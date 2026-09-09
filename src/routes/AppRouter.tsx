import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { ProjectInvestigation } from '@/pages/ProjectInvestigation';
import { RiskAnalysis } from '@/pages/RiskAnalysis';
import { Alerts } from '@/pages/Alerts';
import { ActionCenter } from '@/pages/ActionCenter';
import { FinancialAnalytics } from '@/pages/FinancialAnalytics';
import { ProgressAnalytics } from '@/pages/ProgressAnalytics';
import { DuplicateDetection } from '@/pages/DuplicateDetection';
import { AgencyPerformance } from '@/pages/AgencyPerformance';
import { GeographicAnalysis } from '@/pages/GeographicAnalysis';
import { MPConstituency } from '@/pages/MPConstituency';
import { Reports } from '@/pages/Reports';
import { DataManagement } from '@/pages/DataManagement';
import { Settings } from '@/pages/Settings';

export function AppRouter() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* All authenticated pages inside DashboardLayout */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard"            element={<Dashboard />} />
        <Route path="/projects"             element={<Projects />} />
        <Route path="/projects/:projectId"     element={<ProjectInvestigation />} />
        <Route path="/risk-analysis"        element={<RiskAnalysis />} />
        <Route path="/alerts"               element={<Alerts />} />
        <Route path="/action-center"        element={<ActionCenter />} />
        <Route path="/financial-analytics"  element={<FinancialAnalytics />} />
        <Route path="/progress-analytics"   element={<ProgressAnalytics />} />
        <Route path="/duplicate-detection"  element={<DuplicateDetection />} />
        <Route path="/agency-performance"   element={<AgencyPerformance />} />
        <Route path="/geographic-analysis"  element={<GeographicAnalysis />} />
        <Route path="/mp-constituency"      element={<MPConstituency />} />
        <Route path="/reports"              element={<Reports />} />
        <Route path="/data-management"      element={<DataManagement />} />
        <Route path="/settings"             element={<Settings />} />
      </Route>

      {/* Catch-all — redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
