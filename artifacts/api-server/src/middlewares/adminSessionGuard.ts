import crypto from "node:crypto";
import type { RequestHandler } from "express";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.ADMIN_TOKEN;
  if (!value) throw new Error("ADMIN_TOKEN is required for Admin Panel access");
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createAdminSession(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expiresAt}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function isValidAdminToken(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return safeEqual(value, expected);
}

export function isValidAdminSession(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const [, expiryText] = payload.split(":");
    const expiry = Number(expiryText);
    return payload.startsWith("admin:")
      && Number.isFinite(expiry)
      && expiry > Date.now()
      && safeEqual(signature, sign(payload));
  } catch {
    return false;
  }
}

export function requireAdminSession(): RequestHandler {
  return (req, res, next) => {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!isValidAdminSession(token)) {
      res.status(401).json({ error: "Admin authentication required" });
      return;
    }
    next();
  };
}