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
