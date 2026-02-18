import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);

function readArg(flag, fallback = '') {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return fallback;
  }
  return String(args[idx + 1] || '').trim();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function run(cmd, cmdArgs, env = process.env) {
  const result = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    env
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function collectFiles(rootDir) {
  const out = [];
  const stack = ['.'];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(rootDir, rel);
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextRel);
      } else if (entry.isFile()) {
        out.push(nextRel);
      }
    }
  }
  return out.sort();
}

function sha256File(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function usage() {
  console.log(
    'Usage: node tools/release-runtime-bundle.js [--tag vX.Y.Z] [--out-dir dist/releases] [--pack-base-url https://cdn.example.com/packs]'
  );
}

if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const defaultTag = pkg.version ? `v${pkg.version}` : 'v0.0.0';
const tag = readArg('--tag', defaultTag);
const outDir = readArg('--out-dir', path.join('dist', 'releases'));
const packBaseUrl = readArg('--pack-base-url', String(process.env.REPATH_PACK_BASE_URL || '').trim());

const runtimeRoot = `repath-core-${tag}-runtime-data`;
const releaseDir = path.join(outDir, tag);
const archivePath = path.join(releaseDir, `${runtimeRoot}.tar.gz`);
const filesShaPath = path.join(releaseDir, `${runtimeRoot}.files.sha256`);
const archiveShaPath = path.join(releaseDir, `${runtimeRoot}.sha256`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repath-core-release-'));
const stagingRoot = path.join(tmpDir, runtimeRoot);

ensureDir(releaseDir);
ensureDir(path.join(stagingRoot, 'packages'));
ensureDir(path.join(stagingRoot, 'schema'));
ensureDir(path.join(stagingRoot, 'dist'));

const env = { ...process.env };
if (packBaseUrl) {
  env.REPATH_PACK_BASE_URL = packBaseUrl;
}

run('node', ['tools/manifest-build.js'], env);
run('node', ['tools/validate-pack.js'], env);
run('node', ['tools/smoke-test.js'], env);

fs.cpSync(path.join('packages', 'packs'), path.join(stagingRoot, 'packages', 'packs'), { recursive: true });
fs.copyFileSync(path.join('schema', 'pack.schema.json'), path.join(stagingRoot, 'schema', 'pack.schema.json'));
fs.copyFileSync(path.join('dist', 'manifest.json'), path.join(stagingRoot, 'dist', 'manifest.json'));
fs.copyFileSync(path.join('dist', 'search.json'), path.join(stagingRoot, 'dist', 'search.json'));

run('tar', ['-czf', archivePath, '-C', tmpDir, runtimeRoot]);

const fileHashes = collectFiles(stagingRoot).map((relPath) => {
  const normalizedRelPath = relPath.startsWith('.') ? relPath : `./${relPath}`;
  return `${sha256File(path.join(stagingRoot, relPath))}  ${normalizedRelPath}`;
});
fs.writeFileSync(filesShaPath, fileHashes.join('\n') + '\n');

const archiveHash = sha256File(archivePath);
fs.writeFileSync(archiveShaPath, `${archiveHash}  ${path.basename(archivePath)}\n`);

console.log(`Wrote ${archivePath}`);
console.log(`Wrote ${filesShaPath}`);
console.log(`Wrote ${archiveShaPath}`);
