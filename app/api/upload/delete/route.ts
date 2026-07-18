import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/utils/r2/client";

export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    const body = await request.json();
    const { objectKey } = body;

    if (!objectKey) {
      return NextResponse.json(
        { error: "Missing objectKey" },
        { status: 400 }
      );
    }

    // Object key from the form doesn't include "camera/" prefix
    const fullObjectKey = `camera/${objectKey}`;

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fullObjectKey,
    });

    await r2Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
