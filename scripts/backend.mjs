import { spawn, spawnSync } from 'node:child_process';
import { cliCommand, localStatus } from './supabase-command.mjs';
const action = process.argv[2] || 'start';
if (!['start', 'stop', 'status'].includes(action)) throw new Error('Use start, stop, or status.');
const args =
  action === 'start'
    ? [
        'start',
        '--network-id',
        'faultline-local',
        '-x',
        'studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit',
      ]
    : [action];
const cli = cliCommand(args);
// Keep WSL alive before health checks: a cold distribution may still be recovering its DB.
function startKeeper() {
  const processHandle = spawn(
    'wsl.exe',
    ['-u', 'root', '-e', 'bash', 'scripts/keep-backend-alive.sh'],
    {
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  processHandle.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  return processHandle;
}
let keeper = action === 'start' && cli.command === 'wsl.exe' ? startKeeper() : null;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    keeper?.kill();
    process.exit(0);
  });
if (action === 'start') {
  const docker =
    cli.command === 'wsl.exe' ? ['wsl.exe', ['-u', 'root', '-e', 'docker']] : ['docker', []];
  const inspect = spawnSync(docker[0], [...docker[1], 'network', 'inspect', 'faultline-local'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  if (inspect.status !== 0) {
    const create = spawnSync(
      docker[0],
      [
        ...docker[1],
        'network',
        'create',
        '--driver',
        'bridge',
        '--opt',
        'com.docker.network.bridge.host_binding_ipv4=127.0.0.1',
        'faultline-local',
      ],
      { stdio: 'ignore', windowsHide: true },
    );
    if (create.status !== 0) throw new Error('Docker is not ready. Start Docker, then retry.');
  }
  for (let attempt = 0; attempt < 90; attempt++) {
    const health = spawnSync(
      docker[0],
      [...docker[1], 'inspect', '-f', '{{.State.Health.Status}}', 'supabase_db_faultline'],
      {
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    if (health.status !== 0 || health.stdout.trim() !== 'starting') break;
    if (attempt === 0) console.log('Waiting for the existing database to recover…');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
const child = spawn(cli.command, cli.args, {
  stdio: ['inherit', action === 'start' || action === 'status' ? 'pipe' : 'inherit', 'inherit'],
  windowsHide: true,
});
// The CLI prints local admin credentials to stdout. Never echo them in this helper.
child.stdout?.resume();
child.on('error', () => {
  keeper?.kill();
  console.error('Supabase CLI was not found. See README.md for setup.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
  if (code !== 0 || action === 'stop') {
    keeper?.kill();
    return;
  }
  const status = localStatus();
  // Initial image downloads can outlast the helper's startup grace period.
  // The CLI keeps WSL alive during the download; renew the helper after it completes.
  if (keeper && keeper.exitCode !== null) keeper = startKeeper();
  console.log(`Faultline backend ready: ${status.API_URL}`);
  if (action === 'start' && cli.command === 'wsl.exe') {
    console.log(
      'Keep this terminal open while using Faultline. Use npm run backend:stop in another terminal to stop the stack.',
    );
  }
});
