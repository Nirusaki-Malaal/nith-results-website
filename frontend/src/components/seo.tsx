import { Helmet } from 'react-helmet-async';

type SeoProps = {
  title: string;
  description: string;
  path: string;
  type?: string;
  roll?: string;
};

const SITE = 'NITH Results';
const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://nithresults.xyz';
const CANONICAL_BASE = 'https://nithresults.xyz';

function Seo({ title, description, path, type = 'website', roll }: SeoProps) {
  const fullTitle = path === '/' ? title : `${title} | ${SITE}`;
  const url = `${CANONICAL_BASE}${path}`;
  const ogImageUrl = roll 
    ? `${BASE}/api/og/${roll.toUpperCase()}`
    : `${BASE}/assets/og-default.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Helmet>
  );
}

export default Seo;
