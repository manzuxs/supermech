#!/usr/bin/env node

import { startServer } from '../src/server.ts';

async function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const noOpen = args.includes('--no-open');
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) || 4388 : 4388;

  console.log('[supermech] Starting workbench...');
  console.log(`[supermech] Directory: ${cwd}`);

  try {
    const server = await startServer({ port, cwd, noOpen });

    if (!noOpen) {
      try {
        const open = (await import('open')).default;
        await open(server.url);
      } catch {
        // best effort
      }
    }

    console.log(`[supermech] Workbench ready at ${server.url}`);
    console.log('[supermech] Press Ctrl+C to stop.');
  } catch (err) {
    console.error('[supermech] Failed to start:', err);
    process.exit(1);
  }
}

main();
