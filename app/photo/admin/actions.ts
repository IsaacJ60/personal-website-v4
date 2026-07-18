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

export type UpdatePhotoState = {
  success: boolean;
  message: string | null;
  submissionId: number;
};

export type BundleActionState = {
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
  revalidatePath("/photo/bundles/[id]", "page");
  revalidatePath("/photo/photos/[id]", "page");

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

async function getNextBundlePosition(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  bundleId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("bundle_photos")
    .select("position")
    .eq("bundle_id", bundleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not determine bundle position: ${error.message}`);
  }

  return (data?.position ?? 0) + 1;
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
  const bundleId = optionalText(formData.get("bundle_id"));

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

  // If a bundle was selected, add the photo to that bundle
  if (bundleId) {
    const position = await getNextBundlePosition(supabase, bundleId);

    const { error: bundleError } = await supabase
      .from("bundle_photos")
      .insert({
        bundle_id: bundleId,
        photo_slug: slug,
        position,
      });

    if (bundleError) {
      // Photo was created, but bundle assignment failed
      return {
        success: true,
        message: `Photo added, but could not add to bundle: ${bundleError.message}`,
        submissionId: Date.now(),
      };
    }
  }

  refreshPhotoPages(slug);

  return {
    success: true,
    message: bundleId
      ? "Photo added and assigned to bundle successfully."
      : "Photo added successfully.",
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

    // Get the portfolio_order of the photo being deleted
    const { data: deletedPhoto, error: fetchError } = await supabase
        .from("photos")
        .select("portfolio_order")
        .eq("id", id)
        .single();

    if (fetchError) {
        throw new Error(`Could not fetch photo: ${fetchError.message}`);
    }

    // Delete the photo
    const { error: deleteError } = await supabase
        .from("photos")
        .delete()
        .eq("id", id);

    if (deleteError) {
        throw new Error(`Could not delete photo: ${deleteError.message}`);
    }

    // Update portfolio_order for all photos that came after the deleted one
    if (deletedPhoto.portfolio_order !== null) {
        const { error: updateError } = await supabase.rpc(
            "decrement_portfolio_order_after",
            {
                deleted_order: deletedPhoto.portfolio_order,
            }
        );

        if (updateError) {
            throw new Error(
                `Could not update portfolio order: ${updateError.message}`
            );
        }
    }

    refreshPhotoPages();
}

export async function updatePhotoAction(
    _previousState: UpdatePhotoState,
    formData: FormData
): Promise<UpdatePhotoState> {
    const supabase = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const dateTaken = String(formData.get("date_taken") ?? "").trim();
    const altText = String(formData.get("alt_text") ?? "").trim();
    const categories = parseCategories(formData.get("categories"));

    // Bundle IDs as comma-separated string
    const newBundleIds = String(formData.get("bundle_ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    if (!id || !slug || !title || !dateTaken || !altText || categories.length === 0) {
        return {
            success: false,
            message: "Please complete all required photo fields.",
            submissionId: Date.now(),
        };
    }

    // Update photo metadata
    const { error } = await supabase
        .from("photos")
        .update({
            slug,
            title,
            date_taken: dateTaken,
            categories,
            alt_text: altText,
            description: optionalText(formData.get("description")),
            location: optionalText(formData.get("location")),
            published: formData.get("published") === "on",
        })
        .eq("id", id);

    if (error) {
        return {
            success: false,
            message: `Could not update photo: ${error.message}`,
            submissionId: Date.now(),
        };
    }

    // Sync bundle memberships
    // Get current bundle memberships
    const { data: currentMemberships, error: fetchError } = await supabase
        .from("bundle_photos")
        .select("bundle_id")
        .eq("photo_slug", slug);

    if (fetchError) {
        return {
            success: true,
            message: "Photo updated, but could not sync bundles.",
            submissionId: Date.now(),
        };
    }

    const currentBundleIds = (currentMemberships ?? []).map((m) => m.bundle_id);

    // Bundles to add
    const toAdd = newBundleIds.filter((id) => !currentBundleIds.includes(id));
    // Bundles to remove
    const toRemove = currentBundleIds.filter((id) => !newBundleIds.includes(id));

    // Add new memberships
    for (const bundleId of toAdd) {
        const position = await getNextBundlePosition(supabase, bundleId);
        await supabase.from("bundle_photos").insert({
            bundle_id: bundleId,
            photo_slug: slug,
            position,
        });
    }

    // Remove old memberships
    for (const bundleId of toRemove) {
        await supabase
            .from("bundle_photos")
            .delete()
            .eq("bundle_id", bundleId)
            .eq("photo_slug", slug);
    }

    refreshPhotoPages(slug);

    return {
        success: true,
        message: "Photo updated successfully.",
        submissionId: Date.now(),
    };
}

export async function addPhotoToBundleAction(formData: FormData) {
    const supabase = await requireAdmin();

    const photoSlug = String(formData.get("photo_slug") ?? "").trim();
    const bundleId = String(formData.get("bundle_id") ?? "").trim();

    if (!photoSlug || !bundleId) {
        throw new Error("Photo slug and bundle ID are required.");
    }

    const position = await getNextBundlePosition(supabase, bundleId);

    const { error } = await supabase.from("bundle_photos").insert({
        bundle_id: bundleId,
        photo_slug: photoSlug,
        position,
    });

    if (error) {
        throw new Error(`Could not add photo to bundle: ${error.message}`);
    }

    refreshPhotoPages();
}

export async function removePhotoFromBundleAction(formData: FormData) {
    const supabase = await requireAdmin();

    const photoSlug = String(formData.get("photo_slug") ?? "").trim();
    const bundleId = String(formData.get("bundle_id") ?? "").trim();

    if (!photoSlug || !bundleId) {
        throw new Error("Photo slug and bundle ID are required.");
    }

    const { error } = await supabase
        .from("bundle_photos")
        .delete()
        .eq("bundle_id", bundleId)
        .eq("photo_slug", photoSlug);

    if (error) {
        throw new Error(`Could not remove photo from bundle: ${error.message}`);
    }

    refreshPhotoPages();
}

// ============================================================================
// Bundle CRUD Actions
// ============================================================================

function generateBundleId(title: string): string {
    const slug = title
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const suffix = Math.random().toString(36).substring(2, 8);

    return `${slug}-${suffix}`;
}

export async function createBundleAction(
    _previousState: BundleActionState,
    formData: FormData
): Promise<BundleActionState> {
    const supabase = await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const description = optionalText(formData.get("description"));
    const categories = parseCategories(formData.get("categories"));
    const dateTaken = optionalText(formData.get("date_taken"));
    const locationName = optionalText(formData.get("location_name"));
    const published = formData.get("published") === "on";

    if (!title || categories.length === 0) {
        return {
            success: false,
            message: "Title and collection are required.",
            submissionId: Date.now(),
        };
    }

    const id = generateBundleId(title);

    const { error } = await supabase.from("bundles").insert({
        id,
        title,
        description,
        categories,
        date_taken: dateTaken,
        location_name: locationName,
        published,
    });

    if (error) {
        return {
            success: false,
            message: `Could not create bundle: ${error.message}`,
            submissionId: Date.now(),
        };
    }

    refreshPhotoPages();

    return {
        success: true,
        message: "Bundle created successfully.",
        submissionId: Date.now(),
    };
}

export async function updateBundleAction(
    _previousState: BundleActionState,
    formData: FormData
): Promise<BundleActionState> {
    const supabase = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = optionalText(formData.get("description"));
    const categories = parseCategories(formData.get("categories"));
    const dateTaken = optionalText(formData.get("date_taken"));
    const locationName = optionalText(formData.get("location_name"));
    const published = formData.get("published") === "on";

    if (!id || !title || categories.length === 0) {
        return {
            success: false,
            message: "ID, title, and collection are required.",
            submissionId: Date.now(),
        };
    }

    const { error } = await supabase
        .from("bundles")
        .update({
            title,
            description,
            categories,
            date_taken: dateTaken,
            location_name: locationName,
            published,
        })
        .eq("id", id);

    if (error) {
        return {
            success: false,
            message: `Could not update bundle: ${error.message}`,
            submissionId: Date.now(),
        };
    }

    refreshPhotoPages();

    return {
        success: true,
        message: "Bundle updated successfully.",
        submissionId: Date.now(),
    };
}

export async function deleteBundleAction(formData: FormData) {
    const supabase = await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
        throw new Error("Bundle ID is required.");
    }

    // First, delete all bundle_photos associations (dispersing photos back to standalone)
    const { error: photoError } = await supabase
        .from("bundle_photos")
        .delete()
        .eq("bundle_id", id);

    if (photoError) {
        throw new Error(`Could not remove photos from bundle: ${photoError.message}`);
    }

    // Then delete the bundle itself
    const { error: bundleError } = await supabase
        .from("bundles")
        .delete()
        .eq("id", id);

    if (bundleError) {
        throw new Error(`Could not delete bundle: ${bundleError.message}`);
    }

    refreshPhotoPages();
}