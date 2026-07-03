import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  transformSkillForCodex,
  validateCodexSkill,
} from '../lib/transform-skill-codex.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function main() {
  testMinimalSkillTransformsWithMarkerAndFinalNewline();
  testValidationReportsForbiddenRuntimeToolNames();
  testQuestionInstructionsAreRuntimeNeutral();
  testTaskSubagentInstructionsUseCodexWording();
  testSlashCommandHandoffsUseSkillInvocation();
  testEditWriteAndTodoToolNamesAreRuntimeNeutral();
  testRealWorkflowSkillHasNoForbiddenCodexOutput();
  testCliWritesGeneratedRegularFile();
  testCliFailureDoesNotLeaveFinalOutput();

  console.log('codex skill transform tests: ok');
}

function testMinimalSkillTransformsWithMarkerAndFinalNewline() {
  const source = [
    '---',
    'name: act-example',
    'description: Example description.',
    'tools: [Read, Write]',
    '---',
    '# Example',
    '',
    'Keep this body.',
    '',
  ].join('\n');

  const first = transformSkillForCodex(source, {
    sourcePath: 'skills/act-example/SKILL.md',
  });
  const second = transformSkillForCodex(source, {
    sourcePath: 'skills/act-example/SKILL.md',
  });

  assert.equal(first, second);
  assert.equal(first.endsWith('\n'), true);
  assert.match(first, /^---\nname: act-example\ndescription: Example description\.\n---\n/);
  assert.match(
    first,
    /<!-- ACT generated Codex skill from skills\/act-example\/SKILL\.md\. Do not edit this installed copy\. -->/,
  );
  assert.match(
    first,
    /<codex_runtime>\nWhen this skill says to ask the user directly, print the question or options in normal assistant output and stop\./,
  );
  assert.doesNotMatch(first, /^tools:/m);
  assert.match(first, /# Example\n\nKeep this body\.\n$/);
}

function testValidationReportsForbiddenRuntimeToolNames() {
  const generated = [
    '---',
    'name: act-example',
    'description: Example description.',
    '---',
    '',
    'Use AskUserQuestion before the Write tool.',
    '',
  ].join('\n');

  assert.deepEqual(validateCodexSkill(generated), [
    'generated Codex skill contains forbidden pattern: AskUserQuestion',
    'generated Codex skill contains forbidden pattern: Write tool',
  ]);
}

function testQuestionInstructionsAreRuntimeNeutral() {
  const output = transformBody([
    'Use AskUserQuestion:',
    'Use AskUserQuestion to ask for missing context.',
    'Then use AskUserQuestion.',
    'Check before any AskUserQuestion call.',
    'Read the AskUserQuestion answer.',
  ].join('\n'));

  assert.match(output, /Ask the user directly:/);
  assert.match(output, /Ask the user directly for missing context\./);
  assert.match(output, /Then ask the user directly\./);
  assert.match(output, /before asking any follow-up question\./);
  assert.match(output, /user answer\./);
  assert.deepEqual(validateCodexSkill(output), []);
}

function testTaskSubagentInstructionsUseCodexWording() {
  const output = transformBody([
    'Use Task subagents for research.',
    'Use the Task tool to launch focused work.',
    '- Task act-codebase-researcher(task_input)',
    'Task(description="Check", prompt="Inspect", subagent_type="general")',
  ].join('\n'));

  assert.match(output, /Spawn Codex subagents for research\./);
  assert.match(output, /Spawn Codex subagents to launch focused work\./);
  assert.match(output, /- Spawn the act-codebase-researcher Codex custom agent with task_input/);
  assert.match(output, /Spawn the requested Codex custom agent with the described prompt\./);
  assert.deepEqual(validateCodexSkill(output), []);
}

function testSlashCommandHandoffsUseSkillInvocation() {
  const output = transformBody([
    'If ready, use SlashCommand tool: `/act-workflow-plan [spec-path] --use-subagents`',
    'SlashCommand: /act-git-worktree create feature-name',
    'Built-in Codex command: /skills',
    'Script path: node ~/.config/agentic-coding-toolkit/bin/act-run-script.js skills/act-git-worktree/scripts/git-worktree.sh help',
    '```text',
    '/act-workflow-work ai_specs/auth-plan.md',
    '```',
  ].join('\n'));

  assert.match(output, /If ready, invoke `\$act-workflow-plan \[spec-path\] --use-subagents`/);
  assert.match(output, /Codex skill invocation: \$act-git-worktree create feature-name/);
  assert.match(output, /Built-in Codex command: \/skills/);
  assert.match(output, /skills\/act-git-worktree\/scripts\/git-worktree\.sh help/);
  assert.match(output, /```text\n\$act-workflow-work ai_specs\/auth-plan\.md\n```/);
  assert.deepEqual(validateCodexSkill(output), []);
}

function testEditWriteAndTodoToolNamesAreRuntimeNeutral() {
  const output = transformBody([
    'Use Write tool to save the spec:',
    'Use Write tool to save the plan.',
    'Do not use the Edit tool before approval.',
    'Before using Edit, inspect the file.',
    'Apply edits using the Edit tool.',
    'Maintain TodoWrite entries.',
  ].join('\n'));

  assert.match(output, /Create or update the spec file:/);
  assert.match(output, /Create or update the plan file\./);
  assert.match(output, /Do not edit files before approval\./);
  assert.match(output, /Before editing files, inspect the file\./);
  assert.match(output, /Apply targeted edits\./);
  assert.match(output, /Maintain a concise task list entries\./);
  assert.deepEqual(validateCodexSkill(output), []);
}

function testRealWorkflowSkillHasNoForbiddenCodexOutput() {
  const sourcePath = 'skills/act-workflow-spec/SKILL.md';
  const source = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
  const output = transformSkillForCodex(source, { sourcePath });

  assert.deepEqual(validateCodexSkill(output), []);
  assert.doesNotMatch(output, /^tools:/m);
  assert.match(output, /\$act-workflow-plan \[spec-path\] --use-subagents/);
  assert.match(output, /Do not continue the workflow, infer an answer, select an option, or create\/update files until the user replies\./);
}

function transformBody(body) {
  return transformSkillForCodex([
    '---',
    'name: act-example',
    'description: Example description.',
    'tools: [Read, Write, Task, AskUserQuestion, SlashCommand, Edit]',
    '---',
    body,
    '',
  ].join('\n'), {
    sourcePath: 'skills/act-example/SKILL.md',
  });
}

function testCliWritesGeneratedRegularFile() {
  const tempDir = makeTempDir('act-codex-skill-cli-');
  const input = path.join(tempDir, 'SKILL.md');
  const output = path.join(tempDir, 'out', 'SKILL.md');
  fs.writeFileSync(input, [
    '---',
    'name: act-cli',
    'description: CLI skill.',
    'tools: [Read]',
    '---',
    'Use AskUserQuestion:',
    '',
  ].join('\n'));

  const result = runCli(['--input', input, '--output', output, '--source-path', 'skills/act-cli/SKILL.md']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.lstatSync(output).isFile(), true);
  assert.equal(fs.lstatSync(output).isSymbolicLink(), false);
  const generated = fs.readFileSync(output, 'utf8');
  assert.match(generated, /ACT generated Codex skill from skills\/act-cli\/SKILL\.md/);
  assert.doesNotMatch(generated, /^tools:/m);
  assert.match(generated, /Ask the user directly:/);
}

function testCliFailureDoesNotLeaveFinalOutput() {
  const tempDir = makeTempDir('act-codex-skill-cli-fail-');
  const input = path.join(tempDir, 'SKILL.md');
  const output = path.join(tempDir, 'out', 'SKILL.md');
  fs.writeFileSync(input, 'missing frontmatter\n');

  const result = runCli(['--input', input, '--output', output]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /skill missing front-matter/);
  assert.equal(fs.existsSync(output), false);
}

function runCli(args) {
  return spawnSync('node', [path.join(repoRoot, 'scripts', 'lib', 'transform-skill-codex.js'), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

main();
