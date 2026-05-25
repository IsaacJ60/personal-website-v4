"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CreatePhotoState = {
  success: boolean;
  message: string | null;
  submissionId: number;
};

async function requireAdmin() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || !userId || userId !== process.env.ADMIN_USER_ID) {
        redirect("/photo/admin/login");
    }

    return supabase;
}

function parseCategories(value: FormDataEntryValue | null): string[] {
    return String(value ?? "")
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean);
}

function optionalText(value: FormDataEntryValue | null): string | null {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : null;
}

function refreshPhotoPages(slug?: string) {
  revalidatePath("/photo");
  revalidatePath("/photo/gallery");
  revalidatePath("/photo/gallery/[slug]", "page");
  revalidatePath("/photo/admin");

  if (slug) {
    revalidatePath(`/photo/photos/${slug}`);
  }
}

function normalizeObjectKey(value: FormDataEntryValue | null): string {
    return String(value ?? "")
        .trim()
        .replace(/^https?:\/\/media\.isaacjiang\.ca\//, "")
        .replace(/^\/+/, "")
        .replace(/^camera\//, "");
}

async function getNextPortfolioOrder(
  supabase: Awaited<ReturnType<typeof requireAdmin>>
): Promise<number> {
  const { data, error } = await supabase
    .from("photos")
    .select("portfolio_order")
    .order("portfolio_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not determine photo order: ${error.message}`);
  }

  return (data?.portfolio_order ?? 0) + 1;
}

export async function createPhotoAction(
  _previousState: CreatePhotoState,
  formData: FormData
): Promise<CreatePhotoState> {
  const supabase = await requireAdmin();

  const slug = String(formData.get("slug") ?? "").trim();
  const objectKey = normalizeObjectKey(formData.get("object_key"));
  const title = String(formData.get("title") ?? "").trim();
  const dateTaken = String(formData.get("date_taken") ?? "").trim();
  const altText = String(formData.get("alt_text") ?? "").trim();
  const categories = parseCategories(formData.get("categories"));

  if (
    !slug ||
    !objectKey ||
    !title ||
    !dateTaken ||
    !altText ||
    categories.length === 0
  ) {
    return {
      success: false,
      message: "Please complete all required photo fields.",
      submissionId: Date.now(),
    };
  }

  const portfolioOrder = await getNextPortfolioOrder(supabase);

  const { error } = await supabase.from("photos").insert({
    slug,
    object_key: objectKey,
    title,
    date_taken: dateTaken,
    categories,
    alt_text: altText,
    description: optionalText(formData.get("description")),
    location: optionalText(formData.get("location")),
    published: formData.get("published") === "on",
    portfolio_order: portfolioOrder,
  });

  if (error) {
    return {
      success: false,
      message: `Could not add photo: ${error.message}`,
      submissionId: Date.now(),
    };
  }

  refreshPhotoPages(slug);

  return {
    success: true,
    message: "Photo added successfully.",
    submissionId: Date.now(),
  };
}

export async function togglePublishedPhotoAction(formData: FormData) {
    const supabase = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const currentlyPublished = formData.get("published") === "true";

    const { error } = await supabase
        .from("photos")
        .update({ published: !currentlyPublished })
        .eq("id", id);

    if (error) {
        throw new Error(`Could not update photo: ${error.message}`);
    }

    refreshPhotoPages();
}

export async function deletePhotoAction(formData: FormData) {
    const supabase = await requireAdmin();

    const id = String(formData.get("id") ?? "");

    const { error } = await supabase
        .from("photos")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(`Could not delete photo: ${error.message}`);
    }

    refreshPhotoPages();
}