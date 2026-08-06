import assert from "node:assert/strict";
import {
  getNextWelcomeCampaign,
  isValidWelcomeCampaignUrl,
  type WelcomeCampaign,
} from "./welcome-campaign";

const baseCampaign: Omit<WelcomeCampaign, "id" | "title"> = {
  imageUrl: null,
  gifUrl: null,
  videoUrl: null,
  description: "",
  buttonText: null,
  url: null,
  durationSeconds: 5,
};

const campaigns: WelcomeCampaign[] = [
  { ...baseCampaign, id: "campaign-a", title: "A" },
  { ...baseCampaign, id: "campaign-b", title: "B" },
  { ...baseCampaign, id: "campaign-c", title: "C" },
];

assert.equal(isValidWelcomeCampaignUrl("https://example.com/learn"), true);
assert.equal(isValidWelcomeCampaignUrl("mailto:hello@example.com"), true);
assert.equal(isValidWelcomeCampaignUrl("tel:+15551234567"), true);
assert.equal(isValidWelcomeCampaignUrl("javascript:alert(1)"), false);
assert.equal(isValidWelcomeCampaignUrl("not-a-url"), false);
assert.equal(getNextWelcomeCampaign(campaigns, null)?.id, "campaign-a");
assert.equal(getNextWelcomeCampaign(campaigns, "campaign-a")?.id, "campaign-b");
assert.equal(getNextWelcomeCampaign(campaigns, "campaign-c")?.id, "campaign-a");
assert.equal(getNextWelcomeCampaign([campaigns[1]], "campaign-b")?.id, "campaign-b");

console.log("welcome-campaign tests passed");