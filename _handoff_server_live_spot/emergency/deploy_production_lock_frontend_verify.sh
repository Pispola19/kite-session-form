#!/usr/bin/env bash
# Verify ventolive.com passive chain matches repo (no deploy — GitHub Pages is git-driven).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="https://ventolive.com"
FILES=(
  "index.html"
  "translations.js"
  "ui-lab/mock-ui/static_data.js"
  "ui-lab/mock-ui/ventolive_api_routing_v1.js"
  "ui-lab/mock-ui/ventolive_i18n_v1.js"
  "ui-lab/mock-ui/user_intent_gate_v1.js"
  "ui-lab/mock-ui/server_contract_passive_v1.js"
  "ui-lab/mock-ui/live_spot_wind_adapter_v1.js"
  "ui-lab/mock-ui/wind_ui_single_writer_v1.js"
  "ui-lab/mock-ui/mock_ui.js"
  "ui-lab/mock-ui/styles.css"
)

echo "==> Script chain (must NOT include SIERRA)"
curl -sS -A 'Mozilla/5.0' "$BASE/index.html" | grep -E 'script src' | grep -v cloudflare || true
for bad in resolve_wind_contract single_truth kite_score time_ui ux_trust; do
  if curl -sS -A 'Mozilla/5.0' "$BASE/index.html" | grep -q "$bad"; then
    echo "FAIL: legacy script $bad in index.html"
    exit 1
  fi
done
echo "OK: no SIERRA in index.html"

echo "==> SHA256 repo vs ventolive.com"
FAIL=0
for rel in "${FILES[@]}"; do
  local_hash=$(shasum -a 256 "$ROOT/$rel" | awk '{print $1}')
  remote_hash=$(curl -sS -A 'Mozilla/5.0' "$BASE/$rel" | shasum -a 256 | awk '{print $1}')
  if [[ "$local_hash" == "$remote_hash" ]]; then
    echo "OK  $rel"
  else
    echo "DRIFT $rel (push main to GitHub Pages if repo is source of truth)"
    FAIL=1
  fi
done
exit $FAIL
