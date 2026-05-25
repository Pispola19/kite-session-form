#!/usr/bin/env bash
# Deploy PRODUCTION LOCK server files to api host (no UI changes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${DEPLOY_HOST:-massimiliano@100.108.166.103}"
PORT="${DEPLOY_PORT:-2222}"
REMOTE="${DEPLOY_REMOTE:-/opt/live_spot_server}"

echo "==> Backup app.py on server"
ssh -p "$PORT" "$HOST" "cp '$REMOTE/app.py' '$REMOTE/app.py.bak_before_production_lock_$(date +%Y%m%d_%H%M%S)'"

echo "==> Upload kernel + enforcer + schema lock + app.py"
scp -P "$PORT" \
  "$ROOT/tools/zero_drift_enforcer_v1.py" \
  "$ROOT/tools/server_contract_schema_lock_v1.py" \
  "$ROOT/tools/zero_drift_kernel_v1.py" \
  "$HOST:$REMOTE/tools/"
scp -P "$PORT" "$ROOT/app_wind_wrapper_patch.py" "$HOST:$REMOTE/app.py"

echo "==> Import smoke test (same PYTHONPATH as systemd)"
ssh -p "$PORT" "$HOST" "cd '$REMOTE' && PYTHONPATH='$REMOTE' '$REMOTE/.venv/bin/python3' -c \"
import app
from tools.zero_drift_kernel_v1 import kernel_health_flags
print('smoke_ok', kernel_health_flags())
\""

echo ""
echo "==> RESTART REQUIRED (sudo password on server):"
echo "    ssh -p $PORT $HOST"
echo "    sudo systemctl restart live-spot-server.service"
echo ""
echo "==> Verify:"
echo "    curl -sS http://127.0.0.1:5000/health | jq '.zero_drift_kernel, .wind_latest_contract'"
echo "    curl -sS 'http://127.0.0.1:5000/wind/latest?spot=Is%20Solinas' | jq '.contract_version, .display.wind'"
