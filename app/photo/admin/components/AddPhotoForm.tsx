"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
    createPhotoAction,
    type CreatePhotoState,
} from "../actions";
import { ChevronDown } from "lucide-react";
import FileUploader from "./FileUploader";

type BundleOption = {
    id: string;
    title: string;
    categories: string[];
};

type AddPhotoFormProps = {
    bundles: BundleOption[];
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

const INITIAL_STATE: CreatePhotoState = {
    success: false,
    message: null,
    submissionId: 0,
};

function normalizeObjectKey(value: string): string {
    return value
        .trim()
        .replace(/^https?:\/\/media\.isaacjiang\.ca\//, "")
        .replace(/^\/+/, "")
        .replace(/^camera\//, "");
}

function getPhotoUrl(objectKey: string): string {
    const encodedPath = objectKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    return `${MEDIA_BASE_URL}/camera/${encodedPath}`;
}

function getFileNameWithoutExtension(objectKey: string): string {
    const fileName = objectKey.split("/").pop() ?? "";

    return fileName
        .replace(/\.[^/.]+$/, "")  // Remove extension
        .replace(/_/g, " ");        // Replace underscores with spaces
}

function toSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getDateFromObjectKey(objectKey: string): string {
    const match = objectKey.match(/(?:^|\/)(\d{4}-\d{2}-\d{2})(?:\/|$)/);

    return match?.[1] ?? "";
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
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            <div className="relative">
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
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

function BundleSelectField({
    label,
    name,
    value,
    onChange,
    bundles,
    helperText,
    disabled = false,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    bundles: BundleOption[];
    helperText?: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            <div className="relative">
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled || bundles.length === 0}
                    className="w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200 dark:[color-scheme:dark]"
                >
                    <option
                        value=""
                        className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
                    >
                        None (standalone photo)
                    </option>
                    {bundles.map((bundle) => (
                        <option
                            key={bundle.id}
                            value={bundle.id}
                            className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
                        >
                            {bundle.title}
                        </option>
                    ))}
                </select>

                <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
                />
            </div>

            {helperText && (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {helperText}
                </p>
            )}
        </div>
    );
}

export default function AddPhotoForm({ bundles }: AddPhotoFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const [state, formAction, isPending] = useActionState(
        createPhotoAction,
        INITIAL_STATE
    );

    const [objectKey, setObjectKey] = useState("");
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [dateTaken, setDateTaken] = useState("");
    const [altText, setAltText] = useState("");
    const [description, setDescription] = useState("");
    const [primaryCategory, setPrimaryCategory] =
        useState<(typeof PRIMARY_CATEGORIES)[number] | "">("");
    const [location, setLocation] = useState("");
    const [bundleId, setBundleId] = useState("");
    const [manualPathEntry, setManualPathEntry] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const previewUrl = objectKey ? getPhotoUrl(objectKey) : null;

    // Check if all required fields are filled
    const isFormValid =
        objectKey.trim() !== "" &&
        title.trim() !== "" &&
        slug.trim() !== "" &&
        dateTaken !== "" &&
        altText.trim() !== "" &&
        primaryCategory !== "";

    // Filter bundles to only show those matching the selected category
    const matchingBundles = primaryCategory
        ? bundles.filter((b) => b.categories.includes(primaryCategory))
        : [];

    // Clear bundle selection when category changes
    function handleCategoryChange(value: string) {
        setPrimaryCategory(value as (typeof PRIMARY_CATEGORIES)[number]);
        setBundleId(""); // Reset bundle when category changes
    }

    useEffect(() => {
        if (!state.success) {
            return;
        }

        formRef.current?.reset();

        setObjectKey("");
        setTitle("");
        setSlug("");
        setDateTaken("");
        setAltText("");
        setDescription("");
        setPrimaryCategory("");
        setLocation("");
        setBundleId("");
        setManualPathEntry(false);
        setUploadComplete(false);
    }, [state.success, state.submissionId]);

    function handleUploadComplete(uploadedObjectKey: string, filename: string, exifDate?: string) {
        // Set date from EXIF if available (before handleObjectKeyChange which might derive from path)
        if (exifDate) {
            setDateTaken(exifDate);
        }
        handleObjectKeyChange(uploadedObjectKey, exifDate);
        setUploadComplete(true);
    }

    function handleChangeFile() {
        setObjectKey("");
        setUploadComplete(false);
        setManualPathEntry(false);
    }

    async function handleRemoveUpload() {
        if (!objectKey || isRemoving) return;

        setIsRemoving(true);
        try {
            const response = await fetch("/api/upload/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ objectKey }),
            });

            if (!response.ok) {
                const data = await response.json();
                console.error("Failed to delete:", data.error);
            }
        } catch (error) {
            console.error("Delete request failed:", error);
        }

        // Reset form state regardless of delete success
        setObjectKey("");
        setTitle("");
        setSlug("");
        setDateTaken("");
        setAltText("");
        setDescription("");
        setUploadComplete(false);
        setIsRemoving(false);
    }

    function handleObjectKeyChange(rawValue: string, exifDate?: string) {
        const normalizedKey = normalizeObjectKey(rawValue);
        const derivedTitle = getFileNameWithoutExtension(normalizedKey);
        const derivedDate = getDateFromObjectKey(normalizedKey);

        setObjectKey(normalizedKey);

        if (!title || title === getFileNameWithoutExtension(objectKey)) {
            setTitle(derivedTitle);
            setSlug(toSlug(derivedTitle));
            setAltText(derivedTitle);
            setDescription(derivedTitle);
        }

        // Only set date from path if no EXIF date and no existing date
        if (!exifDate && !dateTaken && derivedDate) {
            setDateTaken(derivedDate);
        }
    }

    function handleTitleChange(value: string) {
        const previousAutoSlug = toSlug(title);
        const previousAutoAlt = title;
        const previousAutoDesc = title;

        setTitle(value);

        if (!slug || slug === previousAutoSlug) {
            setSlug(toSlug(value));
        }

        if (!altText || altText === previousAutoAlt) {
            setAltText(value);
        }

        if (!description || description === previousAutoDesc) {
            setDescription(value);
        }
    }

    return (
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Add photo</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Upload a JPEG image directly, or enter the R2 path manually.
                </p>
            </div>

            <form ref={formRef} action={formAction}>
                {/* Hidden input for object_key */}
                <input type="hidden" name="object_key" value={objectKey} />

                {/* Two column layout for fields */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Column 1 */}
                    <div className="space-y-4">
                        {/* Upload / Path section */}
                        {!uploadComplete && !manualPathEntry && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Photo
                                </label>
                                <FileUploader
                                    onUploadComplete={handleUploadComplete}
                                    dateTaken={dateTaken}
                                />
                                <button
                                    type="button"
                                    onClick={() => setManualPathEntry(true)}
                                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Or enter R2 path manually
                                </button>
                            </div>
                        )}

                        {manualPathEntry && !uploadComplete && (
                            <div>
                                <label htmlFor="object_key_manual" className="mb-1.5 block text-sm font-medium">
                                    Path inside /camera folder
                                </label>
                                <input
                                    id="object_key_manual"
                                    type="text"
                                    value={objectKey}
                                    onChange={(e) => handleObjectKeyChange(e.target.value)}
                                    placeholder="2026-05-10/Air Canada Departure.jpg"
                                    required
                                    className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManualPathEntry(false);
                                        setObjectKey("");
                                    }}
                                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    ← Back to upload
                                </button>
                            </div>
                        )}

                        {uploadComplete && previewUrl && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Photo
                                </label>
                                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                                        <Image
                                            src={previewUrl}
                                            alt="Uploaded photo preview"
                                            fill
                                            quality={70}
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                                            Uploaded successfully
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {objectKey}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={handleChangeFile}
                                            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveUpload}
                                            disabled={isRemoving}
                                            className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
                                        >
                                            {isRemoving ? "Removing..." : "Remove"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Field
                            label="Title"
                            name="title"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Air Canada Departure"
                            required
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="Slug"
                                name="slug"
                                value={slug}
                                onChange={setSlug}
                                placeholder="air-canada-departure"
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
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Collection"
                                name="categories"
                                value={primaryCategory}
                                onChange={handleCategoryChange}
                                options={PRIMARY_CATEGORIES}
                                placeholder="Choose..."
                                required
                            />

                            <BundleSelectField
                                label="Bundle"
                                name="bundle_id"
                                value={bundleId}
                                onChange={setBundleId}
                                bundles={matchingBundles}
                                disabled={!primaryCategory}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="location"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Location
                            </label>
                            <input
                                id="location"
                                name="location"
                                list="common-photo-locations"
                                value={location}
                                onChange={(event) => setLocation(event.target.value)}
                                placeholder="Select or type a location"
                                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                            />
                            <datalist id="common-photo-locations">
                                {COMMON_LOCATIONS.map((place) => (
                                    <option key={place} value={place} />
                                ))}
                            </datalist>
                        </div>

                        <div className="flex flex-1 flex-col">
                            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
                                Description
                            </label>
                            <textarea
                                id="description"
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
                <div className="mt-6 flex items-center justify-end gap-4">
                    {state.message && (
                        <p
                            role="status"
                            className={`mr-auto rounded-md px-3 py-2 text-sm ${state.success
                                ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                }`}
                        >
                            {state.message}
                        </p>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="published"
                            defaultChecked
                            className="h-4 w-4"
                        />
                        Published
                    </label>

                    <button
                        type="submit"
                        disabled={!isFormValid || isPending}
                        className="rounded-md bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                    >
                        {isPending ? "Adding..." : "Add photo"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({
    label,
    name,
    type = "text",
    placeholder,
    helperText,
    required = false,
    value,
    onChange,
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
    value?: string;
    onChange?: (value: string) => void;
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
                value={value}
                onChange={
                    onChange
                        ? (event) => onChange(event.target.value)
                        : undefined
                }
                placeholder={placeholder}
                required={required}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />

            {helperText && (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {helperText}
                </p>
            )}
        </div>
    );
}

function TextArea({
    label,
    name,
    placeholder,
    value,
    onChange,
}: {
    label: string;
    name: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
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
                placeholder={placeholder}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
            />
        </div>
    );
}

function Checkbox({
    label,
    name,
    defaultChecked = false,
}: {
    label: string;
    name: string;
    defaultChecked?: boolean;
}) {
    return (
        <label className="flex items-center gap-2">
            <input
                type="checkbox"
                name={name}
                defaultChecked={defaultChecked}
                className="h-4 w-4"
            />
            {label}
        </label>
    );
}