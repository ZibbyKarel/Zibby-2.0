#!/bin/sh
set -e
# Run Prisma migrations on startup
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
exec "$@"
