import type { ReportCreateInput, ReportSummary } from "../../../packages/shared/src/report";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function listReports(): Promise<ReportSummary[]> {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is required for live report data.");
  const response = await fetch(`${API_BASE_URL}/api/v1/reports`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load reports");
  const payload = await response.json() as { items: ReportSummary[] };
  return payload.items;
}

export async function createReport(input: ReportCreateInput) {
  if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is required to submit a report.");
  const response = await fetch(`${API_BASE_URL}/api/v1/reports`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Unable to submit report");
  return response.json() as Promise<{ reference: string; status: string }>;
}
