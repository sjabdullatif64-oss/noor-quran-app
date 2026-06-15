import type { Request, Response, NextFunction } from "express";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_TOKEN) {
    res.status(503).json({ error: "Admin not configured (ADMIN_TOKEN not set)" });
    return;
  }
  const token = req.headers["x-admin-token"] ?? req.query.adminToken;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
