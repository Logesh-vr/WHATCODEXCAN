import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('edit, explore, save, reopen, export, and delete a local decision', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What should I build next?');
  await expect(page.locator('.option-card').first()).toContainText('7.75');
  await page.getByLabel('Edit decision', { exact: true }).click();
  await page.getByLabel('Your question').fill('Which project earns its weekend?');
  await page.getByRole('button', { name: 'Start comparing' }).click();
  await page.getByLabel('Browser extension: Time to first user score').fill('8');
  await expect(page.locator('.option-card').first()).toContainText('Weekend workshop');
  await page.getByRole('tab', { name: 'Stress test' }).click();
  await page.getByLabel('Criterion to stress test').selectOption({ label: 'Enjoyment' });
  await page.locator('#scenario-weight').fill('70');
  await expect(page.locator('.scenario-result')).toContainText('Weekend workshop');
  await page.getByRole('button', { name: 'Use these weights' }).click();
  await expect(page.getByRole('status')).toContainText('Scenario applied');
  await page.getByRole('tab', { name: 'Decision brief' }).click();
  await page
    .getByLabel('What does the model miss?')
    .fill('Validate demand with five people first.');
  await page.getByRole('button', { name: 'Save decision', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  await page.reload();
  await page.getByRole('button', { name: 'My notebook' }).click();
  await page.getByRole('button', { name: /^Which project earns its weekend/ }).click();
  await page.getByRole('tab', { name: 'Decision brief' }).click();
  await expect(page.getByLabel('What does the model miss?')).toHaveValue(
    'Validate demand with five people first.',
  );
  await page.getByRole('button', { name: 'My notebook' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete Which project earns its weekend?' }).click();
  await expect(page.getByText('Keep the reasoning, not just the result.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('criteria/options limits and keyboard dialog behavior', async ({ page }) => {
  await page.getByLabel('Edit decision', { exact: true }).click();
  await page.getByRole('button', { name: 'Add option' }).click();
  await expect(page.getByRole('button', { name: 'Add option' })).toBeDisabled();
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByRole('button', { name: 'Add criterion' })).toBeDisabled();
  await page.getByRole('button', { name: 'Start comparing' }).click();
  await expect(page.locator('.option-card')).toHaveCount(4);
  await page.getByRole('button', { name: /How it works/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Score the options' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Stress test' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('desktop and mobile have no serious accessibility violations or page overflow', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/screenshots/workspace-${viewport.width}.png`,
      fullPage: true,
    });
  }
});

test('corrupt browser data produces a recoverable state', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('faultline-draft-v1', 'broken');
    localStorage.setItem('faultline-library-v1', 'broken');
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('draft couldn’t be read');
  await page.getByRole('button', { name: 'My notebook' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('notebook didn’t load');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('score uncertainty and a tied decision are explained accurately', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Your question').fill('An honest tie');
  await page.getByRole('button', { name: 'Start comparing' }).click();
  await expect(page.locator('.option-status').filter({ hasText: 'JOINT LEAD' })).toHaveCount(2);
  await page.getByLabel('Option A: Impact uncertain', { exact: true }).click();
  await expect(
    page.getByText('The score ranges overlap. Check the uncertain scores before committing.'),
  ).toBeVisible();
});

test('explore tipping point opens the exact crossover without changing saved weights', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Explore tipping point' }).click();
  await expect(page.getByLabel('Criterion to stress test')).toHaveValue(
    (await page
      .locator('#stress-criterion option')
      .filter({ hasText: 'Enjoyment' })
      .getAttribute('value')) || '',
  );
  await expect(page.locator('#scenario-weight')).toHaveValue('34.4');
  await expect(page.locator('.scenario-result')).toContainText('A tie at these weights.');
  await expect(page.locator('.option-card').first()).toContainText('7.75');
});

test('mobile editor, scenario, brief, and empty notebook remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const audit = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  };
  await page.getByLabel('Edit decision', { exact: true }).click();
  await page.getByRole('button', { name: 'Add option' }).click();
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await audit();
  await page.getByRole('button', { name: 'Start comparing' }).click();
  await audit();
  await page.getByRole('tab', { name: 'Stress test' }).click();
  await audit();
  await page.getByRole('tab', { name: 'Decision brief' }).click();
  await audit();
  await page.getByRole('button', { name: 'My notebook' }).click();
  await expect(page.getByText('Keep the reasoning, not just the result.')).toBeVisible();
  await audit();
});
