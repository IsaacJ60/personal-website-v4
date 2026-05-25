"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
    createPhotoAction,
    type CreatePhotoState,
} from "../actions";
import { ChevronDown } from "lucide-react";

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

    return fileName.replace(/\.[^/.]+$/, "");
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
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    required?: boolean;
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

export default function AddPhotoForm() {
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
    const [primaryCategory, setPrimaryCategory] =
        useState<(typeof PRIMARY_CATEGORIES)[number]>("Landscapes");
    const [location, setLocation] = useState("");

    const previewUrl = objectKey ? getPhotoUrl(objectKey) : null;

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
        setPrimaryCategory("Landscapes");
        setLocation("");
    }, [state.success, state.submissionId]);

    function handleObjectKeyChange(rawValue: string) {
        const normalizedKey = normalizeObjectKey(rawValue);
        const derivedTitle = getFileNameWithoutExtension(normalizedKey);
        const derivedDate = getDateFromObjectKey(normalizedKey);

        setObjectKey(normalizedKey);

        if (!title || title === getFileNameWithoutExtension(objectKey)) {
            setTitle(derivedTitle);
            setSlug(toSlug(derivedTitle));
            setAltText(derivedTitle);
        }

        if (!dateTaken && derivedDate) {
            setDateTaken(derivedDate);
        }
    }

    function handleTitleChange(value: string) {
        const previousAutoSlug = toSlug(title);
        const previousAutoAlt = title;

        setTitle(value);

        if (!slug || slug === previousAutoSlug) {
            setSlug(toSlug(value));
        }

        if (!altText || altText === previousAutoAlt) {
            setAltText(value);
        }
    }

    return (
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Add photo</h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Upload the file into the R2{" "}
                <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">
                    camera/
                </code>{" "}
                folder first. Then enter only the path after{" "}
                <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">
                    camera/
                </code>
                .
            </p>

            <form ref={formRef} action={formAction} className="mt-6 space-y-4">
                <Field
                    label="Path inside /camera folder"
                    name="object_key"
                    value={objectKey}
                    onChange={handleObjectKeyChange}
                    placeholder="2026-05-10/Air Canada Departure.jpg"
                    required
                />

                {previewUrl && (
                    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                            <Image
                                src={previewUrl}
                                alt="R2 photo preview"
                                fill
                                quality={70}
                                sizes="80px"
                                className="object-cover"
                            />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-medium">R2 preview</p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                                {objectKey}
                            </p>
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

                <Field
                    label="Slug"
                    name="slug"
                    value={slug}
                    onChange={setSlug}
                    placeholder="air-canada-departure"
                    helperText="Used in the photo page URL. Auto-generated from the title, but editable."
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

                <SelectField
                    label="Collection"
                    name="categories"
                    value={primaryCategory}
                    onChange={(value) =>
                        setPrimaryCategory(
                            value as (typeof PRIMARY_CATEGORIES)[number]
                        )
                    }
                    options={PRIMARY_CATEGORIES}
                    required
                />

                <Field
                    label="Alt text"
                    name="alt_text"
                    value={altText}
                    onChange={setAltText}
                    placeholder="Air Canada aircraft departing above a field"
                    helperText="Describe what is visibly shown for accessibility."
                    required
                />

                <TextArea
                    label="Description"
                    name="description"
                    placeholder="Optional caption shown on the photo page."
                />

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

                <div className="flex gap-5 text-sm">
                    <Checkbox label="Published" name="published" defaultChecked />
                </div>

                {state.message && (
                    <p
                        role="status"
                        className={`rounded-md px-3 py-2 text-sm ${state.success
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                    >
                        {state.message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                    {isPending ? "Adding photo..." : "Add photo"}
                </button>
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
}: {
    label: string;
    name: string;
    placeholder?: string;
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