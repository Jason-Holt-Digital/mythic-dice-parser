#!/usr/bin/env node

// Dart Migration Launcher: a Shared Runtime Helper that runs the synced
// act_dart_migrate tool for migration skills. It mirrors the act-run-script.js
// contract (resolve the ACT checkout through shared settings) but, instead of
// running an arbitrary toolkit script, it bootstraps and runs the committed
// Synced Tool Snapshot under tools/act_dart_migrate. Settings/toolkit helpers
// are intentionally duplicated rather than shared to keep the launcher
// self-contained (see the Shared Dart Migration Distribution PRD).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

// Structured launcher-owned diagnostic prefix so launcher failures are
// distinguishable from Dart migration failures.
const DIAGNOSTIC_PREFIX = '[act-dart-migrate]';

// The Synced Tool Snapshot location inside the ACT checkout and the minimal
// package shape required before attempting Dart execution.
const SNAPSHOT_RELATIVE_DIR = path.join('tools', 'act_dart_migrate');
const PACKAGE_EXECUTABLE = 'act_dart_migrate';
const REQUIRED_PACKAGE_FILES = ['pubspec.yaml', path.join('bin', `${PACKAGE_EXECUTABLE}.dart`)];
const REQUIRED_PACKAGE_DIRS = ['lib'];

function main() {
  // All launcher arguments are migration arguments forwarded unchanged. The
  // launcher never parses migration subcommands, flags, or Target Package paths.
  const migrationArgs = process.argv.slice(2);

  const settings = readActSettings();
  if (!Object.prototype.hasOwnProperty.call(settings, 'toolkitPath')) {
    fail(`ACT settings are missing toolkitPath: ${settings.settingsPath}. Rerun install to refresh ACT metadata.`);
  }
  if (typeof settings.toolkitPath !== 'string' || settings.toolkitPath.trim() === '') {
    fail(`ACT settings toolkitPath must be a non-empty string: ${settings.settingsPath}`);
  }

  const toolkitPath = resolveToolkitPath(settings.toolkitPath, settings.settingsPath);
  const snapshotDir = resolveSnapshotDir(toolkitPath);

  const dartRunner = resolveDartRunner();

  // Bootstrap dependencies on every invocation, from inside the Synced Tool
  // Snapshot directory. Bootstrap stdout and stderr are routed to launcher
  // stderr so migration stdout can remain machine-readable. SDK incompatibility
  // is left to Dart bootstrap diagnostics rather than parsed by the launcher.
  const bootstrap = spawnSync(dartRunner, ['pub', 'get'], {
    cwd: snapshotDir,
    env: process.env,
    stdio: ['inherit', 2, 2],
  });

  if (bootstrap.error) {
    failRunner(dartRunner, bootstrap.error);
  }
  if (bootstrap.signal) {
    process.kill(process.pid, bootstrap.signal);
    return;
  }
  if (bootstrap.status !== 0) {
    process.exit(bootstrap.status === null ? 1 : bootstrap.status);
  }

  // Run the declared act_dart_migrate package executable from inside the
  // Synced Tool Snapshot directory, forwarding migration arguments unchanged.
  // Migration stdout and stderr are forwarded unchanged via inherited stdio.
  const child = spawn(dartRunner, ['run', PACKAGE_EXECUTABLE, ...migrationArgs], {
    cwd: snapshotDir,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    failRunner(dartRunner, error);
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
      fail(`ACT settings not found: ${settingsPath}. Rerun install before invoking the Dart Migration Launcher.`);
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

function resolveSnapshotDir(toolkitPath) {
  const snapshotDir = path.join(toolkitPath, SNAPSHOT_RELATIVE_DIR);

  let snapshotStats;
  try {
    snapshotStats = fs.statSync(snapshotDir);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`Synced Tool Snapshot not found: ${snapshotDir}. Rerun install or maintainer sync to ship ${SNAPSHOT_RELATIVE_DIR}.`);
    }
    fail(`Failed to inspect Synced Tool Snapshot ${snapshotDir}: ${formatError(error)}`);
  }

  if (!snapshotStats.isDirectory()) {
    fail(`Synced Tool Snapshot is not a directory: ${snapshotDir}`);
  }

  for (const relFile of REQUIRED_PACKAGE_FILES) {
    const target = path.join(snapshotDir, relFile);
    let stats;
    try {
      stats = fs.statSync(target);
    } catch (error) {
      fail(`Synced Tool Snapshot is incomplete, missing ${relFile}: ${snapshotDir}`);
    }
    if (!stats.isFile()) {
      fail(`Synced Tool Snapshot entry is not a file: ${target}`);
    }
  }

  for (const relDir of REQUIRED_PACKAGE_DIRS) {
    const target = path.join(snapshotDir, relDir);
    let stats;
    try {
      stats = fs.statSync(target);
    } catch (error) {
      fail(`Synced Tool Snapshot is incomplete, missing ${relDir}/: ${snapshotDir}`);
    }
    if (!stats.isDirectory()) {
      fail(`Synced Tool Snapshot entry is not a directory: ${target}`);
    }
  }

  return snapshotDir;
}

function resolveDartRunner() {
  // The Dart Runner is selected from ACT_DART_RUNNER when set, otherwise the
  // launcher falls back to PATH `dart`. The value is treated as an executable
  // path or command name with no embedded arguments and is passed to the child
  // process without shell evaluation, so a value with embedded arguments simply
  // fails to spawn rather than being shell-parsed.
  const configured = process.env.ACT_DART_RUNNER;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured;
  }
  return 'dart';
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

function failRunner(dartRunner, error) {
  fail(`Failed to run Dart Runner "${dartRunner}": ${formatError(error)}`);
}

function fail(message) {
  console.error(`${DIAGNOSTIC_PREFIX} ${message}`);
  process.exit(1);
}

main();
