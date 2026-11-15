#!/bin/sh
set -e

mkdir -p /data/uploads
chown -R nextjs:nodejs /data/uploads 2>/dev/null || true

export PGPASSWORD="${POSTGRES_PASSWORD:-qa}"
until pg_isready -h "${PGHOST:-db}" -p "${PGPORT:-5432}" -U "${POSTGRES_USER:-qa}"; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/db/migrations/001_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/db/seed.sql

exec su-exec nextjs node server.js
