import { expect, test } from '@playwright/test';

const site = 'https://entrypointcanada.com';
const publicPaths = [
  '/',
  '/services/',
  '/programs/',
  '/programs/oinp/',
  '/programs/pgwp/',
  '/programs/spousal-sponsorship/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/terms/',
];

test('public pages have distinct search metadata and canonical sitemap entries', async ({ page, request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${site}/sitemap.xml`);

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const sitemapUrls = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(document.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'loc'),
      (loc) => loc.textContent?.trim() ?? '');
  }, await sitemap.text());
  expect(sitemapUrls.sort()).toEqual(publicPaths.map((path) => site + path).sort());

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of publicPaths) {
    await test.step(path, async () => {
      expect((await page.goto(path))?.status()).toBe(200);
      const title = (await page.title()).trim();
      const description = (await page.locator('meta[name="description"]').getAttribute('content'))?.trim() ?? '';

      expect(title).toContain('Entrypoint Canada');
      expect(titles.has(title)).toBe(false);
      expect(description).not.toBe('');
      expect(descriptions.has(description)).toBe(false);
      expect(await page.locator('meta[name="robots"]').getAttribute('content')).not.toMatch(/\b(noindex|nosnippet)\b/i);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + path);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', site + path);
      await expect(page.locator('main h1')).toHaveCount(1);

      titles.add(title);
      descriptions.add(description);
    });
  }
});

test('confirmation and error pages are excluded from indexing', async ({ page }) => {
  for (const path of ['/thank-you/', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /\bnoindex\b/i);
  }
});
