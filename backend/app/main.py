from __future__ import annotations

import json
import os
import smtplib
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from pathlib import Path
from typing import Any
from urllib import request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load backend/.env automatically so SMTP settings work when starting uvicorn.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("DATABASE_URL", "sqlite:///./mplads.db").replace("sqlite:///", ""))
if not DB_PATH.is_absolute():
    DB_PATH = BASE / DB_PATH

app = FastAPI(title="MPLADS AI Monitoring API", version="1.0.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            project_name TEXT NOT NULL,
            state TEXT,
            constituency TEXT,
            mp_name TEXT,
            agency TEXT,
            risk_score REAL NOT NULL,
            risk_level TEXT NOT NULL,
            ai_confidence REAL,
            anomalies TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            risk_score REAL NOT NULL,
            risk_level TEXT NOT NULL,
            recommended_action TEXT NOT NULL,
            authority TEXT NOT NULL,
            priority TEXT NOT NULL,
            deadline TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            notified_at TEXT,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            action_id TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            channel TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            sent_at TEXT,
            error TEXT
        );
        """)


@app.on_event("startup")
def startup() -> None:
    init_db()


class ProjectIn(BaseModel):
    projectId: str
    projectName: str
    state: str = ""
    constituency: str = ""
    mpName: str = ""
    agency: str = ""
    riskScore: float = 0
    riskLevel: str = "low"
    factors: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    financial: dict[str, Any] = Field(default_factory=dict)
    progress: dict[str, Any] = Field(default_factory=dict)
    raw: dict[str, Any] = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    projects: list[ProjectIn]


class ActionRequest(BaseModel):
    project: ProjectIn
    authority: str | None = None
    action: str | None = None
    priority: str | None = None
    deadlineDays: int = 7


class NotifyRequest(BaseModel):
    actionId: str
    recipients: list[str] | None = None
    subject: str | None = None
    message: str | None = None

class TestEmailRequest(BaseModel):
    recipient: str


def ai_analyze(p: ProjectIn) -> dict[str, Any]:
    triggered = [f for f in p.factors if float(f.get("score", 0) or 0) > 0]
    evidence = [str(f.get("reason")) for f in triggered if f.get("reason")]
    score = max(0, min(100, float(p.riskScore)))
    confidence = min(0.99, 0.62 + 0.08 * len(triggered) + (0.12 if score >= 75 else 0.06 if score >= 50 else 0))
    if not evidence:
        evidence = ["No material anomaly signal was supplied by the current risk engine."]
    if p.riskLevel in {"critical", "high"}:
        action = p.recommendations[0] if p.recommendations else "Review project records and supporting evidence before further action."
    else:
        action = p.recommendations[0] if p.recommendations else "Continue monitoring and verify supporting documentation during the next review cycle."
    if any(str(f.get("id")) == "duplicate" and float(f.get("score", 0) or 0) > 0 for f in triggered):
        authority = "District Authority"
    elif any(str(f.get("id")) in {"delay", "progress"} and float(f.get("score", 0) or 0) > 0 for f in triggered):
        authority = "District Authority / Implementing Agency"
    elif any(str(f.get("id")) in {"cost", "compliance"} and float(f.get("score", 0) or 0) > 0 for f in triggered):
        authority = "District Authority"
    else:
        authority = "Monitoring Authority"
    priority = "URGENT" if score >= 75 else "HIGH" if score >= 50 else "MEDIUM" if score >= 25 else "LOW"
    return {
        "riskScore": round(score, 1),
        "confidence": round(confidence * 100, 1),
        "riskLevel": p.riskLevel,
        "anomalies": evidence,
        "recommendedAction": action,
        "authority": authority,
        "priority": priority,
        "humanReviewRequired": True,
        "summary": f"The project has a {p.riskLevel} monitoring risk profile based on {len(triggered)} triggered signal(s). The result requires human verification and is not a finding of fraud or misconduct.",
    }


def llm_optional(prompt: str) -> str | None:
    url = os.getenv("AI_API_URL", "").strip()
    key = os.getenv("AI_API_KEY", "").strip()
    model = os.getenv("AI_MODEL", "").strip()
    if not url or not key or not model:
        return None
    body = json.dumps({"model": model, "messages": [{"role": "system", "content": "You are an evidence-constrained public-sector monitoring analyst. Never declare fraud. Return concise review guidance based only on supplied facts."}, {"role": "user", "content": prompt}], "temperature": 0.1}).encode()
    req = request.Request(url, data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"}, method="POST")
    try:
        with request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
        return data.get("choices", [{}])[0].get("message", {}).get("content")
    except Exception:
        return None


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "database": str(DB_PATH), "emailConfigured": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USERNAME") and os.getenv("SMTP_PASSWORD")), "aiProviderConfigured": bool(os.getenv("AI_API_URL") and os.getenv("AI_API_KEY") and os.getenv("AI_MODEL"))}


@app.post("/api/ai/analyze")
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    results = []
    for p in req.projects:
        result = ai_analyze(p)
        result["projectId"] = p.projectId
        result["projectName"] = p.projectName
        results.append(result)
        with db() as con:
            con.execute("INSERT OR REPLACE INTO projects VALUES (?,?,?,?,?,?,?,?,?,?,?)", (p.projectId, p.projectName, p.state, p.constituency, p.mpName, p.agency, p.riskScore, p.riskLevel, result["confidence"], json.dumps(result["anomalies"]), json.dumps(p.model_dump()), now()))
    return {"count": len(results), "results": results}


@app.post("/api/actions")
def create_action(req: ActionRequest) -> dict[str, Any]:
    ai = ai_analyze(req.project)
    action_id = str(uuid.uuid4())
    authority = req.authority or ai["authority"]
    action = req.action or ai["recommendedAction"]
    priority = req.priority or ai["priority"]
    deadline = (datetime.now(timezone.utc) + timedelta(days=max(1, req.deadlineDays))).isoformat()
    with db() as con:
        con.execute("INSERT INTO actions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (action_id, req.project.projectId, ai["riskScore"], ai["riskLevel"], action, authority, priority, deadline, "DETECTED", now(), None, None))
    return {"actionId": action_id, **ai, "authority": authority, "recommendedAction": action, "priority": priority, "deadline": deadline, "status": "DETECTED"}


@app.get("/api/actions")
def actions() -> dict[str, Any]:
    with db() as con:
        rows = [dict(r) for r in con.execute("SELECT a.*, p.project_name FROM actions a LEFT JOIN projects p ON p.id=a.project_id ORDER BY a.created_at DESC").fetchall()]
    return {"actions": rows}



@app.get("/api/projects")
def projects(limit: int = Query(500, ge=1, le=5000)) -> dict[str, Any]:
    with db() as con:
        rows = [dict(r) for r in con.execute("SELECT id, project_name, state, constituency, mp_name, agency, risk_score, risk_level, ai_confidence, updated_at FROM projects ORDER BY risk_score DESC LIMIT ?", (limit,)).fetchall()]
    return {"projects": rows}

@app.get("/api/notifications")
def notifications(limit: int = Query(500, ge=1, le=5000)) -> dict[str, Any]:
    with db() as con:
        rows = [dict(r) for r in con.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()]
    return {"notifications": rows}

@app.patch("/api/actions/{action_id}")
def update_action(action_id: str, status: str, notes: str = "") -> dict[str, Any]:
    allowed = {"DETECTED", "NOTIFIED", "ASSIGNED", "UNDER_INVESTIGATION", "ACTION_TAKEN", "VERIFIED", "CLOSED", "ESCALATED"}
    if status not in allowed:
        raise HTTPException(400, "Invalid action status")
    with db() as con:
        cur = con.execute("UPDATE actions SET status=?, notes=? WHERE id=?", (status, notes, action_id))
        if cur.rowcount == 0:
            raise HTTPException(404, "Action not found")
    return {"actionId": action_id, "status": status}


def send_email(to_email: str, subject: str, body: str) -> tuple[bool, str | None]:
    host, user, password = os.getenv("SMTP_HOST", "").strip(), os.getenv("SMTP_USERNAME", "").strip(), os.getenv("SMTP_PASSWORD", "").strip()
    if not host or not user or not password:
        return False, "SMTP is not configured on the backend."
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", user)
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=20) as server:
            if os.getenv("SMTP_USE_TLS", "true").lower() == "true":
                server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True, None
    except Exception as exc:
        return False, str(exc)



@app.post("/api/notifications/test-email")
def test_email(req: TestEmailRequest) -> dict[str, Any]:
    recipient = req.recipient.strip()
    if not recipient or "@" not in recipient:
        raise HTTPException(400, "Enter a valid recipient email address.")
    configured = bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USERNAME") and os.getenv("SMTP_PASSWORD"))
    if not configured:
        return {"configured": False, "sent": False, "recipient": recipient, "error": "SMTP is not configured. Fill backend/.env and restart FastAPI."}
    sent, error = send_email(recipient, "MPLADS AI Monitor — SMTP Test", "This is a test notification from the MPLADS AI Monitor. SMTP configuration is working. No project action is attached to this test.")
    nid = str(uuid.uuid4())
    with db() as con:
        con.execute("INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?,?,?)", (nid, None, recipient, "MPLADS AI Monitor — SMTP Test", "SMTP configuration test", "email", "SENT" if sent else "FAILED", now(), now() if sent else None, error))
    return {"configured": True, "sent": sent, "recipient": recipient, "error": error}

@app.post("/api/notifications/email")
def notify(req: NotifyRequest) -> dict[str, Any]:
    recipients = req.recipients or [x.strip() for x in os.getenv("DEFAULT_AUTHORITY_EMAILS", "").split(",") if x.strip()]
    if not recipients:
        raise HTTPException(400, "No authority email recipient configured.")
    with db() as con:
        action = con.execute("SELECT * FROM actions WHERE id=?", (req.actionId,)).fetchone()
    if not action:
        raise HTTPException(404, "Action not found")
    subject = req.subject or f"MPLADS Monitoring Alert — {action['priority']} — Action {action['id'][:8]}"
    body = req.message or (f"MPLADS monitoring action requires review.\n\nProject ID: {action['project_id']}\nRisk: {action['risk_level']} ({action['risk_score']}/100)\nPriority: {action['priority']}\nAuthority: {action['authority']}\nRecommended action: {action['recommended_action']}\nDeadline: {action['deadline']}\n\nThis notification is a risk signal for human verification and is not a finding of fraud or misconduct.")
    results = []
    for email in recipients:
        sent, error = send_email(email, subject, body)
        nid = str(uuid.uuid4())
        with db() as con:
            con.execute("INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?,?,?)", (nid, req.actionId, email, subject, body, "email", "SENT" if sent else "FAILED", now(), now() if sent else None, error))
        results.append({"recipient": email, "status": "SENT" if sent else "FAILED", "error": error})
    with db() as con:
        con.execute("UPDATE actions SET status=?, notified_at=? WHERE id=?", ("NOTIFIED" if any(x["status"] == "SENT" for x in results) else "DETECTED", now() if any(x["status"] == "SENT" for x in results) else None, req.actionId))
    return {"actionId": req.actionId, "results": results}
