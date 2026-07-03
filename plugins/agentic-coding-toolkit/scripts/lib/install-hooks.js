#!/usr/bin/env node
/**
 * Installs hooks from a hooks.json file into Claude settings.json
 *
 * Usage:
 *   node install-hooks.js <hooks-file>
 *   node install-hooks.js hooks.json
 *   node install-hooks.js --remove hooks.json  # Remove hooks instead of adding
 *   node install-hooks.js --settings ~/.claude-work/settings.json --hook-dir ~/.claude-work/hooks/claude hooks.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function getHookLabel(hook) {
  return hook.description || hook.matcher || hook.hooks?.[0]?.command;
}

function commandScriptBasename(command) {
  return command?.match(/act-claude-[A-Za-z0-9-]+\.js/)?.[0] || null;
}

function transformCommand(command, hookDir) {
  const basename = commandScriptBasename(command);
  if (!basename || !hookDir) return command;
  return `node ${shellQuote(path.resolve(hookDir, basename))}`;
}

function transformHook(hook, hookDir) {
  return {
    ...hook,
    hooks: hook.hooks?.map((entry) => ({
      ...entry,
      command: transformCommand(entry.command, hookDir),
    })),
  };
}

function transformHooksData(hooksData, hookDir) {
  const transformed = { ...hooksData };
  if (hooksData.statusLine) {
    transformed.statusLine = {
      ...hooksData.statusLine,
      command: transformCommand(hooksData.statusLine.command, hookDir),
    };
  }
  if (hooksData.hooks) {
    transformed.hooks = Object.fromEntries(
      Object.entries(hooksData.hooks).map(([eventType, hooks]) => [
        eventType,
        hooks.map((hook) => transformHook(hook, hookDir)),
      ]),
    );
  }
  return transformed;
}

function isActDescription(description) {
  return typeof description === 'string' && description.startsWith('[ACT] ');
}

function findMatchingIndices(targetHooks, sourceHook) {
  const sourceCmd = sourceHook.hooks?.[0]?.command;
  const sourceMatcher = sourceHook.matcher;
  const sourceDescription = sourceHook.description;
  const indices = [];
  for (let i = 0; i < targetHooks.length; i++) {
    const existing = targetHooks[i];
    const existingCmd = existing.hooks?.[0]?.command;
    const exactCommandMatch = sourceCmd && existingCmd === sourceCmd;
    const exactActIdentityMatch = isActDescription(sourceDescription)
      && existing.description === sourceDescription
      && existing.matcher === sourceMatcher;
    if (exactCommandMatch || exactActIdentityMatch) {
      indices.push(i);
    }
  }
  return indices;
}

function mergeHooks(target, source) {
  // For each hook event type in source
  for (const [eventType, sourceHooks] of Object.entries(source)) {
    if (!target[eventType]) {
      target[eventType] = [];
    }

    // Add or update each hook from source, removing duplicates
    for (const sourceHook of sourceHooks) {
      const sourceLabel = getHookLabel(sourceHook);
      const indices = findMatchingIndices(target[eventType], sourceHook);

      if (indices.length === 0) {
        target[eventType].push(sourceHook);
        console.log(`  Added ${eventType} hook: ${sourceLabel}`);
      } else {
        // Update first match
        const existingHook = target[eventType][indices[0]];
        const hasChanges = JSON.stringify(existingHook) !== JSON.stringify(sourceHook);
        if (hasChanges) {
          target[eventType][indices[0]] = sourceHook;
          console.log(`  Updated ${eventType} hook: ${sourceLabel}`);
        } else {
          console.log(`  Unchanged ${eventType} hook: ${sourceLabel}`);
        }
        // Remove remaining duplicates (splice in reverse to preserve indices)
        for (let i = indices.length - 1; i >= 1; i--) {
          target[eventType].splice(indices[i], 1);
          console.log(`  Removed duplicate ${eventType} hook at index ${indices[i]}`);
        }
      }
    }
  }
  return target;
}

function removeHooks(target, source) {
  // For each hook event type in source
  for (const [eventType, sourceHooks] of Object.entries(source)) {
    if (!target[eventType]) continue;

    for (const sourceHook of sourceHooks) {
      const indices = findMatchingIndices(target[eventType], sourceHook);

      // Remove all matches (splice in reverse to preserve indices)
      for (let i = indices.length - 1; i >= 0; i--) {
        const removedLabel = getHookLabel(target[eventType][indices[i]]);
        target[eventType].splice(indices[i], 1);
        console.log(`  Removed ${eventType} hook: ${removedLabel}`);
      }

      // Clean up empty arrays
      if (target[eventType] && target[eventType].length === 0) {
        delete target[eventType];
      }
    }
  }
  return target;
}

function parseArgs(args) {
  const parsed = {
    removeMode: false,
    settingsPath: SETTINGS_PATH,
    hookDir: null,
    hooksFile: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--remove') {
      parsed.removeMode = true;
    } else if (arg === '--settings') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) {
        throw new Error('--settings requires a path');
      }
      parsed.settingsPath = path.resolve(args[++i]);
    } else if (arg === '--hook-dir') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) {
        throw new Error('--hook-dir requires a path');
      }
      parsed.hookDir = path.resolve(args[++i]);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else if (!parsed.hooksFile) {
      parsed.hooksFile = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return parsed;
}

function shouldRemoveStatusLine(existing, source) {
  if (!existing || !source) return false;
  if (JSON.stringify(existing) === JSON.stringify(source)) return true;
  if (existing.type === source.type && existing.command === source.command) return true;
  return isActDescription(source.description) && existing.description === source.description;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: node install-hooks.js [--remove] <hooks-file>

Installs hooks from a hooks.json file into Claude settings.json

Options:
  --remove           Remove the hooks instead of adding them
  --settings <path>  Target Claude settings.json path
  --hook-dir <path>  Installed Claude hook script directory
  --help, -h         Show this help message

Examples:
  node install-hooks.js hooks.json                                      # Add hooks
  node install-hooks.js --remove hooks.json                             # Remove hooks
  node install-hooks.js --settings ~/.claude/settings.json hooks.json   # Add hooks to explicit settings
`);
    process.exit(0);
  }

  let parsed;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  if (!parsed.hooksFile) {
    console.error('Error: No hooks file specified');
    process.exit(1);
  }

  // Resolve hooks file path
  const hooksPath = path.resolve(parsed.hooksFile);

  // Load files
  const hooksData = loadJson(hooksPath);
  if (!hooksData) {
    console.error(`Error: Could not read hooks file ${hooksPath}; target settings path ${parsed.settingsPath}`);
    process.exit(1);
  }

  const hooksDataForSettings = transformHooksData(hooksData, parsed.hookDir);
  const settings = loadJson(parsed.settingsPath) || {};

  if (!hooksData.hooks) {
    console.error('Error: hooks.json must have a "hooks" property');
    process.exit(1);
  }

  // Initialize hooks in settings if needed
  if (!settings.hooks) {
    settings.hooks = {};
  }

  console.log(`${parsed.removeMode ? 'Removing' : 'Installing'} hooks from ${hooksPath}`);
  console.log(`Into ${parsed.settingsPath}\n`);

  // Merge or remove hooks
  if (parsed.removeMode) {
    removeHooks(settings.hooks, hooksDataForSettings.hooks);
  } else {
    mergeHooks(settings.hooks, hooksDataForSettings.hooks);
  }

  // Handle statusLine setting
  if (hooksDataForSettings.statusLine) {
    if (parsed.removeMode) {
      if (shouldRemoveStatusLine(settings.statusLine, hooksDataForSettings.statusLine)) {
        delete settings.statusLine;
        console.log('  Removed statusLine setting');
      }
    } else {
      const hasChanges = JSON.stringify(settings.statusLine) !== JSON.stringify(hooksDataForSettings.statusLine);
      if (!settings.statusLine) {
        settings.statusLine = hooksDataForSettings.statusLine;
        console.log('  Added statusLine setting');
      } else if (hasChanges) {
        settings.statusLine = hooksDataForSettings.statusLine;
        console.log('  Updated statusLine setting');
      } else {
        console.log('  Unchanged statusLine setting');
      }
    }
  }

  // Save updated settings
  try {
    saveJson(parsed.settingsPath, settings);
  } catch (error) {
    console.error(`Error: Could not write target settings path ${parsed.settingsPath} from hooks file ${hooksPath}: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nDone! Updated ${parsed.settingsPath}`);
}

main();
