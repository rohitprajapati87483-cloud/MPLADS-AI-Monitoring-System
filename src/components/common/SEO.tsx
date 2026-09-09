import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'MPLADS AI monitoring dashboard for project, financial and risk intelligence.' },
  '/projects': { title: 'Projects', description: 'Search and review MPLADS development works, progress, expenditure and risk signals.' },
  '/risk-analysis': { title: 'Risk Analysis', description: 'Analyze MPLADS project risk signals, anomalies and monitoring priorities.' },
  '/alerts': { title: 'Alerts', description: 'Review explainable MPLADS alerts for financial, progress and compliance risk signals.' },
  '/financial-analytics': { title: 'Financial Analytics', description: 'Analyze MPLADS sanctions, expenditure, utilization and financial anomalies.' },
  '/progress-analytics': { title: 'Predictive Analytics', description: 'Explore explainable early-warning predictions for MPLADS delay, cost and completion risk.' },
  '/duplicate-detection': { title: 'Duplicate Detection', description: 'Screen MPLADS works for potentially duplicate or overlapping project records.' },
  '/agency-performance': { title: 'Agency Performance', description: 'Compare implementing agency performance, utilization, progress and delay indicators.' },
  '/geographic-analysis': { title: 'Geographic Analysis', description: 'Explore MPLADS risk and implementation patterns across states and constituencies.' },
  '/mp-constituency': { title: 'MP / Constituency', description: 'Analyze MPLADS allocation, sanctions, expenditure and utilization by constituency.' },
  '/reports': { title: 'Reports', description: 'Generate monitoring-oriented MPLADS reports and decision-support summaries.' },
  '/data-management': { title: 'Data Management', description: 'Upload, validate, profile and prepare MPLADS datasets for analysis.' },
  '/settings': { title: 'Settings', description: 'Configure MPLADS AI Monitor application preferences.' },
};

export function SEO() {
  const { pathname } = useLocation();
  const base = 'MPLADS AI Monitor';
  const meta = pageMeta[pathname] ?? { title: 'MPLADS AI Monitor', description: 'AI-powered monitoring and decision-support platform for MPLADS implementation.' };

  useEffect(() => {
    document.title = `${meta.title} | ${base}`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute('content', meta.description);
  }, [meta]);

  return null;
}
