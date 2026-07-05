#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
SECRET="${POGODAI_SECRET:?Set POGODAI_SECRET}"

deno run -A scripts/generate-sample-forecast.ts > /tmp/pogodai-forecast.json

echo "POST $BASE_URL/api/forecast"
curl -sf -X POST "$BASE_URL/api/forecast" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d @/tmp/pogodai-forecast.json

echo ""
echo "GET $BASE_URL/api/health"
curl -sf "$BASE_URL/api/health"
echo ""
