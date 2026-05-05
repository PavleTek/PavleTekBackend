#!/usr/bin/env node
/**
 * Pre-push check: if prisma/schema.prisma was changed in this push,
 * verify that a new migration directory also exists in the same diff range.
 *
 * Strategy (validate_only, no Postgres required):
 *   1. Find the upstream ref the current branch tracks.
 *   2. Get the list of files changed since that ref (or HEAD~1 as fallback).
 *   3. If schema.prisma changed, ensure at least one new prisma/migrations/<dir>
 *      also appears in the diff. If not, fail with a clear message.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return fallback ?? null;
  }
}

// Determine the base ref to compare against
function getBaseRef() {
  // Try the upstream of the current branch
  const upstream = run('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
  if (upstream) {
    const resolved = run(`git rev-parse ${upstream}`);
    if (resolved) return resolved;
  }

  // Fallback: compare against HEAD~1 if there's more than one commit
  const parentCount = run('git rev-list --count HEAD');
  if (parentCount && parseInt(parentCount) > 1) {
    return run('git rev-parse HEAD~1');
  }

  return null;
}

const baseRef = getBaseRef();

let changedFiles;
if (baseRef) {
  changedFiles = run(`git diff --name-only ${baseRef} HEAD`);
} else {
  // Very first commit — check staged files
  changedFiles = run('git diff --name-only --cached');
}

if (!changedFiles) {
  console.log('[check-prisma-migration] No changed files detected. Skipping check.');
  process.exit(0);
}

const files = changedFiles.split('\n').map((f) => f.trim()).filter(Boolean);

const schemaChanged = files.some((f) => f === 'prisma/schema.prisma');

if (!schemaChanged) {
  console.log('[check-prisma-migration] prisma/schema.prisma not changed. OK.');
  process.exit(0);
}

// Schema changed — check for a new migration directory
const newMigrationDirs = files.filter(
  (f) => f.startsWith('prisma/migrations/') && !f.startsWith('prisma/migrations/migration_lock')
);

if (newMigrationDirs.length === 0) {
  console.error(
    '\n[check-prisma-migration] ERROR: prisma/schema.prisma was changed but no new migration was found.\n' +
    '\n' +
    '  You MUST run: npx prisma migrate dev --name describe_your_change\n' +
    '  Then commit the generated prisma/migrations/<timestamp>_<name>/ directory.\n' +
    '\n' +
    '  NEVER use `npx prisma db push` — migrations are required for reproducible deploys.\n' +
    '  See: PavleTekBackend/.cursor/rules/prisma-migrations.mdc\n'
  );
  process.exit(1);
}

console.log(`[check-prisma-migration] Found ${newMigrationDirs.length} migration file(s). OK.`);
process.exit(0);
