#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function main() {
  const [logicalScriptPath, ...scriptArgs] = process.argv.slice(2);

  if (!logicalScriptPath) {
    fail('Usage: act-run-script.js <logical-script-path> [args...]');
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

  const settings = readActSettings();
  if (!Object.prototype.hasOwnProperty.call(settings, 'toolkitPath')) {
    fail(`ACT settings are missing toolkitPath: ${settings.settingsPath}. Rerun install to refresh ACT metadata.`);
  }
  if (typeof settings.toolkitPath !== 'string' || settings.toolkitPath.trim() === '') {
    fail(`ACT settings toolkitPath must be a non-empty string: ${settings.settingsPath}`);
  }

  const toolkitPath = resolveToolkitPath(settings.toolkitPath, settings.settingsPath);
  const candidateScriptPath = path.resolve(toolkitPath, normalizedPath);
  let resolvedScriptPath;
  try {
    resolvedScriptPath = fs.realpathSync(candidateScriptPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`ACT script not found via toolkitPath: ${normalizedPath}`);
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

function readActSettings() {
  const settingsPath = path.join(os.homedir(), '.config', 'agentic-coding-toolkit', 'act-settings.json');

  let raw;
  try {
    raw = fs.readFileSync(settingsPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`ACT settings not found: ${settingsPath}. Rerun install before invoking ACT-owned scripts.`);
    }
    fail(`Failed to read ACT settings ${settingsPath}: ${formatError(error)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`ACT settings contain invalid JSON: ${settingsPath}. Fix the file or rerun install.`);
  }

  if (!isObjectRecord(parsed)) {
    fail(`ACT settings must contain a JSON object: ${settingsPath}`);
  }

  return {
    ...parsed,
    settingsPath,
  };
}

function isAllowedActScriptPath(normalizedPath) {
  if (normalizedPath.startsWith('scripts/')) {
    return true;
  }

  return /^skills\/[^/]+\/scripts\/.+/.test(normalizedPath);
}

function resolveToolkitPath(configuredToolkitPath, settingsPath) {
  let toolkitPath;
  try {
    toolkitPath = fs.realpathSync(configuredToolkitPath);
  } catch (error) {
    fail(`ACT settings toolkitPath is not accessible: ${settingsPath} -> ${configuredToolkitPath} (${formatError(error)})`);
  }

  let toolkitStats;
  try {
    toolkitStats = fs.statSync(toolkitPath);
  } catch (error) {
    fail(`Failed to inspect ACT toolkitPath ${toolkitPath}: ${formatError(error)}`);
  }

  if (!toolkitStats.isDirectory()) {
    fail(`ACT settings toolkitPath is not a directory: ${settingsPath} -> ${configuredToolkitPath}`);
  }

  return toolkitPath;
}

function isObjectRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
