#!/bin/sh
set -e
# Run Prisma migrations on startup
/app/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
exec "$@"
