# entrypoint-website
Website for Entrypoint Canada.

## Layout checks

```sh
npm ci
npx playwright install chromium webkit
npm run check:layout
```

This builds the site and checks it in Chromium and WebKit at mobile, tablet,
desktop, and breakpoint widths. It checks for overflow, distorted controls,
misaligned service cards, and extra hero image downloads. Failed checks include
screenshots in `test-results/`. The GitHub Pages workflow runs these checks before upload.

For visual changes, also review the rendered page on a narrow phone, a tablet,
and a wide desktop. Check that the subject stays clear of the copy, the shared
gutters and section rhythm hold, and wrapped text does not push icons out of place.
