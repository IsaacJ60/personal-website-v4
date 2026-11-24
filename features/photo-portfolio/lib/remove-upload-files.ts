// Verify removal as well as the API result: an RLS-filtered delete can succeed
// without removing anything. List the UUID folder because exists() reports an
// error for missing objects, including the expected state after deletion.
export async function removeUploadFiles(storage: {
  remove: (paths: string[]) => PromiseLike<{ error: unknown }>;
  list: (folder: string, options: { limit: number }) => PromiseLike<{ data: { name: string }[] | null; error: unknown }>;
}, paths: string[]) {
  try {
    if (!paths.length) return true;
    const folder = paths[0].slice(0, paths[0].lastIndexOf("/"));
    if (paths.some((path) => path.slice(0, path.lastIndexOf("/")) !== folder)) return false;
    const removed = await storage.remove(paths);
    if (removed.error) return false;
    // This namespace permits only display.webp and thumbnail.webp per UUID.
    const remaining = await storage.list(folder, { limit: 100 });
    return !remaining.error && remaining.data !== null
      && remaining.data.every((file) => !paths.includes(`${folder}/${file.name}`));
  } catch {
    return false;
  }
}
