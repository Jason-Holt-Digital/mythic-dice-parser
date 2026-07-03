const unsupportedFrontMatterKeys = new Set(['tools', 'allowed-tools']);
const codexRuntimeNotice = [
  '<codex_runtime>',
  'When this skill says to ask the user directly, print the question or options in normal assistant output and stop. Do not continue the workflow, infer an answer, select an option, or create/update files until the user replies.',
  '</codex_runtime>',
  '',
].join('\n');
const forbiddenOutputPatterns = [
  /AskUserQuestion/,
  /SlashCommand/,
  /Task tool/,
  /Use Task/,
  /Edit tool/,
  /Write tool/,
  /TodoWrite/,
];
const actSlashInvocationPattern = /(^|[^A-Za-z0-9_./~-])\/act-[A-Za-z0-9_-]+/;

export function splitFrontMatter(markdown, sourcePath = '<memory>') {
  if (!markdown.startsWith('---\n')) {
    throw new Error(`skill missing front-matter: ${sourcePath}`);
  }

  const endIndex = markdown.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw new Error(`skill missing closing front-matter delimiter: ${sourcePath}`);
  }

  return {
    frontMatter: markdown.slice(4, endIndex),
    body: markdown.slice(endIndex + '\n---\n'.length),
  };
}

export function transformFrontMatterForCodex(frontMatter, options = {}) {
  const sourcePath = options.sourcePath ?? '<memory>';
  const blocks = collectFrontMatterBlocks(frontMatter, sourcePath);
  const keys = new Set(blocks.map((block) => block.key));

  for (const requiredKey of ['name', 'description']) {
    if (!keys.has(requiredKey)) {
      throw new Error(`skill missing ${requiredKey}: ${sourcePath}`);
    }
  }

  return blocks
    .filter((block) => !unsupportedFrontMatterKeys.has(block.key))
    .map((block) => block.lines.join('\n'))
    .join('\n');
}

export function rewriteCodexRuntimeReferences(body) {
  return body
    .split('\n')
    .map((line) => rewriteLineForCodex(line))
    .join('\n');
}

export function validateCodexSkill(markdown, options = {}) {
  const sourcePath = options.sourcePath ?? '<memory>';
  const errors = [];
  let frontMatter;

  try {
    frontMatter = splitFrontMatter(markdown, sourcePath).frontMatter;
    const blocks = collectFrontMatterBlocks(frontMatter, sourcePath);
    const keys = new Set(blocks.map((block) => block.key));
    for (const requiredKey of ['name', 'description']) {
      if (!keys.has(requiredKey)) {
        errors.push(`generated Codex skill missing ${requiredKey} frontmatter`);
      }
    }
    for (const unsupportedKey of unsupportedFrontMatterKeys) {
      if (keys.has(unsupportedKey)) {
        errors.push(`generated Codex skill contains unsupported frontmatter: ${unsupportedKey}`);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }

  for (const pattern of forbiddenOutputPatterns) {
    if (pattern.test(markdown)) {
      errors.push(`generated Codex skill contains forbidden pattern: ${pattern.source}`);
    }
  }

  if (actSlashInvocationPattern.test(markdown)) {
    errors.push('generated Codex skill contains forbidden ACT slash invocation');
  }

  return errors;
}

export function transformSkillForCodex(markdown, options = {}) {
  const sourcePath = options.sourcePath ?? '<memory>';
  const includeGeneratedMarker = options.includeGeneratedMarker ?? true;
  const { frontMatter, body } = splitFrontMatter(markdown, sourcePath);
  const transformedFrontMatter = transformFrontMatterForCodex(frontMatter, { sourcePath });
  const transformedBody = rewriteCodexRuntimeReferences(body, { sourcePath });
  const marker = includeGeneratedMarker
    ? `<!-- ACT generated Codex skill from ${sourcePath}. Do not edit this installed copy. -->\n\n`
    : '';
  const output = `---\n${transformedFrontMatter}\n---\n${marker}${codexRuntimeNotice}${transformedBody}`;
  return output.endsWith('\n') ? output : `${output}\n`;
}

function collectFrontMatterBlocks(frontMatter, sourcePath) {
  const lines = frontMatter.split('\n');
  const blocks = [];
  let currentBlock = null;

  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):/);
    if (match) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        key: match[1],
        lines: [line],
      };
      continue;
    }

    if (!currentBlock) {
      throw new Error(`unsupported front-matter format before first top-level key: ${sourcePath}`);
    }

    currentBlock.lines.push(line);
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function rewriteLineForCodex(line) {
  let rewritten = line;

  rewritten = rewritten.replace(/Use AskUserQuestion:/g, 'Ask the user directly:');
  rewritten = rewritten.replace(/use AskUserQuestion:/g, 'ask the user directly:');
  rewritten = rewritten.replace(/Then use AskUserQuestion\./g, 'Then ask the user directly.');
  rewritten = rewritten.replace(/Use AskUserQuestion to ask/g, 'Ask the user directly');
  rewritten = rewritten.replace(/use AskUserQuestion to ask/g, 'ask the user directly');
  rewritten = rewritten.replace(/Do not call AskUserQuestion/g, 'Do not ask follow-up questions');
  rewritten = rewritten.replace(/before any AskUserQuestion call/g, 'before asking any follow-up question');
  rewritten = rewritten.replace(/AskUserQuestion answer/g, 'user answer');
  rewritten = rewritten.replace(/AskUserQuestion/g, 'direct user question');

  rewritten = rewritten.replace(/Use Task subagents/g, 'Spawn Codex subagents');
  rewritten = rewritten.replace(/Task subagents/g, 'Codex subagents');
  rewritten = rewritten.replace(/Use the Task tool/g, 'Spawn Codex subagents');
  rewritten = rewritten.replace(/^([ \t]*- )Task ([A-Za-z0-9_-]+)\(([^)]*)\)/, '$1Spawn the $2 Codex custom agent with $3');
  rewritten = rewritten.replace(/Task\(description=[^)]+\)/g, 'Spawn the requested Codex custom agent with the described prompt.');
  rewritten = rewritten.replace(/Task tool/g, 'Codex subagent workflow');

  rewritten = rewritten.replace(/use SlashCommand tool: `([^`]*)`/g, (_match, invocation) => `invoke \`${rewriteActSlashInvocations(invocation)}\``);
  rewritten = rewritten.replace(/Use SlashCommand tool: `([^`]*)`/g, (_match, invocation) => `Invoke \`${rewriteActSlashInvocations(invocation)}\``);
  rewritten = rewritten.replace(/SlashCommand tool/g, 'Codex skill invocation');
  rewritten = rewritten.replace(/SlashCommand:/g, 'Codex skill invocation:');
  rewritten = rewriteActSlashInvocations(rewritten);

  rewritten = rewritten.replace(/Use Write tool to save the spec:/g, 'Create or update the spec file:');
  rewritten = rewritten.replace(/Use Write tool to save the plan\./g, 'Create or update the plan file.');
  rewritten = rewritten.replace(/Write tool/g, 'file update');
  rewritten = rewritten.replace(/Do not use the Edit tool/g, 'Do not edit files');
  rewritten = rewritten.replace(/Before using Edit/g, 'Before editing files');
  rewritten = rewritten.replace(/Apply edits using the Edit tool/g, 'Apply targeted edits');
  rewritten = rewritten.replace(/using the Edit tool/g, 'editing files');
  rewritten = rewritten.replace(/Edit tool/g, 'file editing');
  rewritten = rewritten.replace(/TodoWrite/g, 'a concise task list');

  return rewritten;
}

function rewriteActSlashInvocations(value) {
  return value.replace(/(^|[^A-Za-z0-9_./~-])\/act-([A-Za-z0-9_-]+)/g, '$1$act-$2');
}
