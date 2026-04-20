#!/bin/sh
set -e
# Configure git to authenticate via GITHUB_TOKEN
gh auth setup-git
# Run Prisma migrations on startup
/app/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
exec "$@"
