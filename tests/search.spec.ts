import { expect, test } from '@playwright/test';

const site = 'https://entrypointcanada.com';
const publicPaths = [
  '/',
  '/services/',
  '/programs/',
  '/programs/oinp/',
  '/programs/pgwp/',
  '/programs/employer-work-permits/',
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

test('site links resolve to existing pages and section anchors', async ({ page }) => {
  const paths = [...publicPaths, '/thank-you/', '/404.html'];
  const anchorsByPath = new Map<string, Set<string>>();
  const linksByPath = new Map<string, string[]>();
  for (const path of paths) {
    const response = await page.goto(path);
    if (path !== '/404.html') expect(response?.status(), path).toBe(200);
    const { anchors, links } = await page.evaluate(() => ({
      anchors: [...document.querySelectorAll('[id]')].map((el) => el.id),
      links: [...new Set([...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((el) => el.href))],
    }));
    anchorsByPath.set(path, new Set(anchors));
    linksByPath.set(path, links);
  }

  const previewOrigin = new URL(page.url()).origin;
  for (const [path, links] of linksByPath) {
    for (const href of links) {
      const url = new URL(href);
      if (url.protocol === 'tel:') expect(url.href, path).toBe('tel:+16479060011');
      if (url.protocol === 'mailto:') expect(url.href, path).toBe('mailto:info@entrypointcanada.com');
      if (url.origin !== previewOrigin && url.origin !== site) continue;
      const anchors = anchorsByPath.get(url.pathname);
      expect(anchors, `${path} links to ${href}`).toBeDefined();
      if (url.hash) expect(anchors?.has(decodeURIComponent(url.hash.slice(1))), `${path} links to ${href}`).toBe(true);
    }
  }
});

test('program cards distinguish guides from consultations', async ({ page }) => {
  const guides = [
    { link: 'Read the OINP guide', path: '/programs/oinp/', heading: 'Ontario Immigrant Nominee Program (OINP)' },
    { link: 'Read the PGWP guide', path: '/programs/pgwp/', heading: 'Post-Graduation Work Permit (PGWP)' },
    { link: 'Read the work permit guide', path: '/programs/employer-work-permits/', heading: 'Employer Work Permits and LMIAs' },
    { link: 'Read the sponsorship guide', path: '/programs/spousal-sponsorship/', heading: 'Spousal, Partner, and Dependent Child Sponsorship' },
  ];
  await page.goto('/programs/');
  const cards = page.locator('.program-card');
  const consultationLinks = cards.getByRole('link', { name: 'Book a consultation', exact: true });
  await expect(cards.locator('.btn-gold, .program-inline-link')).toHaveCount(10);
  await expect(consultationLinks).toHaveCount(6);
  expect(await consultationLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    .toEqual(Array(6).fill('/contact/'));

  for (const { link, path, heading } of guides) {
    await test.step(link, async () => {
      await cards.getByRole('link', { name: link, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
      await page.goto('/programs/');
    });
  }
});

test('program review dates match structured data and the sitemap', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml');
  const lastModified = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    return Object.fromEntries(Array.from(document.getElementsByTagName('url'), (entry) => [
      entry.getElementsByTagName('loc')[0]?.textContent,
      entry.getElementsByTagName('lastmod')[0]?.textContent,
    ]));
  }, await sitemap.text());

  for (const path of publicPaths.filter((path) => path.startsWith('/programs/'))) {
    await test.step(path, async () => {
      await page.goto(path);
      const date = await page.locator('main time[datetime]').getAttribute('datetime');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const modifiedDate = await page.locator('script[type="application/ld+json"]').evaluateAll(
        (scripts, url) => scripts.flatMap((script) => JSON.parse(script.textContent ?? 'null'))
          .find((entity) => entity?.url === url && entity.dateModified)?.dateModified,
        site + path,
      );
      expect(modifiedDate).toBe(date);
      expect(lastModified[site + path]).toBe(date);
    });
  }
});
