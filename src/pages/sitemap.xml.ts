import type { APIRoute } from 'astro';

const routes = [
  { path: '', lastmod: '2026-11-08', changefreq: 'weekly', priority: '1.0' },
  { path: 'programs/', lastmod: '2026-11-08', changefreq: 'weekly', priority: '0.9' },
  { path: 'programs/oinp/', lastmod: '2026-11-08', changefreq: 'weekly', priority: '0.8' },
  { path: 'programs/pgwp/', lastmod: '2026-11-08', changefreq: 'monthly', priority: '0.8' },
  { path: 'programs/employer-work-permits/', lastmod: '2026-11-08', changefreq: 'monthly', priority: '0.8' },
  { path: 'programs/spousal-sponsorship/', lastmod: '2026-11-08', changefreq: 'monthly', priority: '0.8' },
  { path: 'services/', lastmod: '2026-11-08', changefreq: 'monthly', priority: '0.9' },
  { path: 'contact/', lastmod: '2026-11-07', changefreq: 'monthly', priority: '0.8' },
  { path: 'about/', lastmod: '2026-11-07', changefreq: 'monthly', priority: '0.7' },
  { path: 'privacy/', lastmod: '2026-11-08', changefreq: 'yearly', priority: '0.3' },
  { path: 'terms/', lastmod: '2026-11-08', changefreq: 'yearly', priority: '0.3' },
];

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response('Site URL is not configured.', { status: 500 });
  }

  const siteOrigin = site.toString().replace(/\/$/, '');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const url = route.path === '' ? `${siteOrigin}/` : `${siteOrigin}/${route.path}`;
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
