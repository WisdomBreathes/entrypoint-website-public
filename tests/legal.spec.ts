import { expect, test } from '@playwright/test';

for (const { path, title, contents } of [
  { path: '/privacy/', title: 'Privacy Policy', contents: 'Privacy policy sections' },
  { path: '/terms/', title: 'Terms of Use', contents: 'Terms of use sections' },
]) {
  for (const [width, height] of [[390, 844], [1440, 480]]) {
    test(`${title} links and contents at ${width} x ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.getByRole('contentinfo').getByRole('link', { name: title, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

      const nav = page.getByRole('navigation', { name: contents, exact: true });
      const links = await nav.getByRole('link').evaluateAll((elements) =>
        elements.map((el) => ({ hash: (el as HTMLAnchorElement).hash, name: el.textContent!.trim() })),
      );
      expect(links.length).toBeGreaterThan(0);

      for (const { hash, name } of links) {
        await test.step(name, async () => {
          await nav.getByRole('link', { name, exact: true }).click();
          await expect(page).toHaveURL(path + hash);
          const heading = page.locator(hash).getByRole('heading', { name, level: 2 });
          await expect.poll(() => heading.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const header = document.querySelector('.site-header')!.getBoundingClientRect();
            return rect.top >= header.bottom && rect.bottom <= window.innerHeight;
          })).toBe(true);
        });
      }

      if (width >= 900) {
        const panel = page.locator('.legal-contents-panel');
        await expect(panel).toBeInViewport({ ratio: 0.95 });
        await expect(panel).toHaveCSS('position', 'sticky');
      }
    });
  }
}
