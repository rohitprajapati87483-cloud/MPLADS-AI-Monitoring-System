# MPLADS AI Monitor — Final Build

## Frontend
```powershell
npm install
npm run dev
```

## Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Main functional flows

1. **Data Management** — upload, process, import and revisit saved datasets. Imported datasets are stored in IndexedDB, while history metadata remains in localStorage.
2. **Risk Analysis** — explainable cost, progress, delay, duplicate, compliance and agency signals.
3. **Navbar Alerts** — potential fraud-risk projects appear on the bell and Alerts page.
4. **Automatic Project Risk Reports** — every configured potential fraud-risk project gets a persistent project report containing project details, risk score, factors, reasons, evidence and recommendations.
5. **Reports** — executive report, CSV, JSON, per-project risk reports, preview and print/PDF.
6. **Action Center** — persistent review workflow. If FastAPI is unavailable, create/update actions fall back to browser-local storage so the UI remains usable.
7. **SMTP** — configure only in `backend/.env`, then use the Settings test-email action or Notify buttons.
8. **Settings** — theme, density, font scale, duplicate thresholds, table limits, auto-refresh, backend URL, desktop notifications and SMTP test.

## Important safeguard
Risk detection is an evidence-screening mechanism. A risk alert or generated report is not proof of fraud or misconduct. Human verification is required before enforcement or financial action.
