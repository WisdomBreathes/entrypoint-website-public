import { expect, test } from '@playwright/test';

test('contact page handles the local fallback and configured inquiry delivery', async ({ page }) => {
  await page.goto('/contact/?test=do-not-send#contact-heading');
  const form = page.locator('#contact-form');
  const endpoint = await form.getAttribute('data-inquiry-endpoint');

  if (!endpoint) {
    await expect(form).toBeHidden();
    await expect(page.locator('#privacy').getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy/');
    await page.getByRole('link', { name: 'phone or email options' }).click();
    await expect(page).toHaveURL(/#direct-contact$/);
    return;
  }

  expect(endpoint).toBe(endpoint.trim());
  const url = new URL(endpoint, page.url()).href;
  let status = 503;
  const requests: Record<string, unknown>[] = [];
  await page.route((requestUrl) => requestUrl.href === url, async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': new URL(page.url()).origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status, headers, json: { ok: status === 200 } });
  });

  await expect(form).toBeVisible();
  await expect(form.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy/');
  await expect(form.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms/#consultant-client');
  await form.locator('[name="full_name"]').fill('Synthetic Browser Test');
  await form.locator('[name="email"]').fill('browser-test@example.com');
  await form.locator('[name="service"]').selectOption({ index: 1 });
  const message = form.locator('[name="message"]');
  const submit = form.getByRole('button', { name: 'Request consultation' });
  const feedback = form.getByRole('alert');
  await message.fill('Do not send this link: https://example.com');
  await submit.click();
  await expect(feedback).toContainText('Please remove links');
  expect(requests).toHaveLength(0);

  const testMessage = 'Synthetic browser test. This inquiry is never sent to the live service.';
  await message.fill(testMessage);
  await submit.click();
  await expect(feedback).toContainText('We could not confirm delivery');
  await expect(feedback.getByRole('link', { name: 'email us' })).toBeVisible();
  await expect(feedback.getByRole('link', { name: 'call 647-906-0011' })).toHaveAttribute('href', 'tel:+16479060011');
  await expect(message).toHaveValue(testMessage);
  await expect(submit).toBeEnabled();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    full_name: 'Synthetic Browser Test',
    email: 'browser-test@example.com',
    phone: null,
    message: testMessage,
    page_url: new URL('/contact/', page.url()).href,
  });

  status = 200;
  await submit.click();
  await expect(page).toHaveURL(/\/thank-you\/$/);
  expect(requests).toHaveLength(2);
});
