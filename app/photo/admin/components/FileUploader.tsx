"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type UploadStatus = "idle" | "validating" | "presigning" | "uploading" | "success" | "error";

type FileUploaderProps = {
  onUploadComplete: (objectKey: string, filename: string) => void;
  onUploadError?: (error: string) => void;
  dateTaken?: string;
  accept?: string;
  maxSizeMB?: number;
};

export default function FileUploader({
  onUploadComplete,
  onUploadError,
  dateTaken,
  accept = "image/jpeg,image/jpg",
  maxSizeMB = 20,
}: FileUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setFilename(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const handleError = useCallback(
    (message: string) => {
      setStatus("error");
      setError(message);
      onUploadError?.(message);
    },
    [onUploadError]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setFilename(file.name);
      setError(null);

      // Client-side validation
      setStatus("validating");

      if (!file.type.match(/^image\/jpe?g$/i)) {
        handleError("Only JPEG images are allowed");
        return;
      }

      if (file.size > maxSizeBytes) {
        handleError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }

      // Get presigned URL
      setStatus("presigning");

      try {
        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            dateTaken,
          }),
        });

        if (!presignResponse.ok) {
          const data = await presignResponse.json();
          if (presignResponse.status === 401) {
            handleError("Session expired. Please refresh the page and log in again.");
          } else {
            handleError(data.error || "Failed to get upload URL");
          }
          return;
        }

        const { presignedUrl, objectKey } = await presignResponse.json();

        // Upload to R2 using XHR for progress tracking
        setStatus("uploading");
        setProgress(0);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgress(percent);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload aborted"));
          });

          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setStatus("success");
        setProgress(100);
        onUploadComplete(objectKey, file.name);
      } catch (err) {
        handleError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [maxSizeBytes, maxSizeMB, dateTaken, handleError, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleClick = useCallback(() => {
    if (status === "idle" || status === "error") {
      inputRef.current?.click();
    }
  }, [status]);

  const isUploading = status === "validating" || status === "presigning" || status === "uploading";

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : status === "error"
              ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
              : status === "success"
                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        {status === "idle" && (
          <>
            <Upload className="mb-2 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Drop a JPEG here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Maximum file size: {maxSizeMB}MB
            </p>
          </>
        )}

        {isUploading && (
          <>
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {status === "validating" && "Validating..."}
              {status === "presigning" && "Preparing upload..."}
              {status === "uploading" && `Uploading... ${progress}%`}
            </p>
            {status === "uploading" && (
              <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {filename && (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {filename}
              </p>
            )}
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Upload complete!
            </p>
            {filename && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {filename}
              </p>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click to try again
            </p>
          </>
        )}
      </div>

      {(status === "success" || status === "error") && (
        <button
          type="button"
          onClick={resetState}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          {status === "success" ? "Upload a different file" : "Clear"}
        </button>
      )}
    </div>
  );
}
