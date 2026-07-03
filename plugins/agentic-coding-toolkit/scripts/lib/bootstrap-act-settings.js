#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getActSettingsPath } = require('../../hooks/core/act-settings');

const TOOLKIT_PATH = fs.realpathSync(path.resolve(__dirname, '..', '..'));

const DEFAULT_SETTINGS = {
  enableLogging: false,
  toolkitPath: TOOLKIT_PATH,
};

function main() {
  const settingsPath = getActSettingsPath();
  const settingsDir = path.dirname(settingsPath);

  ensureDirectory(settingsDir, settingsPath);

  const existing = readExistingSettings(settingsPath);
  if (!existing.exists) {
    writeJsonAtomically(settingsPath, DEFAULT_SETTINGS);
    return;
  }

  const merged = mergeManagedSettings(existing.value, DEFAULT_SETTINGS);
  if (!merged.changed) {
    return;
  }

  writeJsonAtomically(settingsPath, merged.value);
}

function ensureDirectory(settingsDir, settingsPath) {
  try {
    fs.mkdirSync(settingsDir, { recursive: true });
  } catch (error) {
    fail(settingsPath, `failed to create settings directory (${settingsDir}): ${formatError(error)}`);
  }
}

function readExistingSettings(settingsPath) {
  let linkStats;
  try {
    linkStats = fs.lstatSync(settingsPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { exists: false, value: null };
    }
    fail(settingsPath, `failed to read settings metadata: ${formatError(error)}`);
  }

  let stats;
  try {
    stats = fs.statSync(settingsPath);
  } catch (error) {
    fail(settingsPath, `failed to read settings metadata: ${formatError(error)}`);
  }

  if (!stats.isFile() || linkStats.isDirectory()) {
    fail(settingsPath, 'settings path exists but is not a regular file');
  }

  let raw;
  try {
    raw = fs.readFileSync(settingsPath, 'utf8');
  } catch (error) {
    fail(settingsPath, `failed to read settings file: ${formatError(error)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(
      settingsPath,
      `settings file contains invalid JSON. Fix ${settingsPath} and rerun install: ${formatError(error)}`,
    );
  }

  if (!isObjectRecord(parsed)) {
    fail(settingsPath, 'settings file must contain a JSON object at the root');
  }

  return {
    exists: true,
    value: parsed,
  };
}

function mergeManagedSettings(existing, defaults) {
  const next = { ...existing };
  let changed = false;

  for (const [key, value] of Object.entries(defaults)) {
    if (key === 'toolkitPath') {
      if (next[key] !== value) {
        next[key] = value;
        changed = true;
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(next, key)) {
      continue;
    }
    next[key] = value;
    changed = true;
  }

  return {
    changed,
    value: next,
  };
}

function writeJsonAtomically(settingsPath, content) {
  const settingsDir = path.dirname(settingsPath);
  const tempPath = path.join(
    settingsDir,
    `.act-settings.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  const serialized = `${JSON.stringify(content, null, 2)}\n`;

  try {
    fs.writeFileSync(tempPath, serialized, { mode: 0o600 });
    fs.renameSync(tempPath, settingsPath);
  } catch (error) {
    try {
      fs.rmSync(tempPath, { force: true });
    } catch {
      // Best-effort cleanup only.
    }
    fail(settingsPath, `failed to write settings file: ${formatError(error)}`);
  }
}

function fail(settingsPath, message) {
  console.error(`[ACT_SETTINGS_INSTALL_ERROR] settingsPath=${settingsPath} message="${escapeMessage(message)}"`);
  process.exit(1);
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

function isObjectRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeMessage(message) {
  return String(message)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

main();
