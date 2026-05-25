import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logoutAction } from "./login/actions";
import AdminPhotoList from "./components/AdminPhotoList";
import AddPhotoForm from "./components/AddPhotoForm";

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

    const { data: photos, error } = await supabase
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
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Could not load admin photos: ${error.message}`);
    }

    return (
        <main className="mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden px-4 py-6">
            <header className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
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

            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                <section className="min-h-0 overflow-y-auto overscroll-contain pr-2">
                        <AddPhotoForm />
                </section>

                <AdminPhotoList photos={photos ?? []} />
            </div>
        </main>
    );
}

function Field({
    label,
    name,
    type = "text",
    placeholder,
    required = false,
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />
        </div>
    );
}

function TextArea({
    label,
    name,
}: {
    label: string;
    name: string;
}) {
    return (
        <div>
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            <textarea
                id={name}
                name={name}
                rows={3}
                className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />
        </div>
    );
}

function Checkbox({
    label,
    name,
}: {
    label: string;
    name: string;
}) {
    return (
        <label className="flex items-center gap-2">
            <input type="checkbox" name={name} />
            {label}
        </label>
    );
}