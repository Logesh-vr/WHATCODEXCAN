import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/account.spec.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, RUN_BACKEND_TESTS: '1' },
    windowsHide: true,
  },
);
child.on('exit', (code) => (process.exitCode = code ?? 1));
