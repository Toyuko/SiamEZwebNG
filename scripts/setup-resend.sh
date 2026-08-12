#!/usr/bin/env bash
# Finish Resend wiring after Marketplace checkout (or a manual API key).
# Usage:
#   RESEND_API_KEY=re_xxx ./scripts/setup-resend.sh
#   ./scripts/setup-resend.sh   # pulls from Vercel env if already connected
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${EMAIL_DOMAIN:-siam-ez.com}"
FROM="${EMAIL_FROM:-SiamEZ <inquiries@${DOMAIN}>}"
REPLY="${EMAIL_REPLY_TO:-inquiries@${DOMAIN}}"
OPS="${EMAIL_OPS_TO:-inquiries@${DOMAIN}}"
REGION="${RESEND_REGION:-ap-northeast-1}"

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "Pulling env from Vercel…"
  vercel env pull .env.resend.tmp --environment=production --yes >/dev/null 2>&1 || true
  if [[ -f .env.resend.tmp ]]; then
    # shellcheck disable=SC1091
    set -a
    # Only import RESEND_* / EMAIL_* lines
    eval "$(rg -N '^(RESEND_|EMAIL_)' .env.resend.tmp | sed 's/^/export /')"
    set +a
    rm -f .env.resend.tmp
  fi
fi

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "RESEND_API_KEY is not set."
  echo "1) Complete Vercel Resend checkout (Pro) for domain ${DOMAIN}"
  echo "2) Or paste a key: RESEND_API_KEY=re_xxx $0"
  exit 1
fi

echo "Using Resend key: ${RESEND_API_KEY:0:8}…"

echo "Ensuring domain ${DOMAIN} exists…"
DOMAINS_JSON=$(curl -sS -H "Authorization: Bearer ${RESEND_API_KEY}" https://api.resend.com/domains)
DOMAIN_ID=$(python3 - <<'PY' "$DOMAINS_JSON" "$DOMAIN"
import json,sys
data=json.loads(sys.argv[1])
name=sys.argv[2]
for d in data.get("data") or []:
  if d.get("name")==name:
    print(d["id"]); break
PY
)

if [[ -z "$DOMAIN_ID" ]]; then
  CREATE=$(curl -sS -X POST https://api.resend.com/domains \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${DOMAIN}\",\"region\":\"${REGION}\"}")
  echo "$CREATE" | python3 -m json.tool
  DOMAIN_ID=$(python3 - <<'PY' "$CREATE"
import json,sys
print(json.loads(sys.argv[1]).get("id",""))
PY
)
fi

if [[ -z "$DOMAIN_ID" ]]; then
  echo "Could not create/find domain. Full domains response:"
  echo "$DOMAINS_JSON" | python3 -m json.tool
  exit 1
fi

echo "Domain id: $DOMAIN_ID"
DETAIL=$(curl -sS -H "Authorization: Bearer ${RESEND_API_KEY}" "https://api.resend.com/domains/${DOMAIN_ID}")
echo "$DETAIL" | python3 -m json.tool

STATUS=$(python3 - <<'PY' "$DETAIL"
import json,sys
print(json.loads(sys.argv[1]).get("status",""))
PY
)

if [[ "$STATUS" != "verified" ]]; then
  echo ""
  echo "Add these DNS records at your domain registrar, then re-run this script:"
  python3 - <<'PY' "$DETAIL"
import json,sys
d=json.loads(sys.argv[1])
recs=d.get("records") or []
for r in recs:
  print(f"  {r.get('type','?'):6}  {r.get('name','?'):40}  {r.get('value','')}")
PY
  echo ""
  echo "Triggering verification check…"
  curl -sS -X POST -H "Authorization: Bearer ${RESEND_API_KEY}" \
    "https://api.resend.com/domains/${DOMAIN_ID}/verify" | python3 -m json.tool || true
fi

echo "Writing Vercel env vars…"
# Remove existing then add (idempotent-ish)
for envname in RESEND_API_KEY EMAIL_FROM EMAIL_REPLY_TO EMAIL_OPS_TO; do
  vercel env rm "$envname" production --yes >/dev/null 2>&1 || true
  vercel env rm "$envname" preview --yes >/dev/null 2>&1 || true
  vercel env rm "$envname" development --yes >/dev/null 2>&1 || true
done

printf '%s' "$RESEND_API_KEY" | vercel env add RESEND_API_KEY production --sensitive >/dev/null
printf '%s' "$RESEND_API_KEY" | vercel env add RESEND_API_KEY preview --sensitive >/dev/null
printf '%s' "$RESEND_API_KEY" | vercel env add RESEND_API_KEY development --sensitive >/dev/null
printf '%s' "$FROM" | vercel env add EMAIL_FROM production >/dev/null
printf '%s' "$FROM" | vercel env add EMAIL_FROM preview >/dev/null
printf '%s' "$FROM" | vercel env add EMAIL_FROM development >/dev/null
printf '%s' "$REPLY" | vercel env add EMAIL_REPLY_TO production >/dev/null
printf '%s' "$REPLY" | vercel env add EMAIL_REPLY_TO preview >/dev/null
printf '%s' "$REPLY" | vercel env add EMAIL_REPLY_TO development >/dev/null
printf '%s' "$OPS" | vercel env add EMAIL_OPS_TO production >/dev/null
printf '%s' "$OPS" | vercel env add EMAIL_OPS_TO preview >/dev/null
printf '%s' "$OPS" | vercel env add EMAIL_OPS_TO development >/dev/null

# Local .env.local (append/update)
touch .env.local
for pair in \
  "RESEND_API_KEY=${RESEND_API_KEY}" \
  "EMAIL_FROM=${FROM}" \
  "EMAIL_REPLY_TO=${REPLY}" \
  "EMAIL_OPS_TO=${OPS}"
do
  key="${pair%%=*}"
  if rg -q "^${key}=" .env.local; then
    # portable in-place update
    python3 - <<'PY' "$key" "$pair"
import pathlib,sys
key,pair=sys.argv[1],sys.argv[2]
p=pathlib.Path(".env.local")
lines=p.read_text().splitlines()
out=[pair if l.startswith(key+"=") else l for l in lines]
if not any(l.startswith(key+"=") for l in lines):
  out.append(pair)
p.write_text("\n".join(out)+"\n")
PY
  else
    echo "$pair" >> .env.local
  fi
done

echo "Sending test email to ${OPS}…"
curl -sS -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"${FROM}\",\"to\":[\"${OPS}\"],\"subject\":\"SiamEZ Resend setup OK\",\"html\":\"<p>Resend is configured for <strong>${DOMAIN}</strong>.</p>\"}" \
  | python3 -m json.tool

echo ""
echo "Done. Redeploy so production picks up env:"
echo "  vercel --prod"
