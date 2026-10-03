#!/usr/bin/env bash
# Run prisma migrate deploy over a direct (non-pooled) Neon connection.
# PgBouncer transaction pooling cannot hold pg_advisory_lock → P1002.
set -euo pipefail

if [[ -z "${DIRECT_URL:-}" ]]; then
  if [[ "${DATABASE_URL:-}" == *"-pooler."* ]]; then
    export DIRECT_URL="${DATABASE_URL/-pooler./.}"
    echo "migrate-deploy: derived DIRECT_URL by stripping -pooler from DATABASE_URL hostname"
  else
    # Local / already-direct URLs: satisfy schema.prisma directUrl.
    export DIRECT_URL="${DATABASE_URL:-}"
  fi
fi

# Prefer direct connection for both url + directUrl during migrate.
export DATABASE_URL="$DIRECT_URL"

# Default Prisma lock wait is 10s; bump for cold Neon computes / brief contention.
export PRISMA_SCHEMA_ENGINE_LOCK_TIMEOUT="${PRISMA_SCHEMA_ENGINE_LOCK_TIMEOUT:-60000}"

# Prisma will not retry a migration that failed mid-deploy. Production already
# had some job-intake columns, so that attempt is marked rolled back and the
# idempotent SQL is applied again.
status_output="$(npx prisma migrate status 2>&1 || true)"
printf '%s\n' "$status_output"
if printf '%s\n' "$status_output" | grep -q "20261003140000_job_intake" && printf '%s\n' "$status_output" | grep -qi "failed"; then
  echo "migrate-deploy: marking failed 20261003140000_job_intake as rolled back so it can be retried"
  npx prisma migrate resolve --rolled-back 20261003140000_job_intake
fi

npx prisma migrate deploy
