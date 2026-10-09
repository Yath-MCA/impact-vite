import { test, expect } from '@playwright/test';

function parseJsonData(postData) {
  if (!postData) return {};
  try {
    const params = new URLSearchParams(postData);
    const raw = params.get('jsondata') || postData;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

test('Agree grants session and opens editor shell', async ({ page }) => {
  let lastSessionId = 'S-E2E';

  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          docid: 'D-E2E',
          title: 'Accept Proof',
          client: 'default',
          rolename: 'Author',
          apikey: 'test-api-key',
          emailto: 'author@example.com',
        },
      }),
    });
  });

  await page.route('**/linksharing**', async (route) => {
    const payload = parseJsonData(route.request().postData());
    if (payload.session_id) lastSessionId = String(payload.session_id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        r: 1,
        session_id: lastSessionId,
        session_start_time: String(Date.now()),
      }),
    });
  });

  await page.route('**/*getdocs*', async (route) => {
    const payload = parseJsonData(route.request().postData());
    const isSessionVerify =
      payload?.find?.docstatus === '1' || payload?.find?.session_end_time === '0';
    if (isSessionVerify) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          r: 1,
          data: [
            {
              docid: 'D-E2E',
              docstatus: '1',
              session_end_time: '0',
              session_id: lastSessionId,
            },
          ],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto('/#/validateurl?key=accept-key');
  await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
  const agree = page.getByRole('button', { name: /agree & continue/i });
  await expect(agree).toBeEnabled({ timeout: 10000 });
  await agree.click();
  await expect(page).toHaveURL(/#\/editor/, { timeout: 30000 });
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
});
