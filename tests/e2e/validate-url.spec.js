import { test, expect } from '@playwright/test';

test('validateurl with mocked valid api shows success stub', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { docid: 'doc-1', title: 'Sample Proof', rolename: 'Author' },
      }),
    });
  });

  await page.goto('/#/validateurl?key=test-key-abc');
  await expect(page.getByRole('heading', { name: /link validated/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/sample proof/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /continue to landing/i })).toBeDisabled();
});

test('validateurl with mocked expired api shows failure', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'expired',
        message: 'The link has expired',
      }),
    });
  });

  await page.goto('/#/validateurl?key=expired-key');
  // Dismiss SweetAlert (Expired) then assert page error state
  const swalConfirm = page.locator('.swal2-confirm');
  await expect(swalConfirm).toBeVisible({ timeout: 15000 });
  await swalConfirm.click();
  await expect(page.getByRole('heading', { name: /validation failed/i })).toBeVisible({
    timeout: 10000,
  });
});
