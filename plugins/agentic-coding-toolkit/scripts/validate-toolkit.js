#!/usr/bin/env node

// Toolkit smoke validator
// - Front-matter presence and required keys
// - Reference/link integrity
// - README command/skill listings
// - Script executability and hook references
// - CHANGELOG vs VERSION consistency
// - Dart Migration Launcher source, installer wiring, and Synced Tool Snapshot
//   file shape (static file checks only; never executes Dart)
// - Broken symlink warnings
// - Workflow file reference integrity
// - Basic markdown sanity (unclosed fenced code blocks)
//
// Notes:
// - Designed to be fast and conservative (smoke checks, not deep linting).
// - Exits with non-zero status on errors; warnings are non-fatal.
// - Paths in skill docs may reference either repo-level `scripts/foo.sh` or
//   canonical skill-owned `skills/<skill>/scripts/foo.sh` locations.

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const supportedActScriptHelper = 'node ~/.config/agentic-coding-toolkit/bin/act-run-script.js';
const optionalGeneratedMarkdownTargets = new Set([
  path.resolve(repoRoot, 'skills', 'act-flutter-development', 'references', 'flutter-rules-official.md'),
]);

const errors = [];
const warnings = [];

// Recursively collect files under a directory.
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Read UTF-8 file content.
function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

// Safe path existence check.
function exists(p) {
  return fs.existsSync(p);
}

// Extract a top-level markdown section body by heading name.
function getMarkdownSection(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^## ${escapedHeading}\\n([\\s\\S]*?)(?=^## |$)`, 'm'));
  return match ? match[1] : null;
}

// Check executable bit for scripts (Unix).
function isExecutable(p) {
  try {
    const mode = fs.statSync(p).mode;
    return (mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

// Very small front-matter parser:
// - Expects leading `---` and a closing `---` line.
// - Extracts YAML keys only (no full YAML parsing).
function parseFrontMatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const fm = content.slice(4, end).split('\n');
  const keys = new Set();
  for (const line of fm) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:/);
    if (m) keys.add(m[1]);
  }
  return { keys, raw: fm.join('\n') };
}

// Validate front-matter presence + required keys by file type.
function checkFrontMatter(filePath, type) {
  const content = readFile(filePath);
  const fm = parseFrontMatter(content);
  if (!fm) {
    errors.push(`${type} missing front-matter: ${rel(filePath)}`);
    return;
  }
  const keys = fm.keys;

  const nameMatch = content.match(/^[\s\S]*?^name:\s*([^\n]+)$/m);
  const frontMatterName = nameMatch ? nameMatch[1].trim() : null;

  // Required keys by type
  if (type === 'command') {
    if (!keys.has('name')) errors.push(`command missing name: ${rel(filePath)}`);
    if (frontMatterName && !frontMatterName.startsWith('act-')) {
      errors.push(`command name must start with \`act-\`: ${rel(filePath)} (found: ${frontMatterName})`);
    }
    if (!keys.has('description')) errors.push(`command missing description: ${rel(filePath)}`);
    if (!keys.has('allowed-tools') && !keys.has('tools')) {
      warnings.push(`command missing allowed-tools/tools: ${rel(filePath)}`);
    }
  } else if (type === 'agent') {
    for (const k of ['name', 'description', 'tools']) {
      if (!keys.has(k)) errors.push(`agent missing ${k}: ${rel(filePath)}`);
    }
    if (frontMatterName && !frontMatterName.startsWith('act-')) {
      errors.push(`agent name must start with \`act-\`: ${rel(filePath)} (found: ${frontMatterName})`);
    }
    if (!keys.has('mode')) warnings.push(`agent missing mode: ${rel(filePath)}`);
    if (!keys.has('permission')) warnings.push(`agent missing permission: ${rel(filePath)}`);
  } else if (type === 'skill') {
    for (const k of ['name', 'description', 'tools']) {
      if (!keys.has(k)) errors.push(`skill missing ${k}: ${rel(filePath)}`);
    }
  }
}

// Repo-relative path for readable reporting.
function rel(p) {
  return path.relative(repoRoot, p);
}

// Detect duplicate `name:` entries across commands/agents/skills.
function collectNames(files) {
  const names = new Map();
  for (const f of files) {
    const content = readFile(f);
    const fm = parseFrontMatter(content);
    if (!fm || !fm.keys.has('name')) continue;
    const m = content.match(/^[\s\S]*?^name:\s*([^\n]+)$/m);
    if (!m) continue;
    const name = m[1].trim();
    if (!name) continue;
    if (!names.has(name)) names.set(name, []);
    names.get(name).push(rel(f));
  }
  for (const [name, paths] of names.entries()) {
    if (paths.length > 1) {
      errors.push(`duplicate name "${name}": ${paths.join(', ')}`);
    }
  }
}

// Validate relative markdown links and script references inside docs.
// - Links like `](../foo/bar.md)` must resolve on disk.
// - Script references like `scripts/foo.sh` are resolved relative to:
//   1) file directory (skill-local execution context)
//   2) repo root (legacy/global references)
function checkMarkdownLinks(filePath) {
  const dir = path.dirname(filePath);
  const content = readFile(filePath);
  const linkRegex = /\]\((\.\.?\/[^)]+)\)/g;
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const target = m[1].trim();
    // Skip template/placeholder links (e.g., {principles|patterns}/{file}.md)
    if (/\{.*\}/.test(target)) continue;
    // Strip URL fragments before resolving (e.g., ./file.md#section)
    const pathOnly = target.replace(/#.*$/, '');
    const resolved = path.resolve(dir, pathOnly);
    if (!exists(resolved)) {
      if (optionalGeneratedMarkdownTargets.has(resolved)) {
        warnings.push(`optional generated link target missing in ${rel(filePath)}: ${target}`);
        continue;
      }
      errors.push(`broken link target in ${rel(filePath)}: ${target}`);
    }
  }

  // Check for ACT script references such as scripts/foo.sh or
  // skills/act-skill/scripts/foo.sh.
  const scriptRegex = /\b((?:skills\/[A-Za-z0-9_-]+\/scripts\/|scripts\/)[A-Za-z0-9_./-]+\.sh)\b/g;
  while ((m = scriptRegex.exec(content)) !== null) {
    const target = m[1];
    const resolvedLocal = path.resolve(dir, target);
    const resolvedRoot = path.resolve(repoRoot, target);
    const resolved = target.startsWith('skills/') ? resolvedRoot : (exists(resolvedLocal) ? resolvedLocal : resolvedRoot);
    if (!exists(resolved)) {
      errors.push(`missing script reference in ${rel(filePath)}: ${target}`);
    }
  }
}

// Validate Skill(...) references point to existing skill folders.
function checkSkillReferences(filePath) {
  const content = readFile(filePath);
  const skillRegex = /Skill\(([^)]+)\)/g;
  let m;
  while ((m = skillRegex.exec(content)) !== null) {
    const name = m[1].trim();
    if (!name) continue;
    const skillDir = path.resolve(repoRoot, 'skills', name);
    if (!exists(skillDir)) {
      errors.push(`missing skill reference in ${rel(filePath)}: Skill(${name})`);
    }
  }
}

// Verify README skill list maps to existing skill directories.
function checkReadmeSkillRefs() {
  const readme = path.resolve(repoRoot, 'README.md');
  if (!exists(readme)) return;
  const content = readFile(readme);
  const knownSkills = new Set(fs.readdirSync(path.resolve(repoRoot, 'skills')).filter(d => fs.statSync(path.join(repoRoot, 'skills', d)).isDirectory()));

  // Validate all listed skills in README match existing directories
  // (Use a stricter pass for the Skills table section)
  const skillsSection = getMarkdownSection(content, 'Skills');
  if (skillsSection) {
    const rows = skillsSection.split('\n').filter(l => l.includes('`/'));
    for (const row of rows) {
      const match = row.match(/`\/(.+?)`/);
      if (!match) continue;
      const skill = match[1].trim();
      if (!knownSkills.has(skill)) {
        errors.push(`README lists missing skill: ${skill}`);
      }
    }
  }
}

function checkWorkflowSkillMigration() {
  const requiredSkills = [
    'skills/act-config/SKILL.md',
    'skills/act-interview/SKILL.md',
    'skills/act-interview-flutter/SKILL.md',
    'skills/act-create-spec/SKILL.md',
    'skills/act-create-spec-flutter/SKILL.md',
    'skills/act-refine-spec/SKILL.md',
    'skills/act-refine-spec-flutter/SKILL.md',
    'skills/act-create-issues/SKILL.md',
    'skills/act-create-issues-flutter/SKILL.md',
    'skills/act-implement/SKILL.md',
    'skills/act-implement-flutter/SKILL.md',
    'skills/act-workflow-spec/SKILL.md',
    'skills/act-workflow-refine-spec/SKILL.md',
    'skills/act-workflow-plan/SKILL.md',
    'skills/act-workflow-work/SKILL.md',
    'skills/act-workflow-compound/SKILL.md',
  ];
  for (const relPath of requiredSkills) {
    if (!exists(path.resolve(repoRoot, relPath))) {
      errors.push(`missing workflow skill artifact: ${relPath}`);
    }
  }

  const removedCommands = [
    'commands/act/workflow/spec.md',
    'commands/act/workflow/refine-spec.md',
    'commands/act/workflow/plan.md',
    'commands/act/workflow/work.md',
    'commands/act/workflow/compound.md',
  ];
  for (const relPath of removedCommands) {
    if (exists(path.resolve(repoRoot, relPath))) {
      errors.push(`deprecated workflow command still present: ${relPath}`);
    }
  }

  const deprecatedWorkflowCommandRegex = /\/act:workflow:(spec|refine-spec|plan|work|compound)\b/;
  const docsWithoutDeprecatedWorkflowCommands = [
    'README.md',
    'commands/act-help.md',
    'skills/act-git-worktree/SKILL.md',
  ];
  for (const relPath of docsWithoutDeprecatedWorkflowCommands) {
    const filePath = path.resolve(repoRoot, relPath);
    if (!exists(filePath)) {
      continue;
    }
    if (deprecatedWorkflowCommandRegex.test(readFile(filePath))) {
      errors.push(`deprecated workflow command reference in ${relPath}`);
    }
  }

}

function checkGitMetaSkillMigration() {
  const requiredSkills = [
    'skills/act-git-commit/SKILL.md',
    'skills/act-git-commit-all/SKILL.md',
    'skills/act-git-push-make-pr/SKILL.md',
    'skills/act-git-switch-main-pull/SKILL.md',
  ];
  for (const relPath of requiredSkills) {
    if (!exists(path.resolve(repoRoot, relPath))) {
      errors.push(`missing git/meta skill artifact: ${relPath}`);
    }
  }

  const removedCommands = [
    'commands/act/git/commit.md',
    'commands/act/git/commit-all.md',
    'commands/act/git/push-make-pr.md',
    'commands/act/git/switch-main-pull.md',
    'commands/act/meta/audit-work.md',
    'commands/act/meta/compare-commands.md',
    'commands/act/meta/improve-command.md',
    'commands/act/meta/compare-workflow-runs-worktree.md',
    'commands/act/meta/compare-workflow-runs-branch.md',
  ];
  for (const relPath of removedCommands) {
    if (exists(path.resolve(repoRoot, relPath))) {
      errors.push(`deprecated git/meta command still present: ${relPath}`);
    }
  }

  const deprecatedGitMetaCommandRegex = /\/act:(?:git:(?:commit|commit-all|switch-main-pull|push-make-pr)|meta:(?:improve-command|compare-commands|audit-work|compare-workflow-runs-worktree|compare-workflow-runs-branch))\b/;
  const docsWithoutDeprecatedGitMetaCommands = [
    'README.md',
    'commands/act-help.md',
    'skills/act-workflow-spec/SKILL.md',
  ];
  for (const relPath of docsWithoutDeprecatedGitMetaCommands) {
    const filePath = path.resolve(repoRoot, relPath);
    if (!exists(filePath)) {
      continue;
    }
    if (deprecatedGitMetaCommandRegex.test(readFile(filePath))) {
      errors.push(`deprecated git/meta command reference in ${relPath}`);
    }
  }
}

function checkPrimaryConstructorMigrationDocs() {
  const primaryConstructorDescription = 'Migrate eligible Dart declarations to experimental primary-constructor syntax';
  const userFacingDocs = [
    'README.md',
    'commands/act-help.md',
  ];

  for (const relPath of userFacingDocs) {
    const filePath = path.resolve(repoRoot, relPath);
    if (!exists(filePath)) {
      errors.push(`missing primary-constructor migration doc: ${relPath}`);
      continue;
    }

    const content = readFile(filePath);
    if (content.includes('--non-const')) {
      errors.push(`primary-constructor migration doc advertises unsupported --non-const flag: ${relPath}`);
    }
    if (/Migrate Dart classes and enums to (?:the )?experimental primary constructors syntax/.test(content)) {
      errors.push(`primary-constructor migration doc uses stale class/enum-only wording: ${relPath}`);
    }
  }

  const readmePath = path.resolve(repoRoot, 'README.md');
  if (exists(readmePath) && !readFile(readmePath).includes(primaryConstructorDescription)) {
    errors.push('README missing current primary-constructor migration support description');
  }

  const helpPath = path.resolve(repoRoot, 'commands', 'act-help.md');
  if (exists(helpPath)) {
    const helpContent = readFile(helpPath);
    if (!helpContent.includes(primaryConstructorDescription)) {
      errors.push('commands/act-help.md missing current primary-constructor migration support description');
    }
    if (!helpContent.includes('- `/act-dart-migrate-primary-constructors`')) {
      errors.push('commands/act-help.md missing primary-constructor migration usage without unsupported flags');
    }
  }
}

// Ensure scripts/*.sh are executable.
function checkScriptsExecutable() {
  const scriptsDir = path.resolve(repoRoot, 'scripts');
  if (!exists(scriptsDir)) return;
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
  for (const f of files) {
    const p = path.join(scriptsDir, f);
    if (!isExecutable(p)) {
      errors.push(`script not executable: ${rel(p)}`);
    }
  }
}

// Validate hooks.json:
// - valid JSON
// - $schema presence (warn only)
// - any referenced scripts exist
function checkHooks() {
  const hooksPath = path.resolve(repoRoot, 'hooks', 'hooks.json');
  if (!exists(hooksPath)) return;
  let data;
  try {
    data = JSON.parse(readFile(hooksPath));
  } catch (e) {
    errors.push(`invalid JSON: ${rel(hooksPath)}`);
    return;
  }
  if (!data.$schema) warnings.push(`hooks.json missing $schema: ${rel(hooksPath)}`);

  const jsonStr = JSON.stringify(data);
  const scriptRegex = /scripts\/[A-Za-z0-9_./-]+\.js/g;
  const relocatedScriptSources = {
    'scripts/act-claude-statusline.js': path.resolve(repoRoot, 'hooks', 'claude', 'act-claude-statusline.js'),
    'scripts/act-claude-log-session.js': path.resolve(repoRoot, 'hooks', 'claude', 'act-claude-log-session.js'),
    'scripts/act-claude-dart-format.js': path.resolve(repoRoot, 'hooks', 'claude', 'act-claude-dart-format.js'),
  };
  let m;
  while ((m = scriptRegex.exec(jsonStr)) !== null) {
    const target = m[0];
    const resolved = path.resolve(repoRoot, target);
    const resolvedFromHooks = path.resolve(repoRoot, 'hooks', target);
    const resolvedRelocated = relocatedScriptSources[target];
    if (!exists(resolved) && !exists(resolvedFromHooks) && !(resolvedRelocated && exists(resolvedRelocated))) {
      errors.push(`hooks.json references missing script: ${target}`);
    }
  }
}

function checkClaudeHookArtifacts() {
  const required = [
    'hooks/claude/act-claude-statusline.js',
    'hooks/claude/act-claude-log-session.js',
    'hooks/claude/act-claude-dart-format.js',
    'hooks/core/act-settings.js',
    'hooks/core/act-dart-formatter.js',
    'hooks/core/act-logger.js',
  ];

  for (const relPath of required) {
    const resolved = path.resolve(repoRoot, relPath);
    if (!exists(resolved)) {
      errors.push(`missing Claude hook artifact: ${relPath}`);
    }
  }

  const installScript = path.resolve(repoRoot, 'scripts', 'install.sh');
  if (exists(installScript)) {
    const installContent = readFile(installScript);
    if (!installContent.includes('hooks/claude')) {
      errors.push('install.sh missing Claude hook source marker: hooks/claude');
    }
  }
}

function checkCodexHookArtifacts() {
  const required = [
    'hooks/codex/act-codex-log-session.js',
    'hooks/codex/act-codex-dart-format.js',
    'hooks/codex/hooks.json',
  ];
  for (const relPath of required) {
    const resolved = path.resolve(repoRoot, relPath);
    if (!exists(resolved)) {
      errors.push(`missing Codex hook artifact: ${relPath}`);
    }
  }

  const hooksPath = path.resolve(repoRoot, 'hooks', 'codex', 'hooks.json');
  if (!exists(hooksPath)) {
    return;
  }

  let data;
  try {
    data = JSON.parse(readFile(hooksPath));
  } catch {
    errors.push('invalid JSON: hooks/codex/hooks.json');
    return;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data) || !data.hooks || typeof data.hooks !== 'object' || Array.isArray(data.hooks)) {
    errors.push('hooks/codex/hooks.json must contain a hooks object');
    return;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'statusLine')) {
    errors.push('hooks/codex/hooks.json must not contain statusLine');
  }

  const allowedEvents = new Set(['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse']);
  for (const eventName of Object.keys(data.hooks)) {
    if (!allowedEvents.has(eventName)) {
      errors.push(`hooks/codex/hooks.json contains unsupported event: ${eventName}`);
    }
  }

  const jsonStr = JSON.stringify(data);
  if (jsonStr.includes('act-claude-')) {
    errors.push('hooks/codex/hooks.json must not reference Claude hook scripts');
  }

  for (const [eventName, eventEntries] of Object.entries(data.hooks)) {
    if (!Array.isArray(eventEntries)) {
      errors.push(`hooks/codex/hooks.json event must be an array: ${eventName}`);
      continue;
    }
    for (const eventEntry of eventEntries) {
      if (!Array.isArray(eventEntry.hooks)) {
        errors.push(`hooks/codex/hooks.json event entry missing hooks array: ${eventName}`);
        continue;
      }
      for (const hook of eventEntry.hooks) {
        const command = hook.command;
        if (typeof command !== 'string') {
          errors.push(`hooks/codex/hooks.json hook missing command: ${eventName}`);
          continue;
        }
        const scriptName = command.match(/act-codex-[A-Za-z0-9-]+\.js/)?.[0];
        if (!scriptName) {
          errors.push(`hooks/codex/hooks.json command must reference an act-codex script: ${eventName}`);
          continue;
        }
        if (!exists(path.resolve(repoRoot, 'hooks', 'codex', scriptName))) {
          errors.push(`hooks/codex/hooks.json references missing script: ${scriptName}`);
        }
      }
    }
  }
}

function checkInstallTestArtifacts() {
  const installTests = path.resolve(repoRoot, 'scripts', 'tests', 'run-install-tests.mjs');
  if (!exists(installTests)) {
    errors.push('missing installer test artifact: scripts/tests/run-install-tests.mjs');
  }
}

function checkCursorPluginManifest() {
  const manifestPath = path.resolve(repoRoot, '.cursor-plugin', 'plugin.json');
  if (!exists(manifestPath)) {
    errors.push('missing Cursor plugin manifest: .cursor-plugin/plugin.json');
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFile(manifestPath));
  } catch {
    errors.push('invalid JSON: .cursor-plugin/plugin.json');
    return;
  }

  if (manifest.name !== 'agentic-coding-toolkit') {
    errors.push(`Cursor plugin manifest name must be agentic-coding-toolkit (found: ${manifest.name || 'missing'})`);
  }

  const versionPath = path.resolve(repoRoot, 'VERSION');
  if (exists(versionPath)) {
    const version = readFile(versionPath).trim();
    if (manifest.version !== version) {
      errors.push(`Cursor plugin manifest version (${manifest.version || 'missing'}) does not match VERSION (${version})`);
    }
  }

  if (typeof manifest.skills !== 'string' || manifest.skills.trim() === '') {
    errors.push('Cursor plugin manifest missing skills path');
  } else {
    if (manifest.skills !== './skills/') {
      errors.push(`Cursor plugin manifest must point to ./skills/ (found: ${manifest.skills})`);
    }
    const skillsPath = path.resolve(repoRoot, manifest.skills);
    if (!exists(skillsPath)) {
      errors.push(`Cursor plugin manifest skills path missing: ${manifest.skills}`);
    }
  }

  for (const deferredKey of ['commands', 'agents', 'hooks']) {
    if (Object.prototype.hasOwnProperty.call(manifest, deferredKey)) {
      errors.push(`Cursor plugin manifest must omit ${deferredKey}: .cursor-plugin/plugin.json`);
    }
  }
}

function checkCursorDocs() {
  const readmePath = path.resolve(repoRoot, 'README.md');
  if (exists(readmePath)) {
    const readme = readFile(readmePath);
    for (const snippet of [
      './scripts/install.sh --tool cursor',
      './scripts/uninstall.sh --tool cursor',
      '~/.cursor/plugins/local/agentic-coding-toolkit',
      'commands, and agents',
      'experimental',
    ]) {
      if (!readme.includes(snippet)) {
        errors.push(`README missing Cursor guidance snippet: ${snippet}`);
      }
    }
  }

  const updatePath = path.resolve(repoRoot, 'commands', 'act-update.md');
  if (exists(updatePath)) {
    const updateDoc = readFile(updatePath);
    for (const snippet of ['--tool cursor', '~/.cursor/plugins/local/agentic-coding-toolkit']) {
      if (!updateDoc.includes(snippet)) {
        errors.push(`commands/act/update.md missing Cursor guidance snippet: ${snippet}`);
      }
    }
  }
}

function checkCodexSupportDocs() {
  const readmePath = path.resolve(repoRoot, 'README.md');
  if (exists(readmePath)) {
    const readme = readFile(readmePath);
    for (const snippet of [
      './scripts/install.sh --tool codex',
      './scripts/uninstall.sh --tool codex',
      '~/.codex/skills/',
      '~/.codex/agents/',
      'generated Codex-compatible skill copies',
      'Canonical source skills remain shared',
      'restart Codex',
      '/skills',
      '$act-create-issues',
    ]) {
      if (!readme.includes(snippet)) {
        errors.push(`README missing Codex guidance snippet: ${snippet}`);
      }
    }
    if (readme.includes('~/.agents/skills/')) {
      errors.push('README must not document ~/.agents/skills/ as a Codex install path');
    }
  }

  const helpPath = path.resolve(repoRoot, 'commands', 'act-help.md');
  if (exists(helpPath)) {
    const helpDoc = readFile(helpPath);
    for (const snippet of ['/skills', '$act-help']) {
      if (!helpDoc.includes(snippet)) {
        errors.push(`commands/act-help.md missing Codex guidance snippet: ${snippet}`);
      }
    }
  }

  const updatePath = path.resolve(repoRoot, 'commands', 'act-update.md');
  if (exists(updatePath)) {
    const updateDoc = readFile(updatePath);
    for (const snippet of ['--tool codex', '~/.codex/skills/act-help/SKILL.md']) {
      if (!updateDoc.includes(snippet)) {
        errors.push(`commands/act-update.md missing Codex guidance snippet: ${snippet}`);
      }
    }
    if (updateDoc.includes('~/.agents/skills/act-help/SKILL.md')) {
      errors.push('commands/act-update.md must not use ~/.agents/skills/act-help/SKILL.md for Codex detection');
    }
  }

  const commonPath = path.resolve(repoRoot, 'scripts', 'lib', 'common.sh');
  if (exists(commonPath)) {
    const commonScript = readFile(commonPath);
    for (const snippet of ['codex', '.codex/skills', '.codex/agents']) {
      if (!commonScript.includes(snippet)) {
        errors.push(`common.sh missing Codex support marker: ${snippet}`);
      }
    }
  }

  const installPath = path.resolve(repoRoot, 'scripts', 'install.sh');
  if (exists(installPath)) {
    const installScript = readFile(installPath);
    for (const snippet of ['codex', 'install_codex_command_skill', 'install_codex_agents', 'install_codex_skill_dir']) {
      if (!installScript.includes(snippet)) {
        errors.push(`install.sh missing Codex support marker: ${snippet}`);
      }
    }
    for (const forbidden of ['.codex/prompts', '.codex-plugin']) {
      if (installScript.includes(forbidden)) {
        errors.push(`install.sh must not install Codex MVP artifact: ${forbidden}`);
      }
    }
  }

  const transformPath = path.resolve(repoRoot, 'scripts', 'lib', 'transform-agent.js');
  if (exists(transformPath)) {
    const transformScript = readFile(transformPath);
    for (const snippet of ['codex', 'sandbox_mode = "read-only"', 'developer_instructions', 'ACT-GENERATED: agentic-coding-toolkit']) {
      if (!transformScript.includes(snippet)) {
        errors.push(`transform-agent.js missing Codex marker: ${snippet}`);
      }
    }
  }
}

async function checkCodexSkillTransforms(skillFiles) {
  let transformModule;
  try {
    transformModule = await import(pathToFileUrl(path.resolve(repoRoot, 'scripts', 'lib', 'transform-skill-codex.mjs')));
  } catch (error) {
    errors.push(`failed to load Codex skill transformer: ${error.message}`);
    return;
  }

  for (const filePath of skillFiles) {
    const sourcePath = rel(filePath);
    try {
      const generated = transformModule.transformSkillForCodex(readFile(filePath), { sourcePath });
      const validationErrors = transformModule.validateCodexSkill(generated, { sourcePath });
      for (const validationError of validationErrors) {
        errors.push(`Codex transform validation failed for ${sourcePath}: ${validationError}`);
      }
    } catch (error) {
      errors.push(`Codex transform failed for ${sourcePath}: ${error.message}`);
    }
  }
}

function pathToFileUrl(filePath) {
  return `file://${filePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

function getScriptShippingSkills() {
  const skillsRoot = path.resolve(repoRoot, 'skills');
  if (!exists(skillsRoot)) {
    return [];
  }

  const result = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = path.join(skillsRoot, entry.name);
    const scriptsDir = path.join(skillDir, 'scripts');
    if (!exists(scriptsDir)) {
      continue;
    }

    const scriptEntries = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter((item) => item.isFile());
    if (scriptEntries.length === 0) {
      continue;
    }

    result.push({
      skillDir,
      skillDoc: path.join(skillDir, 'SKILL.md'),
    });
  }

  return result;
}

function checkScriptShippingSkillDocs() {
  const helperSource = path.resolve(repoRoot, 'scripts', 'lib', 'act-run-script.js');
  if (!exists(helperSource)) {
    errors.push('missing ACT runtime helper source: scripts/lib/act-run-script.js');
  }

  const rawScriptLineRegex = /(^|[^A-Za-z0-9_./~-])(?:(?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.sh|skills\/[A-Za-z0-9_-]+\/scripts\/[A-Za-z0-9_./-]+\.sh)(?:$|\s|`)/;

  for (const { skillDir, skillDoc } of getScriptShippingSkills()) {
    if (!exists(skillDoc)) {
      errors.push(`script-shipping skill missing SKILL.md: ${rel(skillDoc)}`);
      continue;
    }

    const content = readFile(skillDoc);
    if (!content.includes(supportedActScriptHelper)) {
      errors.push(`script-shipping skill missing helper contract: ${rel(skillDoc)}`);
    }

    const scriptDir = path.join(skillDir, 'scripts');
    const expectedScriptTargets = fs.readdirSync(scriptDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => `skills/${path.basename(skillDir)}/scripts/${entry.name}`);

    if (!expectedScriptTargets.some((target) => content.includes(target))) {
      errors.push(`script-shipping skill missing canonical skill script path: ${rel(skillDoc)}`);
    }

    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (rawScriptLineRegex.test(line) && !line.includes('act-run-script.js')) {
        errors.push(`script-shipping skill contains raw script invocation: ${rel(skillDoc)}:${index + 1}`);
      }
      if (line.includes('act-run-script.js') && /(^|\s)scripts\/[A-Za-z0-9_./-]+\.sh(?:$|\s|`)/.test(line)) {
        errors.push(`script-shipping skill uses repo-root script path instead of skill script path: ${rel(skillDoc)}:${index + 1}`);
      }
    }
  }
}

// Ensure the Dart Migration Launcher source exists, installer wiring installs
// it as a shared runtime helper, and the committed Synced Tool Snapshot has the
// expected file shape. All checks are static file assertions: no `dart pub get`,
// `dart test`, migration command, or synced package test is ever run, so this
// validation stays runnable on machines with Node but no Dart SDK.
function checkDartMigrationLauncher() {
  const launcherRelPath = 'scripts/lib/act-dart-migrate.js';
  const launcherSource = path.resolve(repoRoot, 'scripts', 'lib', 'act-dart-migrate.js');
  if (!exists(launcherSource)) {
    errors.push(`missing Dart Migration Launcher source: ${launcherRelPath}`);
  }

  // Installer wiring: the launcher must be installed through the shared runtime
  // helper contract (the shared-bin helper group), not just mentioned in passing.
  const installScript = path.resolve(repoRoot, 'scripts', 'install.sh');
  if (exists(installScript)) {
    const installContent = readFile(installScript);
    if (!installContent.includes('act-dart-migrate.js')) {
      errors.push('install.sh missing Dart Migration Launcher wiring: act-dart-migrate.js');
    }
    if (!installContent.includes('ACT_SHARED_RUNTIME_HELPERS')) {
      errors.push('install.sh missing shared runtime helper group: ACT_SHARED_RUNTIME_HELPERS');
    } else {
      // The launcher basename must appear inside the shared runtime helper list
      // so it is copied through the same shared-bin path as other helpers.
      const helperListMatch = installContent.match(/ACT_SHARED_RUNTIME_HELPERS=\(([\s\S]*?)\)/);
      if (!helperListMatch || !helperListMatch[1].includes('act-dart-migrate.js')) {
        errors.push('install.sh does not install Dart Migration Launcher as a shared runtime helper');
      }
    }
  }

  // Synced Tool Snapshot: file-shape-only assertions. These mirror the launcher's
  // runtime package-shape contract but never execute Dart.
  const snapshotRelDir = 'tools/act_dart_migrate';
  const snapshotDir = path.resolve(repoRoot, 'tools', 'act_dart_migrate');
  if (!exists(snapshotDir)) {
    errors.push(`missing Synced Tool Snapshot: ${snapshotRelDir}`);
    return;
  }

  const requiredSnapshotFiles = ['pubspec.yaml', path.join('bin', 'act_dart_migrate.dart')];
  for (const relFile of requiredSnapshotFiles) {
    const target = path.join(snapshotDir, relFile);
    if (!exists(target) || !fs.statSync(target).isFile()) {
      errors.push(`Synced Tool Snapshot missing file: ${snapshotRelDir}/${relFile.split(path.sep).join('/')}`);
    }
  }

  const requiredSnapshotDirs = ['lib'];
  for (const relDir of requiredSnapshotDirs) {
    const target = path.join(snapshotDir, relDir);
    if (!exists(target) || !fs.statSync(target).isDirectory()) {
      errors.push(`Synced Tool Snapshot missing directory: ${snapshotRelDir}/${relDir}/`);
    }
  }
}

// Ensure required OpenCode hook artifacts exist and are wired.
function checkOpenCodeHookArtifacts() {
  const required = [
    'hooks/opencode/act-hooks-plugin.js',
    'hooks/opencode/act-opencode-log-session.js',
  ];

  for (const relPath of required) {
    const resolved = path.resolve(repoRoot, relPath);
    if (!exists(resolved)) {
      errors.push(`missing OpenCode artifact: ${relPath}`);
    }
  }

  const installScript = path.resolve(repoRoot, 'scripts', 'install.sh');
  if (exists(installScript)) {
    const installContent = readFile(installScript);
    if (!installContent.includes('act-hooks-plugin.js') || !installContent.includes('Installing OpenCode hooks plugin')) {
      errors.push('install.sh missing OpenCode plugin install markers');
    }
  }

  const uninstallScript = path.resolve(repoRoot, 'scripts', 'uninstall.sh');
  if (exists(uninstallScript)) {
    const uninstallContent = readFile(uninstallScript);
    if (!uninstallContent.includes('plugins/act-hooks-plugin.js')) {
      errors.push('uninstall.sh missing OpenCode plugin cleanup marker: plugins/act-hooks-plugin.js');
    }
  }
}

// Ensure VERSION matches the latest CHANGELOG entry.
function checkChangelogVersion() {
  const versionPath = path.resolve(repoRoot, 'VERSION');
  const changelogPath = path.resolve(repoRoot, 'CHANGELOG.md');
  if (!exists(versionPath) || !exists(changelogPath)) return;
  const version = readFile(versionPath).trim();
  const changelog = readFile(changelogPath);
  const m = changelog.match(/## \[([^\]]+)\] - \d{4}-\d{2}-\d{2}/);
  if (!m) {
    errors.push('CHANGELOG.md missing version headings');
    return;
  }
  const latest = m[1].trim();
  if (latest !== version) {
    errors.push(`VERSION (${version}) does not match latest CHANGELOG entry (${latest})`);
  }
}

// Warn on broken symlinks inside commands/agents/skills.
function checkBrokenSymlinks() {
  const roots = ['commands', 'agents', 'skills'];
  for (const root of roots) {
    const rootPath = path.resolve(repoRoot, root);
    if (!exists(rootPath)) continue;
    for (const entry of fs.readdirSync(rootPath)) {
      const p = path.join(rootPath, entry);
      try {
        const stat = fs.lstatSync(p);
        if (stat.isSymbolicLink()) {
          const target = fs.readlinkSync(p);
          const resolved = path.resolve(path.dirname(p), target);
          if (!exists(resolved)) warnings.push(`broken symlink: ${rel(p)} -> ${target}`);
        }
      } catch {
        // ignore
      }
    }
  }
}

// Validate links in workflow .md files (non-SKILL.md) under skills/.
// Catches broken references from workflow files to shared includes.
function checkWorkflowLinks() {
  const skillsDir = path.resolve(repoRoot, 'skills');
  if (!exists(skillsDir)) return;
  const allMd = walk(skillsDir).filter(f => f.endsWith('.md') && !f.endsWith('SKILL.md'));
  for (const f of allMd) {
    checkMarkdownLinks(f);
  }
}

// Check for unclosed fenced code blocks in markdown files.
function checkFencedCodeBlocks(filePath) {
  const content = readFile(filePath);
  const lines = content.split('\n');
  let open = false;
  for (const line of lines) {
    if (/^```/.test(line)) open = !open;
  }
  if (open) {
    warnings.push(`unclosed fenced code block: ${rel(filePath)}`);
  }
}

// Main runner: collect files, run all checks, report.
async function main() {
  // Front-matter validation
  const commandFiles = walk(path.resolve(repoRoot, 'commands')).filter(f => f.endsWith('.md'));
  const agentFiles = walk(path.resolve(repoRoot, 'agents')).filter(f => f.endsWith('.md'));
  const skillFiles = walk(path.resolve(repoRoot, 'skills')).filter(f => f.endsWith('SKILL.md'));

  for (const f of commandFiles) checkFrontMatter(f, 'command');
  for (const f of agentFiles) checkFrontMatter(f, 'agent');
  for (const f of skillFiles) checkFrontMatter(f, 'skill');

  // Duplicate names across all front-matter files
  collectNames([...commandFiles, ...agentFiles, ...skillFiles]);

  // Link & reference integrity
  for (const f of [...commandFiles, ...agentFiles, ...skillFiles]) {
    checkMarkdownLinks(f);
    checkSkillReferences(f);
  }

  // Workflow file link integrity (shared includes, etc.)
  checkWorkflowLinks();

  checkReadmeSkillRefs();
  checkWorkflowSkillMigration();
  checkGitMetaSkillMigration();
  checkPrimaryConstructorMigrationDocs();
  checkScriptsExecutable();
  checkHooks();
  checkClaudeHookArtifacts();
  checkCodexHookArtifacts();
  checkInstallTestArtifacts();
  checkCursorPluginManifest();
  checkCursorDocs();
  checkCodexSupportDocs();
  await checkCodexSkillTransforms(skillFiles);
  checkScriptShippingSkillDocs();
  checkDartMigrationLauncher();
  checkOpenCodeHookArtifacts();
  checkChangelogVersion();
  checkBrokenSymlinks();

  // Basic markdown sanity
  const allMdFiles = [...commandFiles, ...agentFiles, ...skillFiles,
    ...walk(path.resolve(repoRoot, 'skills')).filter(f => f.endsWith('.md') && !f.endsWith('SKILL.md'))];
  for (const f of allMdFiles) checkFencedCodeBlocks(f);

  if (warnings.length) {
    console.log('Warnings:');
    for (const w of warnings) console.log(`- ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.error('Errors:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('OK: smoke checks passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
