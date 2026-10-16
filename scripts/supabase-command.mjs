import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Prefer this workspace's WSL CLI when present; otherwise use a normal installed CLI.
export function cliCommand(args) {
  const local = resolve('.runtime/supabase');
  if (process.platform === 'win32' && existsSync(local)) {
    const converted = spawnSync('wsl.exe', ['-e', 'wslpath', '-a', local], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (converted.status !== 0)
      throw new Error('The local WSL runtime is unavailable. Start Ubuntu and Docker, then retry.');
    return { command: 'wsl.exe', args: ['-u', 'root', '-e', converted.stdout.trim(), ...args] };
  }
  return { command: process.env.SUPABASE_CLI || 'supabase', args };
}

export function localStatus() {
  const cli = cliCommand(['status', '-o', 'json']);
  const result = spawnSync(cli.command, cli.args, { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0)
    throw new Error('Supabase is not running. Start the local stack first.');
  const status = JSON.parse(result.stdout);
  const target = new URL(status.API_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
    throw new Error('This helper only configures a loopback Supabase stack.');
  return status;
}
