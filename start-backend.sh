#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
.venv/bin/uvicorn app.main:app --reload --port 8000
