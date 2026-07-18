"use client";

import { useActionState, useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trash2, Pencil, Plus, X } from "lucide-react";
import {
    createBundleAction,
    updateBundleAction,
    deleteBundleAction,
    type BundleActionState,
} from "../actions";

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

type BundleManagerProps = {
    bundles: AdminBundle[];
};

const PRIMARY_CATEGORIES = [
    "Landscapes",
    "People & Portraits",
    "Urban Nature",
    "Wildlife",
    "Motion & Aviation",
    "Abstract & Detail",
] as const;

const INITIAL_STATE: BundleActionState = {
    success: false,
    message: null,
    submissionId: 0,
};

export default function BundleManager({ bundles }: BundleManagerProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBundleId, setEditingBundleId] = useState<string | null>(null);

    return (
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Bundles</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {bundles.length} bundle{bundles.length !== 1 ? "s" : ""}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCreateOpen(!isCreateOpen)}
                    className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                    {isCreateOpen ? (
                        <>
                            <X size={14} />
                            Cancel
                        </>
                    ) : (
                        <>
                            <Plus size={14} />
                            New Bundle
                        </>
                    )}
                </button>
            </div>

            {isCreateOpen && (
                <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                    <CreateBundleForm onSuccess={() => setIsCreateOpen(false)} />
                </div>
            )}

            <div className="mt-4 space-y-2">
                {bundles.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No bundles yet. Create one to group related photos.
                    </p>
                ) : (
                    bundles.map((bundle) => (
                        <BundleRow
                            key={bundle.id}
                            bundle={bundle}
                            isEditing={editingBundleId === bundle.id}
                            onEdit={() => setEditingBundleId(bundle.id)}
                            onCancelEdit={() => setEditingBundleId(null)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function CreateBundleForm({ onSuccess }: { onSuccess: () => void }) {
    const [state, formAction, isPending] = useActionState(
        createBundleAction,
        INITIAL_STATE
    );

    const [category, setCategory] = useState<string>("");

    // Reset form on success
    useEffect(() => {
        if (state.success && state.submissionId > 0) {
            onSuccess();
        }
    }, [state.success, state.submissionId, onSuccess]);

    return (
        <form action={formAction} className="space-y-3">
            <h3 className="text-sm font-medium">Create New Bundle</h3>

            <div>
                <label htmlFor="create-title" className="mb-1 block text-xs font-medium">
                    Title *
                </label>
                <input
                    id="create-title"
                    name="title"
                    type="text"
                    required
                    placeholder="e.g., Stanley Park Sunset Series"
                    className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                />
            </div>

            <div>
                <label htmlFor="create-description" className="mb-1 block text-xs font-medium">
                    Description
                </label>
                <textarea
                    id="create-description"
                    name="description"
                    rows={2}
                    placeholder="Optional description for this bundle"
                    className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                />
            </div>

            <div>
                <label htmlFor="create-categories" className="mb-1 block text-xs font-medium">
                    Collection *
                </label>
                <div className="relative">
                    <select
                        id="create-categories"
                        name="categories"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        className="w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200"
                    >
                        <option value="" disabled>
                            Choose a collection
                        </option>
                        {PRIMARY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="create-date" className="mb-1 block text-xs font-medium">
                        Date Taken
                    </label>
                    <input
                        id="create-date"
                        name="date_taken"
                        type="date"
                        className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                    />
                </div>

                <div>
                    <label htmlFor="create-location" className="mb-1 block text-xs font-medium">
                        Location
                    </label>
                    <input
                        id="create-location"
                        name="location_name"
                        type="text"
                        placeholder="e.g., Stanley Park"
                        className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-200"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    id="create-published"
                    name="published"
                    defaultChecked
                    className="h-4 w-4"
                />
                <label htmlFor="create-published">Published</label>
            </div>

            {state.message && !state.success && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {state.message}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
                {isPending ? "Creating..." : "Create Bundle"}
            </button>
        </form>
    );
}

function BundleRow({
    bundle,
    isEditing,
    onEdit,
    onCancelEdit,
}: {
    bundle: AdminBundle;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isEditing) {
        return (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                <EditBundleForm bundle={bundle} onCancel={onCancelEdit} />
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{bundle.title}</h3>
                        <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                bundle.published
                                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
                            }`}
                        >
                            {bundle.published ? "Published" : "Draft"}
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {bundle.photoCount} photo{bundle.photoCount !== 1 ? "s" : ""}
                        {bundle.date_taken && ` · ${bundle.date_taken}`}
                        {bundle.location_name && ` · ${bundle.location_name}`}
                    </p>

                    {bundle.categories.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {bundle.categories.map((cat) => (
                                <span
                                    key={cat}
                                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="Edit bundle"
                    >
                        <Pencil size={16} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                    {bundle.description && (
                        <p className="text-xs text-muted-foreground">{bundle.description}</p>
                    )}

                    <div className="flex gap-2">
                        <form
                            action={deleteBundleAction}
                            onSubmit={(e) => {
                                const confirmed = window.confirm(
                                    `Delete "${bundle.title}"?\n\nThis will remove the bundle but keep all ${bundle.photoCount} photo${bundle.photoCount !== 1 ? "s" : ""} as standalone items.`
                                );
                                if (!confirmed) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <input type="hidden" name="id" value={bundle.id} />
                            <input type="hidden" name="disperse" value="true" />
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                                <Trash2 size={12} />
                                Delete Bundle
                            </button>
                        </form>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                        Deleting removes the bundle but keeps all photos as standalone items.
                    </p>
                </div>
            )}
        </div>
    );
}

function EditBundleForm({
    bundle,
    onCancel,
}: {
    bundle: AdminBundle;
    onCancel: () => void;
}) {
    const [state, formAction, isPending] = useActionState(
        updateBundleAction,
        INITIAL_STATE
    );

    const [category, setCategory] = useState<string>(bundle.categories[0] ?? "");

    // Close on success
    useEffect(() => {
        if (state.success && state.submissionId > 0) {
            onCancel();
        }
    }, [state.success, state.submissionId, onCancel]);

    return (
        <form action={formAction} className="space-y-3">
            <input type="hidden" name="id" value={bundle.id} />

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Edit Bundle</h3>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                    <X size={16} />
                </button>
            </div>

            <div>
                <label htmlFor={`edit-title-${bundle.id}`} className="mb-1 block text-xs font-medium">
                    Title *
                </label>
                <input
                    id={`edit-title-${bundle.id}`}
                    name="title"
                    type="text"
                    required
                    defaultValue={bundle.title}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-200"
                />
            </div>

            <div>
                <label htmlFor={`edit-description-${bundle.id}`} className="mb-1 block text-xs font-medium">
                    Description
                </label>
                <textarea
                    id={`edit-description-${bundle.id}`}
                    name="description"
                    rows={2}
                    defaultValue={bundle.description ?? ""}
                    className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-200"
                />
            </div>

            <div>
                <label htmlFor={`edit-categories-${bundle.id}`} className="mb-1 block text-xs font-medium">
                    Collection *
                </label>
                <div className="relative">
                    <select
                        id={`edit-categories-${bundle.id}`}
                        name="categories"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        className="w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-200"
                    >
                        <option value="" disabled>
                            Choose a collection
                        </option>
                        {PRIMARY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor={`edit-date-${bundle.id}`} className="mb-1 block text-xs font-medium">
                        Date Taken
                    </label>
                    <input
                        id={`edit-date-${bundle.id}`}
                        name="date_taken"
                        type="date"
                        defaultValue={bundle.date_taken ?? ""}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-200"
                    />
                </div>

                <div>
                    <label htmlFor={`edit-location-${bundle.id}`} className="mb-1 block text-xs font-medium">
                        Location
                    </label>
                    <input
                        id={`edit-location-${bundle.id}`}
                        name="location_name"
                        type="text"
                        defaultValue={bundle.location_name ?? ""}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-200"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    id={`edit-published-${bundle.id}`}
                    name="published"
                    defaultChecked={bundle.published}
                    className="h-4 w-4"
                />
                <label htmlFor={`edit-published-${bundle.id}`}>Published</label>
            </div>

            {state.message && !state.success && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {state.message}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                    {isPending ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
