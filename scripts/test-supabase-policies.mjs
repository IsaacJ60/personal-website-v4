import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// This suite cannot contact Supabase or R2: it has no network client, credentials,
// or environment loading. All identities, photos, and bundles are synthetic.
const fixture = JSON.parse(await readFile(
  new URL('../supabase/tests/fixtures/content-schema-before.json', import.meta.url), 'utf8',
));
const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const migrationFiles = await readdir(migrationDirectory);
async function readMigration(suffix) {
  const matching = migrationFiles.filter((name) => name.endsWith(suffix));
  assert.equal(matching.length, 1, `Expected one migration ending in ${suffix}`);
  return readFile(new URL(matching[0], migrationDirectory), 'utf8');
}
const migration = await readMigration('_harden_bundle_access.sql');
const catalogMigration = await readMigration('_create_photo_v2_catalog.sql');
const draftMigration = await readMigration('_save_photo_v2_selection_draft.sql');
const seriesMigration = await readMigration('_save_photo_v2_series_draft.sql');
const publishMigration = await readMigration('_publish_photo_v2_draft.sql');
const managePublicationMigration = await readMigration('_manage_photo_v2_publications.sql');
const uploadMediaMigration = await readMigration('_add_photo_v2_media_storage.sql');
const mediaCleanupMigration = await readMigration('_add_photo_v2_media_cleanup.sql');
const v3Migration = await readMigration('_create_photo_v3_catalog.sql');
const v3MediaMigration = await readMigration('_add_photo_v3_media_storage.sql');
const admin = '00000000-0000-4000-8000-000000000001';
const otherUser = '00000000-0000-4000-8000-000000000002';
const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const tables = ['photos', 'bundles', 'bundle_photos'];

async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN NOBYPASSRLS;
    CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  `);
  for (const table of tables) {
    const columns = fixture.columns.filter((c) => c.table_name === table).map((c) => {
      const type = c.data_type === 'ARRAY' ? c.udt_name.slice(1) + '[]' : c.data_type;
      return `${identifier(c.column_name)} ${type}`
        + (c.column_default ? ` DEFAULT ${c.column_default}` : '')
        + (c.is_nullable === 'NO' ? ' NOT NULL' : '');
    });
    await db.exec(`CREATE TABLE public.${identifier(table)} (${columns.join(',')});`);
  }
  // Primary/unique keys must exist before the membership foreign keys.
  for (const foreign of [false, true]) {
    for (const c of fixture.constraints.filter((c) => c.definition.startsWith('FOREIGN KEY') === foreign)) {
      await db.exec(`ALTER TABLE public.${identifier(c.table_name)} ADD CONSTRAINT ${identifier(c.conname)} ${c.definition};`);
    }
  }
  for (const grant of fixture.grants.filter((g) => ['anon', 'authenticated'].includes(g.grantee))) {
    await db.exec(`GRANT ${grant.privilege_type} ON public.${identifier(grant.table_name)} TO ${identifier(grant.grantee)};`);
  }
  for (const table of tables) {
    await db.exec(`ALTER TABLE public.${identifier(table)} ENABLE ROW LEVEL SECURITY;`);
  }
  for (const p of fixture.policies) {
    const roles = p.roles.slice(1, -1).split(',').map(identifier).join(',');
    await db.exec(`CREATE POLICY ${identifier(p.policyname)} ON public.${identifier(p.tablename)}
      AS ${p.permissive} FOR ${p.cmd} TO ${roles}
      ${p.qual ? `USING (${p.qual})` : ''}
      ${p.with_check ? `WITH CHECK (${p.with_check})` : ''};`);
  }
  await db.exec(`
    INSERT INTO public.photos (slug,object_key,title,date_taken,categories,alt_text,portfolio_order,published)
    VALUES ('visible','visible.jpg','Visible','2026-01-01','{Landscapes}','Visible photo',1,true),
           ('hidden','hidden.jpg','Hidden','2026-01-01','{Landscapes}','Hidden photo',2,false);
    INSERT INTO public.bundles (id,title,published)
    VALUES ('published','Published',true), ('draft','Draft',false);
    INSERT INTO public.bundle_photos (bundle_id,photo_slug,position)
    VALUES ('published','visible',1),('published','hidden',2),('draft','visible',1);
  `);
  return db;
}

async function asRole(db, role, userId, callback) {
  await db.exec('BEGIN');
  try {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    await db.exec(`SET LOCAL ROLE ${identifier(role)}`);
    return await callback();
  } finally {
    // Also restores role/claims after an expected RLS exception aborts the txn.
    await db.exec('ROLLBACK');
  }
}

async function rows(db, table) {
  const order = table === 'bundle_photos' ? 'bundle_id,photo_slug' : table === 'photos' ? 'slug' : 'id';
  return (await db.query(`SELECT * FROM public.${identifier(table)} ORDER BY ${order}`)).rows;
}

test('bundle policy migration', async (t) => {
  const db = await createDatabase();
  try {
    await t.test('reproduces broad legacy access before the fix', async () => {
      await asRole(db, 'anon', null, async () => {
        assert.equal((await rows(db, 'bundles')).length, 2);
        assert.equal((await rows(db, 'bundle_photos')).length, 3);
      });
      await asRole(db, 'authenticated', otherUser, async () => {
        assert.equal((await db.query(`UPDATE public.bundles SET title='Unauthorized' WHERE id='draft' RETURNING id`)).rows.length, 1);
        await db.exec(`INSERT INTO public.bundles(id,title) VALUES ('unauthorized','Unauthorized')`);
      });
    });

    const before = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await rows(db, table)])));
    await db.exec(migration);

    await t.test('changes policies without changing content rows or photo policies', async () => {
      for (const table of tables) assert.deepEqual(await rows(db, table), before[table]);
      const photoPolicies = (await db.query(`SELECT policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='photos'`)).rows;
      for (const p of fixture.policies.filter((p) => p.tablename === 'photos')) {
        assert.deepEqual(photoPolicies.find((x) => x.policyname === p.policyname), {
          policyname: p.policyname, qual: p.qual, with_check: p.with_check,
        });
      }
    });

    for (const [label, role, uid] of [
      ['anonymous visitor', 'anon', null],
      ['non-admin account', 'authenticated', otherUser],
      ['authenticated request missing identity', 'authenticated', null],
    ]) {
      await t.test(`${label}: published rows only; no draft/member leakage`, async () => {
        await asRole(db, role, uid, async () => {
          assert.deepEqual((await rows(db, 'bundles')).map((r) => r.id), ['published']);
          assert.deepEqual((await rows(db, 'photos')).map((r) => r.slug), ['visible']);
          assert.deepEqual((await rows(db, 'bundle_photos')).map((r) => [r.bundle_id, r.photo_slug]), [['published', 'visible']]);
        });
      });
      for (const [table, insert, update] of [
        ['bundles', `INSERT INTO public.bundles(id,title) VALUES ('forbidden','Forbidden')`, `title='Forbidden'`],
        ['bundle_photos', `INSERT INTO public.bundle_photos(bundle_id,photo_slug,position) VALUES ('draft','hidden',3)`, `position=99`],
      ]) {
        await t.test(`${label}: cannot insert ${table}`, async () => {
          await assert.rejects(asRole(db, role, uid, () => db.exec(insert)), (error) => error.code === '42501');
        });
        await t.test(`${label}: cannot update/delete ${table}`, async () => {
          await asRole(db, role, uid, async () => {
            assert.equal((await db.query(`UPDATE public.${table} SET ${update} RETURNING *`)).rows.length, 0);
            assert.equal((await db.query(`DELETE FROM public.${table} RETURNING *`)).rows.length, 0);
          });
        });
      }
    }

    await t.test('an admin subject cannot gain privileges through the anon role', async () => {
      await asRole(db, 'anon', admin, async () => {
        assert.equal((await rows(db, 'bundles')).length, 1);
      });
      await assert.rejects(asRole(db, 'anon', admin, () => db.exec(
        `INSERT INTO public.bundles(id,title) VALUES ('forbidden','Forbidden')`,
      )), (error) => error.code === '42501');
    });

    await t.test('admin can read drafts and create/update/delete bundles and memberships', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        assert.equal((await rows(db, 'bundles')).length, 2);
        assert.equal((await rows(db, 'bundle_photos')).length, 3);
        await db.exec(`INSERT INTO public.bundles(id,title,published) VALUES ('new-draft','New draft',false)`);
        await db.exec(`INSERT INTO public.bundle_photos(bundle_id,photo_slug,position) VALUES ('new-draft','hidden',1)`);
        assert.equal((await db.query(`UPDATE public.bundles SET title='Edited',published=true WHERE id='new-draft' RETURNING id`)).rows.length, 1);
        assert.equal((await db.query(`UPDATE public.bundle_photos SET position=2 WHERE bundle_id='new-draft' RETURNING *`)).rows.length, 1);
        assert.equal((await db.query(`DELETE FROM public.bundle_photos WHERE bundle_id='new-draft' RETURNING *`)).rows.length, 1);
        assert.equal((await db.query(`DELETE FROM public.bundles WHERE id='new-draft' RETURNING id`)).rows.length, 1);
      });
    });

    await t.test('publication changes take effect for visitors', async () => {
      await db.exec('BEGIN');
      try {
        await db.exec(`UPDATE public.photos SET published=false WHERE slug='visible'`);
        await db.exec('SET LOCAL ROLE anon');
        assert.equal((await rows(db, 'bundle_photos')).length, 0);
      } finally { await db.exec('ROLLBACK'); }
    });
  } finally { await db.close(); }
});

test('preflight refuses policy drift without making partial changes', async () => {
  const db = await createDatabase();
  try {
    await db.exec(`CREATE POLICY unexpected_policy ON public.bundles FOR SELECT TO anon USING (true)`);
    const before = (await db.query(`SELECT * FROM pg_policies ORDER BY tablename,policyname`)).rows;
    await assert.rejects(db.exec(migration), /differ from audited baseline/);
    assert.deepEqual((await db.query(`SELECT * FROM pg_policies ORDER BY tablename,policyname`)).rows, before);
  } finally { await db.close(); }
});

test('preflight refuses inconsistent admin predicates', async () => {
  const db = await createDatabase();
  try {
    await db.exec(`ALTER POLICY "Admin can insert photos" ON public.photos WITH CHECK (true)`);
    await assert.rejects(db.exec(migration), /missing or inconsistent/);
    assert.equal((await db.query(`SELECT count(*)::int AS count FROM pg_policies WHERE policyname='Allow public to read bundles'`)).rows[0].count, 1);
  } finally { await db.close(); }
});

test('independent v2 catalog and private metadata snapshot', async (t) => {
  const db = await createDatabase();
  try {
    await db.exec(migration);
    const sourceBefore = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await rows(db, table)])));
    await db.exec(catalogMigration);

    await t.test('backs up every v1 row and imports metadata without changing the source', async () => {
      for (const table of tables) {
        assert.deepEqual(await rows(db, table), sourceBefore[table]);
        const order = table === 'bundle_photos' ? 'bundle_id,photo_slug' : table === 'photos' ? 'slug' : 'id';
        const backup = (await db.query(`SELECT * FROM photo_backup_before_v2.${table} ORDER BY ${order}`)).rows;
        assert.deepEqual(backup, sourceBefore[table]);
      }
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.photo_v2_photos')).rows[0].n, 2);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.photo_v2_collection_photos')).rows[0].n, 3);
      const collections = (await db.query('SELECT * FROM public.photo_v2_collections')).rows;
      assert.equal(collections.length, 3);
      assert.ok(collections.every((c) => c.published === false));
      assert.equal(collections.filter((c) => c.kind === 'selected').length, 1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.photo_v2_collections WHERE legacy_bundle_id IS NOT NULL AND cover_photo_id IS NOT NULL')).rows[0].n, 2);
    });

    for (const [label, role, uid] of [
      ['anonymous visitor', 'anon', null],
      ['non-admin account', 'authenticated', otherUser],
      ['admin application account', 'authenticated', admin],
    ]) {
      await t.test(`${label}: cannot read or mutate the private snapshot`, async () => {
        for (const sql of [
          'SELECT * FROM photo_backup_before_v2.photos',
          'UPDATE photo_backup_before_v2.photos SET title=title',
        ]) {
          await assert.rejects(asRole(db, role, uid, () => db.exec(sql)), (error) => error.code === '42501');
        }
      });
    }

    for (const [label, role, uid] of [
      ['anonymous visitor', 'anon', null], ['non-admin account', 'authenticated', otherUser],
    ]) {
      await t.test(`${label}: sees published v2 photos, but no draft collections or members`, async () => {
        await asRole(db, role, uid, async () => {
          assert.equal((await db.query('SELECT * FROM public.photo_v2_photos')).rows.length, 1);
          assert.equal((await db.query('SELECT * FROM public.photo_v2_collections')).rows.length, 0);
          assert.equal((await db.query('SELECT * FROM public.photo_v2_collection_photos')).rows.length, 0);
        });
      });
      for (const [table, sql] of [
        ['photo_v2_photos', `INSERT INTO public.photo_v2_photos(slug,object_key,title,date_taken,alt_text) VALUES ('bad','bad.jpg','Bad','2026-01-01','Bad')`],
        ['photo_v2_collections', `INSERT INTO public.photo_v2_collections(slug,title,kind) VALUES ('bad','Bad','series')`],
        ['photo_v2_collection_photos', `INSERT INTO public.photo_v2_collection_photos(collection_id,photo_id,position) SELECT c.id,p.id,99 FROM public.photo_v2_collections c CROSS JOIN public.photo_v2_photos p LIMIT 1`],
      ]) {
        await t.test(`${label}: no ${table} writes`, async () => {
          // For memberships, use IDs found as owner so hidden parent SELECTs
          // cannot turn a forbidden INSERT into a no-op that passes the test.
          let insert = sql;
          if (table === 'photo_v2_collection_photos') {
            const ids = (await db.query(`SELECT c.id AS collection,p.id AS photo FROM public.photo_v2_collections c CROSS JOIN public.photo_v2_photos p WHERE c.slug='selected-work' AND p.slug='visible'`)).rows[0];
            insert = `INSERT INTO public.photo_v2_collection_photos(collection_id,photo_id,position) VALUES ('${ids.collection}','${ids.photo}',99)`;
          }
          await assert.rejects(asRole(db, role, uid, () => db.exec(insert)), (error) => error.code === '42501');
          const assignment = table === 'photo_v2_collection_photos' ? 'position=position' : 'title=title';
          for (const statement of [
            `UPDATE public.${table} SET ${assignment} RETURNING *`,
            `DELETE FROM public.${table} RETURNING *`,
          ]) {
            if (role === 'anon') {
              await assert.rejects(asRole(db, role, uid, () => db.query(statement)), (error) => error.code === '42501');
            } else {
              await asRole(db, role, uid, async () => {
                assert.equal((await db.query(statement)).rows.length, 0);
              });
            }
          }
        });
      }
    }

    await t.test('admin can curate v2; the update trigger works with normal admin privileges', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        assert.equal((await db.query('SELECT * FROM public.photo_v2_photos')).rows.length, 2);
        const original = (await db.query(`SELECT updated_at FROM public.photo_v2_photos WHERE slug='visible'`)).rows[0];
        const changed = (await db.query(`UPDATE public.photo_v2_photos SET title='New independent title' WHERE slug='visible' RETURNING updated_at`)).rows[0];
        assert.notEqual(changed.updated_at, original.updated_at);
        await db.exec(`UPDATE public.photo_v2_collections SET published=true WHERE slug='published'`);
        await db.exec(`INSERT INTO public.photo_v2_photos(slug,object_key,title,date_taken,alt_text) VALUES ('new','new.jpg','New','2026-01-01','New')`);
        assert.equal((await db.query(`SELECT published FROM public.photo_v2_photos WHERE slug='new'`)).rows[0].published, false);
        await db.exec(`INSERT INTO public.photo_v2_collections(slug,title,kind) VALUES ('new','New','notebook')`);
        await db.exec(`INSERT INTO public.photo_v2_collection_photos(collection_id,photo_id,position) SELECT c.id,p.id,0 FROM public.photo_v2_collections c CROSS JOIN public.photo_v2_photos p WHERE c.slug='new' AND p.slug='new'`);
        await db.exec(`DELETE FROM public.photo_v2_collections WHERE slug='new'`);
        await db.exec(`DELETE FROM public.photo_v2_photos WHERE slug='new'`);
      });
      assert.deepEqual(await rows(db, 'photos'), sourceBefore.photos);
    });

    await t.test('admin deletion rejects stale revisions, removes memberships and clears covers atomically', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const photo = (await db.query(`SELECT id,updated_at FROM public.photo_v2_photos WHERE slug='visible'`)).rows[0];
        const before = (await db.query(`SELECT count(*)::int AS n FROM public.photo_v2_collection_photos WHERE photo_id=$1`, [photo.id])).rows[0].n;
        assert.ok(before > 0);
        await db.query(`UPDATE public.photo_v2_collections SET cover_photo_id=$1 WHERE slug='published'`, [photo.id]);
        const stale = await db.query(`DELETE FROM public.photo_v2_photos WHERE id=$1 AND updated_at=$2::timestamptz - interval '1 second' RETURNING id`, [photo.id, photo.updated_at]);
        assert.equal(stale.rows.length, 0);
        assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.photo_v2_collection_photos WHERE photo_id=$1`, [photo.id])).rows[0].n, before);
        assert.equal((await db.query(`DELETE FROM public.photo_v2_photos WHERE id=$1 AND updated_at=$2 RETURNING id`, [photo.id, photo.updated_at])).rows.length, 1);
        assert.equal((await db.query(`SELECT * FROM public.photo_v2_collection_photos WHERE photo_id=$1`, [photo.id])).rows.length, 0);
        assert.equal((await db.query(`SELECT cover_photo_id FROM public.photo_v2_collections WHERE slug='published'`)).rows[0].cover_photo_id, null);
        assert.deepEqual(await rows(db, 'photos'), sourceBefore.photos);
      });
    });

    await t.test('published collection members require a published photo too', async () => {
      await db.exec('BEGIN');
      try {
        await db.exec(`UPDATE public.photo_v2_collections SET published=true WHERE slug='published'`);
        await db.exec('SET LOCAL ROLE anon');
        const members = (await db.query('SELECT * FROM public.photo_v2_collection_photos')).rows;
        assert.equal(members.length, 1);
      } finally { await db.exec('ROLLBACK'); }
    });

    await t.test('v2 changes and deletes never alter the old catalog or snapshot', async () => {
      await db.exec('BEGIN');
      try {
        await db.exec(`DELETE FROM public.photo_v2_photos WHERE slug='visible'`);
        for (const table of tables) assert.deepEqual(await rows(db, table), sourceBefore[table]);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM photo_backup_before_v2.photos')).rows[0].n, 2);
      } finally { await db.exec('ROLLBACK'); }
    });

    await t.test('collection order can be swapped atomically; duplicate final positions fail', async () => {
      const collection = (await db.query(`SELECT id FROM public.photo_v2_collections WHERE slug='published'`)).rows[0].id;
      await asRole(db, 'authenticated', admin, async () => {
        await db.exec('SET CONSTRAINTS photo_v2_collection_position_key DEFERRED');
        await db.query('UPDATE public.photo_v2_collection_photos SET position=1-position WHERE collection_id=$1', [collection]);
        await db.exec('SET CONSTRAINTS photo_v2_collection_position_key IMMEDIATE');
      });
      await assert.rejects(asRole(db, 'authenticated', admin, () => db.query(
        'UPDATE public.photo_v2_collection_photos SET position=0 WHERE collection_id=$1', [collection],
      )), (error) => error.code === '23505');
    });

    await t.test('invalid dimensions and multiple live Selected edits are rejected', async () => {
      await assert.rejects(asRole(db, 'authenticated', admin, () => db.exec(
        `UPDATE public.photo_v2_photos SET image_width=0,image_height=100 WHERE slug='visible'`,
      )), (error) => error.code === '23514');
      await assert.rejects(asRole(db, 'authenticated', admin, async () => {
        await db.exec(`UPDATE public.photo_v2_collections SET published=true WHERE kind='selected'`);
        await db.exec(`INSERT INTO public.photo_v2_collections(slug,title,kind,published) VALUES ('another','Another','selected',true)`);
      }), (error) => error.code === '23505');
    });

    await t.test('rerunning the import refuses to overwrite existing v2 work', async () => {
      await assert.rejects(db.exec(catalogMigration), /refusing to overwrite/);
    });
  } finally { await db.close(); }
});

test('a failed v2 import rolls back the entire new schema and snapshot', async () => {
  const db = await createDatabase();
  try {
    await db.exec(migration);
    // Model unexpected source drift, without ever doing this to the live DB.
    await db.exec(`ALTER TABLE public.bundle_photos DROP CONSTRAINT bundle_photos_photo_slug_fkey;
      INSERT INTO public.bundle_photos(bundle_id,photo_slug,position) VALUES ('draft','orphan',99);`);
    await assert.rejects(db.exec(catalogMigration), /Snapshot\/import counts differ/);
    const state = (await db.query(`SELECT to_regnamespace('photo_backup_before_v2') AS backup,
      to_regclass('public.photo_v2_photos') AS photos,
      to_regclass('public.photo_v2_collections') AS collections,
      to_regclass('public.photo_v2_collection_photos') AS members`)).rows[0];
    assert.deepEqual(state, {backup:null,photos:null,collections:null,members:null});
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.bundle_photos`)).rows[0].n, 4);
  } finally { await db.close(); }
});

test('private upload derivatives follow the corresponding v2 photo visibility', async (t) => {
  const db = await createDatabase();
  try {
    await db.exec(migration);
    await db.exec(catalogMigration);
    await db.exec(`
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets (
        id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
      );
      CREATE TABLE storage.objects (
        bucket_id text REFERENCES storage.buckets(id), name text, PRIMARY KEY(bucket_id, name)
      );
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO anon, authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    `);
    await db.exec(uploadMediaMigration);
    const id = '00000000-0000-4000-8000-000000000093';
    const bucket = 'portfolio-v2-media';
    const display = `uploads/${id}/display.webp`;
    const thumbnail = `uploads/${id}/thumbnail.webp`;
    const orphan = 'uploads/00000000-0000-4000-8000-000000000099/display.webp';
    const upload = (name) => db.query('INSERT INTO storage.objects VALUES ($1,$2)', [bucket, name]);
    const images = async () => (await db.query('SELECT name FROM storage.objects ORDER BY name')).rows.map((row) => row.name);
    assert.deepEqual((await db.query('SELECT public, allowed_mime_types FROM storage.buckets WHERE id=$1', [bucket])).rows,
      [{ public: false, allowed_mime_types: ['image/webp'] }]);

    await t.test('ordinary accounts cannot upload and the admin can only insert supported paths', async () => {
      await assert.rejects(asRole(db, 'anon', null, () => upload(display)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => upload(display)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', admin, () => upload(`uploads/${id}/original.jpg`)), (error) => error.code === '42501');
      await asRole(db, 'authenticated', admin, async () => {
        await upload(display);
        await upload(thumbnail);
        assert.deepEqual(await images(), [display, thumbnail]);
        assert.equal((await db.query('DELETE FROM storage.objects RETURNING name')).rows.length, 0);
        assert.equal((await db.query("UPDATE storage.objects SET name='replacement.webp' RETURNING name")).rows.length, 0);
      });
    });
    await t.test('anon and non-admin reads see only both derivatives of a published photo', async () => {
      await db.query(`INSERT INTO public.photo_v2_photos(id,slug,object_key,title,date_taken,alt_text)
        VALUES ($1,'draft-upload',$2,'Draft upload','2026-11-23','')`, [id, display]);
      await upload(display);
      await upload(thumbnail);
      await upload(orphan);
      for (const [role, uid] of [['anon', null], ['authenticated', otherUser]]) {
        await asRole(db, role, uid, async () => { assert.deepEqual(await images(), []); });
      }
      await db.query('UPDATE public.photo_v2_photos SET published=true WHERE id=$1', [id]);
      for (const [role, uid] of [['anon', null], ['authenticated', otherUser]]) {
        await asRole(db, role, uid, async () => { assert.deepEqual(await images(), [display, thumbnail]); });
      }
    });
    await db.exec(mediaCleanupMigration);
    await t.test('cleanup is admin-only and cannot delete media still used by a photo', async () => {
      await assert.rejects(asRole(db, 'anon', null, () => db.query('SELECT * FROM public.photo_v2_media_cleanup')), (error) => error.code === '42501');
      await asRole(db, 'authenticated', otherUser, async () => {
        assert.equal((await db.query('SELECT * FROM public.photo_v2_media_cleanup')).rows.length, 0);
        assert.equal((await db.query('DELETE FROM storage.objects RETURNING name')).rows.length, 0);
      });
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => db.query('INSERT INTO public.photo_v2_media_cleanup(photo_id) VALUES ($1)', [id])), (error) => error.code === '42501');
      await asRole(db, 'authenticated', admin, async () => {
        await db.query('INSERT INTO public.photo_v2_media_cleanup(photo_id) VALUES ($1)', [id]);
        assert.equal((await db.query('DELETE FROM storage.objects RETURNING name')).rows.length, 0);
      });
    });
    await t.test('deletion queues only uploaded files and authorizes just their two derivatives', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const revision = (await db.query('SELECT updated_at FROM public.photo_v2_photos WHERE id=$1', [id])).rows[0].updated_at;
        assert.equal((await db.query(`DELETE FROM public.photo_v2_photos WHERE id=$1 AND updated_at=$2::timestamptz - interval '1 second' RETURNING id`, [id, revision])).rows.length, 0);
        assert.equal((await db.query('SELECT * FROM public.photo_v2_media_cleanup')).rows.length, 0);
        await db.query('DELETE FROM public.photo_v2_photos WHERE id=$1 AND updated_at=$2', [id, revision]);
        assert.deepEqual((await db.query('SELECT photo_id FROM public.photo_v2_media_cleanup')).rows, [{ photo_id: id }]);
        // Files remain until the separate Storage API request succeeds.
        assert.ok((await images()).includes(display));
        await db.exec("DELETE FROM public.photo_v2_photos WHERE slug='visible'");
        assert.equal((await db.query('SELECT * FROM public.photo_v2_media_cleanup')).rows.length, 1);
        assert.deepEqual((await db.query('DELETE FROM storage.objects RETURNING name')).rows.map((row) => row.name).sort(), [display, thumbnail]);
        assert.deepEqual(await images(), [orphan]);
      });
      // Rolling back metadata deletion also rolls back the queued task.
      assert.equal((await db.query('SELECT * FROM public.photo_v2_media_cleanup')).rows.length, 0);
      assert.equal((await db.query('SELECT id FROM public.photo_v2_photos WHERE id=$1', [id])).rows.length, 1);
    });
  } finally { await db.close(); }
});

test('publishing keeps draft edits separate from the public portfolio', async (t) => {
  const db = await createDatabase();
  try {
    for (const sql of [migration, catalogMigration, draftMigration, seriesMigration, publishMigration, managePublicationMigration]) await db.exec(sql);
    const [{ id: hidden }, { id: visible }] = (await db.query('SELECT id FROM public.photo_v2_photos ORDER BY slug')).rows;
    const selected = (await db.query("SELECT id, updated_at::text AS revision FROM public.photo_v2_collections WHERE slug='selected-work'")).rows[0];
    const seriesId = '00000000-0000-4000-8000-000000000094';
    const publish = async (id, revision) =>
      (await db.query('SELECT * FROM public.photo_v2_publish_draft($1,$2)', [id, revision])).rows[0];
    const saveAndPublish = async (id, kind, revision, ids, title = null) =>
      (await db.query('SELECT * FROM public.photo_v2_save_and_publish_draft($1,$2,$3::uuid[],$4,$5)',
        [id, kind, '{' + ids.join(',') + '}', revision, title])).rows[0];
    const unpublish = async (id, revision) =>
      (await db.query('SELECT * FROM public.photo_v2_unpublish_draft($1,$2)', [id, revision])).rows[0];
    const liveCopy = async (id) => (await db.query(
      `SELECT c.id, c.slug, c.published, c.is_public_copy, c.updated_at::text AS revision
       FROM public.photo_v2_publications p JOIN public.photo_v2_collections c ON c.id=p.live_id
       WHERE p.draft_id=$1`, [id])).rows[0];
    const saveSelected = async (revision, ids) =>
      (await db.query('SELECT public.photo_v2_save_selection_draft($1,$2,$3::uuid[])::text AS revision',
        [selected.id, revision, '{' + ids.join(',') + '}'])).rows[0].revision;
    const saveSeries = async (revision, title, ids, cover) =>
      (await db.query('SELECT public.photo_v2_save_series_draft($1,$2,$3,$4::uuid[],$5,$6)::text AS revision',
        [seriesId, title, 'A description', '{' + ids.join(',') + '}', revision, cover])).rows[0].revision;
    const publicSequence = async (slug) => (await db.query(
      `SELECT c.id, c.title, c.description, c.cover_photo_id, m.photo_id FROM public.photo_v2_collections c
       JOIN public.photo_v2_collection_photos m ON m.collection_id=c.id
       WHERE c.published AND c.slug=$1 ORDER BY m.position`, [slug])).rows;

    await t.test('anonymous and non-admin calls cannot publish', async () => {
      await assert.rejects(asRole(db, 'anon', null, () => publish(selected.id, selected.revision)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => publish(selected.id, selected.revision)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'anon', null, () => unpublish(selected.id, selected.revision)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => unpublish(selected.id, selected.revision)), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => saveAndPublish(seriesId, 'series', null, [visible], 'Denied')), (error) => error.code === '42501');
    });
    await t.test('rejects empty drafts and sequences containing a private photo', async () => {
      await assert.rejects(asRole(db, 'authenticated', admin, () => publish(selected.id, selected.revision)), (error) => error.code === '22023');
      await assert.rejects(asRole(db, 'authenticated', admin, async () => {
        const revision = await saveSelected(selected.revision, [hidden, visible]);
        await publish(selected.id, revision);
      }), (error) => error.code === '23514');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM public.photo_v2_publications')).rows[0].n, 0);
    });
    await t.test('publishes Selected Work once and exposes only the published copy', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const revision = await saveSelected(selected.revision, [visible]);
        const output = await publish(selected.id, revision);
        assert.equal(output.collection_kind, 'selected');
        assert.deepEqual(await publish(selected.id, revision), output);
        const [publicPhoto] = await publicSequence(output.public_slug);
        assert.notEqual(publicPhoto.id, selected.id);
        assert.equal(publicPhoto.photo_id, visible);
        await db.exec('SET LOCAL ROLE anon');
        assert.equal((await publicSequence(output.public_slug)).length, 1);
        assert.equal((await db.query('SELECT id FROM public.photo_v2_collections WHERE id=$1', [selected.id])).rows.length, 0);
        assert.equal((await db.query('SELECT photo_id FROM public.photo_v2_collection_photos WHERE collection_id=$1', [selected.id])).rows.length, 0);
        await assert.rejects(db.query('SELECT * FROM public.photo_v2_publications'), (error) => error.code === '42501');
      });
    });
    await t.test('new Series edits stay private, then replace the live sequence at the same URL', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        await db.query('UPDATE public.photo_v2_photos SET published=true WHERE id=$1', [hidden]);
        const first = await saveSeries(null, 'Quiet hours', [visible, hidden], hidden);
        const { public_slug: slug } = await publish(seriesId, first);
        assert.equal(slug, 'quiet-hours');
        const liveBefore = await publicSequence(slug);
        assert.deepEqual(liveBefore.map((row) => row.photo_id), [visible, hidden]);
        assert.equal(liveBefore[0].cover_photo_id, hidden);
        const next = await saveSeries(first, 'Changed title', [hidden, visible], visible);
        assert.deepEqual(await publicSequence(slug), liveBefore);
        await db.exec('SAVEPOINT stale');
        await assert.rejects(publish(seriesId, first), (error) => error.code === '40001');
        await db.exec('ROLLBACK TO SAVEPOINT stale');
        assert.equal((await publish(seriesId, next)).public_slug, slug);
        const liveAfter = await publicSequence(slug);
        assert.deepEqual(liveAfter.map((row) => row.photo_id), [hidden, visible]);
        assert.equal(liveAfter[0].title, 'Changed title');
        assert.equal(liveAfter[0].description, 'A description');
        assert.equal(liveAfter[0].cover_photo_id, visible);
        assert.equal(liveAfter[0].id, liveBefore[0].id);
        await db.exec(`SELECT set_config('request.jwt.claim.sub', '${otherUser}', true)`);
        assert.equal((await db.query('SELECT * FROM public.photo_v2_publications')).rows.length, 0);
        assert.equal((await publicSequence(slug)).length, 2);
      });
    });
    await t.test('a failed publication leaves the previous public copy intact', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const first = await saveSeries(null, 'Quiet hours', [visible], null);
        const { public_slug: slug } = await publish(seriesId, first);
        const next = await saveSeries(first, 'Changed title', [visible], null);
        const before = await publicSequence(slug);
        await db.exec('RESET ROLE');
        await db.exec("ALTER TABLE public.photo_v2_publications ADD CHECK (draft_revision < '2000-01-01') NOT VALID");
        await db.exec('SET LOCAL ROLE authenticated');
        await db.exec('SAVEPOINT failing_publish');
        await assert.rejects(publish(seriesId, next), (error) => error.code === '23514');
        await db.exec('ROLLBACK TO SAVEPOINT failing_publish');
        assert.deepEqual(await publicSequence(slug), before);
      });
    });
    await t.test('an invalid direct publish rolls back the draft save too', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const first = await saveSeries(null, 'Earlier draft', [visible], null);
        await db.exec('SAVEPOINT direct_publish');
        await assert.rejects(saveAndPublish(seriesId, 'series', first, [hidden], 'Unsaved changes'), (error) => error.code === '23514');
        await db.exec('ROLLBACK TO SAVEPOINT direct_publish');
        const draft = await db.query('SELECT title, updated_at::text AS revision FROM public.photo_v2_collections WHERE id=$1', [seriesId]);
        assert.deepEqual(draft.rows[0], { title: 'Earlier draft', revision: first });
        assert.equal(await liveCopy(seriesId), undefined);
      });
    });
    await t.test('unpublish hides the copy and keeps its URL for a later direct publish', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const first = await saveAndPublish(seriesId, 'series', null, [visible], 'Between Stops');
        const live = await liveCopy(seriesId);
        assert.equal(live.is_public_copy, true);
        assert.notEqual(live.slug, 'between-stops');
        assert.equal((await unpublish(seriesId, live.revision)).public_slug, live.slug);
        assert.equal((await liveCopy(seriesId)).published, false);
        assert.equal((await db.query('SELECT title FROM public.photo_v2_collections WHERE id=$1', [seriesId])).rows[0].title, 'Between Stops');
        await db.exec('SET LOCAL ROLE anon');
        assert.equal((await publicSequence(live.slug)).length, 0);
        await db.exec('SET LOCAL ROLE authenticated');
        await db.exec('SAVEPOINT try_edit_copy');
        await assert.rejects(publish(live.id, (await liveCopy(seriesId)).revision), (error) => error.code === '22023');
        await db.exec('ROLLBACK TO SAVEPOINT try_edit_copy');
        const result = await saveAndPublish(seriesId, 'series', first.saved_revision, [visible], 'New title');
        assert.equal(result.public_slug, live.slug);
        assert.equal((await liveCopy(seriesId)).id, live.id);
        assert.equal((await publicSequence(live.slug))[0].title, 'New title');
        await assert.rejects(unpublish(seriesId, live.revision), (error) => error.code === '40001');
      });
    });
  } finally { await db.close(); }
});

test('private series drafts save metadata, cover, and sequence together', async (t) => {
  const db = await createDatabase();
  try {
    await db.exec(migration);
    await db.exec(catalogMigration);
    await db.exec(seriesMigration);
    const id = '00000000-0000-4000-8000-000000000090';
    const [{ id: first }, { id: second }] = (await db.query('SELECT id FROM public.photo_v2_photos ORDER BY slug')).rows;
    const save = async ({ target = id, revision = null, cover = second, ids = [first, second], title = '  A new series  ' } = {}) =>
      (await db.query('SELECT public.photo_v2_save_series_draft($1,$2,$3,$4::uuid[],$5,$6)::text AS revision',
        [target, title, 'A description', '{' + ids.join(',') + '}', revision, cover])).rows[0].revision;
    const draft = async () => (await db.query('SELECT title, description, cover_photo_id, published FROM public.photo_v2_collections WHERE id=$1', [id])).rows;
    const members = async () => (await db.query('SELECT photo_id FROM public.photo_v2_collection_photos WHERE collection_id=$1 ORDER BY position', [id])).rows.map((row) => row.photo_id);

    await t.test('anonymous and non-admin callers cannot create a draft', async () => {
      await assert.rejects(asRole(db, 'anon', null, () => save()), (error) => error.code === '42501');
      await assert.rejects(asRole(db, 'authenticated', otherUser, () => save()), (error) => error.code === '42501');
    });
    await t.test('cover can differ from the opener and stays selected when reordering', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const version = await save();
        assert.deepEqual(await draft(), [{ title: 'A new series', description: 'A description', cover_photo_id: second, published: false }]);
        assert.deepEqual(await members(), [first, second]);
        await save({ revision: version, ids: [second, first], title: 'Revised' });
        assert.deepEqual(await members(), [second, first]);
        assert.equal((await draft())[0].cover_photo_id, second);
        assert.equal((await draft())[0].title, 'Revised');
      });
    });
    await t.test('rejects a cover outside the sequence and rolls back failed membership inserts', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const version = await save();
        await db.exec('SAVEPOINT before_save');
        await assert.rejects(save({ revision: version, ids: [first] }), (error) => error.code === '22023');
        await db.exec('ROLLBACK TO SAVEPOINT before_save');
        await db.exec('RESET ROLE');
        await db.exec('ALTER TABLE public.photo_v2_collection_photos ADD CHECK (position <> 1) NOT VALID');
        await db.exec('SET LOCAL ROLE authenticated');
        await db.exec('SAVEPOINT before_insert');
        await assert.rejects(save({ revision: version, ids: [second, first], title: 'Failed' }), (error) => error.code === '23514');
        await db.exec('ROLLBACK TO SAVEPOINT before_insert');
        assert.deepEqual(await members(), [first, second]);
        assert.equal((await draft())[0].title, 'A new series');
      });
    });
    await t.test('blocks stale saves and duplicate creation requests', async () => {
      await asRole(db, 'authenticated', admin, async () => {
        const version = await save();
        await save({ revision: version, title: 'Newer' });
        await db.exec('SAVEPOINT before_stale');
        await assert.rejects(save({ revision: version }), (error) => error.code === '40001');
        await db.exec('ROLLBACK TO SAVEPOINT before_stale');
        await assert.rejects(save(), (error) => error.code === '40001');
      });
    });
    await t.test('existing imported drafts can be updated without losing provenance', async () => {
      const existing = (await db.query("SELECT id, slug, legacy_bundle_id, updated_at::text AS revision FROM public.photo_v2_collections WHERE kind='series' LIMIT 1")).rows[0];
      await asRole(db, 'authenticated', admin, async () => {
        await save({ target: existing.id, revision: existing.revision, title: 'Edited import' });
        assert.deepEqual((await db.query('SELECT slug, legacy_bundle_id FROM public.photo_v2_collections WHERE id=$1', [existing.id])).rows[0],
          { slug: existing.slug, legacy_bundle_id: existing.legacy_bundle_id });
        await db.exec('SET LOCAL ROLE anon');
        assert.equal((await db.query('SELECT id FROM public.photo_v2_collections WHERE id=$1', [existing.id])).rows.length, 0);
        assert.equal((await db.query('SELECT photo_id FROM public.photo_v2_collection_photos WHERE collection_id=$1', [existing.id])).rows.length, 0);
      });
    });
    await t.test('rejects edits to published series and to Selected Work', async () => {
      const selected = (await db.query("SELECT id, updated_at::text AS revision FROM public.photo_v2_collections WHERE kind='selected'")).rows[0];
      await asRole(db, 'authenticated', admin, async () => {
        await db.exec('SAVEPOINT before_wrong_kind');
        await assert.rejects(save({ target: selected.id, revision: selected.revision }), (error) => error.code === '22023');
        await db.exec('ROLLBACK TO SAVEPOINT before_wrong_kind');
        await save();
        const published = await db.query('UPDATE public.photo_v2_collections SET published=true WHERE id=$1 RETURNING updated_at::text AS revision', [id]);
        await assert.rejects(save({ revision: published.rows[0].revision }), (error) => error.code === '22023');
      });
    });
  } finally { await db.close(); }
});

test('atomic private v2 selection draft saves', async (t) => {
  const db = await createDatabase();
  try {
    await db.exec(migration);
    await db.exec(catalogMigration);
    await db.exec(draftMigration);
    const draft = (await db.query(`SELECT id, updated_at::text AS revision FROM public.photo_v2_collections WHERE slug='selected-work'`)).rows[0];
    const photos = (await db.query(`SELECT id,slug FROM public.photo_v2_photos ORDER BY slug`)).rows;
    const visible = photos.find(p => p.slug === 'visible').id;
    const hidden = photos.find(p => p.slug === 'hidden').id;
    await db.query(`INSERT INTO public.photo_v2_collection_photos(collection_id,photo_id,position) VALUES ($1,$2,0)`, [draft.id, visible]);
    const selection = async () => (await db.query(`SELECT photo_id,position FROM public.photo_v2_collection_photos WHERE collection_id=$1 ORDER BY position`, [draft.id])).rows;
    const save = (ids, revision=draft.revision, id=draft.id) => db.query(
      `SELECT public.photo_v2_save_selection_draft($1,$2,$3::uuid[])::text AS revision`,
      [id,revision,ids === null ? null : '{'+ids.map(id => id ?? 'NULL').join(',')+'}']);
    const beforeV1 = Object.fromEntries(await Promise.all(tables.map(async name => [name,await rows(db,name)])));

    for (const [role, uid] of [['anon',null],['anon',admin],['authenticated',otherUser],['authenticated',null]]) {
      await t.test(`${role}/${uid ?? 'no identity'} cannot save`, async () => {
        await assert.rejects(asRole(db,role,uid,()=>save([visible])), error=>error.code === '42501');
      });
    }
    await t.test('admin can atomically reorder, retain draft status, and choose first cover', async () => {
      await asRole(db,'authenticated',admin,async()=>{
        const result = await save([hidden,visible]);
        assert.deepEqual(await selection(),[{photo_id:hidden,position:0},{photo_id:visible,position:1}]);
        const state = (await db.query(`SELECT published,cover_photo_id FROM public.photo_v2_collections WHERE id=$1`,[draft.id])).rows[0];
        assert.deepEqual(state,{published:false,cover_photo_id:hidden});
        assert.notEqual(result.rows[0].revision,draft.revision);
        await save([visible,hidden],result.rows[0].revision);
        assert.equal((await selection())[0].photo_id,visible);
      });
    });
    await t.test('a stale editor cannot overwrite a newer save', async () => {
      await assert.rejects(asRole(db,'authenticated',admin,async()=>{
        await save([hidden]);
        await save([visible]);
      }),error=>error.code === '40001');
    });
    for (const [name,ids] of [['duplicates',[visible,visible]],['missing photo',['00000000-0000-4000-8000-000000000099']],['null list',null],['null member',[null]],['oversized',Array(1001).fill(visible)]]) {
      await t.test(`rejects ${name}`, async()=>{
        await assert.rejects(asRole(db,'authenticated',admin,()=>save(ids)),error=>error.code === '22023');
        assert.deepEqual(await selection(),[{photo_id:visible,position:0}]);
      });
    }
    await t.test('published selections and other collection kinds cannot be overwritten', async()=>{
      await assert.rejects(asRole(db,'authenticated',admin,async()=>{
        await db.query(`UPDATE public.photo_v2_collections SET published=true WHERE id=$1`,[draft.id]);
        await save([hidden]);
      }),error=>error.code === '22023');
      const series = (await db.query(`SELECT id,updated_at::text AS revision FROM public.photo_v2_collections WHERE kind='series' LIMIT 1`)).rows[0];
      await assert.rejects(asRole(db,'authenticated',admin,()=>save([visible],series.revision,series.id)),error=>error.code === '22023');
    });
    await t.test('empty drafts clear memberships and the cover safely',async()=>{
      await asRole(db,'authenticated',admin,async()=>{
        await save([]);
        assert.deepEqual(await selection(),[]);
        assert.equal((await db.query(`SELECT cover_photo_id FROM public.photo_v2_collections WHERE id=$1`,[draft.id])).rows[0].cover_photo_id,null);
      });
    });
    await t.test('an insertion failure leaves the old selection intact',async()=>{
      await db.exec(`CREATE FUNCTION public.reject_test_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test insert failure'; END $$;
        CREATE TRIGGER reject_test_member BEFORE INSERT ON public.photo_v2_collection_photos FOR EACH ROW EXECUTE FUNCTION public.reject_test_member();`);
      await asRole(db,'authenticated',admin,async()=>{
        await db.exec('SAVEPOINT before_failed_save');
        await assert.rejects(save([hidden]),/test insert failure/);
        await db.exec('ROLLBACK TO SAVEPOINT before_failed_save');
        assert.deepEqual(await selection(),[{photo_id:visible,position:0}]);
      });
    });
    await t.test('draft memberships stay private; original catalog is unchanged',async()=>{
      await asRole(db,'anon',null,async()=>{
        assert.equal((await db.query(`SELECT * FROM public.photo_v2_collection_photos WHERE collection_id=$1`,[draft.id])).rows.length,0);
      });
      for(const name of tables) assert.deepEqual(await rows(db,name),beforeV1[name]);
    });
  } finally { await db.close(); }
});

test('empty v3 catalog isolates access, publication, and cleanup from existing catalogs', async () => {
  const db = await createDatabase();
  try {
    for (const sql of [migration, catalogMigration, draftMigration, seriesMigration, publishMigration, managePublicationMigration]) await db.exec(sql);
    const existingTables = [...tables, 'photo_v2_photos', 'photo_v2_collections', 'photo_v2_collection_photos', 'photo_v2_publications'];
    const snapshot = async () => Promise.all(existingTables.map(async name => (await db.query(`SELECT to_jsonb(t) AS row FROM public.${identifier(name)} t ORDER BY to_jsonb(t)::text`)).rows));
    const before = await snapshot();
    await db.exec(v3Migration);
    assert.deepEqual(await snapshot(), before);
    const draft = (await db.query("SELECT * FROM public.photo_v3_collections")).rows;
    assert.equal(draft.length, 1);
    assert.equal(draft[0].slug, 'selected-work');
    assert.equal(draft[0].published, false);
    for (const name of ['photos', 'collection_photos', 'publications', 'media_cleanup']) {
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.photo_v3_${name}`)).rows[0].n, 0);
    }
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'photo_v3_%' AND relkind='r' AND NOT relrowsecurity")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid IN (SELECT oid FROM pg_class WHERE relname LIKE 'photo_v3_%') AND contype='f' AND confrelid NOT IN (SELECT oid FROM pg_class WHERE relname LIKE 'photo_v3_%')")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname LIKE 'photo_v3_%' AND (prosecdef OR prosrc LIKE '%photo_v2%')")).rows[0].n, 0);
    for (const [role, user] of [['anon', null], ['authenticated', otherUser]]) {
      await asRole(db, role, user, async () => {
        assert.equal((await db.query('SELECT * FROM public.photo_v3_collections')).rows.length, 0);
        assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length, 0);
      });
      await assert.rejects(asRole(db, role, user, () => db.query("INSERT INTO public.photo_v3_collections(slug,title,kind) VALUES ('denied','Denied','series')")), /permission denied|row-level security/);
      await assert.rejects(asRole(db, role, user, () => db.query('SELECT public.photo_v3_save_selection_draft($1,$2,$3::uuid[])', [draft[0].id, draft[0].updated_at, []])), /permission denied|Administrator access required/);
    }
    const photoId = '00000000-0000-4000-8000-000000000099';
    await db.query("INSERT INTO public.photo_v3_photos(id,slug,object_key,title,date_taken,alt_text,published) VALUES ($1,'v3-only',$2,'V3','2026-11-25','V3',true)", [photoId, `uploads/${photoId}/display.webp`]);
    await asRole(db, 'authenticated', admin, async () => {
      const saved = (await db.query('SELECT public.photo_v3_save_selection_draft($1,$2,$3::uuid[]) AS revision', [draft[0].id, draft[0].updated_at, [photoId]])).rows[0].revision;
      const published = (await db.query('SELECT * FROM public.photo_v3_publish_draft($1,$2)', [draft[0].id, saved])).rows;
      assert.equal(published.length, 1);
      assert.equal((await db.query('SELECT * FROM public.photo_v3_publications')).rows.length, 1);
    });
    await asRole(db, 'anon', null, async () => {
      assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length, 1);
      assert.equal((await db.query('SELECT * FROM public.photo_v3_collections')).rows.length, 0);
    });
    await asRole(db, 'authenticated', admin, async () => {
      await db.query('DELETE FROM public.photo_v3_photos WHERE id=$1', [photoId]);
      assert.equal((await db.query('SELECT * FROM public.photo_v3_media_cleanup')).rows[0].photo_id, photoId);
    });
    assert.deepEqual(await snapshot(), before);
  } finally { await db.close(); }
});

test('v3 storage policies isolate same-ID media from v2 and constrain cleanup', async () => {
  const db = await createDatabase();
  try {
    for (const sql of [migration, catalogMigration, v3Migration]) await db.exec(sql);
    await db.exec(`CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(bucket_id text REFERENCES storage.buckets(id),name text,PRIMARY KEY(bucket_id,name));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO anon,authenticated;
      GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;`);
    for (const sql of [uploadMediaMigration, mediaCleanupMigration, v3MediaMigration]) await db.exec(sql);
    const id = '00000000-0000-4000-8000-000000000098';
    const key = `uploads/${id}/display.webp`;
    const thumb = `uploads/${id}/thumbnail.webp`;
    for (const version of [2,3]) {
      await db.query(`INSERT INTO public.photo_v${version}_photos(id,slug,object_key,title,date_taken,alt_text,published) VALUES($1,'same-id',$2,'Photo','2026-11-25','Photo',$3)`, [id,key,version===2]);
      await db.query('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2),($1,$3)', [`portfolio-v${version}-media`,key,thumb]);
    }
    for (const [role,user] of [['anon',null],['authenticated',otherUser]]) {
      await asRole(db,role,user,async () => {
        const visible=(await db.query('SELECT bucket_id FROM storage.objects')).rows;
        assert.equal(visible.length,2);
        assert.ok(visible.every(row=>row.bucket_id==='portfolio-v2-media'));
      });
      await assert.rejects(asRole(db,role,user,()=>db.query("INSERT INTO storage.objects VALUES('portfolio-v3-media','uploads/denied/display.webp')")),/row-level security/);
    }
    await asRole(db,'authenticated',admin,async () => {
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,4);
      await assert.rejects(db.query("INSERT INTO storage.objects VALUES('portfolio-v3-media','original.jpg')"),/row-level security/);
    });
    await asRole(db,'authenticated',admin,async () => {
      assert.equal((await db.query("UPDATE storage.objects SET name=name WHERE bucket_id='portfolio-v3-media' RETURNING name")).rows.length,0);
      await db.query('INSERT INTO public.photo_v3_media_cleanup(photo_id) VALUES($1)',[id]);
      assert.equal((await db.query("DELETE FROM storage.objects WHERE bucket_id='portfolio-v3-media' RETURNING name")).rows.length,0);
      await db.query('DELETE FROM public.photo_v3_photos WHERE id=$1',[id]);
      const removed=(await db.query('DELETE FROM storage.objects RETURNING bucket_id')).rows;
      assert.equal(removed.length,2);
      assert.ok(removed.every(row=>row.bucket_id==='portfolio-v3-media'));
      assert.equal((await db.query('SELECT * FROM public.photo_v2_photos WHERE id=$1',[id])).rows.length,1);
    });
    await db.query('UPDATE public.photo_v3_photos SET published=true WHERE id=$1',[id]);
    await asRole(db,'anon',null,async () => assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='portfolio-v3-media'")).rows.length,2));
  } finally { await db.close(); }
});

const ownershipMigration = await readMigration('_series_photo_ownership.sql');
async function createSeriesDatabase() {
  const db = await createDatabase();
  for (const sql of [migration, catalogMigration, v3Migration]) await db.exec(sql);
  await db.exec(`CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(bucket_id text REFERENCES storage.buckets(id),name text,PRIMARY KEY(bucket_id,name));
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO anon,authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;`);
  await db.exec(v3MediaMigration);
  return db;
}
async function adminCommit(db, callback) {
  await db.exec('BEGIN');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [admin]);
    await db.exec('SET LOCAL ROLE authenticated');
    const result = await callback();
    await db.exec('COMMIT');
    return result;
  } catch (error) { await db.exec('ROLLBACK'); throw error; }
}
const seriesPhoto = '00000000-0000-4000-8000-000000000091';
async function addOwnedPhoto(db, series, id = seriesPhoto, media = true) {
  if (media) await db.query("INSERT INTO storage.objects VALUES('portfolio-v3-media',$1),('portfolio-v3-media',$2)",
    [`uploads/${id}/display.webp`,`uploads/${id}/thumbnail.webp`]);
  await db.query(`INSERT INTO public.photo_v3_photos(id,slug,title,date_taken,alt_text,object_key,image_width,image_height,owner_series_id)
    VALUES($1::uuid,$1::text,'Test','2026-11-25','Test',$2,1600,1200,$3)`,[id,`uploads/${id}/display.webp`,series]);
}
async function newSeries(db, title = 'Test series') {
  return (await db.query("INSERT INTO public.photo_v3_collections(slug,title,kind) VALUES(gen_random_uuid()::text,$1,'series') RETURNING id",[title])).rows[0].id;
}
async function publishSeries(db, id) {
  const revision=(await db.query('SELECT updated_at FROM public.photo_v3_collections WHERE id=$1',[id])).rows[0].updated_at;
  return (await db.query('SELECT * FROM public.photo_v3_publish_draft($1,$2)',[id,revision])).rows[0];
}

test('series ownership backfills loose photos privately and preserves legacy catalogs', async () => {
  const db=await createSeriesDatabase();
  try {
    await db.query(`INSERT INTO public.photo_v3_photos(id,slug,title,date_taken,alt_text,object_key,published)
      VALUES($1,'loose','Loose','2026-11-25','Loose',$2,true)`,[seriesPhoto,`uploads/${seriesPhoto}/display.webp`]);
    await db.exec(ownershipMigration);
    const owner=(await db.query('SELECT c.title FROM public.photo_v3_photos p JOIN public.photo_v3_collections c ON c.id=p.owner_series_id')).rows;
    assert.deepEqual(owner,[{title:'To organize'}]);
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,0));
    assert.equal((await rows(db,'photos')).length,2);
  } finally {await db.close();}
});

test('series publication controls anonymous photos, memberships and storage together', async () => {
  const db=await createSeriesDatabase();
  try {
    await db.exec(ownershipMigration);
    const series=await adminCommit(db,()=>newSeries(db));
    const second='00000000-0000-4000-8000-000000000092';
    const read=async(expected)=>{
      for (const [role,user] of [['anon',null],['authenticated',otherUser]]) await asRole(db,role,user,async()=>{
        assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,expected);
        assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='portfolio-v3-media'")).rows.length,expected*2);
      });
    };
    await adminCommit(db,()=>addOwnedPhoto(db,series));
    await read(0);
    await adminCommit(db,()=>db.query('UPDATE public.photo_v3_photos SET published=true WHERE id=$1',[seriesPhoto]));
    await read(0);
    await adminCommit(db,()=>publishSeries(db,series));
    await read(1);
    await adminCommit(db,()=>addOwnedPhoto(db,series,second));
    await read(1);
    const liveId=(await db.query('SELECT live_id FROM public.photo_v3_publications WHERE draft_id=$1',[series])).rows[0].live_id;
    assert.equal((await db.query('SELECT * FROM public.photo_v3_collection_photos WHERE collection_id=$1',[liveId])).rows.length,1);
    await adminCommit(db,()=>publishSeries(db,series));
    await read(2);
    // Selected Work cannot preserve visibility after the owner is unpublished.
    await adminCommit(db,async()=>{
      const draft=(await db.query("SELECT * FROM public.photo_v3_collections WHERE slug='selected-work'")).rows[0];
      await db.query('SELECT public.photo_v3_save_and_publish_draft($1,$2,$3,$4)',[draft.id,'selected',[seriesPhoto],draft.updated_at]);
    });
    const destination=await adminCommit(db,()=>newSeries(db,'Destination'));
    await assert.rejects(adminCommit(db,async()=>{
      const photo=(await db.query('SELECT updated_at FROM public.photo_v3_photos WHERE id=$1',[seriesPhoto])).rows[0];
      await db.query('SELECT public.photo_v3_move_photo($1,$2,$3)',[seriesPhoto,destination,photo.updated_at]);
    }),/Publish its removal/);
    await adminCommit(db,async()=>{
      const live=(await db.query('SELECT updated_at FROM public.photo_v3_collections WHERE id=$1',[liveId])).rows[0];
      await db.query('SELECT public.photo_v3_unpublish_draft($1,$2)',[series,live.updated_at]);
    });
    await read(0);
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_collection_photos')).rows.length,0));
    assert.ok((await db.query('SELECT * FROM public.photo_v3_collection_photos WHERE photo_id=$1',[seriesPhoto])).rows.length>1);
    await adminCommit(db,async()=>{
      const photo=(await db.query('SELECT updated_at FROM public.photo_v3_photos WHERE id=$1',[seriesPhoto])).rows[0];
      await db.query('SELECT public.photo_v3_move_photo($1,$2,$3)',[seriesPhoto,destination,photo.updated_at]);
    });
    assert.equal((await db.query('SELECT owner_series_id FROM public.photo_v3_photos WHERE id=$1',[seriesPhoto])).rows[0].owner_series_id,destination);
    await assert.rejects(adminCommit(db,()=>db.query('DELETE FROM public.photo_v3_collections WHERE id=$1',[destination])),/foreign key|Unpublish and move/);
    await adminCommit(db,()=>publishSeries(db,destination));
    await read(1);
    await adminCommit(db,()=>db.query('DELETE FROM public.photo_v3_photos WHERE id=$1',[seriesPhoto]));
    await read(0);
    assert.equal((await db.query('SELECT * FROM public.photo_v3_media_cleanup WHERE photo_id=$1',[seriesPhoto])).rows.length,1);
  } finally {await db.close();}
});

test('database rejects unowned photos, invalid owners, cross-series membership and incomplete publications',async()=>{
  const db=await createSeriesDatabase();
  try {
    await db.exec(ownershipMigration);
    const series=await adminCommit(db,()=>newSeries(db));
    const other=await adminCommit(db,()=>newSeries(db,'Other'));
    await assert.rejects(adminCommit(db,()=>db.query(`INSERT INTO public.photo_v3_photos(slug,title,date_taken,alt_text,object_key) VALUES('unowned','Unowned','2026-11-25','Unowned','invalid')`)),/not-null/);
    const selected=(await db.query("SELECT id FROM public.photo_v3_collections WHERE slug='selected-work'")).rows[0].id;
    await assert.rejects(adminCommit(db,()=>addOwnedPhoto(db,selected)),/editable series/);
    await assert.rejects(adminCommit(db,()=>publishSeries(db,series)),/at least one/);
    await adminCommit(db,()=>addOwnedPhoto(db,series,seriesPhoto,false));
    await assert.rejects(adminCommit(db,()=>publishSeries(db,series)),/both derivatives/);
    await assert.rejects(adminCommit(db,()=>db.query('INSERT INTO public.photo_v3_collection_photos(collection_id,photo_id,position) VALUES($1,$2,0)',[other,seriesPhoto])),/only owned photos/);
    await assert.rejects(adminCommit(db,()=>db.query('SELECT public.photo_v3_save_series_draft($1,$2,$3,$4,$5,$6)',[series,'Test','',[seriesPhoto],'2020-01-01',seriesPhoto])),/changed in another session/);
    for (const [role,user] of [['anon',null],['authenticated',otherUser]]) {
      await assert.rejects(asRole(db,role,user,()=>db.query('SELECT public.photo_v3_move_photo($1,$2,now())',[seriesPhoto,other])),/permission denied|Administrator access required/);
    }
  }finally{await db.close();}
});

test('draft saves preserve the live sequence; direct moves, deletion and failed publish remain atomic',async()=>{
  const db=await createSeriesDatabase();
  try{
    await db.exec(ownershipMigration);
    const series=await adminCommit(db,()=>newSeries(db));
    const destination=await adminCommit(db,()=>newSeries(db,'Destination'));
    const second='00000000-0000-4000-8000-000000000093';
    await adminCommit(db,async()=>{await addOwnedPhoto(db,series);await addOwnedPhoto(db,series,second);await publishSeries(db,series);});
    await assert.rejects(adminCommit(db,()=>db.query('UPDATE public.photo_v3_photos SET owner_series_id=$1 WHERE id=$2',[destination,seriesPhoto])),/Publish its removal/);
    await assert.rejects(adminCommit(db,()=>db.query('SELECT public.photo_v3_delete_series($1,(SELECT updated_at FROM public.photo_v3_collections WHERE id=$1))',[series])),/Unpublish and move/);
    await adminCommit(db,async()=>{
      const draft=(await db.query('SELECT updated_at FROM public.photo_v3_collections WHERE id=$1',[series])).rows[0];
      await db.query('SELECT public.photo_v3_save_series_draft($1,$2,$3,$4,$5,$6)',[series,'Edited title','',[second],draft.updated_at,second]);
    });
    await asRole(db,'anon',null,async()=>{
      assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,2);
      assert.equal((await db.query('SELECT title FROM public.photo_v3_collections')).rows[0].title,'Test series');
    });
    await adminCommit(db,()=>publishSeries(db,series));
    await asRole(db,'anon',null,async()=>assert.deepEqual((await db.query('SELECT id FROM public.photo_v3_photos')).rows.map(r=>r.id),[second]));
    // Removing from the draft never removes ownership.
    assert.equal((await db.query('SELECT owner_series_id FROM public.photo_v3_photos WHERE id=$1',[seriesPhoto])).rows[0].owner_series_id,series);
    await adminCommit(db,()=>db.query('UPDATE public.photo_v3_photos SET owner_series_id=$1 WHERE id=$2',[destination,seriesPhoto]));
    assert.equal((await db.query('SELECT collection_id FROM public.photo_v3_collection_photos WHERE photo_id=$1',[seriesPhoto])).rows[0].collection_id,destination);
    // Failed publication rolls back the snapshot and publication mapping.
    const empty=await adminCommit(db,()=>newSeries(db,'Empty'));
    await assert.rejects(adminCommit(db,()=>publishSeries(db,empty)),/at least one/);
    assert.equal((await db.query('SELECT * FROM public.photo_v3_publications WHERE draft_id=$1',[empty])).rows.length,0);
    await adminCommit(db,()=>db.query('SELECT public.photo_v3_delete_series($1,(SELECT updated_at FROM public.photo_v3_collections WHERE id=$1))',[empty]));
    assert.equal((await db.query('SELECT * FROM public.photo_v3_collections WHERE id=$1',[empty])).rows.length,0);
    await assert.rejects(adminCommit(db,()=>db.query('UPDATE public.photo_v3_collections SET cover_photo_id=$1 WHERE id=$2',[seriesPhoto,series])),/cover must be in the sequence/);
    // Explicit deletion of a live cover hides emptied snapshots, retaining bytes
    // until the existing cleanup worker processes its durable queue.
    await adminCommit(db,()=>db.query('DELETE FROM public.photo_v3_photos WHERE id=$1',[second]));
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,0));
    assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='portfolio-v3-media'")).rows.length,4);
    await adminCommit(db,()=>db.query('SELECT public.photo_v3_delete_series($1,(SELECT updated_at FROM public.photo_v3_collections WHERE id=$1))',[series]));
    assert.equal((await db.query('SELECT * FROM public.photo_v3_publications WHERE draft_id=$1',[series])).rows.length,0);
  }finally{await db.close();}
});

test('ownership migration refuses ambiguous current data without deleting content',async()=>{
  const db=await createSeriesDatabase();
  try{
    const first=await newSeries(db,'First');const second=await newSeries(db,'Second');
    await db.query(`INSERT INTO public.photo_v3_photos(id,slug,title,date_taken,alt_text,object_key)
      VALUES($1,'ambiguous','Ambiguous','2026-11-25','Ambiguous',$2)`,[seriesPhoto,`uploads/${seriesPhoto}/display.webp`]);
    await db.query('INSERT INTO public.photo_v3_collection_photos(collection_id,photo_id,position) VALUES($1,$3,0),($2,$3,0)',[first,second,seriesPhoto]);
    await assert.rejects(db.exec(ownershipMigration),/Ambiguous series ownership/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.photo_v3_collection_photos')).rows.length,2);
    assert.equal((await db.query("SELECT * FROM information_schema.columns WHERE table_name='photo_v3_photos' AND column_name='owner_series_id'")).rows.length,0);
  }finally{await db.close();}
});

const photoSelectionMigration = await readMigration('_allow_series_photo_selection.sql');
test('new series selects private library photos and transfers ownership and sequence atomically',async()=>{
  const db=await createSeriesDatabase();
  try{
    await db.exec(ownershipMigration);
    await db.exec(photoSelectionMigration);
    const source=await adminCommit(db,()=>newSeries(db,'To organize'));
    const second='00000000-0000-4000-8000-000000000094';
    const third='00000000-0000-4000-8000-000000000095';
    const target='00000000-0000-4000-8000-000000000096';
    const rejected='00000000-0000-4000-8000-000000000097';
    await adminCommit(db,async()=>{
      await addOwnedPhoto(db,source);
      await addOwnedPhoto(db,source,second);
      await addOwnedPhoto(db,source,third);
      await db.query('UPDATE public.photo_v3_collections SET cover_photo_id=$1 WHERE id=$2',[seriesPhoto,source]);
    });
    const save=(id,ids,revision=null)=>db.query('SELECT public.photo_v3_save_series_draft($1,$2,$3,$4,$5,$6) AS revision',
      [id,'Flowers','Flowers',ids,revision,ids[0]??null]);
    await adminCommit(db,()=>save(target,[second,seriesPhoto]));
    assert.deepEqual((await db.query('SELECT photo_id FROM public.photo_v3_collection_photos WHERE collection_id=$1 ORDER BY position',[target])).rows.map(r=>r.photo_id),[second,seriesPhoto]);
    assert.deepEqual((await db.query('SELECT photo_id FROM public.photo_v3_collection_photos WHERE collection_id=$1',[source])).rows.map(r=>r.photo_id),[third]);
    assert.equal((await db.query('SELECT cover_photo_id FROM public.photo_v3_collections WHERE id=$1',[source])).rows[0].cover_photo_id,null);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.photo_v3_photos WHERE owner_series_id=$1',[target])).rows[0].n,2);
    await adminCommit(db,()=>publishSeries(db,target));
    // One live photo rejects the entire create/save, including another private transfer.
    await assert.rejects(adminCommit(db,()=>save(rejected,[third,seriesPhoto])),/Publish its removal/);
    assert.equal((await db.query('SELECT owner_series_id FROM public.photo_v3_photos WHERE id=$1',[third])).rows[0].owner_series_id,source);
    assert.equal((await db.query('SELECT * FROM public.photo_v3_collections WHERE id=$1',[rejected])).rows.length,0);
    // Save-and-publish uses the same transfer transaction.
    await adminCommit(db,()=>db.query('SELECT * FROM public.photo_v3_save_and_publish_draft($1,$2,$3,NULL,$4,$5,$6)',
      [rejected,'series',[third],'More flowers','',third]));
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,3));
  }finally{await db.close();}
});

test('existing series adds private library photos without altering its live snapshot or accepting stale saves',async()=>{
  const db=await createSeriesDatabase();
  try{
    await db.exec(ownershipMigration);await db.exec(photoSelectionMigration);
    const target=await adminCommit(db,()=>newSeries(db,'Existing'));
    const source=await adminCommit(db,()=>newSeries(db,'Source'));
    const extra='00000000-0000-4000-8000-000000000094';
    const stale='00000000-0000-4000-8000-000000000095';
    await adminCommit(db,async()=>{
      await addOwnedPhoto(db,target);await publishSeries(db,target);
      await addOwnedPhoto(db,source,extra);await addOwnedPhoto(db,source,stale);
    });
    const revision=(await db.query('SELECT updated_at FROM public.photo_v3_collections WHERE id=$1',[target])).rows[0].updated_at;
    await adminCommit(db,()=>db.query('SELECT public.photo_v3_save_series_draft($1,$2,$3,$4,$5,$6)',
      [target,'Existing','',[seriesPhoto,extra],revision,seriesPhoto]));
    assert.equal((await db.query('SELECT owner_series_id FROM public.photo_v3_photos WHERE id=$1',[extra])).rows[0].owner_series_id,target);
    await asRole(db,'anon',null,async()=>assert.deepEqual((await db.query('SELECT id FROM public.photo_v3_photos')).rows.map(r=>r.id),[seriesPhoto]));
    await assert.rejects(adminCommit(db,()=>db.query('SELECT public.photo_v3_save_series_draft($1,$2,$3,$4,$5,$6)',
      [target,'Existing','',[seriesPhoto,extra,stale],revision,seriesPhoto])),/changed in another session/);
    assert.equal((await db.query('SELECT owner_series_id FROM public.photo_v3_photos WHERE id=$1',[stale])).rows[0].owner_series_id,source);
  }finally{await db.close();}
});

const publicViewsMigration = await readMigration('_series_public_views.sql');
test('public placements separate Series and Archive while Selected Work accepts either and drafts stay private',async()=>{
  const db=await createSeriesDatabase();
  try{
    for(const sql of [ownershipMigration,photoSelectionMigration,publicViewsMigration])await db.exec(sql);
    const series=await adminCommit(db,()=>newSeries(db,'Flowers'));
    const draft=await adminCommit(db,()=>newSeries(db,'Private'));
    const second='00000000-0000-4000-8000-000000000094';
    await adminCommit(db,async()=>{await addOwnedPhoto(db,series);await addOwnedPhoto(db,draft,second);});
    const revision=async id=>(await db.query('SELECT updated_at FROM public.photo_v3_collections WHERE id=$1',[id])).rows[0].updated_at;
    const place=async view=>adminCommit(db,async()=>db.query('SELECT * FROM public.photo_v3_publish_in_view($1,$2,$3)',[series,await revision(series),view]));
    const publicSeries=async view=>asRole(db,'anon',null,()=>db.query("SELECT id FROM public.photo_v3_collections WHERE kind='series' AND public_view=$1",[view]));
    await place('archive');
    assert.equal((await publicSeries('archive')).rows.length,1);
    assert.equal((await publicSeries('series')).rows.length,0);
    await asRole(db,'anon',null,async()=>{
      assert.deepEqual((await db.query('SELECT id FROM public.photo_v3_photos')).rows.map(r=>r.id),[seriesPhoto]);
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,2);
    });
    const selected=(await db.query("SELECT * FROM public.photo_v3_collections WHERE slug='selected-work'")).rows[0];
    await adminCommit(db,()=>db.query('SELECT * FROM public.photo_v3_save_and_publish_draft($1,$2,$3,$4)',[selected.id,'selected',[seriesPhoto],selected.updated_at]));
    await asRole(db,'anon',null,async()=>assert.equal((await db.query("SELECT * FROM public.photo_v3_collection_photos m JOIN public.photo_v3_collections c ON c.id=m.collection_id WHERE c.kind='selected'")).rows.length,1));
    await place('series');
    assert.equal((await publicSeries('archive')).rows.length,0);
    assert.equal((await publicSeries('series')).rows.length,1);
    await place('archive');
    // Archive updates save, transfer private photos and snapshot atomically.
    await adminCommit(db,async()=>db.query('SELECT * FROM public.photo_v3_save_and_publish_in_view($1,$2,$3,$4,$5,$6,$7)',
      [series,[seriesPhoto,second],'Flowers','Updated',seriesPhoto,await revision(series),'archive']));
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,2));
    const before=await revision(series);
    await assert.rejects(adminCommit(db,()=>db.query('SELECT * FROM public.photo_v3_save_and_publish_in_view($1,$2,$3,$4,$5,$6,$7)',
      [series,[seriesPhoto],'Wrong','',seriesPhoto,before,'unknown'])),/Unknown public view/);
    assert.deepEqual(await revision(series),before);
    // Future placements require a catalog entry, without an ownership/RLS change.
    await db.exec("INSERT INTO public.photo_v3_public_views VALUES('projects','Projects')");
    await place('projects');
    assert.equal((await publicSeries('projects')).rows.length,1);
    await asRole(db,'anon',null,async()=>assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,2));
    const live=(await db.query('SELECT c.updated_at FROM public.photo_v3_publications p JOIN public.photo_v3_collections c ON c.id=p.live_id WHERE p.draft_id=$1',[series])).rows[0];
    await adminCommit(db,()=>db.query('SELECT * FROM public.photo_v3_unpublish_draft($1,$2)',[series,live.updated_at]));
    await asRole(db,'anon',null,async()=>{
      assert.equal((await db.query('SELECT * FROM public.photo_v3_photos')).rows.length,0);
      assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0);
      assert.equal((await db.query('SELECT * FROM public.photo_v3_collection_photos')).rows.length,0);
    });
    const selectedRevision=await revision(selected.id);
    await assert.rejects(adminCommit(db,()=>db.query('SELECT * FROM public.photo_v3_save_and_publish_draft($1,$2,$3,$4)',[selected.id,'selected',[seriesPhoto],selectedRevision])),/published series/);
    for(const [role,user] of [['anon',null],['authenticated',otherUser]]){
      await assert.rejects(asRole(db,role,user,()=>db.query('SELECT * FROM public.photo_v3_publish_in_view($1,now(),$2)',[series,'archive'])),/permission denied|Administrator access required/);
      await assert.rejects(asRole(db,role,user,()=>db.exec("INSERT INTO public.photo_v3_public_views VALUES('intruder','Intruder')")),/permission denied/);
    }
  }finally{await db.close();}
});
