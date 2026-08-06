import { Router } from "express";
import { getActiveWelcomeCampaigns } from "../lib/sheets";

const router = Router();

router.get("/welcome", async (_req, res) => {
  const campaigns = await getActiveWelcomeCampaigns();
  res.json({ campaigns });
});

export default router;