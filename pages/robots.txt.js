const SITE_URL = 'https://reel-grab-teal.vercel.app';

export default function Robots() {}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.write(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`);
  res.end();
  return { props: {} };
}
