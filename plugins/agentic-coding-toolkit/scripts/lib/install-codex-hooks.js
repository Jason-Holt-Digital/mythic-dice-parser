#!/usr/bin/env node
/**
 * Installs or removes ACT-owned Codex hooks in ~/.codex/hooks.json.
 *
 * Usage:
 *   node install-codex-hooks.js --target ~/.codex/hooks.json --hook-dir ~/.codex/hooks/codex hooks/codex/hooks.json
 *   node install-codex-hooks.js --remove --target ~/.codex/hooks.json --hook-dir ~/.codex/hooks/codex hooks/codex/hooks.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_TARGET_PATH = path.join(os.homedir(), '.codex', 'hooks.json');

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function commandScriptBasename(command) {
  return command?.match(/act-codex-[A-Za-z0-9-]+\.js/)?.[0] || null;
}

function transformCommand(command, hookDir) {
  const basename = commandScriptBasename(command);
  if (!basename || !hookDir) return command;
  return `node ${shellQuote(path.resolve(hookDir, basename))}`;
}

function transformHookEntry(entry, hookDir) {
  return {
    ...entry,
    command: transformCommand(entry.command, hookDir),
  };
}

function transformEventEntry(entry, hookDir) {
  return {
    ...entry,
    hooks: Array.isArray(entry.hooks)
      ? entry.hooks.map((hook) => transformHookEntry(hook, hookDir))
      : entry.hooks,
  };
}

function transformHooksData(hooksData, hookDir) {
  return {
    ...hooksData,
    hooks: Object.fromEntries(
      Object.entries(hooksData.hooks || {}).map(([eventName, entries]) => [
        eventName,
        entries.map((entry) => transformEventEntry(entry, hookDir)),
      ]),
    ),
  };
}

function eventEntryCommands(entry) {
  if (!Array.isArray(entry?.hooks)) return [];
  return entry.hooks.map((hook) => hook.command).filter((command) => typeof command === 'string');
}

function findMatchingIndices(targetEntries, sourceEntry) {
  const sourceCommands = new Set(eventEntryCommands(sourceEntry));
  const indices = [];
  for (let i = 0; i < targetEntries.length; i++) {
    if (eventEntryCommands(targetEntries[i]).some((command) => sourceCommands.has(command))) {
      indices.push(i);
    }
  }
  return indices;
}

function mergeHooks(targetHooks, sourceHooks) {
  for (const [eventName, sourceEntries] of Object.entries(sourceHooks)) {
    if (!Array.isArray(targetHooks[eventName])) {
      targetHooks[eventName] = [];
    }

    for (const sourceEntry of sourceEntries) {
      const indices = findMatchingIndices(targetHooks[eventName], sourceEntry);
      if (indices.length === 0) {
        targetHooks[eventName].push(sourceEntry);
        continue;
      }

      targetHooks[eventName][indices[0]] = sourceEntry;
      for (let i = indices.length - 1; i >= 1; i--) {
        targetHooks[eventName].splice(indices[i], 1);
      }
    }
  }
}

function removeHooks(targetHooks, sourceHooks) {
  for (const [eventName, sourceEntries] of Object.entries(sourceHooks)) {
    if (!Array.isArray(targetHooks[eventName])) {
      continue;
    }

    for (const sourceEntry of sourceEntries) {
      const indices = findMatchingIndices(targetHooks[eventName], sourceEntry);
      for (let i = indices.length - 1; i >= 0; i--) {
        targetHooks[eventName].splice(indices[i], 1);
      }
    }

    if (targetHooks[eventName].length === 0) {
      delete targetHooks[eventName];
    }
  }
}

function ensureCompatibleTarget(target) {
  if (target === null) {
    return { hooks: {} };
  }
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    throw new Error('target hooks file must contain a JSON object');
  }
  if (target.hooks === undefined) {
    target.hooks = {};
  }
  if (!target.hooks || typeof target.hooks !== 'object' || Array.isArray(target.hooks)) {
    throw new Error('target hooks property must be a JSON object');
  }
  return target;
}

function shouldDeleteTargetAfterRemove(target) {
  const keys = Object.keys(target);
  return keys.length === 1 && keys[0] === 'hooks' && Object.keys(target.hooks).length === 0;
}

function parseArgs(args) {
  const parsed = {
    removeMode: false,
    targetPath: DEFAULT_TARGET_PATH,
    hookDir: null,
    hooksFile: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--remove') {
      parsed.removeMode = true;
    } else if (arg === '--target') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('--target requires a path');
      parsed.targetPath = path.resolve(args[++i]);
    } else if (arg === '--hook-dir') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('--hook-dir requires a path');
      parsed.hookDir = path.resolve(args[++i]);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else if (!parsed.hooksFile) {
      parsed.hooksFile = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!parsed.hooksFile) throw new Error('No hooks file specified');
  return parsed;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  try {
    const hooksData = loadJson(path.resolve(parsed.hooksFile));
    if (!hooksData?.hooks || typeof hooksData.hooks !== 'object' || Array.isArray(hooksData.hooks)) {
      throw new Error('hooks source must contain a hooks object');
    }

    const source = transformHooksData(hooksData, parsed.hookDir);
    const target = ensureCompatibleTarget(loadJson(parsed.targetPath));

    if (parsed.removeMode) {
      removeHooks(target.hooks, source.hooks);
      if (shouldDeleteTargetAfterRemove(target)) {
        fs.rmSync(parsed.targetPath, { force: true });
      } else {
        saveJson(parsed.targetPath, target);
      }
    } else {
      mergeHooks(target.hooks, source.hooks);
      saveJson(parsed.targetPath, target);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  shellQuote,
  transformCommand,
  transformHooksData,
  mergeHooks,
  removeHooks,
};
