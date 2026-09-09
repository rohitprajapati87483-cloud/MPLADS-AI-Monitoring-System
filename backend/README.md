# MPLADS AI Monitoring API

FastAPI service used by the frontend for persistent projects, review actions, notifications and optional AI analysis.

## Endpoints
- `GET /api/health`
- `POST /api/ai/analyze`
- `GET /api/projects`
- `POST /api/actions`
- `GET /api/actions`
- `PATCH /api/actions/{action_id}?status=...&notes=...`
- `GET /api/notifications`
- `POST /api/notifications/email`
- `POST /api/notifications/test-email`
- `GET /docs`

SQLite is used by default. The database file is created automatically at first startup.

## SMTP setup

1. Copy/edit `backend/.env`.
2. For Gmail, enable 2-Step Verification and create an App Password.
3. Set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-gmail-address
SMTP_USE_TLS=true
DEFAULT_AUTHORITY_EMAILS=authority@example.gov.in
```

4. Restart FastAPI after changing `.env`.
5. Open **Settings → Backend & SMTP → Send test email**.

SMTP credentials are never stored in the frontend localStorage.
