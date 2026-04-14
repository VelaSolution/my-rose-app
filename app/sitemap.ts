import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://velaanalytics.com';
  const now = new Date().toISOString();

  const staticPages = [
    { url: base, lastModified: now, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/guide`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${base}/info`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${base}/community`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${base}/game`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/benchmark`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${base}/checklist`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/help`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.4 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.4 },
    { url: `${base}/promo`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/stores`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${base}/api-docs`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${base}/refund`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const tools = [
    'menu-cost', 'labor', 'tax', 'pl-report', 'sns-content', 'review-reply',
    'area-analysis', 'delivery-menu', 'promo-generator', 'menu-pricing',
    'review-analysis', 'delivery-analysis', 'naver-place', 'marketing-calendar',
    'startup-checklist', 'daily-sales', 'labor-law', 'card-sales',
    'competitor-pricing', 'handover', 'tax-advisor', 'group-buy', 'integrations',
    'business-plan', 'gov-support', 'incorporation', 'financial-sim',
    'fundraising', 'tax-guide', 'hiring', 'revenue-forecast',
  ].map(tool => ({
    url: `${base}/tools/${tool}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...tools];
}
