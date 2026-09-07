import { findRecordIndexById, patchRecordById } from "./campaign-record";

type CampaignRecord = {
  id: string;
  title: string;
  enabled: boolean;
  imageUrl: string | null;
};

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function throws(action: () => unknown, pattern: RegExp): void {
  try {
    action();
  } catch (error) {
    if (pattern.test(error instanceof Error ? error.message : String(error))) return;
    throw new Error(`Expected error matching ${pattern}`);
  }
  throw new Error("Expected action to throw");
}

const campaignA: CampaignRecord = {
  id: "campaign-a",
  title: "Campaign A",
  enabled: false,
  imageUrl: "/campaigns/media/a",
};
const campaignB: CampaignRecord = {
  id: "campaign-b",
  title: "Campaign B",
  enabled: false,
  imageUrl: "/campaigns/media/b",
};
const records = [campaignA, campaignB];

const approvedA = patchRecordById(records, "campaign-a", { enabled: true }).record;
equal(approvedA.enabled, true, "approving A");
equal(records[1].enabled, false, "approving A must not change B status");
equal(records[1].title, campaignB.title, "approving A must not change B title");
equal(records[1].imageUrl, campaignB.imageUrl, "approving A must not change B media");

const pausedA = patchRecordById(records, "campaign-a", { enabled: false }).record;
equal(pausedA.enabled, false, "pausing A");
equal(records[1].enabled, false, "pausing A must not change B");

const editedA = patchRecordById(records, "campaign-a", { title: "Campaign A edited" }).record;
equal(editedA.title, "Campaign A edited", "editing A");
equal(records[1].title, campaignB.title, "editing A must not change B title");
equal(records[1].imageUrl, campaignB.imageUrl, "editing A must not change B media");

equal(findRecordIndexById(records, " campaign-b "), 1, "IDs should be trimmed at the boundary");
throws(
  () => patchRecordById([{ ...campaignA }, { ...campaignA }], "campaign-a", { enabled: true }),
  /not unique/,
);

console.log("campaign record isolation tests passed");