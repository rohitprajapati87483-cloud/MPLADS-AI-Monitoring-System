// ─── Risk Levels ─────────────────────────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ─── Project Status ───────────────────────────────────────────────────────────
export type ProjectStatus =
  | 'completed'
  | 'in-progress'
  | 'delayed'
  | 'pending'
  | 'sanctioned';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export interface KPICardData {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
  colorClass?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string; // Lucide icon name
  badge?: number;
}

// ─── Filter Options ───────────────────────────────────────────────────────────
export interface FilterOptions {
  state: string;
  district: string;
  mpConstituency: string;
  financialYear: string;
  agency: string;
  projectStatus: string;
  riskLevel: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  district: string;
  agency: string;
  sanctionedAmount: number;
  expenditure: number;
  progress: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: ProjectStatus;
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  type: string;
  severity: RiskLevel;
  message: string;
  projectId?: string;
  createdAt: string;
}

// ─── Anomaly Card ─────────────────────────────────────────────────────────────
export interface AnomalyCard {
  id: string;
  label: string;
  count: string;
  description: string;
}

// ─── Table Column ─────────────────────────────────────────────────────────────
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}
