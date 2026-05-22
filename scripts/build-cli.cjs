const esbuild = require('esbuild');
const { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const cliDir = join(root, 'packages', 'cli');

// Only keep these as external (they ship compiled JS)
const EXTERNAL_PKGS = ['express', 'chokidar', 'open'];

function resolveWorkspaceProtocols() {
  const pkgPath = join(cliDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  let changed = false;
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (version !== 'workspace:*') continue;
    // Resolve from monorepo packages
    const pkgName = name.split('/').pop(); // @supermech/runtime → runtime
    const workspacePkgPath = join(root, 'packages', pkgName, 'package.json');
    if (existsSync(workspacePkgPath)) {
      const resolved = JSON.parse(readFileSync(workspacePkgPath, 'utf-8'));
      pkg.dependencies[name] = `^${resolved.version}`;
      changed = true;
      console.log(`[build-cli] resolved ${name}: workspace:* → ^${resolved.version}`);
    }
  }

  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

async function main() {
  // Resolve workspace:* before bundling (required for npm publish)
  resolveWorkspaceProtocols();

  await esbuild.build({
    entryPoints: [join(cliDir, 'src', 'server.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: join(cliDir, 'bin', 'server.mjs'),
    external: EXTERNAL_PKGS,
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
