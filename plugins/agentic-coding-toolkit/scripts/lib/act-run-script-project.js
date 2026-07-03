#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function main() {
  const [logicalScriptPath, ...scriptArgs] = process.argv.slice(2);

  if (!logicalScriptPath) {
    fail('Usage: act-run-script-project.js <logical-script-path> [args...]');
  }

  const requestedPath = logicalScriptPath.replace(/\\/g, '/');
  const normalizedPath = path.posix.normalize(requestedPath);
  if (
    path.posix.isAbsolute(normalizedPath)
    || normalizedPath === '..'
    || normalizedPath.startsWith('../')
    || !isAllowedActScriptPath(normalizedPath)
  ) {
    fail(`ACT script path must stay within toolkit-owned script locations (scripts/ or skills/*/scripts/): ${logicalScriptPath}`);
  }

  const toolkitPath = resolveProjectToolkitPath();
  const candidateScriptPath = path.resolve(toolkitPath, normalizedPath);
  let resolvedScriptPath;
  try {
    resolvedScriptPath = fs.realpathSync(candidateScriptPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`ACT script not found in project-local toolkit: ${normalizedPath}`);
    }
    fail(`Failed to access ACT script ${normalizedPath}: ${formatError(error)}`);
  }

  const relativeToToolkit = path.relative(toolkitPath, resolvedScriptPath);
  if (relativeToToolkit.startsWith('..') || path.isAbsolute(relativeToToolkit)) {
    fail(`Resolved ACT script escapes the toolkit root: ${logicalScriptPath}`);
  }

  let scriptStats;
  try {
    scriptStats = fs.statSync(resolvedScriptPath);
  } catch (error) {
    fail(`Failed to inspect ACT script ${normalizedPath}: ${formatError(error)}`);
  }

  if (!scriptStats.isFile()) {
    fail(`ACT script target is not a file: ${normalizedPath}`);
  }

  if ((scriptStats.mode & 0o111) === 0) {
    fail(`ACT script is not executable: ${normalizedPath}`);
  }

  const child = spawn(resolvedScriptPath, scriptArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  child.on('error', (error) => {
    fail(`Failed to run ACT script ${normalizedPath}: ${formatError(error)}`);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code === null ? 1 : code);
  });
}

function resolveProjectToolkitPath() {
  const toolkitPath = path.resolve(__dirname, '..', '..');
  let realToolkitPath;
  try {
    realToolkitPath = fs.realpathSync(toolkitPath);
  } catch (error) {
    fail(`Project-local ACT toolkit path is not accessible: ${toolkitPath} (${formatError(error)})`);
  }
  const stats = fs.statSync(realToolkitPath);
  if (!stats.isDirectory()) {
    fail(`Project-local ACT toolkit path is not a directory: ${realToolkitPath}`);
  }
  return realToolkitPath;
}

function isAllowedActScriptPath(normalizedPath) {
  if (normalizedPath.startsWith('scripts/')) {
    return true;
  }
  return /^skills\/[^/]+\/scripts\/.+/.test(normalizedPath);
}

function formatError(error) {
  if (!error) {
    return 'unknown error';
  }
  if (error.code) {
    return `${error.code}: ${error.message}`;
  }
  if (error.message) {
    return String(error.message);
  }
  return String(error);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();
