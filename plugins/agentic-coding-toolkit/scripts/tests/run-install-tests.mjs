import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const require = createRequire(import.meta.url);
const { getActSettingsPath } = require(path.join(repoRoot, 'hooks/core/act-settings.js'));
const expectedToolkitPath = fs.realpathSync(repoRoot);
const gitWorktreeSkillScript = 'skills/act-git-worktree/scripts/git-worktree.sh';
const sharedRuntimeHelperNames = ['act-run-script.js', 'act-dart-migrate.js'];
const dartMigrateSnapshotDir = path.join(expectedToolkitPath, 'tools', 'act_dart_migrate');

function main() {
  testFailureOrderingInvalidSettings();
  testInstallCreatesDefaultSettings();
  testReadmeDocumentsClaudeConfigDirSyntax();
  testClaudeInstallTargetsDefaultConfigDir();
  testClaudeInstallTargetsExplicitConfigDirOnly();
  testClaudeInstallTargetsEnvConfigDirOnly();
  testClaudeInstallExplicitConfigDirOverridesEnv();
  testClaudeInstallResolvesRelativeConfigDirFromCwd();
  testClaudeInstallRejectsInvalidConfigDirUsageBeforeSideEffects();
  testCodexToolValidationAndMinimalInstall();
  testInstallCodexHooksCreatesMergesAndRemoves();
  testInstallCodexHooksFailsWithoutOverwrite();
  testCodexInstallUninstallHooksJourney();
  testCodexReinstallPreservesUserHooksAndAvoidsDuplicates();
  testReadmeDocumentsCodexGeneratedSkillCopies();
  testCodexInstallRejectsConfigDirBeforeSideEffects();
  testCodexUninstallRejectsConfigDirBeforeSideEffects();
  testCodexInstallCreatesSkillSymlinksAndCommandSkills();
  testCodexInstallReusesCurrentCheckoutSkillLinks();
  testCodexUninstallRemovesOwnedSkillsAndPreservesForeignEntries();
  testCodexUninstallDoesNotTouchAgentsSkills();
  testCodexTransformEmitsTomlAgent();
  testCodexInstallGeneratesFlatTomlAgentsAndReplacesOwnedFiles();
  testCodexUninstallRemovesOwnedAgentsAndPreservesForeignFiles();
  testInstallMergesMissingKeysOnly();
  testInstallFailsOnInvalidShape();
  testInstallFailsOnUnreadableSymlinkTarget();
  testInstallFailsOnPermissionError();
  testInstallCreatesFlatCommandSymlinks();
  testInstallRemovesLegacyToolkitCommandSymlink();
  testInstallRemovesLegacyToolkitCommandSymlinkFromAnotherCheckout();
  testInstallPromptsForMismatchedSymlinkTarget();
  testFailureOrderingInvalidSettingsCursor();
  testCursorInstallCreatesPluginSymlink();
  testCursorInstallKeepsMatchingPluginSymlinkOnReinstall();
  testCursorInstallPromptsForMismatchedPluginSymlink();
  testCursorInstallExposesRepoRootSurface();
  testCursorInstallDoesNotRequireGeneratedPluginCommandsOrAgents();
  testInstallGeneratesPlatformShapedAgents();
  testInstallOverwritesGeneratedAgentsOnReinstall();
  testInstallMigratesLegacyAgentSymlinkToCopiedFolder();
  testInstallCopiesSharedRuntimeHelper();
  testInstallFailsWhenSharedHelperCopyFails();
  testInstallRemovesWorkflowCommandsAndKeepsWorkflowSkills();
  testInstallKeepsGitSkills();
  testInstallCleansLegacyMetaSkillSymlinks();
  testUninstallCleansLegacyMetaSkillSymlinks();
  testInstalledRuntimeHelperRunsToolkitScriptFromCallerRepo();
  testInstalledRuntimeHelperFailsWithoutToolkitPath();
  testInstalledRuntimeHelperRejectsNonScriptPath();
  testInstalledRuntimeHelperRejectsSymlinkEscape();
  testInstalledRuntimeHelperRejectsNonExecutableTarget();
  testDartLauncherFailsWithoutSettings();
  testDartLauncherFailsWithoutToolkitPath();
  testDartLauncherFailsOnInvalidToolkitPath();
  testDartLauncherFailsOnMissingSnapshotAtRuntime();
  testDartLauncherFailsOnIncompletePackageShape();
  testDartLauncherFailsOnInvalidSettingsJson();
  testDartLauncherFailsOnNonDirectoryToolkitPath();
  testDartLauncherUsesConfiguredRunnerAndForwardsArgs();
  testDartLauncherFallsBackToPathDart();
  testDartLauncherRejectsEmbeddedArgumentRunnerWithoutShell();
  testDartLauncherPreservesCallerEnvironment();
  testDartLauncherPropagatesExitCode();
  testDartLauncherPropagatesChildSignal();
  testDartLauncherPropagatesBootstrapFailure();
  testOpenCodePluginSymlinkConflictAutoRelinks();
  testOpenCodePluginFileConflictPreserved();
  testUninstallDefaultsToRemovingMismatchedSymlink();
  testUninstallRemovesFlatCommandSymlinksAndLegacyToolkitCommandSymlink();
  testUninstallRemovesLegacyToolkitCommandSymlinkFromAnotherCheckout();
  testCursorUninstallRemovesOwnedPluginSymlink();
  testCursorUninstallPreservesForeignPluginSymlink();
  testUninstallRemovesGeneratedAgentFolders();
  testUninstallDoesNotMutateSettings();
  testClaudeUninstallTargetsExplicitConfigDirOnly();
  testClaudeUninstallRejectsInvalidConfigDirUsageBeforeSideEffects();
  testUninstallLeavesSharedRuntimeHelperInPlace();

  console.log('install tests: ok');
}

function testFailureOrderingInvalidSettings() {
  const homeDir = makeTempDir('act-install-fail-order-claude-');
  const settingsPath = ensureSettingsFile(homeDir, '{ invalid-json\n');
  const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(claudeSettingsPath), { recursive: true });
  const claudeSettingsContent = '{"hooks":{"PreToolUse":[{"description":"keep-me"}]}}\n';
  fs.writeFileSync(claudeSettingsPath, claudeSettingsContent);

  const claudeResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.notEqual(claudeResult.status, 0);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), '{ invalid-json\n');
  assert.equal(fs.readFileSync(claudeSettingsPath, 'utf8'), claudeSettingsContent);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'commands')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'agents')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'skills')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'hooks', 'core')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'hooks', 'claude')), false);

  const opencodeHome = makeTempDir('act-install-fail-order-opencode-');
  const opencodeSettingsPath = ensureSettingsFile(opencodeHome, '{ invalid-json\n');
  const opencodeResult = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], opencodeHome);
  assert.notEqual(opencodeResult.status, 0);
  assert.equal(fs.readFileSync(opencodeSettingsPath, 'utf8'), '{ invalid-json\n');
  assert.equal(fs.existsSync(path.join(opencodeHome, '.config', 'opencode', 'commands')), false);
  assert.equal(fs.existsSync(path.join(opencodeHome, '.config', 'opencode', 'skills')), false);
  assert.equal(
    fs.existsSync(path.join(opencodeHome, '.config', 'opencode', 'plugins', 'act-hooks-plugin.js')),
    false,
  );
}

function testInstallCreatesDefaultSettings() {
  const homeDir = makeTempDir('act-install-default-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(result.status, 0);

  const settingsPath = getActSettingsPath({ homedir: homeDir });
  assert.equal(fs.existsSync(settingsPath), true);
  const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.deepEqual(parsed, {
    enableLogging: false,
    toolkitPath: expectedToolkitPath,
  });
}

function testReadmeDocumentsClaudeConfigDirSyntax() {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.match(readme, /\.\/scripts\/install\.sh --tool claude --config-dir ~\/\.claude-work/);
  assert.match(readme, /CLAUDE_CONFIG_DIR=~\/\.claude-work \.\/scripts\/install\.sh --tool claude/);
  assert.match(readme, /\.\/scripts\/uninstall\.sh --tool claude --config-dir ~\/\.claude-work/);
  assert.match(readme, /--config-dir` first, then `CLAUDE_CONFIG_DIR`, then `~\/\.claude`/);
  assert.doesNotMatch(readme, /--config-dir=/);
}

function testClaudeInstallTargetsDefaultConfigDir() {
  const homeDir = makeTempDir('act-install-claude-default-config-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(result.status, 0, result.stderr);

  assertClaudeInstallPresent(path.join(homeDir, '.claude'));
}

function testClaudeInstallTargetsExplicitConfigDirOnly() {
  const homeDir = makeTempDir('act-install-claude-explicit-home-');
  const customDir = path.join(homeDir, 'Claude Work');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir', customDir], homeDir);
  assert.equal(result.status, 0, result.stderr);

  assertClaudeInstallPresent(customDir);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'commands')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'settings.json')), false);
}

function testClaudeInstallTargetsEnvConfigDirOnly() {
  const homeDir = makeTempDir('act-install-claude-env-home-');
  const customDir = path.join(homeDir, '.claude-work');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir, {
    env: { CLAUDE_CONFIG_DIR: customDir },
  });
  assert.equal(result.status, 0, result.stderr);

  assertClaudeInstallPresent(customDir);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'commands')), false);
}

function testClaudeInstallExplicitConfigDirOverridesEnv() {
  const homeDir = makeTempDir('act-install-claude-precedence-home-');
  const envDir = path.join(homeDir, '.claude-work');
  const explicitDir = path.join(homeDir, '.claude-personal');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir', explicitDir], homeDir, {
    env: { CLAUDE_CONFIG_DIR: envDir },
  });
  assert.equal(result.status, 0, result.stderr);

  assertClaudeInstallPresent(explicitDir);
  assert.equal(fs.existsSync(path.join(envDir, 'commands')), false);
}

function testClaudeInstallResolvesRelativeConfigDirFromCwd() {
  const homeDir = makeTempDir('act-install-claude-relative-home-');
  const cwd = makeTempDir('act-install-claude-relative-cwd-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir', 'relative claude'], homeDir, { cwd });
  assert.equal(result.status, 0, result.stderr);

  const resolvedDir = path.join(fs.realpathSync(cwd), 'relative claude');
  assertClaudeInstallPresent(resolvedDir);
  const settings = JSON.parse(fs.readFileSync(path.join(resolvedDir, 'settings.json'), 'utf8'));
  assert.equal(settings.statusLine.command, `node '${path.join(resolvedDir, 'hooks', 'claude', 'act-claude-statusline.js')}'`);
}

function testClaudeInstallRejectsInvalidConfigDirUsageBeforeSideEffects() {
  const invalid = runToolkitScript('scripts/install.sh', ['--tool', 'not-a-tool'], makeTempDir('act-install-invalid-tool-'));
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr + invalid.stdout, /claude\|opencode\|cursor\|codex/);

  for (const tool of ['opencode', 'cursor']) {
    const homeDir = makeTempDir(`act-install-invalid-config-tool-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool, '--config-dir', path.join(homeDir, 'custom')], homeDir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /only supported with --tool claude/);
    assert.equal(fs.existsSync(getSharedRuntimeHelperPath(homeDir)), false);
  }

  const missingHome = makeTempDir('act-install-missing-config-dir-');
  const missing = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir'], missingHome);
  assert.notEqual(missing.status, 0);
  assert.equal(fs.existsSync(getSharedRuntimeHelperPath(missingHome)), false);

  const emptyHome = makeTempDir('act-install-empty-config-dir-');
  const empty = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir', ''], emptyHome);
  assert.notEqual(empty.status, 0);
  assert.equal(fs.existsSync(getSharedRuntimeHelperPath(emptyHome)), false);
}

function testCodexToolValidationAndMinimalInstall() {
  const homeDir = makeTempDir('act-install-codex-minimal-');
  const removedOpenCodeSkill = path.join(homeDir, '.config', 'opencode', 'skills', 'act-meta-improve-command');
  fs.mkdirSync(path.dirname(removedOpenCodeSkill), { recursive: true });
  fs.symlinkSync(path.join(repoRoot, 'skills', '__deleted__act-meta-improve-command'), removedOpenCodeSkill);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(getSharedRuntimeHelperPath(homeDir)), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex', 'prompts')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex', 'hooks', 'core')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex', 'hooks', 'codex')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex', 'hooks.json')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex-plugin')), false);
  assert.equal(fs.lstatSync(removedOpenCodeSkill).isSymbolicLink(), true);
}

function testCodexInstallUninstallHooksJourney() {
  const homeDir = makeTempDir('act-install-codex-hooks-journey-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(installResult.status, 0, installResult.stderr);

  const hooksRoot = path.join(homeDir, '.codex', 'hooks');
  assert.equal(fs.existsSync(path.join(hooksRoot, 'core', 'act-settings.js')), true);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'core', 'act-logger.js')), true);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'codex', 'act-codex-log-session.js')), true);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'codex', 'act-codex-dart-format.js')), true);
  const hooksJsonPath = path.join(homeDir, '.codex', 'hooks.json');
  const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  assert.equal(hooksJson.hooks.SessionStart.length, 1);
  assert.equal(hooksJson.hooks.PostToolUse.length, 2);

  const sharedSettingsPath = getActSettingsPath({ homedir: homeDir });
  const sharedSettingsBefore = fs.readFileSync(sharedSettingsPath, 'utf8');
  fs.writeFileSync(path.join(hooksRoot, 'core', 'foreign.js'), '// keep\n');
  fs.writeFileSync(path.join(hooksRoot, 'codex', 'foreign.js'), '// keep\n');
  hooksJson.hooks.SessionStart.unshift({ hooks: [{ type: 'command', command: 'node /tmp/user.js' }], description: '[ACT] user lookalike' });
  fs.writeFileSync(hooksJsonPath, `${JSON.stringify(hooksJson, null, 2)}\n`);

  const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex'], homeDir);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
  const remainingHooks = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  assert.deepEqual(remainingHooks.hooks.SessionStart, [{ hooks: [{ type: 'command', command: 'node /tmp/user.js' }], description: '[ACT] user lookalike' }]);
  assert.equal(remainingHooks.hooks.PostToolUse, undefined);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'core', 'act-settings.js')), false);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'codex', 'act-codex-log-session.js')), false);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'core', 'foreign.js')), true);
  assert.equal(fs.existsSync(path.join(hooksRoot, 'codex', 'foreign.js')), true);
  assert.equal(fs.readFileSync(sharedSettingsPath, 'utf8'), sharedSettingsBefore);

  const emptyHome = makeTempDir('act-install-codex-hooks-empty-');
  assert.equal(runToolkitScript('scripts/install.sh', ['--tool', 'codex'], emptyHome).status, 0);
  assert.equal(runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex'], emptyHome).status, 0);
  assert.equal(fs.existsSync(path.join(emptyHome, '.codex', 'hooks')), false);
}

function testCodexReinstallPreservesUserHooksAndAvoidsDuplicates() {
  const homeDir = makeTempDir('act-install-codex-hooks-reinstall-');
  const first = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(first.status, 0, first.stderr);
  const hooksJsonPath = path.join(homeDir, '.codex', 'hooks.json');
  const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  const userHook = { hooks: [{ type: 'command', command: 'node /tmp/user-post.js' }], description: 'User post hook' };
  hooksJson.custom = { keep: true };
  hooksJson.hooks.PostToolUse.push(userHook, hooksJson.hooks.PostToolUse[0]);
  fs.writeFileSync(hooksJsonPath, `${JSON.stringify(hooksJson, null, 2)}\n`);

  const second = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(second.status, 0, second.stderr);
  const reinstalled = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  assert.deepEqual(reinstalled.custom, { keep: true });
  assert.equal(reinstalled.hooks.PostToolUse.filter((entry) => entry.hooks[0].command.includes('act-codex-dart-format.js')).length, 1);
  assert.equal(reinstalled.hooks.PostToolUse.filter((entry) => entry.hooks[0].command.includes('act-codex-log-session.js')).length, 1);
  assert.equal(reinstalled.hooks.PostToolUse.some((entry) => entry.hooks[0].command === userHook.hooks[0].command), true);
}

function testInstallCodexHooksCreatesMergesAndRemoves() {
  const homeDir = makeTempDir('act-install-codex-hooks-home-');
  const targetPath = path.join(homeDir, '.codex', 'hooks.json');
  const hookDir = path.join(homeDir, "Codex Hook's Dir", 'codex');
  const userHook = {
    hooks: [{ type: 'command', command: 'node /tmp/user.js' }],
    description: '[ACT] User-owned lookalike',
  };
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify({ custom: true, hooks: { SessionStart: [userHook] } }, null, 2));

  const first = runInstallCodexHooks({ targetPath, hookDir });
  assert.equal(first.status, 0, first.stderr);
  const second = runInstallCodexHooks({ targetPath, hookDir });
  assert.equal(second.status, 0, second.stderr);

  const installed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const quotedLogPath = `'${path.join(hookDir, 'act-codex-log-session.js').replaceAll("'", "'\\''")}'`;
  const quotedFormatPath = `'${path.join(hookDir, 'act-codex-dart-format.js').replaceAll("'", "'\\''")}'`;
  assert.equal(installed.custom, true);
  assert.deepEqual(installed.hooks.SessionStart[0], userHook);
  assert.equal(installed.hooks.SessionStart.length, 2);
  assert.equal(installed.hooks.SessionStart[1].hooks[0].command, `node ${quotedLogPath}`);
  assert.equal(installed.hooks.PostToolUse[0].hooks[0].command, `node ${quotedFormatPath}`);
  assert.equal(installed.hooks.PostToolUse[1].hooks[0].command, `node ${quotedLogPath}`);

  const remove = runInstallCodexHooks({ targetPath, hookDir, remove: true });
  assert.equal(remove.status, 0, remove.stderr);
  const removed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  assert.equal(removed.custom, true);
  assert.deepEqual(removed.hooks.SessionStart, [userHook]);
  assert.equal(removed.hooks.PostToolUse, undefined);

  const emptyTarget = path.join(homeDir, '.codex', 'empty-hooks.json');
  assert.equal(runInstallCodexHooks({ targetPath: emptyTarget, hookDir }).status, 0);
  assert.equal(fs.existsSync(emptyTarget), true);
  assert.equal(runInstallCodexHooks({ targetPath: emptyTarget, hookDir, remove: true }).status, 0);
  assert.equal(fs.existsSync(emptyTarget), false);
}

function testInstallCodexHooksFailsWithoutOverwrite() {
  const homeDir = makeTempDir('act-install-codex-hooks-invalid-');
  const targetPath = path.join(homeDir, '.codex', 'hooks.json');
  const hookDir = path.join(homeDir, '.codex', 'hooks', 'codex');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, '[]\n');

  const result = runInstallCodexHooks({ targetPath, hookDir });
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(targetPath, 'utf8'), '[]\n');
  assert.match(result.stderr, /target hooks file must contain a JSON object/);
}

function testReadmeDocumentsCodexGeneratedSkillCopies() {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.match(readme, /generated Codex-compatible skill copies under `~\/\.codex\/skills\/`/);
  assert.match(readme, /Canonical source skills remain shared with Claude Code, OpenCode, and Cursor/);
  assert.match(readme, /rerun this command after ACT updates/);
  assert.match(readme, /Restart Codex if the `\/skills` output or `\$act-\*` wording looks stale/);
}

function testCodexInstallRejectsConfigDirBeforeSideEffects() {
  const homeDir = makeTempDir('act-install-codex-config-dir-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'codex', '--config-dir', path.join(homeDir, 'custom')], homeDir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /only supported with --tool claude/);
  assert.equal(fs.existsSync(getSharedRuntimeHelperPath(homeDir)), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.agents')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex')), false);
}

function testCodexUninstallRejectsConfigDirBeforeSideEffects() {
  const homeDir = makeTempDir('act-uninstall-codex-config-dir-');
  const result = runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex', '--config-dir', path.join(homeDir, 'custom')], homeDir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /only supported with --tool claude/);
  assert.equal(fs.existsSync(path.join(homeDir, '.agents')), false);
  assert.equal(fs.existsSync(path.join(homeDir, '.codex')), false);
}

function testCodexInstallCreatesSkillSymlinksAndCommandSkills() {
  const homeDir = makeTempDir('act-install-codex-skills-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(result.status, 0, result.stderr);

  const skillsRoot = path.join(homeDir, '.codex', 'skills');
  const legacySkillsRoot = path.join(homeDir, '.agents', 'skills');
  assertCodexGeneratedSkill(skillsRoot, 'act-flutter-create');
  assert.equal(fs.lstatSync(path.join(skillsRoot, 'act-flutter-create')).isSymbolicLink(), false);
  assert.equal(fs.lstatSync(path.join(skillsRoot, 'act-flutter-create', 'SKILL.md')).isFile(), true);
  assert.equal(fs.lstatSync(path.join(skillsRoot, 'act-flutter-create', 'SKILL.md')).isSymbolicLink(), false);
  assert.equal(fs.lstatSync(path.join(skillsRoot, 'act-flutter-create', 'scripts')).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(path.join(skillsRoot, 'act-flutter-create', 'scripts')), path.join(repoRoot, 'skills', 'act-flutter-create', 'scripts'));
  assert.equal(fs.existsSync(path.join(legacySkillsRoot, 'act-flutter-create')), false);

  for (const [skillName, commandFile] of [['act-help', 'act-help.md'], ['act-update', 'act-update.md']]) {
    const skillFile = path.join(skillsRoot, skillName, 'SKILL.md');
    const generated = fs.readFileSync(skillFile, 'utf8');
    assert.equal(fs.lstatSync(skillFile).isFile(), true);
    assert.equal(fs.lstatSync(skillFile).isSymbolicLink(), false);
    assert.match(generated, new RegExp(`ACT generated Codex skill from commands/${commandFile}`));
    assert.equal(fs.existsSync(path.join(legacySkillsRoot, skillName)), false);
  }
}

function testCodexInstallReusesCurrentCheckoutSkillLinks() {
  const homeDir = makeTempDir('act-install-codex-skills-reinstall-');
  const first = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(first.status, 0, first.stderr);

  const generatedSkill = path.join(homeDir, '.codex', 'skills', 'act-flutter-create', 'SKILL.md');
  fs.writeFileSync(generatedSkill, fs.readFileSync(generatedSkill, 'utf8').replace('Create a new Flutter project', 'Create a stale Flutter project'));

  const second = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout + second.stderr, /regenerated/);
  assert.doesNotMatch(fs.readFileSync(generatedSkill, 'utf8'), /stale Flutter project/);
  assertCodexGeneratedSkill(path.join(homeDir, '.codex', 'skills'), 'act-flutter-create');
}

function testCodexUninstallRemovesOwnedSkillsAndPreservesForeignEntries() {
  const homeDir = makeTempDir('act-uninstall-codex-skills-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(installResult.status, 0, installResult.stderr);

  const skillsRoot = path.join(homeDir, '.codex', 'skills');
  const foreignSkill = path.join(skillsRoot, 'act-foreign');
  const foreignTarget = path.join(homeDir, 'foreign-skill');
  fs.mkdirSync(foreignTarget, { recursive: true });
  fs.symlinkSync(foreignTarget, foreignSkill);
  const foreignHelp = path.join(skillsRoot, 'act-help-foreign');
  fs.mkdirSync(foreignHelp, { recursive: true });
  fs.writeFileSync(path.join(foreignHelp, 'SKILL.md'), '# local\n');

  const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex'], homeDir);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'act-flutter-create')), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'act-help')), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'act-update')), false);
  assert.equal(fs.lstatSync(foreignSkill).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(foreignHelp, 'SKILL.md')), true);
}

function testCodexUninstallDoesNotTouchAgentsSkills() {
  const homeDir = makeTempDir('act-uninstall-codex-ignore-agents-skills-');
  const skillsRoot = path.join(homeDir, '.agents', 'skills');
  const oldGeneratedSkill = path.join(skillsRoot, 'act-flutter-create');
  fs.mkdirSync(oldGeneratedSkill, { recursive: true });
  fs.writeFileSync(path.join(oldGeneratedSkill, 'SKILL.md'), [
    '---',
    'name: act-flutter-create',
    'description: Create a Flutter project.',
    '---',
    '<!-- ACT generated Codex skill from skills/act-flutter-create/SKILL.md. Do not edit this installed copy. -->',
    '',
  ].join('\n'));

  const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex'], homeDir);

  assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
  assert.equal(fs.existsSync(path.join(oldGeneratedSkill, 'SKILL.md')), true);
}

function testCodexTransformEmitsTomlAgent() {
  const tempDir = makeTempDir('act-transform-codex-');
  const input = path.join(tempDir, 'plain-agent.md');
  const output = path.join(tempDir, 'plain-agent.toml');
  const body = 'Line with "quotes" and \\backslashes\\.\n\n```dart\nfinal text = "hello";\n```\n';
  fs.writeFileSync(input, `---\nname: researcher\ndescription: Research things.\ntools: [Read]\n---\n${body}`);

  const result = spawnSync('node', [path.join(repoRoot, 'scripts', 'lib', 'transform-agent.js'), '--tool', 'codex', '--input', input, '--output', output], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const generated = fs.readFileSync(output, 'utf8');
  assert.match(generated, /# ACT-GENERATED: agentic-coding-toolkit/);
  assert.match(generated, /# ACT-SOURCE:/);
  assert.match(generated, /# ACT-TOOLKIT-PATH:/);
  assert.match(generated, /name = "act-researcher"/);
  assert.match(generated, /description = "Research things\."/);
  assert.match(generated, /sandbox_mode = "read-only"/);
  assert.match(generated, /developer_instructions = """\n/);
  assert.match(generated, /\\\\backslashes\\\\/);
  assert.match(generated, /```dart/);
}

function testCodexInstallGeneratesFlatTomlAgentsAndReplacesOwnedFiles() {
  const homeDir = makeTempDir('act-install-codex-agents-');
  const first = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(first.status, 0, first.stderr);

  const agentsRoot = path.join(homeDir, '.codex', 'agents');
  const agentPath = path.join(agentsRoot, 'act-flutter-patterns-researcher.toml');
  assert.equal(fs.lstatSync(agentPath).isFile(), true);
  assert.equal(fs.existsSync(path.join(agentsRoot, 'act')), false);
  const generated = fs.readFileSync(agentPath, 'utf8');
  assert.match(generated, /# ACT-GENERATED: agentic-coding-toolkit/);
  assert.match(generated, /# ACT-SOURCE: agents\/act\/flutter-patterns-researcher\.md/);
  assert.match(generated, new RegExp(`# ACT-TOOLKIT-PATH: ${escapeRegExp(expectedToolkitPath)}`));
  assert.match(generated, /name = "act-flutter-patterns-researcher"/);
  assert.match(generated, /sandbox_mode = "read-only"/);

  fs.writeFileSync(agentPath, generated.replace('read-only', 'stale'));
  const second = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(second.status, 0, second.stderr);
  assert.match(fs.readFileSync(agentPath, 'utf8'), /sandbox_mode = "read-only"/);
}

function testCodexUninstallRemovesOwnedAgentsAndPreservesForeignFiles() {
  const homeDir = makeTempDir('act-uninstall-codex-agents-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'codex'], homeDir);
  assert.equal(installResult.status, 0, installResult.stderr);

  const agentsRoot = path.join(homeDir, '.codex', 'agents');
  const ownedAgent = path.join(agentsRoot, 'act-flutter-patterns-researcher.toml');
  const foreignActAgent = path.join(agentsRoot, 'act-foreign.toml');
  const foreignPlainAgent = path.join(agentsRoot, 'local.toml');
  fs.writeFileSync(foreignActAgent, 'name = "act-foreign"\n');
  fs.writeFileSync(foreignPlainAgent, 'name = "local"\n');

  const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'codex'], homeDir, { input: 'n\n\n' });
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
  assert.equal(fs.existsSync(ownedAgent), false);
  assert.equal(fs.existsSync(foreignActAgent), true);
  assert.equal(fs.existsSync(foreignPlainAgent), true);
}

function testFailureOrderingInvalidSettingsCursor() {
  const homeDir = makeTempDir('act-install-fail-order-cursor-');
  const settingsPath = ensureSettingsFile(homeDir, '{ invalid-json\n');

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), '{ invalid-json\n');
  assert.equal(fs.existsSync(getCursorPluginPath(homeDir)), false);
}

function testInstallMergesMissingKeysOnly() {
  const homeDir = makeTempDir('act-install-merge-');
  const settingsPath = ensureSettingsFile(homeDir, '{"customValue":123}\n');

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], homeDir);
  assert.equal(result.status, 0);

  const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.equal(merged.enableLogging, false);
  assert.equal(merged.toolkitPath, expectedToolkitPath);
  assert.equal(merged.customValue, 123);

  fs.writeFileSync(
    settingsPath,
    '{"enableLogging":true,"toolkitPath":"/tmp/stale-toolkit","customValue":456}\n',
  );
  const second = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], homeDir);
  assert.equal(second.status, 0);
  const preserved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.equal(preserved.enableLogging, true);
  assert.equal(preserved.toolkitPath, expectedToolkitPath);
  assert.equal(preserved.customValue, 456);
}

function testInstallFailsOnInvalidShape() {
  const homeDir = makeTempDir('act-install-invalid-shape-');
  const settingsPath = ensureSettingsFile(homeDir, '[]\n');

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), '[]\n');
  assert.match(result.stderr + result.stdout, /settings file must contain a JSON object/);
}

function testInstallFailsOnUnreadableSymlinkTarget() {
  const homeDir = makeTempDir('act-install-unreadable-symlink-');
  const settingsPath = getActSettingsPath({ homedir: homeDir });
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.symlinkSync(path.join(homeDir, 'missing-target.json'), settingsPath);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.notEqual(result.status, 0);
  assert.equal(fs.lstatSync(settingsPath).isSymbolicLink(), true);
  assert.match(result.stderr + result.stdout, /failed to read settings metadata/);
}

function testInstallFailsOnPermissionError() {
  const homeDir = makeTempDir('act-install-perm-');
  const configRoot = path.join(homeDir, '.config');
  fs.mkdirSync(configRoot, { recursive: true });
  fs.chmodSync(configRoot, 0o555);

  try {
    const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /act-settings\.json/);
  } finally {
    fs.chmodSync(configRoot, 0o755);
  }
}

function testInstallCreatesFlatCommandSymlinks() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-commands-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    const commandsRoot = getCommandsRoot(homeDir, tool);
    for (const basename of getExpectedCommandFiles()) {
      const installedPath = path.join(commandsRoot, basename);
      assert.equal(fs.lstatSync(installedPath).isSymbolicLink(), true, `${tool} missing ${basename}`);
      assert.equal(fs.readlinkSync(installedPath), path.join(repoRoot, 'commands', basename));
    }

    assert.equal(fs.existsSync(path.join(commandsRoot, 'act')), false, `${tool} should not install commands/act`);
  }
}

function testInstallRemovesLegacyToolkitCommandSymlink() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-command-migration-${tool}-`);
    const commandsRoot = getCommandsRoot(homeDir, tool);
    fs.mkdirSync(commandsRoot, { recursive: true });

    const legacyLink = path.join(commandsRoot, 'act');
    fs.symlinkSync(path.join(repoRoot, 'commands', 'act'), legacyLink);

    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(legacyLink), false, `${tool} should remove legacy commands/act symlink`);
  }
}

function testInstallRemovesLegacyToolkitCommandSymlinkFromAnotherCheckout() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-command-migration-other-path-${tool}-`);
    const commandsRoot = getCommandsRoot(homeDir, tool);
    fs.mkdirSync(commandsRoot, { recursive: true });

    const legacyLink = path.join(commandsRoot, 'act');
    fs.symlinkSync(makeLegacyCommandSourceDir(), legacyLink);

    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(legacyLink), false, `${tool} should remove legacy commands/act symlink from another checkout`);
  }
}

function testInstallPromptsForMismatchedSymlinkTarget() {
  const homeDir = makeTempDir('act-install-mismatched-link-');
  const skillsDir = path.join(homeDir, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  const installedSkillLink = path.join(skillsDir, 'act-flutter-create');
  const wrongTarget = path.join(homeDir, 'external-skill');
  fs.mkdirSync(wrongTarget, { recursive: true });
  fs.symlinkSync(wrongTarget, installedSkillLink);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir, { input: '\n' });
  assert.equal(result.status, 0);
  assert.match(result.stdout + result.stderr, /act-flutter-create points to:/);
  assert.match(result.stdout + result.stderr, /Replaced/);
  assert.equal(fs.readlinkSync(installedSkillLink), path.join(repoRoot, 'skills', 'act-flutter-create'));
}

function testOpenCodePluginSymlinkConflictAutoRelinks() {
  const homeDir = makeTempDir('act-install-opencode-relink-');
  const pluginsDir = path.join(homeDir, '.config', 'opencode', 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });

  const pluginLink = path.join(pluginsDir, 'act-hooks-plugin.js');
  const staleTarget = path.join(homeDir, 'stale-plugin.js');
  fs.writeFileSync(staleTarget, '// stale\n');
  fs.symlinkSync(staleTarget, pluginLink);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], homeDir);
  assert.equal(result.status, 0);

  const expectedTarget = path.join(repoRoot, 'hooks', 'opencode', 'act-hooks-plugin.js');
  assert.equal(fs.lstatSync(pluginLink).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(pluginLink), expectedTarget);
}

function testCursorInstallCreatesPluginSymlink() {
  const homeDir = makeTempDir('act-install-cursor-plugin-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(result.status, 0, result.stderr);

  const pluginLink = getCursorPluginPath(homeDir);
  assert.equal(fs.lstatSync(pluginLink).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(pluginLink), repoRoot);
}

function testCursorInstallKeepsMatchingPluginSymlinkOnReinstall() {
  const homeDir = makeTempDir('act-install-cursor-plugin-reinstall-');
  const first = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(first.status, 0, first.stderr);

  const second = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout + second.stderr, /already exists/);
  assert.equal(fs.readlinkSync(getCursorPluginPath(homeDir)), repoRoot);
}

function testCursorInstallPromptsForMismatchedPluginSymlink() {
  const homeDir = makeTempDir('act-install-cursor-plugin-mismatch-');
  const pluginDir = path.dirname(getCursorPluginPath(homeDir));
  fs.mkdirSync(pluginDir, { recursive: true });

  const wrongTarget = path.join(homeDir, 'external-cursor-plugin');
  fs.mkdirSync(wrongTarget, { recursive: true });
  fs.symlinkSync(wrongTarget, getCursorPluginPath(homeDir));

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir, { input: '\n' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout + result.stderr, /agentic-coding-toolkit points to:/);
  assert.match(result.stdout + result.stderr, /Replaced/);
  assert.equal(fs.readlinkSync(getCursorPluginPath(homeDir)), repoRoot);
}

function testCursorInstallExposesRepoRootSurface() {
  const homeDir = makeTempDir('act-install-cursor-surface-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(result.status, 0, result.stderr);

  const pluginLink = getCursorPluginPath(homeDir);
  const pluginTarget = fs.realpathSync(pluginLink);
  assert.equal(pluginTarget, expectedToolkitPath);

  for (const relPath of [
    'commands',
    'agents',
    'skills',
    'commands/act-help.md',
    'commands/act-update.md',
    'agents/act/codebase-researcher.md',
    'skills/act-workflow-plan/SKILL.md',
  ]) {
    assert.equal(fs.existsSync(path.join(pluginTarget, relPath)), true, `Cursor plugin target missing ${relPath}`);
  }
}

function testCursorInstallDoesNotRequireGeneratedPluginCommandsOrAgents() {
  const homeDir = makeTempDir('act-install-cursor-no-generated-surface-');
  const result = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(result.status, 0, result.stderr);

  const pluginTarget = fs.realpathSync(getCursorPluginPath(homeDir));
  assert.equal(fs.existsSync(path.join(pluginTarget, '.cursor-plugin', 'plugin.json')), true);
  assert.equal(fs.existsSync(path.join(pluginTarget, '.cursor-plugin', 'commands')), false);
  assert.equal(fs.existsSync(path.join(pluginTarget, '.cursor-plugin', 'agents')), false);
}

function testInstallGeneratesPlatformShapedAgents() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-agents-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    const targetRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'agents', 'act')
      : path.join(homeDir, '.config', 'opencode', 'agents', 'act');
    assert.equal(fs.lstatSync(targetRoot).isDirectory(), true);

    const installedAgentPath = path.join(targetRoot, 'flutter-patterns-researcher.md');
    const sourceAgentPath = path.join(repoRoot, 'agents', 'act', 'flutter-patterns-researcher.md');
    const installed = fs.readFileSync(installedAgentPath, 'utf8');
    const source = fs.readFileSync(sourceAgentPath, 'utf8');

    assert.equal(getMarkdownBody(installed), getMarkdownBody(source));

    const installedKeys = getFrontMatterKeys(installed);
    if (tool === 'claude') {
      assert.equal(installedKeys.has('tools'), true);
      assert.equal(installedKeys.has('color'), true);
      assert.equal(installedKeys.has('mode'), false);
      assert.equal(installedKeys.has('permission'), false);
    } else {
      assert.equal(installedKeys.has('mode'), true);
      assert.equal(installedKeys.has('permission'), true);
      assert.equal(installedKeys.has('tools'), false);
      assert.equal(installedKeys.has('color'), false);
    }
  }
}

function testInstallOverwritesGeneratedAgentsOnReinstall() {
  const homeDir = makeTempDir('act-install-agents-reinstall-');
  const first = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(first.status, 0, first.stderr);

  const installedAgentPath = path.join(homeDir, '.claude', 'agents', 'act', 'flutter-patterns-researcher.md');
  fs.writeFileSync(installedAgentPath, 'stale-generated-agent\n');

  const second = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(second.status, 0, second.stderr);

  const restoredContent = fs.readFileSync(installedAgentPath, 'utf8');
  assert.match(restoredContent, /^---\n/);
  assert.equal(getFrontMatterKeys(restoredContent).has('permission'), false);
}

function testInstallMigratesLegacyAgentSymlinkToCopiedFolder() {
  const homeDir = makeTempDir('act-install-agents-migrate-');
  const agentsDir = path.join(homeDir, '.config', 'opencode', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const legacyLink = path.join(agentsDir, 'act');
  fs.symlinkSync(path.join(repoRoot, 'agents', 'act'), legacyLink);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], homeDir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.lstatSync(legacyLink).isDirectory(), true);
  assert.equal(fs.lstatSync(legacyLink).isSymbolicLink(), false);

  const installedKeys = getFrontMatterKeys(fs.readFileSync(path.join(legacyLink, 'codebase-researcher.md'), 'utf8'));
  assert.equal(installedKeys.has('mode'), true);
  assert.equal(installedKeys.has('tools'), false);
}

function testInstallCopiesSharedRuntimeHelper() {
  for (const tool of ['claude', 'opencode', 'cursor', 'codex']) {
    const homeDir = makeTempDir(`act-install-helper-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    for (const helperName of sharedRuntimeHelperNames) {
      const helperSourcePath = path.join(repoRoot, 'scripts', 'lib', helperName);
      const helperPath = getSharedBinHelperPath(homeDir, helperName);
      assert.equal(fs.existsSync(helperPath), true, `${tool} missing ${helperName}`);
      assert.equal(fs.readFileSync(helperPath, 'utf8'), fs.readFileSync(helperSourcePath, 'utf8'));
      assert.notEqual(fs.statSync(helperPath).mode & 0o111, 0);
    }
  }
}

function testInstallFailsWhenSharedHelperCopyFails() {
  // Make the shared bin directory exist but be read-only so settings bootstrap
  // still succeeds (it writes to the config root) while the helper copy fails.
  const homeDir = makeTempDir('act-install-helper-fatal-');
  const sharedBinDir = path.join(homeDir, '.config', 'agentic-coding-toolkit', 'bin');
  fs.mkdirSync(sharedBinDir, { recursive: true });
  fs.chmodSync(sharedBinDir, 0o555);

  try {
    const result = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
    assert.notEqual(result.status, 0, 'install should fail when a shared helper cannot be copied');
    assert.match(result.stdout + result.stderr, /Failed to install helper/);
    // Install left visibly failed: no shared helper landed in the bin dir.
    for (const helperName of sharedRuntimeHelperNames) {
      assert.equal(fs.existsSync(getSharedBinHelperPath(homeDir, helperName)), false, `${helperName} should not be installed`);
    }
  } finally {
    fs.chmodSync(sharedBinDir, 0o755);
  }
}

function testInstallRemovesWorkflowCommandsAndKeepsWorkflowSkills() {
  const workflowSkills = [
    'act-workflow-spec',
    'act-workflow-refine-spec',
    'act-workflow-plan',
    'act-workflow-work',
    'act-workflow-compound',
  ];

  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-workflow-migration-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    const commandsActRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'commands', 'act')
      : path.join(homeDir, '.config', 'opencode', 'commands', 'act');
    assert.equal(fs.existsSync(path.join(commandsActRoot, 'workflow')), false);

    const skillsRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'skills')
      : path.join(homeDir, '.config', 'opencode', 'skills');
    for (const skillName of workflowSkills) {
      assert.equal(fs.existsSync(path.join(skillsRoot, skillName)), true, `${tool} missing ${skillName}`);
    }
  }
}

function testInstallKeepsGitSkills() {
  const gitMetaSkills = [
    'act-git-commit',
    'act-git-commit-all',
    'act-git-push-make-pr',
    'act-git-switch-main-pull',
  ];

  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-git-meta-migration-${tool}-`);
    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    const commandsActRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'commands', 'act')
      : path.join(homeDir, '.config', 'opencode', 'commands', 'act');
    assert.equal(fs.existsSync(path.join(commandsActRoot, 'git')), false);
    assert.equal(fs.existsSync(path.join(commandsActRoot, 'meta')), false);

    const skillsRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'skills')
      : path.join(homeDir, '.config', 'opencode', 'skills');
    for (const skillName of gitMetaSkills) {
      assert.equal(fs.existsSync(path.join(skillsRoot, skillName)), true, `${tool} missing ${skillName}`);
    }
  }
}

function testInstallCleansLegacyMetaSkillSymlinks() {
  const legacySkills = getRemovedActSkills();

  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-legacy-meta-cleanup-${tool}-`);
    const skillsRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'skills')
      : path.join(homeDir, '.config', 'opencode', 'skills');
    fs.mkdirSync(skillsRoot, { recursive: true });

    const staleTargets = {};
    for (const skillName of legacySkills) {
      const staleTarget = path.join(repoRoot, 'skills', `__deleted__${skillName}`);
      staleTargets[skillName] = staleTarget;
      fs.symlinkSync(staleTarget, path.join(skillsRoot, skillName));
    }
    const forkLink = path.join(skillsRoot, 'act-meta-compare-commands-fork');
    const forkTarget = path.join(homeDir, 'fork-skill');
    fs.mkdirSync(forkTarget, { recursive: true });
    fs.symlinkSync(forkTarget, forkLink);
    const realDir = path.join(skillsRoot, 'act-meta-improve-command-local');
    fs.mkdirSync(realDir, { recursive: true });
    fs.writeFileSync(path.join(realDir, 'SKILL.md'), '# local\n');

    const result = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    for (const skillName of legacySkills) {
      const linkPath = path.join(skillsRoot, skillName);
      const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
      if (stat) {
        assert.equal(stat.isSymbolicLink(), true, `${tool} ${skillName} should be a symlink if present`);
        assert.notEqual(
          fs.readlinkSync(linkPath),
          staleTargets[skillName],
          `${tool} legacy symlink ${skillName} still points at the seeded stale target`,
        );
      }
      const matcher = skillName === 'act-meta-audit-work'
        ? new RegExp(`(?:Removed legacy symlink: .*${skillName}|${skillName} .*no longer valid)`)
        : new RegExp(`Removed legacy symlink: .*${skillName}`);
      assert.match(result.stdout, matcher, `${tool} install missing line for ${skillName}`);
    }

    assert.equal(fs.lstatSync(forkLink).isSymbolicLink(), true, `${tool} fork control symlink should be preserved`);
    assert.equal(fs.readlinkSync(forkLink), forkTarget, `${tool} fork target should be unchanged`);
    assert.equal(fs.existsSync(realDir), true, `${tool} real-dir control should be preserved`);
    assert.equal(fs.lstatSync(realDir).isDirectory(), true, `${tool} real-dir control should still be a directory`);
    assert.equal(fs.readFileSync(path.join(realDir, 'SKILL.md'), 'utf8'), '# local\n');

    assert.equal(
      result.stdout.includes('agentic-coding-toolkit-meta'),
      false,
      `${tool} install must not advertise the maintainer meta repo`,
    );
  }
}

function testUninstallCleansLegacyMetaSkillSymlinks() {
  const legacySkills = getRemovedActSkills();

  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-uninstall-legacy-meta-cleanup-${tool}-`);
    const skillsRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'skills')
      : path.join(homeDir, '.config', 'opencode', 'skills');
    fs.mkdirSync(skillsRoot, { recursive: true });

    const staleTargets = {};
    for (const skillName of legacySkills) {
      const staleTarget = path.join(repoRoot, 'skills', `__deleted__${skillName}`);
      staleTargets[skillName] = staleTarget;
      fs.symlinkSync(staleTarget, path.join(skillsRoot, skillName));
    }
    const forkLink = path.join(skillsRoot, 'act-meta-compare-commands-fork');
    const forkTarget = path.join(homeDir, 'fork-skill');
    fs.mkdirSync(forkTarget, { recursive: true });
    fs.symlinkSync(forkTarget, forkLink);
    const realDir = path.join(skillsRoot, 'act-meta-improve-command-local');
    fs.mkdirSync(realDir, { recursive: true });
    fs.writeFileSync(path.join(realDir, 'SKILL.md'), '# local\n');

    const result = runToolkitScript('scripts/uninstall.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);

    for (const skillName of legacySkills) {
      const linkPath = path.join(skillsRoot, skillName);
      const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
      assert.equal(
        stat?.isSymbolicLink() ?? false,
        false,
        `${tool} legacy symlink ${skillName} should be removed by uninstall`,
      );
    }

    assert.equal(fs.lstatSync(forkLink).isSymbolicLink(), true, `${tool} fork control symlink should be preserved`);
    assert.equal(fs.readlinkSync(forkLink), forkTarget, `${tool} fork target should be unchanged`);
    assert.equal(fs.existsSync(realDir), true, `${tool} real-dir control should be preserved`);
    assert.equal(fs.lstatSync(realDir).isDirectory(), true, `${tool} real-dir control should still be a directory`);
  }
}

function testInstalledRuntimeHelperRunsToolkitScriptFromCallerRepo() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-install-helper-runtime-${tool}-`);
    const installResult = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(installResult.status, 0);

    const callerRepo = makeTempDir(`act-helper-caller-repo-${tool}-`);
    const initResult = spawnSync('git', ['init'], {
      cwd: callerRepo,
      encoding: 'utf8',
    });
    assert.equal(initResult.status, 0, initResult.stderr);

    const helperResult = spawnSync('node', [getSharedRuntimeHelperPath(homeDir), gitWorktreeSkillScript, 'help'], {
      cwd: callerRepo,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
      },
    });
    assert.equal(helperResult.status, 0, helperResult.stderr);
    assert.match(helperResult.stdout, /Git Worktree Manager/);
    assert.match(helperResult.stdout, /Usage:/);
  }
}

function testInstalledRuntimeHelperFailsWithoutToolkitPath() {
  const homeDir = makeTempDir('act-install-helper-missing-toolkit-path-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(installResult.status, 0);

  const settingsPath = getActSettingsPath({ homedir: homeDir });
  fs.writeFileSync(settingsPath, '{"enableLogging":false}\n');

  const callerRepo = makeTempDir('act-helper-missing-toolkit-path-repo-');
  const initResult = spawnSync('git', ['init'], {
    cwd: callerRepo,
    encoding: 'utf8',
  });
  assert.equal(initResult.status, 0, initResult.stderr);

  const helperResult = spawnSync('node', [getSharedRuntimeHelperPath(homeDir), gitWorktreeSkillScript, 'help'], {
    cwd: callerRepo,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
    },
  });
  assert.notEqual(helperResult.status, 0);
  assert.match(helperResult.stderr, /missing toolkitPath/);
}

function testInstalledRuntimeHelperRejectsNonScriptPath() {
  const homeDir = makeTempDir('act-install-helper-invalid-script-path-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(installResult.status, 0);

  const helperResult = spawnSync('node', [getSharedRuntimeHelperPath(homeDir), 'hooks/core/act-settings.js'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
    },
  });

  assert.notEqual(helperResult.status, 0);
  assert.match(helperResult.stderr, /toolkit-owned script locations/);
}

function testInstalledRuntimeHelperRejectsSymlinkEscape() {
  const homeDir = makeTempDir('act-install-helper-symlink-escape-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(installResult.status, 0);

  const fakeToolkitRoot = makeTempDir('act-helper-fake-toolkit-');
  const escapedScriptTarget = path.join(makeTempDir('act-helper-outside-script-'), 'escaped.sh');
  fs.writeFileSync(escapedScriptTarget, '#!/bin/bash\necho escaped\n');
  fs.chmodSync(escapedScriptTarget, 0o755);

  const linkedScriptPath = path.join(fakeToolkitRoot, 'skills', 'act-fake', 'scripts', 'escaped.sh');
  fs.mkdirSync(path.dirname(linkedScriptPath), { recursive: true });
  fs.symlinkSync(escapedScriptTarget, linkedScriptPath);

  const settingsPath = getActSettingsPath({ homedir: homeDir });
  fs.writeFileSync(settingsPath, `{"enableLogging":false,"toolkitPath":${JSON.stringify(fakeToolkitRoot)}}\n`);

  const helperResult = spawnSync('node', [getSharedRuntimeHelperPath(homeDir), 'skills/act-fake/scripts/escaped.sh'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
    },
  });

  assert.notEqual(helperResult.status, 0);
  assert.match(helperResult.stderr, /escapes the toolkit root/);
}

function testInstalledRuntimeHelperRejectsNonExecutableTarget() {
  const homeDir = makeTempDir('act-install-helper-non-executable-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(installResult.status, 0);

  const fakeToolkitRoot = makeTempDir('act-helper-fake-toolkit-');
  const nonExecutableScriptPath = path.join(fakeToolkitRoot, 'skills', 'act-fake', 'scripts', 'non-executable.sh');
  fs.mkdirSync(path.dirname(nonExecutableScriptPath), { recursive: true });
  fs.writeFileSync(nonExecutableScriptPath, '#!/bin/bash\necho should-not-run\n');
  fs.chmodSync(nonExecutableScriptPath, 0o644);

  const settingsPath = getActSettingsPath({ homedir: homeDir });
  fs.writeFileSync(settingsPath, `{"enableLogging":false,"toolkitPath":${JSON.stringify(fakeToolkitRoot)}}\n`);

  const helperResult = spawnSync('node', [getSharedRuntimeHelperPath(homeDir), 'skills/act-fake/scripts/non-executable.sh'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
    },
  });

  assert.notEqual(helperResult.status, 0);
  assert.match(helperResult.stderr, /not executable/);
}

// ============================================================
// Dart Migration Launcher behavior tests.
//
// These exercise launcher plumbing (settings resolution, package-shape
// validation, Dart Runner selection, cwd, stdout/stderr routing, argument
// forwarding, and exit-code propagation) using fake Dart runner fixtures
// instead of migration-output goldens, so they never depend on a real Dart SDK
// or assert migration engine semantics.
// ============================================================

// Writes a fake Dart Runner that records its cwd and arguments per invocation
// to ACT_FAKE_RUNNER_LOG and emits phase-tagged stdout/stderr markers.
function makeFakeDartRunner(dirPrefix, { name = 'fake-dart' } = {}) {
  const dir = makeTempDir(dirPrefix);
  const runnerPath = path.join(dir, name);
  fs.writeFileSync(
    runnerPath,
    [
      '#!/bin/bash',
      'log="$ACT_FAKE_RUNNER_LOG"',
      'if [ -n "$log" ]; then',
      '  printf "cwd=%s\\n" "$PWD" >> "$log"',
      '  printf "args=%s\\n" "$*" >> "$log"',
      'fi',
      'if [ "$1" = "pub" ]; then',
      '  echo "BOOTSTRAP_STDOUT_MARKER"',
      '  echo "BOOTSTRAP_STDERR_MARKER" 1>&2',
      '  if [ -n "$ACT_FAKE_BOOTSTRAP_SIGNAL" ]; then',
      '    kill -s "$ACT_FAKE_BOOTSTRAP_SIGNAL" $$',
      '  fi',
      '  exit "${ACT_FAKE_BOOTSTRAP_EXIT:-0}"',
      'fi',
      'if [ "$1" = "run" ]; then',
      '  shift',
      '  echo "MIGRATION_STDOUT $*"',
      '  if [ -n "$ACT_FAKE_ECHO_ENV" ]; then',
      '    echo "MIGRATION_ENV ACT_DART_RUNNER=${ACT_DART_RUNNER} ACT_CALLER_MARKER=${ACT_CALLER_MARKER}"',
      '  fi',
      '  echo "MIGRATION_STDERR $*" 1>&2',
      '  if [ -n "$ACT_FAKE_RUN_SIGNAL" ]; then',
      '    kill -s "$ACT_FAKE_RUN_SIGNAL" $$',
      '  fi',
      '  exit "${ACT_FAKE_RUN_EXIT:-0}"',
      'fi',
      'exit 0',
      '',
    ].join('\n'),
  );
  fs.chmodSync(runnerPath, 0o755);
  return runnerPath;
}

function runDartMigrationLauncher(homeDir, args, { env = {}, cwd = repoRoot } = {}) {
  return spawnSync('node', [getDartMigrationLauncherPath(homeDir), ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
      ...env,
    },
  });
}

function readFakeRunnerLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return [];
  }
  return fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
}

function installLauncherHome(prefix) {
  const homeDir = makeTempDir(prefix);
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(installResult.status, 0, installResult.stderr);
  return homeDir;
}

function testDartLauncherFailsWithoutSettings() {
  const homeDir = installLauncherHome('act-launcher-no-settings-');
  fs.rmSync(getActSettingsPath({ homedir: homeDir }), { force: true });

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /ACT settings not found/);
}

function testDartLauncherFailsWithoutToolkitPath() {
  const homeDir = installLauncherHome('act-launcher-missing-toolkit-');
  fs.writeFileSync(getActSettingsPath({ homedir: homeDir }), '{"enableLogging":false}\n');

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /missing toolkitPath/);
}

function testDartLauncherFailsOnInvalidToolkitPath() {
  const homeDir = installLauncherHome('act-launcher-invalid-toolkit-');
  const missingToolkit = path.join(makeTempDir('act-launcher-absent-toolkit-'), 'does-not-exist');
  fs.writeFileSync(
    getActSettingsPath({ homedir: homeDir }),
    `{"enableLogging":false,"toolkitPath":${JSON.stringify(missingToolkit)}}\n`,
  );

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /toolkitPath is not accessible/);
}

function testDartLauncherFailsOnMissingSnapshotAtRuntime() {
  const homeDir = installLauncherHome('act-launcher-missing-snapshot-');
  const fakeToolkit = makeTempDir('act-launcher-fake-toolkit-');
  fs.writeFileSync(
    getActSettingsPath({ homedir: homeDir }),
    `{"enableLogging":false,"toolkitPath":${JSON.stringify(fakeToolkit)}}\n`,
  );

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /Synced Tool Snapshot not found/);
}

function testDartLauncherFailsOnIncompletePackageShape() {
  const homeDir = installLauncherHome('act-launcher-incomplete-shape-');
  const fakeToolkit = makeTempDir('act-launcher-incomplete-toolkit-');
  // pubspec.yaml present but bin/ executable and lib/ missing.
  const snapshot = path.join(fakeToolkit, 'tools', 'act_dart_migrate');
  fs.mkdirSync(snapshot, { recursive: true });
  fs.writeFileSync(path.join(snapshot, 'pubspec.yaml'), 'name: act_dart_migrate\n');
  fs.writeFileSync(
    getActSettingsPath({ homedir: homeDir }),
    `{"enableLogging":false,"toolkitPath":${JSON.stringify(fakeToolkit)}}\n`,
  );

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /incomplete/);
}

function testDartLauncherUsesConfiguredRunnerAndForwardsArgs() {
  const homeDir = installLauncherHome('act-launcher-configured-runner-');
  const runnerPath = makeFakeDartRunner('act-launcher-runner-');
  const logPath = path.join(makeTempDir('act-launcher-log-'), 'runner.log');

  const migrationArgs = ['primary-constructors', '/abs/target', '--unknown-future-flag', 'value'];
  const result = runDartMigrationLauncher(homeDir, migrationArgs, {
    env: { ACT_DART_RUNNER: runnerPath, ACT_FAKE_RUNNER_LOG: logPath },
  });
  assert.equal(result.status, 0, result.stderr);

  const logLines = readFakeRunnerLog(logPath);
  // Bootstrap then run, both from the Synced Tool Snapshot directory.
  assert.equal(logLines[0], `cwd=${dartMigrateSnapshotDir}`);
  assert.equal(logLines[1], 'args=pub get');
  assert.equal(logLines[2], `cwd=${dartMigrateSnapshotDir}`);
  assert.equal(logLines[3], `args=run act_dart_migrate ${migrationArgs.join(' ')}`);

  // Migration stdout forwarded unchanged; bootstrap output kept off stdout.
  assert.match(result.stdout, new RegExp(`MIGRATION_STDOUT act_dart_migrate ${migrationArgs.join(' ')}`));
  assert.doesNotMatch(result.stdout, /BOOTSTRAP_STDOUT_MARKER/);
  // Bootstrap stdout and stderr routed to launcher stderr; migration stderr forwarded.
  assert.match(result.stderr, /BOOTSTRAP_STDOUT_MARKER/);
  assert.match(result.stderr, /BOOTSTRAP_STDERR_MARKER/);
  assert.match(result.stderr, /MIGRATION_STDERR/);

  // Launcher never runs pub against a Target Package path.
  assert.equal(logLines.includes('args=pub get /abs/target'), false);
  for (const line of logLines) {
    if (line.startsWith('cwd=')) {
      assert.equal(line, `cwd=${dartMigrateSnapshotDir}`);
    }
  }
}

function testDartLauncherFallsBackToPathDart() {
  const homeDir = installLauncherHome('act-launcher-path-fallback-');
  const runnerPath = makeFakeDartRunner('act-launcher-path-runner-', { name: 'dart' });
  const logPath = path.join(makeTempDir('act-launcher-path-log-'), 'runner.log');

  const result = runDartMigrationLauncher(homeDir, ['list'], {
    env: {
      ACT_DART_RUNNER: '',
      ACT_FAKE_RUNNER_LOG: logPath,
      PATH: `${path.dirname(runnerPath)}:${process.env.PATH}`,
    },
  });
  assert.equal(result.status, 0, result.stderr);

  const logLines = readFakeRunnerLog(logPath);
  assert.equal(logLines[1], 'args=pub get');
  assert.equal(logLines[3], 'args=run act_dart_migrate list');
  assert.match(result.stdout, /MIGRATION_STDOUT act_dart_migrate list/);
}

function testDartLauncherRejectsEmbeddedArgumentRunnerWithoutShell() {
  const homeDir = installLauncherHome('act-launcher-embedded-args-');
  const logPath = path.join(makeTempDir('act-launcher-embedded-log-'), 'runner.log');
  const runnerPath = makeFakeDartRunner('act-launcher-embedded-runner-');

  // A value with an embedded argument must not be shell-parsed: passed wholesale
  // it is a non-existent executable and fails clearly without ever invoking the
  // fake runner.
  const result = runDartMigrationLauncher(homeDir, ['list'], {
    env: { ACT_DART_RUNNER: `${runnerPath} pub`, ACT_FAKE_RUNNER_LOG: logPath },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /Failed to run Dart Runner/);
  assert.equal(fs.existsSync(logPath), false);
}

function testDartLauncherPropagatesExitCode() {
  const homeDir = installLauncherHome('act-launcher-exit-code-');
  const runnerPath = makeFakeDartRunner('act-launcher-exit-runner-');
  const logPath = path.join(makeTempDir('act-launcher-exit-log-'), 'runner.log');

  const result = runDartMigrationLauncher(homeDir, ['primary-constructors'], {
    env: { ACT_DART_RUNNER: runnerPath, ACT_FAKE_RUNNER_LOG: logPath, ACT_FAKE_RUN_EXIT: '42' },
  });
  assert.equal(result.status, 42);
}

function testDartLauncherPropagatesBootstrapFailure() {
  const homeDir = installLauncherHome('act-launcher-bootstrap-fail-');
  const runnerPath = makeFakeDartRunner('act-launcher-bootstrap-runner-');
  const logPath = path.join(makeTempDir('act-launcher-bootstrap-log-'), 'runner.log');

  const result = runDartMigrationLauncher(homeDir, ['primary-constructors'], {
    env: { ACT_DART_RUNNER: runnerPath, ACT_FAKE_RUNNER_LOG: logPath, ACT_FAKE_BOOTSTRAP_EXIT: '7' },
  });
  assert.equal(result.status, 7);

  // Bootstrap failure stops the launcher before running the migration executable.
  const logLines = readFakeRunnerLog(logPath);
  assert.equal(logLines.some((line) => line.startsWith('args=run ')), false);
}

function testDartLauncherFailsOnInvalidSettingsJson() {
  const homeDir = installLauncherHome('act-launcher-invalid-json-');
  fs.writeFileSync(getActSettingsPath({ homedir: homeDir }), '{ not valid json\n');

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /invalid JSON/);
}

function testDartLauncherFailsOnNonDirectoryToolkitPath() {
  const homeDir = installLauncherHome('act-launcher-file-toolkit-');
  const fileToolkit = path.join(makeTempDir('act-launcher-file-toolkit-target-'), 'toolkit-file');
  fs.writeFileSync(fileToolkit, 'not a directory\n');
  fs.writeFileSync(
    getActSettingsPath({ homedir: homeDir }),
    `{"enableLogging":false,"toolkitPath":${JSON.stringify(fileToolkit)}}\n`,
  );

  const result = runDartMigrationLauncher(homeDir, ['list']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\[act-dart-migrate\]/);
  assert.match(result.stderr, /not a directory/);
}

function testDartLauncherPreservesCallerEnvironment() {
  const homeDir = installLauncherHome('act-launcher-env-preserve-');
  const runnerPath = makeFakeDartRunner('act-launcher-env-runner-');
  const logPath = path.join(makeTempDir('act-launcher-env-log-'), 'runner.log');

  const result = runDartMigrationLauncher(homeDir, ['list'], {
    env: {
      ACT_DART_RUNNER: runnerPath,
      ACT_FAKE_RUNNER_LOG: logPath,
      ACT_FAKE_ECHO_ENV: '1',
      ACT_CALLER_MARKER: 'caller-value-123',
    },
  });
  assert.equal(result.status, 0, result.stderr);

  // The whole caller environment reaches the child unchanged, including the
  // caller's own variables and ACT_DART_RUNNER itself.
  assert.match(result.stdout, /MIGRATION_ENV /);
  assert.match(result.stdout, /ACT_CALLER_MARKER=caller-value-123/);
  assert.match(result.stdout, new RegExp(`ACT_DART_RUNNER=${escapeRegExp(runnerPath)}`));
}

function testDartLauncherPropagatesChildSignal() {
  const homeDir = installLauncherHome('act-launcher-signal-');
  const runnerPath = makeFakeDartRunner('act-launcher-signal-runner-');
  const logPath = path.join(makeTempDir('act-launcher-signal-log-'), 'runner.log');

  const result = runDartMigrationLauncher(homeDir, ['primary-constructors'], {
    env: { ACT_DART_RUNNER: runnerPath, ACT_FAKE_RUNNER_LOG: logPath, ACT_FAKE_RUN_SIGNAL: 'TERM' },
  });
  // The launcher re-raises the child's terminating signal rather than turning it
  // into a plain exit code.
  assert.equal(result.signal, 'SIGTERM');
}

function testOpenCodePluginFileConflictPreserved() {
  const homeDir = makeTempDir('act-install-opencode-file-conflict-');
  const pluginsDir = path.join(homeDir, '.config', 'opencode', 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });

  const pluginLink = path.join(pluginsDir, 'act-hooks-plugin.js');
  const fileContent = '// custom plugin\n';
  fs.writeFileSync(pluginLink, fileContent);

  const result = runToolkitScript('scripts/install.sh', ['--tool', 'opencode'], homeDir);
  assert.equal(result.status, 0);
  assert.equal(fs.lstatSync(pluginLink).isFile(), true);
  assert.equal(fs.readFileSync(pluginLink, 'utf8'), fileContent);
  assert.match(result.stdout + result.stderr, /OpenCode hook symlink step/);
}

function testUninstallDefaultsToRemovingMismatchedSymlink() {
  const homeDir = makeTempDir('act-uninstall-mismatched-link-');
  const skillsDir = path.join(homeDir, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  const installedSkillLink = path.join(skillsDir, 'act-flutter-create');
  const externalTarget = path.join(homeDir, 'external-skill');
  fs.mkdirSync(externalTarget, { recursive: true });
  fs.symlinkSync(externalTarget, installedSkillLink);

  const result = runToolkitScript('scripts/uninstall.sh', ['--tool', 'claude'], homeDir, { input: '\n' });
  assert.equal(result.status, 0);
  assert.match(result.stdout + result.stderr, /act-flutter-create points to:/);
  assert.match(result.stdout + result.stderr, /Removed/);
  assert.equal(fs.existsSync(installedSkillLink), false);
}

function testCursorUninstallRemovesOwnedPluginSymlink() {
  const homeDir = makeTempDir('act-uninstall-cursor-plugin-');
  const installResult = runToolkitScript('scripts/install.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(installResult.status, 0, installResult.stderr);
  assert.equal(fs.existsSync(getCursorPluginPath(homeDir)), true);

  const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
  assert.equal(fs.existsSync(getCursorPluginPath(homeDir)), false);
  assert.match(uninstallResult.stdout + uninstallResult.stderr, /Restart or reload Cursor/);
}

function testCursorUninstallPreservesForeignPluginSymlink() {
  const homeDir = makeTempDir('act-uninstall-cursor-foreign-plugin-');
  const pluginDir = path.dirname(getCursorPluginPath(homeDir));
  fs.mkdirSync(pluginDir, { recursive: true });

  const foreignTarget = path.join(homeDir, 'foreign-cursor-plugin');
  fs.mkdirSync(foreignTarget, { recursive: true });
  fs.symlinkSync(foreignTarget, getCursorPluginPath(homeDir));

  const result = runToolkitScript('scripts/uninstall.sh', ['--tool', 'cursor'], homeDir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(getCursorPluginPath(homeDir)), true);
  assert.match(result.stdout + result.stderr, /Skipped non-toolkit Cursor plugin symlink/);
}

function testUninstallRemovesFlatCommandSymlinksAndLegacyToolkitCommandSymlink() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-uninstall-commands-${tool}-`);
    const installResult = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(installResult.status, 0, installResult.stderr);

    const commandsRoot = getCommandsRoot(homeDir, tool);
    const legacyLink = path.join(commandsRoot, 'act');
    fs.symlinkSync(path.join(repoRoot, 'commands', 'act'), legacyLink);

    const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', tool], homeDir);
    assert.equal(uninstallResult.status, 0, uninstallResult.stderr);

    for (const basename of getExpectedCommandFiles()) {
      assert.equal(fs.existsSync(path.join(commandsRoot, basename)), false, `${tool} should remove ${basename}`);
    }
    assert.equal(fs.existsSync(legacyLink), false, `${tool} should remove legacy commands/act symlink`);
  }
}

function testUninstallRemovesLegacyToolkitCommandSymlinkFromAnotherCheckout() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-uninstall-command-migration-other-path-${tool}-`);
    const commandsRoot = getCommandsRoot(homeDir, tool);
    fs.mkdirSync(commandsRoot, { recursive: true });

    const legacyLink = path.join(commandsRoot, 'act');
    fs.symlinkSync(makeLegacyCommandSourceDir(), legacyLink);

    const result = runToolkitScript('scripts/uninstall.sh', ['--tool', tool], homeDir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(legacyLink), false, `${tool} should remove legacy commands/act symlink from another checkout`);
  }
}

function testUninstallRemovesGeneratedAgentFolders() {
  for (const tool of ['claude', 'opencode']) {
    const homeDir = makeTempDir(`act-uninstall-agents-${tool}-`);
    const installResult = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(installResult.status, 0, installResult.stderr);

    const agentsRoot = tool === 'claude'
      ? path.join(homeDir, '.claude', 'agents', 'act')
      : path.join(homeDir, '.config', 'opencode', 'agents', 'act');
    assert.equal(fs.existsSync(agentsRoot), true);

    const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', tool], homeDir);
    assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
    assert.equal(fs.existsSync(agentsRoot), false);
  }
}

function testUninstallDoesNotMutateSettings() {
  const claudeHome = makeTempDir('act-uninstall-settings-claude-');
  const claudePath = ensureSettingsFile(claudeHome, '{"enableLogging":true,"custom":"x"}\n');
  const claudeBefore = fs.readFileSync(claudePath, 'utf8');
  const claudeResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'claude'], claudeHome);
  assert.equal(claudeResult.status, 0);
  assert.equal(fs.readFileSync(claudePath, 'utf8'), claudeBefore);

  const opencodeHome = makeTempDir('act-uninstall-settings-opencode-');
  const opencodePath = ensureSettingsFile(opencodeHome, '{"enableLogging":false,"custom":42}\n');
  const opencodeBefore = fs.readFileSync(opencodePath, 'utf8');
  const opencodeResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'opencode'], opencodeHome);
  assert.equal(opencodeResult.status, 0);
  assert.equal(fs.readFileSync(opencodePath, 'utf8'), opencodeBefore);

  const cursorHome = makeTempDir('act-uninstall-settings-cursor-');
  const cursorPath = ensureSettingsFile(cursorHome, '{"enableLogging":false,"custom":true}\n');
  const cursorBefore = fs.readFileSync(cursorPath, 'utf8');
  const cursorResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'cursor'], cursorHome);
  assert.equal(cursorResult.status, 0);
  assert.equal(fs.readFileSync(cursorPath, 'utf8'), cursorBefore);
}

function testClaudeUninstallTargetsExplicitConfigDirOnly() {
  const homeDir = makeTempDir('act-uninstall-claude-explicit-home-');
  const defaultDir = path.join(homeDir, '.claude');
  const customDir = path.join(homeDir, '.claude-work');
  const defaultInstall = runToolkitScript('scripts/install.sh', ['--tool', 'claude'], homeDir);
  assert.equal(defaultInstall.status, 0, defaultInstall.stderr);
  const customInstall = runToolkitScript('scripts/install.sh', ['--tool', 'claude', '--config-dir', customDir], homeDir);
  assert.equal(customInstall.status, 0, customInstall.stderr);

  const customResult = runToolkitScript('scripts/uninstall.sh', ['--tool', 'claude', '--config-dir', customDir], homeDir);
  assert.equal(customResult.status, 0, customResult.stderr);

  assertClaudeInstallPresent(defaultDir);
  assert.equal(fs.existsSync(path.join(customDir, 'commands', 'act-help.md')), false);
  assert.equal(fs.existsSync(path.join(customDir, 'agents', 'act')), false);
  assert.equal(fs.existsSync(path.join(customDir, 'skills', 'act-flutter-create')), false);
  assert.equal(fs.existsSync(path.join(customDir, 'hooks', 'claude', 'act-claude-statusline.js')), false);
  const customSettings = JSON.parse(fs.readFileSync(path.join(customDir, 'settings.json'), 'utf8'));
  assert.equal(customSettings.statusLine, undefined);
  assert.deepEqual(customSettings.hooks, {});
}

function testClaudeUninstallRejectsInvalidConfigDirUsageBeforeSideEffects() {
  for (const tool of ['opencode', 'cursor']) {
    const homeDir = makeTempDir(`act-uninstall-invalid-config-tool-${tool}-`);
    const installResult = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(installResult.status, 0, installResult.stderr);
    const before = fs.existsSync(getSharedRuntimeHelperPath(homeDir));
    const result = runToolkitScript('scripts/uninstall.sh', ['--tool', tool, '--config-dir', path.join(homeDir, 'custom')], homeDir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /only supported with --tool claude/);
    assert.equal(fs.existsSync(getSharedRuntimeHelperPath(homeDir)), before);
  }

  const missingHome = makeTempDir('act-uninstall-missing-config-dir-');
  const missing = runToolkitScript('scripts/uninstall.sh', ['--tool', 'claude', '--config-dir'], missingHome);
  assert.notEqual(missing.status, 0);
}

function testUninstallLeavesSharedRuntimeHelperInPlace() {
  for (const tool of ['claude', 'opencode', 'cursor', 'codex']) {
    const homeDir = makeTempDir(`act-uninstall-helper-${tool}-`);
    const installResult = runToolkitScript('scripts/install.sh', ['--tool', tool], homeDir);
    assert.equal(installResult.status, 0);

    const helperContents = sharedRuntimeHelperNames.map((helperName) => {
      const helperPath = getSharedBinHelperPath(homeDir, helperName);
      return { helperPath, content: fs.readFileSync(helperPath, 'utf8') };
    });

    const uninstallResult = runToolkitScript('scripts/uninstall.sh', ['--tool', tool], homeDir);
    assert.equal(uninstallResult.status, 0);
    for (const { helperPath, content } of helperContents) {
      assert.equal(fs.existsSync(helperPath), true);
      assert.equal(fs.readFileSync(helperPath, 'utf8'), content);
    }
  }
}

function ensureSettingsFile(homeDir, content) {
  const settingsPath = getActSettingsPath({ homedir: homeDir });
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, content);
  return settingsPath;
}

function getSharedBinHelperPath(homeDir, helperName) {
  return path.join(homeDir, '.config', 'agentic-coding-toolkit', 'bin', helperName);
}

function getSharedRuntimeHelperPath(homeDir) {
  return getSharedBinHelperPath(homeDir, 'act-run-script.js');
}

function getDartMigrationLauncherPath(homeDir) {
  return getSharedBinHelperPath(homeDir, 'act-dart-migrate.js');
}

function getCursorPluginPath(homeDir) {
  return path.join(homeDir, '.cursor', 'plugins', 'local', 'agentic-coding-toolkit');
}

function getCommandsRoot(homeDir, tool) {
  return tool === 'claude'
    ? path.join(homeDir, '.claude', 'commands')
    : path.join(homeDir, '.config', 'opencode', 'commands');
}

function assertClaudeInstallPresent(configDir) {
  assert.equal(fs.lstatSync(path.join(configDir, 'commands', 'act-help.md')).isSymbolicLink(), true);
  assert.equal(fs.lstatSync(path.join(configDir, 'agents', 'act')).isDirectory(), true);
  assert.equal(fs.lstatSync(path.join(configDir, 'skills', 'act-flutter-create')).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(configDir, 'hooks', 'core', 'act-settings.js')), true);
  assert.equal(fs.existsSync(path.join(configDir, 'hooks', 'claude', 'act-claude-statusline.js')), true);
  const settings = JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
  assert.equal(settings.statusLine.command, `node '${path.join(configDir, 'hooks', 'claude', 'act-claude-statusline.js')}'`);
  assert.match(settings.statusLine.description, /^\[ACT\]/);
  assert.equal(settings.hooks.SessionStart[0].hooks[0].command, `node '${path.join(configDir, 'hooks', 'claude', 'act-claude-log-session.js')}'`);
}

function makeLegacyCommandSourceDir() {
  const legacyToolkitRoot = makeTempDir('act-legacy-toolkit-');
  const legacyCommandsDir = path.join(legacyToolkitRoot, 'commands', 'act');
  fs.mkdirSync(legacyCommandsDir, { recursive: true });
  for (const basename of ['help.md', 'submit-feedback.md', 'update-changelog.md', 'update.md']) {
    fs.writeFileSync(path.join(legacyCommandsDir, basename), `# ${basename}\n`);
  }
  return legacyCommandsDir;
}

function getExpectedCommandFiles() {
  return [
    'act-help.md',
    'act-submit-feedback.md',
    'act-update-changelog.md',
    'act-update.md',
  ];
}

function getFrontMatterKeys(content) {
  const frontMatter = getFrontMatter(content);
  return new Set(frontMatter.split('\n').map((line) => line.match(/^([A-Za-z0-9_-]+):/)?.[1]).filter(Boolean));
}

function getFrontMatter(content) {
  assert.match(content, /^---\n/);
  const end = content.indexOf('\n---\n', 4);
  assert.notEqual(end, -1);
  return content.slice(4, end);
}

function getMarkdownBody(content) {
  const end = content.indexOf('\n---\n', 4);
  assert.notEqual(end, -1);
  return content.slice(end + '\n---\n'.length);
}

function assertCodexGeneratedSkill(skillsRoot, skillName) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');
  const generated = fs.readFileSync(skillFile, 'utf8');
  assert.equal(fs.lstatSync(skillDir).isDirectory(), true);
  assert.equal(fs.lstatSync(skillDir).isSymbolicLink(), false);
  assert.equal(fs.lstatSync(skillFile).isFile(), true);
  assert.equal(fs.lstatSync(skillFile).isSymbolicLink(), false);
  assert.match(generated, new RegExp(`ACT generated Codex skill from skills/${skillName}/SKILL\\.md`));
  assert.doesNotMatch(generated, /^tools:/m);
  assert.doesNotMatch(generated, /AskUserQuestion|SlashCommand|Task tool|Use Task|Edit tool|Write tool|TodoWrite/);
  assert.doesNotMatch(generated, /(^|[^A-Za-z0-9_.\/~`-])\/act-[A-Za-z0-9_-]+/);
}

function runToolkitScript(scriptRelativePath, args, homeDir, options = {}) {
  return spawnSync('bash', [path.join(repoRoot, scriptRelativePath), ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    input: options.input,
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: '',
      HOME: homeDir,
      ...options.env,
    },
  });
}

function runInstallCodexHooks({ targetPath, hookDir, remove = false }) {
  const args = [path.join(repoRoot, 'scripts', 'lib', 'install-codex-hooks.js')];
  if (remove) {
    args.push('--remove');
  }
  args.push('--target', targetPath, '--hook-dir', hookDir, path.join(repoRoot, 'hooks', 'codex', 'hooks.json'));
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function getRemovedActSkills() {
  const filePath = path.join(repoRoot, 'scripts/lib/removed-skills.sh');
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/REMOVED_ACT_SKILLS=\(([\s\S]*?)\)/);
  assert.ok(match, 'REMOVED_ACT_SKILLS not found in scripts/lib/removed-skills.sh');
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
