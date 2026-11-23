"use client";

import { useEffect, useState, type RefObject } from "react";

function hasFiles(event: DragEvent) {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

export function usePhotoDrop(
  section: RefObject<HTMLElement | null>,
  enabled: boolean,
  onFiles: (files: FileList) => void,
) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const area = section.current?.closest("main");
    if (!area) return;
    let depth = 0;

    function reset() {
      depth = 0;
      setDragging(false);
    }

    function enter(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      if (enabled) setDragging(true);
    }

    function over(event: DragEvent) {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = enabled ? "copy" : "none";
      if (enabled) setDragging(true);
    }

    function leave(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    }

    function drop(event: DragEvent) {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      reset();
      if (enabled) onFiles(event.dataTransfer.files);
    }

    // Outside the upload area, ignore the file and stop the browser opening it.
    function outside(event: DragEvent) {
      if (!hasFiles(event) || (event.target instanceof Node && area?.contains(event.target))) return;
      event.preventDefault();
      if (event.type === "dragover" && event.dataTransfer) event.dataTransfer.dropEffect = "none";
      reset();
    }

    area.addEventListener("dragenter", enter);
    area.addEventListener("dragover", over);
    area.addEventListener("dragleave", leave);
    area.addEventListener("drop", drop);
    window.addEventListener("dragover", outside);
    window.addEventListener("drop", outside);
    window.addEventListener("dragend", reset);
    return () => {
      area.removeEventListener("dragenter", enter);
      area.removeEventListener("dragover", over);
      area.removeEventListener("dragleave", leave);
      area.removeEventListener("drop", drop);
      window.removeEventListener("dragover", outside);
      window.removeEventListener("drop", outside);
      window.removeEventListener("dragend", reset);
    };
  }, [section, enabled, onFiles]);

  return enabled && dragging;
}
