import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/unauthorized/',
          '/simulator/',
          '/profile/',
          '/dashboard/',
          '/onboarding/',
          '/my-store/',
          '/monthly-input/',
          '/payment/',
          '/reset-password/',
          '/auth/',
          '/hq/',
          '/notes/',
          '/sales-connect/',
          '/result/',
          '/referral/',
          '/ingredient-tracker/',
          '/event/',
          '/home/',
        ],
      },
    ],
    sitemap: 'https://velaanalytics.com/sitemap.xml',
  };
}
