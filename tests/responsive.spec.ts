import { expect, test, type Page } from '@playwright/test';

const sizes = [
  [320, 568], [390, 844], [430, 932], [639, 800], [640, 800], [767, 820], [768, 820],
  [899, 768], [900, 768], [1023, 768], [1024, 768], [1280, 600], [1440, 900], [1920, 1080],
] as const;

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) {
      problems.push(`page width ${document.documentElement.scrollWidth} exceeds ${innerWidth}`);
    }

    for (const element of document.querySelectorAll('h1, h2, h3, button, a[class*="btn-"], .home-hero-brand span')) {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) continue;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if ([...range.getClientRects()].some((r) => r.width && (r.left < bounds.left - 2 || r.right > bounds.right + 2))) {
          problems.push(`text escapes ${element.tagName}: ${node.textContent.trim().slice(0, 80)}`);
        }
      }
    }

    for (const icon of document.querySelectorAll('a svg[width][height], button svg[width][height]')) {
      const bounds = icon.getBoundingClientRect();
      if (!bounds.width && !bounds.height) continue;
      const width = Number(icon.getAttribute('width'));
      const height = Number(icon.getAttribute('height'));
      if (width && height && (Math.abs(width - bounds.width) > 1 || Math.abs(height - bounds.height) > 1)) {
        problems.push(`icon changed shape in ${icon.closest('a,button')?.textContent?.trim().slice(0, 65) || 'navigation'}`);
      }
      const control = icon.closest('a,button')!.getBoundingClientRect();
      if (bounds.left < control.left - 1 || bounds.right > control.right + 1 || bounds.top < control.top - 1 || bounds.bottom > control.bottom + 1) {
        problems.push('icon extends outside its control');
      }
    }
    return problems;
  });
}

for (const [width, height] of sizes) {
  test(`layout at ${width} x ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await open(page, '/');
    const home = await page.evaluate(() => {
      const rect = (el: Element) => el.getBoundingClientRect();
      const hero = document.querySelector('.home-hero')!;
      const image = hero.querySelector('img')!;
      const heading = document.querySelector('#home-services-title')!;
      const heroHeading = hero.querySelector('h1')!;
      const heroAction = hero.querySelector('.btn-gold')!;
      const heroDescriptor = hero.querySelector('.home-hero-brand span')!;
      const wordmark = document.querySelector('.site-wordmark span')!;
      const nav = rect(document.querySelector('.nav-inner')!);
      const frame = (el: Element) => rect(el).left + parseFloat(getComputedStyle(el).paddingLeft);
      const cards = [...document.querySelectorAll('.home-service-entry')];
      const cardProblems: string[] = [];
      for (const card of cards) {
        const title = rect(card.querySelector('h3')!);
        for (const label of card.querySelectorAll('.home-service-label span')) {
          const range = document.createRange();
          range.selectNodeContents(label);
          if (range.getBoundingClientRect().right > title.left - 4) cardProblems.push(`Label crowds title: ${label.textContent}`);
        }
        for (const sibling of cards.filter((other) => Math.abs(rect(other).top - rect(card).top) < 1)) {
          for (const selector of ['h3', '.home-service-copy p', '.home-service-link']) {
            if (Math.abs(rect(card.querySelector(selector)!).top - rect(sibling.querySelector(selector)!).top) > 1) {
              cardProblems.push(`Cards in the same row disagree on ${selector}`);
              break;
            }
          }
        }
      }
      return {
        cardProblems,
        sameGutters: Math.abs(frame(hero.querySelector('.section-container')!) - frame(heading.closest('.section-container')!)) < 1,
        heroFillsDesktop: rect(hero).bottom >= innerHeight - 1 && Math.abs(rect(hero).top - nav.bottom - 1) <= 1,
        directTransition: hero.nextElementSibling?.id === 'services-heading',
        actionVisible: rect(heroAction).bottom <= innerHeight + 1,
        mobilePhotoClear: rect(image).bottom <= rect(heroDescriptor).top && getComputedStyle(hero, '::after').content === 'none',
        mobileDescriptorHierarchy: rect(heroDescriptor).right <= innerWidth + 2
          && rect(heroDescriptor).height > 0
          && rect(hero.querySelector('.home-hero-brand p')!).height === 0,
        mobileCopyAligned: [heroDescriptor, hero.querySelector('.home-hero-lead')!, heroAction]
          .every((el) => Math.abs(rect(el).left - rect(heroHeading).left) < 1),
        imageReady: image.complete && image.naturalWidth > 0,
        imageCrop: image.currentSrc,
      };
    });
    expect.soft(home.cardProblems).toEqual([]);
    expect.soft(home.sameGutters).toBe(true);
    if (width >= 1024) expect.soft(home.heroFillsDesktop).toBe(true);
    if (width < 768) {
      expect.soft(home.mobilePhotoClear).toBe(true);
      expect.soft(home.mobileDescriptorHierarchy).toBe(true);
      expect.soft(home.mobileCopyAligned).toBe(true);
    }
    if (width <= 390) expect.soft(home.actionVisible).toBe(true);
    expect.soft(home.imageReady).toBe(true);
    expect.soft(home.directTransition).toBe(true);
    expect.soft(home.imageCrop).toMatch(width < 768 ? /-mobile-\d+w\.webp$/ : /-wide-\d+w\.webp$/);

    const paths = ['/', '/services/', '/programs/', '/contact/'];
    if (width === 390 || width === 1440) paths.push('/about/', '/programs/oinp/', '/programs/pgwp/', '/programs/employer-work-permits/', '/programs/spousal-sponsorship/', '/privacy/', '/terms/');
    for (const path of paths) {
      if (path !== '/') await open(page, path);
      expect.soft(await layoutProblems(page), path).toEqual([]);
      if (path === '/programs/' && (width === 390 || width === 1440)) {
        const cards = page.getByRole('region', { name: 'Canadian Experience Class and Ontario Nomination' }).locator('article');
        const insets = await cards.evaluateAll((elements) => elements.map((card) => {
          const note = card.querySelector('.program-card-note')!.getBoundingClientRect();
          const button = card.querySelector('.btn-gold')!.getBoundingClientRect();
          return [Math.round(button.top - note.bottom), Math.round(card.getBoundingClientRect().bottom - button.bottom)];
        }));
        expect.soft(insets).toEqual([[40, 25], [40, 25]]);
      }
      if (['/about/', '/programs/', '/services/'].includes(path)) {
        const band = page.locator('main > .page-cta-band');
        await band.scrollIntoViewIfNeeded();
        await expect.poll(() => band.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const content = element.firstElementChild!;
          const first = content.firstElementChild!.getBoundingClientRect();
          const last = content.lastElementChild!.getBoundingClientRect();
          if (!bounds.height || !first.height || !last.height) return null;
          return [
            Math.round(first.top - bounds.top),
            Math.round(bounds.bottom - last.bottom),
          ];
        }), { message: `${path} consultation section insets` }).toEqual([52, 52]);
      }
    }
  });
}

test('mobile menu icons and state survive resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 420 });
  await open(page, '/');
  const toggle = page.getByRole('button', { name: 'Menu', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#icon-open')).toBeHidden();
  await expect(page.locator('#icon-close')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  expect(await layoutProblems(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.setViewportSize({ width: 768, height: 820 });
  await expect(page.locator('#nav-desktop')).toBeVisible();
  await expect(page.locator('#nav-mobile')).toBeHidden();
  await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded', 'false');
});

test('homepage links directly to program guides and mobile navigation marks the current page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/');
  const guides = page.getByRole('navigation', { name: 'Program guides', exact: true });
  await expect(guides.getByRole('link', { name: 'how to immigrate to Canada' })).toHaveAttribute('href', '/programs/');
  await expect(guides.getByRole('link', { name: 'Ontario Immigrant Nominee Program (OINP)' })).toHaveAttribute('href', '/programs/oinp/');
  await expect(guides.getByRole('link', { name: 'Post-graduation work permit (PGWP)' })).toHaveAttribute('href', '/programs/pgwp/');
  await expect(guides.getByRole('link', { name: 'Employer work permits and LMIAs' })).toHaveAttribute('href', '/programs/employer-work-permits/');
  await expect(guides.getByRole('link', { name: 'Spousal and dependent child sponsorship' })).toHaveAttribute('href', '/programs/spousal-sponsorship/');

  const toggle = page.getByRole('button', { name: 'Menu', exact: true });
  const programs = page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Immigration programs' });
  await toggle.click();
  await programs.click();
  await expect(page).toHaveURL(/\/programs\/$/);
  await toggle.click();
  await expect(programs).toHaveAttribute('aria-current', 'page');
});

for (const [width, height] of [[390, 844], [1440, 900]]) {
  test(`section jump links land below the sticky header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const [path, link, anchor, eyebrow] of [
      ['/', 'Explore services', '#services-heading', 'What we do'],
      ['/programs/', 'Express Entry and provincial nomination', '#economic-pathways', 'Core Pathways'],
    ]) {
      await test.step(path, async () => {
        await open(page, path);
        await page.getByRole('link', { name: link, exact: true }).click();
        await expect(page).toHaveURL(path + anchor);
        const section = page.locator(anchor);
        await expect.poll(() => section.evaluate((el) => {
          const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
          return Math.abs(el.getBoundingClientRect().top - headerBottom);
        })).toBeLessThanOrEqual(2);
        await expect(section.getByText(eyebrow, { exact: true })).toBeInViewport({ ratio: 1 });
      });
    }
  });
}

for (const [width, height, deviceScaleFactor, budget, candidate] of [
  [390, 844, 2, 30_000, 840], [390, 844, 3, 42_000, 1080],
  [1440, 900, 1, 70_000, 1920], [1920, 1080, 2, 155_000, 3200],
] as const) {
  test(`hero photo transfer at ${width}px, ${deviceScaleFactor}x`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width, height }, deviceScaleFactor });
    try {
      const downloads: string[] = [];
      page.on('request', (request) => {
        if (/\/rivera-canadian-flag-.*\.webp$/.test(request.url())) downloads.push(request.url());
      });
      await open(page, '/');
      const image = page.locator('.home-hero-image img');
      await expect(image).toHaveAttribute('fetchpriority', 'high');
      await expect(image).toHaveAttribute('loading', 'eager');
      const result = await image.evaluate((el: HTMLImageElement) => ({
        url: el.currentSrc,
        bytes: (performance.getEntriesByName(el.currentSrc)[0] as PerformanceResourceTiming)?.encodedBodySize,
      }));
      expect(downloads).toEqual([result.url]);
      expect(result.url).toContain(`-${candidate}w.webp`);
      expect(result.bytes).toBeGreaterThan(0);
      expect(result.bytes).toBeLessThanOrEqual(budget);
    } finally {
      await page.close();
    }
  });
}
