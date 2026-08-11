import crypto from "node:crypto";
import { Readable } from "node:stream";
import type { Request, Response } from "express";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const MEDIA_PATH_PREFIX = "/campaigns/media/";

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR?.trim();
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  return dir.replace(/\/+$/, "");
}

function parseObjectPath(value: string): { bucketName: string; objectName: string } {
  const parts = value.replace(/^\/+/, "").split("/");
  if (parts.length < 2 || !parts[0] || !parts.slice(1).join("/")) {
    throw new Error("Invalid object storage path");
  }
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

async function signObjectUrl(
  method: "GET" | "PUT",
  objectName: string,
  ttlSeconds = 3600,
): Promise<string> {
  const { bucketName, objectName: parsedObjectName } = parseObjectPath(objectName);
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: parsedObjectName,
      method,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to sign object storage URL (${response.status})`);
  }
  const body = await response.json() as { signed_url?: string };
  if (!body.signed_url) throw new Error("Object storage did not return a signed URL");
  return body.signed_url;
}

function parseDataUrl(value: string): { contentType: string; bytes: Buffer } | null {
  const match = value.match(/^data:([^;,]+);base64,([\s\S]+)$/i);
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  if (!/^(image\/|video\/)/.test(contentType)) {
    throw new Error("Campaign media must be an image, GIF, or video");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) {
    throw new Error("Campaign media is too large");
  }
  return { contentType, bytes };
}

export async function storeCampaignMedia(value: string | null | undefined): Promise<string | null | undefined> {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? "";
  if (!trimmed || !trimmed.startsWith("data:")) return trimmed || null;

  const parsed = parseDataUrl(trimmed);
  if (!parsed) throw new Error("Invalid campaign media file");

  const objectId = crypto.randomUUID();
  const objectPath = `${getPrivateObjectDir()}/campaign-media/${objectId}`;
  const uploadUrl = await signObjectUrl("PUT", objectPath, 900);
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": parsed.contentType },
    body: parsed.bytes,
    signal: AbortSignal.timeout(120_000),
  });
  if (!upload.ok) throw new Error(`Campaign media upload failed (${upload.status})`);
  return `${MEDIA_PATH_PREFIX}${objectId}`;
}

export async function serveCampaignMedia(id: string, req: Request, res: Response): Promise<void> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  const objectPath = `${getPrivateObjectDir()}/campaign-media/${id}`;
  const signedUrl = await signObjectUrl("GET", objectPath);
  const range = req.header("range");
  const upstream = await fetch(signedUrl, {
    headers: range ? { Range: range } : undefined,
    signal: AbortSignal.timeout(120_000),
  });

  res.status(upstream.status);
  for (const header of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"]) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body as ReadableStream<Uint8Array>).pipe(res);
}