import type { AstraCampaign, CampaignEvent } from "./havnApi";

const PHASE_LABELS: Record<AstraCampaign["phase"], string> = {
  contested: "Front contested",
  awaiting_forge: "Awaiting creator forge",
  awaiting_victories: "Awaiting pilot victories",
  secured: "Sector secured",
};

export function campaignPhaseLabel(phase: AstraCampaign["phase"]): string {
  return PHASE_LABELS[phase];
}

export function campaignEventLabel(event: CampaignEvent): string {
  if (event.kind === "combat") {
    return `${event.actor} logged a Grade ${event.grade || "?"} sortie`;
  }
  return `${event.actor} sealed a ${event.artifact_type || "creator"} artifact`;
}

export function campaignTimeRemaining(endsAt: number, now = Date.now() / 1000): string {
  const seconds = Math.max(0, Math.floor(endsAt - now));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
