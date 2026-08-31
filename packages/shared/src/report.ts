export const REPORT_CATEGORIES = [
  "blocked_drain",
  "flooding",
  "waste_plastic",
  "rising_water",
  "damaged_drainage",
  "other",
] as const;

export const REPORT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const REPORT_STATUSES = ["received", "under_review", "verified", "assigned", "in_progress", "resolved", "rejected", "duplicate"] as const;
export const PILOT_AREAS = ["UNILAG", "Akoka", "Bariga", "Iwaya"] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportCreateInput {
  category: ReportCategory;
  severity: ReportSeverity;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  location_accuracy?: number;
  evidence_paths?: string[];
}

export interface ReportSummary {
  id: string;
  reference: string;
  status: ReportStatus;
  category: ReportCategory;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  area: string;
  created_at: string;
}

export const isAuthorityRole = (role: string | null | undefined) => ["authority", "admin", "super_admin"].includes(role ?? "");
