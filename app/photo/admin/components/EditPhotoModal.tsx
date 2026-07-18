"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronDown, Plus, Minus } from "lucide-react";
import { updatePhotoAction, type UpdatePhotoState } from "../actions";

type BundleOption = {
    id: string;
    title: string;
    categories: string[];
};

type AdminPhoto = {
    id: string;
    slug: string;
    object_key: string;
    title: string;
    date_taken: string | null;
    categories: string[] | null;
    alt_text: string;
    description: string | null;
    location: string | null;
    published: boolean;
    bundleIds: string[];
};

type EditPhotoModalProps = {
    photo: AdminPhoto;
    bundles: BundleOption[];
    onClose: () => void;
};

const PRIMARY_CATEGORIES = [
    "Landscapes",
    "People & Portraits",
    "Urban Nature",
    "Wildlife",
    "Motion & Aviation",
    "Abstract & Detail",
] as const;

const COMMON_LOCATIONS = [
    "Stanley Park, Vancouver",
    "Garry Point Park, Richmond",
    "Terra Nova, Richmond",
    "Iona Beach, Richmond",
    "Downtown Vancouver, BC",
    "English Bay, Vancouver",
    "The Shipyards, North Vancouver",
    "Lighthouse Park, West Vancouver",
    "Larry Berg Flight Path Park, Richmond",
    "YVR Airport, Vancouver",
    "Yaletown, Vancouver",
] as const;

const MEDIA_BASE_URL =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "https://media.isaacjiang.ca";

const INITIAL_STATE: UpdatePhotoState = {
    success: false,
    message: null,
    submissionId: 0,
};

function getPhotoUrl(objectKey: string): string {
    const encodedPath = objectKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    return `${MEDIA_BASE_URL}/camera/${encodedPath}`;
}

function toSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function EditPhotoModal({ photo, bundles, onClose }: EditPhotoModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction, isPending] = useActionState(
        updatePhotoAction,
        INITIAL_STATE
    );

    const [title, setTitle] = useState(photo.title);
    const [slug, setSlug] = useState(photo.slug);
    const [dateTaken, setDateTaken] = useState(photo.date_taken ?? "");
    const [altText, setAltText] = useState(photo.alt_text);
    const [description, setDescription] = useState(photo.description ?? "");
    const [primaryCategory, setPrimaryCategory] = useState(
        photo.categories?.[0] ?? ""
    );
    const [location, setLocation] = useState(photo.location ?? "");
    const [published, setPublished] = useState(photo.published);

    // Bundle management - local state only, synced on save
    const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>(photo.bundleIds);

    const previewUrl = getPhotoUrl(photo.object_key);

    // Create bundle map for display names
    const bundleMap = new Map(bundles.map((b) => [b.id, b.title]));

    // Filter available bundles: match category and not already selected
    const photoCategories = photo.categories ?? [];
    const availableBundles = bundles.filter(
        (b) =>
            !selectedBundleIds.includes(b.id) &&
            b.categories.some((cat) => photoCategories.includes(cat))
    );

    // Check if all required fields are filled
    const isFormValid =
        title.trim() !== "" &&
        slug.trim() !== "" &&
        dateTaken !== "" &&
        altText.trim() !== "" &&
        primaryCategory !== "";

    // Check for unsaved changes
    const hasChanges =
        title !== photo.title ||
        slug !== photo.slug ||
        dateTaken !== (photo.date_taken ?? "") ||
        altText !== photo.alt_text ||
        description !== (photo.description ?? "") ||
        primaryCategory !== (photo.categories?.[0] ?? "") ||
        location !== (photo.location ?? "") ||
        published !== photo.published ||
        JSON.stringify(selectedBundleIds.sort()) !== JSON.stringify([...photo.bundleIds].sort());

    // Close on successful save
    useEffect(() => {
        if (state.success) {
            onClose();
        }
    }, [state.success, state.submissionId, onClose]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    function handleTitleChange(value: string) {
        const previousAutoSlug = toSlug(title);
        setTitle(value);

        if (slug === previousAutoSlug) {
            setSlug(toSlug(value));
        }
    }

    function handleAddBundle(bundleId: string) {
        setSelectedBundleIds((prev) => [...prev, bundleId]);
    }

    function handleRemoveBundle(bundleId: string) {
        setSelectedBundleIds((prev) => prev.filter((id) => id !== bundleId));
    }

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-5">
                    <h2 className="text-lg font-semibold">
                        Edit photo
                        {hasChanges && (
                            <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                                • Unsaved changes
                            </span>
                        )}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {photo.object_key}
                    </p>
                </div>

                <form ref={formRef} action={formAction}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="bundle_ids" value={selectedBundleIds.join(",")} />

                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* Column 1 */}
                        <div className="space-y-4">
                            {/* Photo preview */}
                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <Image
                                    src={previewUrl}
                                    alt={photo.alt_text}
                                    fill
                                    quality={80}
                                    className="object-cover"
                                />
                            </div>

                            <Field
                                label="Title"
                                name="title"
                                value={title}
                                onChange={handleTitleChange}
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    label="Slug"
                                    name="slug"
                                    value={slug}
                                    onChange={setSlug}
                                    required
                                />
                                <Field
                                    label="Date taken"
                                    name="date_taken"
                                    type="date"
                                    value={dateTaken}
                                    onChange={setDateTaken}
                                    required
                                />
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-4">
                            <SelectField
                                label="Collection"
                                name="categories"
                                value={primaryCategory}
                                onChange={setPrimaryCategory}
                                options={PRIMARY_CATEGORIES}
                                placeholder="Choose..."
                                required
                            />

                            {/* Bundle management */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Bundles
                                </label>

                                {/* Current bundles */}
                                {selectedBundleIds.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {selectedBundleIds.map((bundleId) => (
                                            <span
                                                key={bundleId}
                                                className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                            >
                                                {bundleMap.get(bundleId) ?? bundleId}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBundle(bundleId)}
                                                    className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Add to bundle */}
                                {availableBundles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableBundles.map((bundle) => (
                                            <button
                                                key={bundle.id}
                                                type="button"
                                                onClick={() => handleAddBundle(bundle.id)}
                                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-muted-foreground hover:border-neutral-400 hover:text-foreground dark:border-neutral-700 dark:hover:border-neutral-600"
                                            >
                                                <Plus className="h-3 w-3" />
                                                {bundle.title}
                                            </button>
                                        ))}
                                    </div>
                                ) : selectedBundleIds.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No matching bundles available for this collection.
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-location"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Location
                                </label>
                                <input
                                    id="edit-location"
                                    name="location"
                                    list="edit-common-photo-locations"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Select or type a location"
                                    className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                                />
                                <datalist id="edit-common-photo-locations">
                                    {COMMON_LOCATIONS.map((place) => (
                                        <option key={place} value={place} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="flex flex-1 flex-col">
                                <label
                                    htmlFor="edit-description"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="edit-description"
                                    name="description"
                                    placeholder="Optional caption shown on the photo page."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[72px] flex-1 resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                                />
                            </div>

                            <Field
                                label="Alt text"
                                name="alt_text"
                                value={altText}
                                onChange={setAltText}
                                placeholder="Describe what is visibly shown"
                                required
                            />
                        </div>
                    </div>

                    {/* Actions row */}
                    <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="published"
                                checked={published}
                                onChange={(e) => setPublished(e.target.checked)}
                                className="h-4 w-4"
                            />
                            Published
                        </label>

                        <div className="flex items-center gap-3">
                            {state.message && !state.success && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {state.message}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={!isFormValid || !hasChanges || isPending}
                                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                            >
                                {isPending ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({
    label,
    name,
    type = "text",
    placeholder,
    required = false,
    value,
    onChange,
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    value?: string;
    onChange?: (value: string) => void;
}) {
    return (
        <div>
            <label htmlFor={`edit-${name}`} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>
            <input
                id={`edit-${name}`}
                name={name}
                type={type}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />
        </div>
    );
}

function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
    placeholder = "Select an option",
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    required?: boolean;
    placeholder?: string;
}) {
    return (
        <div>
            <label htmlFor={`edit-${name}`} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>
            <div className="relative">
                <select
                    id={`edit-${name}`}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    className="w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200 dark:[color-scheme:dark]"
                >
                    <option
                        value=""
                        disabled
                        className="bg-white text-neutral-400 dark:bg-neutral-950 dark:text-neutral-600"
                    >
                        {placeholder}
                    </option>
                    {options.map((option) => (
                        <option
                            key={option}
                            value={option}
                            className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
                        >
                            {option}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
                />
            </div>
        </div>
    );
}
