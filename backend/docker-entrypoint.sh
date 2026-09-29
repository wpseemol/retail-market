#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "Applying database migrations..."
  node_modules/.bin/prisma migrate deploy
fi

exec "$@"
