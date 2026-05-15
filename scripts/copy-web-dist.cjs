const { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');

const src = resolve(__dirname, '../apps/web/dist');
const dest = resolve(__dirname, '../packages/cli/web');

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const srcPath = join(from, entry);
    const destPath = join(to, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

if (!existsSync(src)) {
  console.error('Web dist not found. Run: pnpm --filter web build');
  process.exit(1);
}

copyDir(src, dest);
console.log('Copied web dist to packages/cli/web/');
