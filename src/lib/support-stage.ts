export type SupportStage = 1 | 2 | 3;

export interface SupportStageInfo {
  stage: SupportStage;
  label: string;
}

const STAGE_LABELS: [string, string, string] = ["Received", "Being worked on", "Done"];

/**
 * Maps a status string to the 3-step progress a customer sees: Received ->
 * [department] is working on it -> Done. Mirrors lib/support-stage.ts in
 * the CRM repo exactly — kept in sync manually since these are separate
 * codebases. Used both for this app's own local SupportRequest.status (the
 * fallback when the CRM bridge isn't reachable) and to interpret the
 * status string pulled live from the CRM when it is.
 */
export function getSupportStage(status: string, departmentOrBusinessUnitName?: string | null): SupportStageInfo {
  if (status === "COMPLETED" || status === "CLOSED" || status === "RESOLVED") {
    return { stage: 3, label: STAGE_LABELS[2] };
  }
  if (status === "IN_PROGRESS") {
    return { stage: 2, label: departmentOrBusinessUnitName ? `${departmentOrBusinessUnitName} is working on it` : "We're working on it" };
  }
  return { stage: 1, label: STAGE_LABELS[0] };
}

export const SUPPORT_STAGE_STEPS = STAGE_LABELS;
