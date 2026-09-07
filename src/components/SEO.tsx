import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'CornMM';
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://cornmm.com').replace(/\/$/, '');
const DEFAULT_DESCRIPTION = 'Discover trending and latest videos on CornMM. Browse categories, creators, and watch videos online.';

const PAGE_META: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': { title: 'CornMM – Watch Trending & Latest Videos', description: DEFAULT_DESCRIPTION },
  '/trending': { title: 'Trending Videos – CornMM', description: 'Explore the most popular and trending videos on CornMM.' },
  '/latest': { title: 'Latest Videos – CornMM', description: 'Browse the latest video uploads and discover new content on CornMM.' },
  '/categories': { title: 'Video Categories – CornMM', description: 'Browse CornMM videos by category and discover content you enjoy.' },
  '/terms': { title: 'Terms of Service – CornMM', description: 'Read the CornMM terms of service.' },
  '/privacy': { title: 'Privacy Policy – CornMM', description: 'Read the CornMM privacy policy.' },
  '/dmca': { title: 'DMCA – CornMM', description: 'Learn how to submit a copyright notice to CornMM.' },
  '/guidelines': { title: 'Community Guidelines – CornMM', description: 'Review the CornMM community and content guidelines.' },
  '/contact': { title: 'Contact – CornMM', description: 'Contact the CornMM team.' },
};

export function SEO() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || (pathname.startsWith('/watch/')
    ? { title: 'Watch Video – CornMM', description: 'Watch videos on CornMM.', index: true }
    : pathname.startsWith('/creator/')
      ? { title: 'Creator Profile – CornMM', description: 'Explore creator videos and profiles on CornMM.', index: true }
      : { title: 'CornMM – Video Platform', description: DEFAULT_DESCRIPTION, index: false });

  useEffect(() => {
    const canonical = new URL(pathname || '/', SITE_URL).href;
    document.title = meta.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;

    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', meta.index === false ? 'noindex,follow' : 'index,follow');
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[name="twitter:card"]', 'content', 'summary');
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);

    document.head.querySelector('#cornmm-schema')?.remove();
    if (meta.index !== false && ['/', '/trending', '/latest', '/categories'].includes(pathname)) {
      const script = document.createElement('script');
      script.id = 'cornmm-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL
      });
      document.head.appendChild(script);
    }
  }, [pathname, meta.title, meta.description, meta.index]);

  return null;
}
