import { Router } from "express";
import { serveCampaignMedia } from "../lib/campaign-media";
import { getActiveWelcomeCampaigns } from "../lib/sheets";

const router = Router();

router.get("/media/:id", async (req, res) => {
  try {
    await serveCampaignMedia(String(req.params.id), req, res);
  } catch {
    res.status(404).json({ error: "Media not found" });
  }
});

router.get("/welcome", async (_req, res) => {
  const campaigns = await getActiveWelcomeCampaigns();
  res.json({ campaigns });
});

export default router;