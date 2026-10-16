import { writeFileSync, existsSync } from 'node:fs';
import { localStatus } from './supabase-command.mjs';

if (existsSync('.env.local') && !process.argv.includes('--force')) {
  console.error(
    '.env.local already exists. Run npm run setup:env -- --force only to replace it with this local stack.',
  );
  process.exit(1);
}
const status = localStatus();
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
if (!key) throw new Error('Supabase did not return a public API key.');
writeFileSync(
  '.env.local',
  `# Local Supabase. Public browser configuration only.\nVITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
);
console.log('Wrote local public configuration to .env.local. Restart Vite to enable accounts.');
