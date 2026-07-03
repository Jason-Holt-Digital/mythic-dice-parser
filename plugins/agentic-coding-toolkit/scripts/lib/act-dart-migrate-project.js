#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const DIAGNOSTIC_PREFIX = '[act-dart-migrate]';
const SNAPSHOT_RELATIVE_DIR = path.join('tools', 'act_dart_migrate');
const PACKAGE_EXECUTABLE = 'act_dart_migrate';
const REQUIRED_PACKAGE_FILES = ['pubspec.yaml', path.join('bin', `${PACKAGE_EXECUTABLE}.dart`)];
const REQUIRED_PACKAGE_DIRS = ['lib'];

function main() {
  const migrationArgs = process.argv.slice(2);
  const toolkitPath = resolveProjectToolkitPath();
  const snapshotDir = resolveSnapshotDir(toolkitPath);
  const dartRunner = resolveDartRunner();

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

function resolveSnapshotDir(toolkitPath) {
  const snapshotDir = path.join(toolkitPath, SNAPSHOT_RELATIVE_DIR);
  let snapshotStats;
  try {
    snapshotStats = fs.statSync(snapshotDir);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`Synced Tool Snapshot not found: ${snapshotDir}. Refresh this project-local ACT plugin from the ACT source checkout.`);
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
  const configured = process.env.ACT_DART_RUNNER;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured;
  }
  return 'dart';
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
