#!/bin/sh
set -e

mkdir -p /app/uploads
chown -R nodejs:nodejs /app/uploads

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "Applying database migrations..."
  su-exec nodejs node_modules/.bin/prisma migrate deploy
fi

exec su-exec nodejs "$@"
