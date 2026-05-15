const esbuild = require('esbuild');
const { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const cliDir = join(root, 'packages', 'cli');

// Mark all non-relative imports as external
const externalPlugin = {
  name: 'external-deps',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      return { external: true, path: args.path };
    });
  },
};

async function main() {
  // Bundle bin entry
  await esbuild.build({
    entryPoints: [join(cliDir, 'src', 'server.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: join(cliDir, 'bin', 'server.mjs'),
    plugins: [externalPlugin],
    tsconfig: join(cliDir, 'tsconfig.json'),
  });

  console.log('[build-cli] server.ts bundled to bin/server.mjs');

  // Copy built web dist
  const srcWeb = join(root, 'apps', 'web', 'dist');
  const destWeb = join(cliDir, 'web');
  if (existsSync(srcWeb)) {
    copyDir(srcWeb, destWeb);
    console.log('[build-cli] web dist copied');
  } else {
    console.error('[build-cli] WARNING: web dist not found. Run: pnpm --filter web build');
  }
}

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
