import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Video } from '../types';

const SITE_NAME = 'CornMM';
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://cornmm.com').replace(/\/$/, '');
const DEFAULT_DESCRIPTION = 'Watch trending and latest adult videos on CornMM. Explore Myanmar and Asian videos with a fast, mobile-friendly viewing experience.';

const PAGE_META: Record<string, { title: string; description: string; index?: boolean }> = {
  '/': { title: 'CornMM – Myanmar Adult Videos & Trending Videos', description: DEFAULT_DESCRIPTION },
  '/trending': { title: 'Trending Adult Videos – CornMM', description: 'Watch the most popular and trending adult videos on CornMM.' },
  '/latest': { title: 'Latest Adult Videos – CornMM', description: 'Browse the latest adult video uploads on CornMM and discover new content.' },
  '/categories': { title: 'Adult Video Categories – CornMM', description: 'Browse CornMM adult videos by category and discover Myanmar and Asian content.' },
  '/terms': { title: 'Terms of Service – CornMM', description: 'Read the CornMM terms of service.' },
  '/privacy': { title: 'Privacy Policy – CornMM', description: 'Read the CornMM privacy policy.' },
  '/dmca': { title: 'DMCA – CornMM', description: 'Learn how to submit a copyright notice to CornMM.' },
  '/guidelines': { title: 'Community Guidelines – CornMM', description: 'Review the CornMM community and content guidelines.' },
  '/contact': { title: 'Contact – CornMM', description: 'Contact the CornMM team.' },
};

const PRIVATE_PREFIXES = [
  '/dashboard', '/edit/', '/history', '/favorites', '/settings', '/admin',
  '/corn-admin-login', '/register', '/forgot-password', '/upload'
];

function toIsoDuration(seconds: unknown) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  if (!total) return undefined;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${secs ? `${secs}S` : ''}`;
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || fallback).replace(/\s+/g, ' ').trim();
  return text.slice(0, 300);
}

export function SEO({ video }: { video?: Video | null }) {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

  const meta = video
    ? {
        title: `${video.title} – CornMM`,
        description: cleanText(video.description, `Watch ${video.title} on CornMM.`),
        index: true,
      }
    : (PAGE_META[pathname] ||
      (pathname.startsWith('/watch/')
        ? { title: 'Watch Adult Video – CornMM', description: 'Watch adult videos on CornMM.', index: true }
        : pathname.startsWith('/creator/')
          ? { title: 'Creator Profile – CornMM', description: 'Explore creator videos and profiles on CornMM.', index: true }
          : pathname.startsWith('/category/')
            ? (() => {
                const slug = decodeURIComponent(pathname.split('/').pop() || '').replace(/[-_]+/g, ' ').trim();
                const label = slug ? slug.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Adult Video';
                return {
                  title: `${label} Adult Videos – CornMM`,
                  description: `Browse ${label.toLowerCase()} adult videos on CornMM. Discover the latest and trending videos in this category.`,
                  index: true,
                };
              })()
            : { title: 'CornMM – Adult Video Platform', description: DEFAULT_DESCRIPTION, index: false }));

  const shouldIndex = !isPrivate && meta.index !== false;

  useEffect(() => {
    const canonical = new URL(pathname || '/', SITE_URL).href;
    document.title = meta.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;

    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', shouldIndex ? 'index,follow' : 'noindex,follow');
    setMeta('meta[name="rating"]', 'content', 'adult');
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:type"]', 'content', video ? 'video.other' : 'website');
    setMeta('meta[property="og:site_name"]', 'content', SITE_NAME);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);

    document.head.querySelector('#cornmm-schema')?.remove();
    document.head.querySelector('#cornmm-video-schema')?.remove();

    if (video && shouldIndex) {
      const script = document.createElement('script');
      script.id = 'cornmm-video-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: meta.description,
        thumbnailUrl: video.thumbnail_url ? [video.thumbnail_url] : [],
        uploadDate: video.created_at,
        duration: toIsoDuration(video.duration),
        embedUrl: video.video_url || video.playback_url || undefined,
        url: canonical,
        isFamilyFriendly: false,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        author: video.creator
          ? {
              '@type': 'Person',
              name: video.creator.display_name || video.creator.username,
              url: `${SITE_URL}/creator/${encodeURIComponent(video.creator.username)}`,
            }
          : undefined,
        genre: video.category?.name || undefined,
      });
      document.head.appendChild(script);
    }

    if (shouldIndex && ['/', '/trending', '/latest', '/categories'].includes(pathname)) {
      const script = document.createElement('script');
      script.id = 'cornmm-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      });
      document.head.appendChild(script);
    }
  }, [pathname, meta.title, meta.description, shouldIndex, video]);

  return null;
}
