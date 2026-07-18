import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/utils/r2/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/jpg"];

function sanitizeFilename(filename: string): string {
  // Remove extension, sanitize, then add back
  const ext = filename.match(/\.[^.]+$/)?.[0] ?? ".jpg";
  const name = filename.replace(/\.[^.]+$/, "");

  const sanitized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9_\-\s]/g, "") // Keep only alphanumeric, underscore, hyphen, space
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Trim underscores

  return (sanitized || "photo") + ext.toLowerCase();
}

function getTodayDateFolder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateFolder(dateTaken?: string): string {
  // If dateTaken is provided and valid (YYYY-MM-DD), use it
  if (dateTaken && /^\d{4}-\d{2}-\d{2}$/.test(dateTaken)) {
    return dateTaken;
  }
  // Otherwise use today's date
  return getTodayDateFolder();
}

export async function POST(request: NextRequest) {
  try {
    // Auth check - reuse pattern from actions.ts
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error: authError } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (authError || !userId || userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { filename, contentType, fileSize, dateTaken } = body;

    // Validate required fields
    if (!filename || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, fileSize" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { error: "Only JPEG images are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate object key: camera/YYYY-MM-DD/filename.jpg
    const dateFolder = getDateFolder(dateTaken);
    const sanitizedFilename = sanitizeFilename(filename);
    const fullObjectKey = `camera/${dateFolder}/${sanitizedFilename}`;

    // objectKey returned to client is without "camera/" prefix to match form expectations
    const objectKey = `${dateFolder}/${sanitizedFilename}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fullObjectKey,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 300, // 5 minutes
    });

    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    return NextResponse.json({
      presignedUrl,
      objectKey,
      expiresAt,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
