#!/usr/bin/env bash
# Wysyła przykładową prognozę do API (test end-to-end).
# Użycie: POGODAI_SECRET=... ./scripts/seed-forecast.sh [base-url] [locationId]
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
LOCATION_ID="${2:-warszawa-bialoleka}"
SECRET="${POGODAI_SECRET:?Set POGODAI_SECRET}"

deno run -A scripts/generate-sample-forecast.ts "$LOCATION_ID" > /tmp/pogodai-forecast.json

echo "POST $BASE_URL/api/forecast ($LOCATION_ID)"
curl -sf -X POST "$BASE_URL/api/forecast" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d @/tmp/pogodai-forecast.json
echo ""

echo "GET $BASE_URL/api/health"
curl -sf "$BASE_URL/api/health"
echo ""
