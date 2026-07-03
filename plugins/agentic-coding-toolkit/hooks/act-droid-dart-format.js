#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const input = readStdinJson();
const toolInput = input?.tool_input || input?.toolInput || {};
const candidatePaths = [
  toolInput.file_path,
  toolInput.path,
  toolInput.target_file,
  ...(Array.isArray(toolInput.edits) ? toolInput.edits.map((edit) => edit?.file_path || edit?.path) : []),
].filter(Boolean);

const dartFiles = [...new Set(candidatePaths)]
  .filter((filePath) => filePath.endsWith(".dart"))
  .filter((filePath) => !filePath.endsWith(".g.dart"))
  .map((filePath) => path.resolve(process.cwd(), filePath));

if (dartFiles.length === 0) {
  process.exit(0);
}

const result = spawnSync("dart", ["format", ...dartFiles], {
  encoding: "utf8",
  stdio: "pipe",
});

if (result.status !== 0) {
  const message = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  console.error(message || "dart format failed");
  process.exit(result.status || 1);
}

process.exit(0);

function readStdinJson() {
  try {
    const chunks = [];
    const buffer = require("fs").readFileSync(0);
    if (buffer.length === 0) {
      return {};
    }
    chunks.push(buffer.toString("utf8"));
    return JSON.parse(chunks.join(""));
  } catch {
    return {};
  }
}
