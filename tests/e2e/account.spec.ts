import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
// @ts-expect-error CLI helper is a Node-only JavaScript module.
import { localStatus } from '../../scripts/supabase-command.mjs';

test('real account signup, private persistence, failed-save recovery and sign-in', async ({
  page,
}) => {
  test.skip(
    process.env.RUN_BACKEND_TESTS !== '1',
    'Run npm run test:accounts with the local backend started.',
  );
  const status = localStatus();
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `faultline-browser-${randomUUID()}@example.test`;
  const password = `Aa9!${randomUUID()}`;
  let userId: string | undefined;
  const title = 'Private reasoning from the browser test';
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'New here? Create an account' }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const signup = page.waitForResponse((r) => r.url().includes('/auth/v1/signup'));
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    const response = await signup;
    expect(response.ok()).toBe(true);
    userId = (await response.json()).user.id;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.storage-label')).toContainText('Private notebook');
    await page.getByLabel('Edit decision', { exact: true }).click();
    await page.getByLabel('Your question').fill(title);
    await page.getByRole('button', { name: 'Start comparing' }).click();
    await page.getByRole('button', { name: 'Save decision', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved to your private notebook');
    await page.getByRole('tab', { name: 'Decision brief' }).click();
    await page.getByLabel('What does the model miss?').fill('Private notes survive a failed save.');
    await page.route('**/rest/v1/faultline_decisions*', (route) =>
      route.request().method() === 'PATCH' ? route.abort('failed') : route.continue(),
    );
    await page.getByRole('button', { name: 'Save decision', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your draft is still here');
    await expect(page.getByLabel('What does the model miss?')).toHaveValue(
      'Private notes survive a failed save.',
    );
    await page.unroute('**/rest/v1/faultline_decisions*');
    await page.getByRole('button', { name: 'Save decision', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved to your private notebook');
    expect(
      await page.evaluate(() =>
        localStorage.getItem('faultline-draft-v1')?.includes('Private reasoning'),
      ),
    ).not.toBe(true);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.locator('.storage-label')).toContainText('This browser only');
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(title);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Incorrect-password-9!');
    await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.storage-label')).toContainText('Private notebook');
    await page.getByRole('button', { name: 'My notebook' }).click();
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /^Private reasoning from the browser test/ }).click();
    await page.getByRole('tab', { name: 'Decision brief' }).click();
    await expect(page.getByLabel('What does the model miss?')).toHaveValue(
      'Private notes survive a failed save.',
    );
    await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved to your private notebook');
    await page.getByRole('button', { name: 'My notebook' }).click();
    const entries = page.getByRole('button', { name: /^Private reasoning from the browser test/ });
    await expect(entries).toHaveCount(2);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: 'docs/screenshots/account-notebook.png' });
    await page
      .getByRole('button', { name: `Delete ${title}` })
      .first()
      .click();
    await expect(entries).toHaveCount(1);
    await page.getByRole('button', { name: `Delete ${title}` }).click();
    await expect(entries).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      expect(error).toBeNull();
    }
  }
});
