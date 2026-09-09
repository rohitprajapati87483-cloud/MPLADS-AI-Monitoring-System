# MPLADS Explainable Risk Engine v1.0

Implemented in `src/services/riskEngine.ts` and integrated with `RiskAnalysis` and `Alerts`.

## Signals
- Cost overrun when sanctioned cost + expenditure are available.
- Estimate variance when estimated + sanctioned costs are available.
- Estimate overrun when only estimated cost + expenditure are available.
- Peer financial anomaly when only Amount Disbursed is available: compares a work against similar state + work-category records and flags values above the peer 95th percentile.
- Progress mismatch between financial and physical progress; financial progress can be derived from expenditure/sanctioned amount when both exist.
- Delay from expected vs actual completion, overdue expected completion, or an explicit delayed source status.
- Duplicate/similarity signal from the existing duplicate detector.
- Compliance/data-quality signal for missing description, evidence, financial amount, and validation issues.
- Agency anomaly when an agency has at least five records and its delayed-work rate is at least 25 percentage points above the dataset baseline.

## Risk score
Maximum contributions: cost 25 + progress 20 + delay 20 + duplicate 20 + compliance 10 + agency 5 = 100.
- 0–24: Low
- 25–49: Medium
- 50–74: High
- 75–100: Critical

The UI explicitly treats scores as review signals, not proof of fraud.

## Important data limitation
The official MPLADS work extract can contain only `Amount Disbursed` and `Completion Date`. The engine does not invent sanctioned cost, expected dates, physical progress, or agency identity when those fields are absent. In that situation it uses peer benchmarking and evidence/data-quality signals only.

Model label: `MPLADS-XRisk-1.0`.
