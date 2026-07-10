const QUERY_LABELS: Record<string, string> = {
  application_strength: "Reviewed application strength",
  chat_context: "Read your application context",
  unified_plan: "Reviewed your application plan",
  documents_list: "Checked your documents",
  document_get: "Read your document",
  essays_list: "Checked your essays",
  university_search: "Searched universities",
  uni_facts: "Checked university details",
};

const WRITE_LABELS: Record<string, string> = {
  set_answer: "Saved your answer",
  set_profile_field: "Saved your profile detail",
  answer_eligibility: "Saved your eligibility answer",
  save_university: "Saved a university",
  trigger_research: "Started university research",
  document_create: "Drafted a document",
  document_save: "Saved a draft",
};

const ACTION_LABELS: Record<string, string> = {
  navigate: "Opened the right page",
  attach_document: "Prepared a document",
  upload_document: "Prepared an upload",
  start_apply: "Prepared an application",
  answer_field: "Prepared an answer",
  answer_eligibility: "Prepared an eligibility answer",
  start_agent_job: "Prepared a task",
};

export function friendlyStepLabel(label: string): string {
  const clean = label.trim();
  const checked = clean.match(/^Checked\s+(.+)$/i)?.[1]?.trim();
  if (checked) return QUERY_LABELS[checked] ?? "Checked your saved information";

  const updated = clean.match(/^Updated\s+(.+)$/i)?.[1]?.trim();
  if (updated) return WRITE_LABELS[updated] ?? "Saved an update";

  const proposed = clean.match(/^Proposed\s+(.+)$/i)?.[1]?.trim();
  if (proposed) {
    if (proposed === "a job") return "Prepared a task";
    return ACTION_LABELS[proposed] ?? "Prepared an action";
  }

  if (/^Searched the web$/i.test(clean)) return "Checked current web results";
  return clean.replace(/_/g, " ");
}

export function friendlyStepLabels(labels: string[], limit = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const friendly = friendlyStepLabel(label);
    if (!friendly || seen.has(friendly)) continue;
    seen.add(friendly);
    out.push(friendly);
    if (out.length >= limit) break;
  }
  return out;
}
