"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoDetails } from "../types";
import { normalizePhotoDetails, photoDetailsLimits } from "./admin-photos";
import { prepareLocalPhoto } from "./prepare-upload.client";
import { savePhotoBatch } from "./save-draft-batch";

export type UploadReviewItem = {
  id: string;
  filename: string;
  details: PhotoDetails;
  selected: boolean;
  expanded: boolean;
  status: "queued" | "preparing" | "ready" | "error" | "saving" | "saved" | "published" | "failed";
  stored?: boolean;
  published?: boolean;
  slug?: string;
  intent?: "draft" | "publish";
  attempted?: boolean;
  image?: Blob;
  original?: File;
  url?: string;
  error?: string;
};

export function useUploadReview() {
  const [items, setItems] = useState<UploadReviewItem[]>([]);
  const jobs = useRef<{ id: string; file: File }[]>([]);
  const live = useRef(new Set<string>());
  const urls = useRef(new Map<string, string>());
  const busy = useRef(false);
  const upload = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ position: number; total: number; mode: "draft" | "publish" }>({ position: 0, total: 0, mode: "draft" });
  const [saveError, setSaveError] = useState("");
  const [authenticationRequired, setAuthenticationRequired] = useState(false);

  useEffect(() => {
    const currentUrls = urls.current;
    const currentLive = live.current;
    return () => {
      currentLive.clear();
      upload.current?.abort();
      jobs.current = [];
      for (const url of currentUrls.values()) URL.revokeObjectURL(url);
      currentUrls.clear();
    };
  }, []);

  const prepare = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      let job;
      while ((job = jobs.current.shift())) {
        const { id, file } = job;
        if (!live.current.has(id)) continue;
        setItems((current) => current.map((item) => item.id === id ? { ...item, status: "preparing" } : item));
        try {
          const { image, date } = await prepareLocalPhoto(file);
          if (!live.current.has(id)) continue;
          const url = URL.createObjectURL(image);
          urls.current.set(id, url);
          setItems((current) => current.map((item) => item.id === id
            ? { ...item, image, original: file, url, status: "ready", details: { ...item.details, date: item.details.date || date } } : item));
        } catch (cause) {
          if (!live.current.has(id)) continue;
          const error = cause instanceof Error ? cause.message : "Couldn’t prepare this photo. Remove it and choose another file.";
          setItems((current) => current.map((item) => item.id === id ? { ...item, status: "error", error } : item));
        }
      }
    } finally {
      busy.current = false;
    }
  }, []);

  const addFiles = useCallback((files: FileList) => {
    const added: UploadReviewItem[] = Array.from(files, (file) => {
      const id = crypto.randomUUID();
      live.current.add(id);
      jobs.current.push({ id, file });
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, photoDetailsLimits.title);
      return { id, filename: file.name, details: { title, date: "", location: "", caption: "", altText: "" },
        selected: false, expanded: false, status: "queued" };
    });
    setItems((current) => [...current, ...added]);
    void prepare();
  }, [prepare]);

  function remove(id: string) {
    if (upload.current) return;
    live.current.delete(id);
    jobs.current = jobs.current.filter((job) => job.id !== id);
    const url = urls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function save(mode: "draft" | "publish" | "retry" = "draft") {
    if (upload.current) return;
    const candidates = items.filter((item) => mode === "retry" ? item.status === "failed"
      : mode === "publish" ? !item.published && ["ready", "saved", "failed"].includes(item.status)
        : item.status === "ready" || (item.status === "failed" && item.intent !== "publish"));
    if (!candidates.length) return;
    const invalid = candidates.find((item) => !normalizePhotoDetails(item.details).ok);
    if (invalid) {
      setSaveError(`Check “${invalid.filename}”: a title and valid date taken are required. No photos were submitted.`);
      return;
    }
    const controller = new AbortController();
    upload.current = controller;
    setSaving(true);
    setSaveError("");
    setAuthenticationRequired(false);
    setProgress({ position: 0, total: candidates.length, mode: mode === "publish" ? "publish" : "draft" });
    try {
      const result = await savePhotoBatch(candidates.map((item) => ({ id: item.id, image: item.image, original: item.original, stored: item.stored, slug: item.slug,
        published: item.published, mode: mode === "retry" ? item.intent : mode, details: { ...item.details } })), {
        signal: controller.signal,
        onStart: (id, position, intent) => {
          setProgress({ position, total: candidates.length, mode: intent });
          setItems((current) => current.map((item) => item.id === id ? { ...item, intent, attempted: true, selected: false, status: "saving", error: undefined } : item));
        },
        onUploaded: (id, photo) => {
          if (!live.current.has(id)) return;
          setItems((current) => current.map((item) => item.id === id ? { ...item, stored: true, slug: photo.slug, published: photo.published, image: undefined, original: undefined } : item));
        },
        onSaved: (id, photo) => {
          if (!live.current.has(id)) return;
          setItems((current) => current.map((item) => item.id === id
            ? { ...item, stored: true, published: photo.published, slug: photo.slug, status: photo.published ? "published" : "saved", image: undefined, original: undefined } : item));
        },
        onFailed: (id, error) => {
          if (!live.current.has(id)) return;
          setItems((current) => current.map((item) => item.id === id ? { ...item, status: "failed", error } : item));
        },
      });
      if (!controller.signal.aborted) setAuthenticationRequired(result.authenticationRequired);
    } finally {
      if (upload.current === controller) upload.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return { items, setItems, addFiles, remove, save, saving, progress, saveError, authenticationRequired };
}
