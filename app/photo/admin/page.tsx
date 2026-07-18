import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logoutAction } from "./login/actions";
import AdminPhotoList from "./components/AdminPhotoList";
import AddPhotoForm from "./components/AddPhotoForm";
import BundleManager from "./components/BundleManager";

export const dynamic = "force-dynamic";

const MEDIA_BASE_URL =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "https://media.isaacjiang.ca";

function getPhotoUrl(objectKey: string) {
    const encodedPath = objectKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    return `${MEDIA_BASE_URL}/camera/${encodedPath}`;
}

type BundleOption = {
    id: string;
    title: string;
    categories: string[];
};

type AdminBundle = {
    id: string;
    title: string;
    description: string | null;
    categories: string[];
    date_taken: string | null;
    location_name: string | null;
    published: boolean;
    photoCount: number;
};

export default async function AdminPhotosPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (
        claimsError ||
        !userId ||
        userId !== process.env.ADMIN_USER_ID
    ) {
        redirect("/photo/admin/login");
    }

    const [photosResult, bundlesResult, bundlePhotosResult] = await Promise.all([
        supabase
            .from("photos")
            .select(`
                id,
                slug,
                object_key,
                title,
                date_taken,
                categories,
                alt_text,
                description,
                location,
                published,
                portfolio_order
            `)
            .order("created_at", { ascending: false }),
        supabase
            .from("bundles")
            .select("id, title, description, categories, date_taken, location_name, published")
            .order("title", { ascending: true }),
        supabase
            .from("bundle_photos")
            .select("bundle_id, photo_slug, position")
            .order("position", { ascending: true }),
    ]);

    if (photosResult.error) {
        throw new Error(`Could not load admin photos: ${photosResult.error.message}`);
    }

    if (bundlesResult.error) {
        throw new Error(`Could not load bundles: ${bundlesResult.error.message}`);
    }

    if (bundlePhotosResult.error) {
        throw new Error(`Could not load bundle photos: ${bundlePhotosResult.error.message}`);
    }

    const photos = photosResult.data ?? [];
    const bundlesRaw = bundlesResult.data ?? [];
    const bundlePhotos = bundlePhotosResult.data ?? [];

    // Build bundle options for dropdowns (id + title + categories)
    const bundleOptions: BundleOption[] = bundlesRaw.map((b) => ({
        id: b.id,
        title: b.title,
        categories: b.categories ?? [],
    }));

    // Count photos per bundle
    const bundlePhotoCount = new Map<string, number>();
    for (const bp of bundlePhotos) {
        bundlePhotoCount.set(bp.bundle_id, (bundlePhotoCount.get(bp.bundle_id) ?? 0) + 1);
    }

    // Build full bundle data for BundleManager
    const adminBundles: AdminBundle[] = bundlesRaw.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        categories: b.categories ?? [],
        date_taken: b.date_taken,
        location_name: b.location_name,
        published: b.published,
        photoCount: bundlePhotoCount.get(b.id) ?? 0,
    }));

    // Build a map of photo slug -> bundle ids
    const photoBundleMap = new Map<string, string[]>();
    for (const bp of bundlePhotos) {
        const existing = photoBundleMap.get(bp.photo_slug) ?? [];
        existing.push(bp.bundle_id);
        photoBundleMap.set(bp.photo_slug, existing);
    }

    // Attach bundle info to each photo
    const photosWithBundles = photos.map((photo) => ({
        ...photo,
        bundleIds: photoBundleMap.get(photo.slug) ?? [],
    }));

    return (
        <main className="mx-auto max-w-7xl px-4 py-6">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        IJ.PRIME Admin
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                        Content Manager
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload the JPEG to R2 first, then add its metadata here.
                    </p>
                </div>

                <form action={logoutAction}>
                    <button
                        type="submit"
                        className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                        Sign out
                    </button>
                </form>
            </header>

            {/* Add Photo Form - full width at top */}
            <section className="mb-6">
                <AddPhotoForm bundles={bundleOptions} />
            </section>

            {/* Photo List - contained scrollable area */}
            <section className="mb-6 h-[900px]">
                <AdminPhotoList photos={photosWithBundles} bundles={bundleOptions} />
            </section>

            {/* Bundle Manager */}
            <section className="pb-6">
                <BundleManager bundles={adminBundles} />
            </section>
        </main>
    );
}