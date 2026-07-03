#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
      usage();
    }

    args[key.slice(2)] = value;
    index += 1;
  }

  return args;
}

function usage() {
  console.error('Usage: transform-skill-codex.js --input <path> --output <path> [--source-path <repo-relative-path>]');
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.output) {
    usage();
  }

  const outputDir = path.dirname(args.output);
  const tempOutput = path.join(outputDir, `.${path.basename(args.output)}.${process.pid}.${Date.now()}.tmp`);

  try {
    const {
      transformSkillForCodex,
      validateCodexSkill,
    } = await import('./transform-skill-codex.mjs');
    const source = fs.readFileSync(args.input, 'utf8');
    const sourcePath = args['source-path'] || args.input;
    const generated = transformSkillForCodex(source, { sourcePath });
    const validationErrors = validateCodexSkill(generated, { sourcePath });
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '));
    }

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(tempOutput, generated, 'utf8');
    fs.renameSync(tempOutput, args.output);
  } catch (error) {
    fs.rmSync(tempOutput, { force: true });
    console.error(error.message);
    process.exit(1);
  }
}

main();
