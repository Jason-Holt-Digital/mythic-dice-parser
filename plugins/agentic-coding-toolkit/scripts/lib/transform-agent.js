#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--') || value === undefined) {
      usage();
    }

    args[key.slice(2)] = value;
    index += 1;
  }

  return args;
}

function usage() {
  console.error('Usage: transform-agent.js --tool [claude|opencode|codex] --input <path> --output <path>');
  process.exit(1);
}

function splitFrontMatter(content, filePath) {
  if (!content.startsWith('---\n')) {
    throw new Error(`agent missing front-matter: ${filePath}`);
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw new Error(`agent missing closing front-matter delimiter: ${filePath}`);
  }

  return {
    frontMatter: content.slice(4, endIndex),
    body: content.slice(endIndex + '\n---\n'.length),
  };
}

function collectBlocks(frontMatter) {
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
      throw new Error('unsupported front-matter format before first top-level key');
    }

    currentBlock.lines.push(line);
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function getScalar(frontMatter, key, filePath) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) {
    throw new Error(`agent missing ${key}: ${filePath}`);
  }
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function toTomlString(value) {
  return JSON.stringify(value);
}

function toTomlMultilineBasic(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"');
}

function writeCodexAgent({ frontMatter, body, input, output }) {
  const toolkitPath = path.resolve(__dirname, '..', '..');
  const sourceRelativePath = path.relative(toolkitPath, path.resolve(input)).split(path.sep).join('/');
  const sourceName = getScalar(frontMatter, 'name', input);
  const name = sourceName.startsWith('act-') ? sourceName : `act-${sourceName}`;
  const description = getScalar(frontMatter, 'description', input);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, [
    '# ACT-GENERATED: agentic-coding-toolkit',
    `# ACT-SOURCE: ${sourceRelativePath}`,
    `# ACT-TOOLKIT-PATH: ${toolkitPath}`,
    '# ACT-OWNERSHIP: reinstall/uninstall may replace this file when the toolkit path matches',
    `name = ${toTomlString(name)}`,
    `description = ${toTomlString(description)}`,
    'sandbox_mode = "read-only"',
    `developer_instructions = """\n${toTomlMultilineBasic(body)}"""`,
    '',
  ].join('\n'));
}

function main() {
  const { tool, input, output } = parseArgs(process.argv);
  if (tool !== 'claude' && tool !== 'opencode' && tool !== 'codex') {
    usage();
  }
  if (!input || !output) {
    usage();
  }

  const keysToStrip = tool === 'claude'
    ? new Set(['mode', 'permission'])
    : new Set(['color', 'tools']);

  const source = fs.readFileSync(input, 'utf8');
  const { frontMatter, body } = splitFrontMatter(source, input);
  if (tool === 'codex') {
    writeCodexAgent({ frontMatter, body, input, output });
    return;
  }
  const blocks = collectBlocks(frontMatter);
  const transformedFrontMatter = blocks
    .filter((block) => !keysToStrip.has(block.key))
    .map((block) => block.lines.join('\n'))
    .join('\n');

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `---\n${transformedFrontMatter}\n---\n${body}`);
}

main();
