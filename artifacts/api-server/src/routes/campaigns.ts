import { Router } from "express";
import { serveCampaignMedia } from "../lib/campaign-media";
import {
  getActiveWelcomeCampaigns,
  getAllWelcomeCampaigns,
  recordWelcomeCampaignEvent,
} from "../lib/sheets";

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

router.post("/welcome/:id/events", async (req, res) => {
  const campaignId = String(req.params.id).trim();
  const eventId = typeof req.body?.eventId === "string" ? req.body.eventId.trim() : "";
  const eventType = req.body?.eventType;
  if (!campaignId || !eventId || eventId.length > 200 || (eventType !== "view" && eventType !== "click")) {
    res.status(400).json({ error: "Invalid campaign event" });
    return;
  }

  const campaign = (await getAllWelcomeCampaigns()).find((item) => item.id === campaignId);
  if (!campaign || !campaign.enabled) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (eventType === "click" && (!campaign.buttonText?.trim() || !campaign.url)) {
    res.status(204).end();
    return;
  }

  const recorded = await recordWelcomeCampaignEvent({ eventId, campaignId, eventType });
  res.status(recorded ? 201 : 204).end();
});

export default router;