import fs from 'node:fs';
import path from 'node:path';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadingShell } from '../components/LoadingShell';
import { StaticProfile } from '../components/StaticProfile';

function injectShell(html: string): string {
  const shellMarkup =
    renderToStaticMarkup(createElement(LoadingShell)) + renderToStaticMarkup(createElement(StaticProfile));
  const shellStyles =
    fs.readFileSync(path.resolve(process.cwd(), 'components/LoadingShell.css'), 'utf8') +
    fs.readFileSync(path.resolve(process.cwd(), 'components/StorySections.css'), 'utf8');
  return html
    .replace('<div id="root"></div>', () => `<div id="root">${shellMarkup}</div>`)
    .replace(/<meta charset="[^"]*"\s*\/?>/i, (charset) => `${charset}<style data-shell-styles>${shellStyles}</style>`);
}

export const htmlPlugin = (): Plugin => {
  let isBuild = false;
  return {
    name: 'html-transform',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    transformIndexHtml(html) {
      const shelledHtml = injectShell(html);
      try {
        const metadata = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'metadata.json'), 'utf8'));
        const title = `${metadata.name} — Engineering, AI Workflows & Exploration`;
        const pageUrl = metadata.siteUrl;
        const image = new URL(metadata.image, `${metadata.siteUrl}/`).href;
        const personSchema = {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: metadata.author.name,
          url: pageUrl,
          image,
          sameAs: [metadata.social.github, metadata.social.linkedin],
          jobTitle: metadata.author.role,
          email: metadata.author.email,
          knowsAbout: metadata.keywords,
          description: metadata.description,
        };
        const websiteSchema = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: `${metadata.name} Portfolio`,
          url: pageUrl,
          image,
          description: metadata.description,
          author: { '@type': 'Person', name: metadata.author.name },
          inLanguage: metadata.locale,
        };
        return {
          html: shelledHtml,
          tags: ([
            { tag: 'title', children: title },
            { tag: 'meta', attrs: { name: 'title', content: title } },
            { tag: 'meta', attrs: { name: 'description', content: metadata.description } },
            { tag: 'meta', attrs: { name: 'keywords', content: metadata.keywords.join(', ') } },
            { tag: 'meta', attrs: { name: 'author', content: metadata.author.name } },
            { tag: 'meta', attrs: { name: 'theme-color', content: metadata.themeColor } },
            { tag: 'link', attrs: { rel: 'canonical', href: pageUrl } },
            { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
            { tag: 'meta', attrs: { property: 'og:url', content: pageUrl } },
            { tag: 'meta', attrs: { property: 'og:title', content: title } },
            { tag: 'meta', attrs: { property: 'og:description', content: metadata.description } },
            { tag: 'meta', attrs: { property: 'og:image', content: image } },
            { tag: 'meta', attrs: { property: 'og:site_name', content: `${metadata.name} Portfolio` } },
            { tag: 'meta', attrs: { property: 'og:locale', content: metadata.locale } },
            { tag: 'meta', attrs: { property: 'twitter:card', content: 'summary_large_image' } },
            { tag: 'meta', attrs: { property: 'twitter:url', content: pageUrl } },
            { tag: 'meta', attrs: { property: 'twitter:title', content: title } },
            { tag: 'meta', attrs: { property: 'twitter:description', content: metadata.description } },
            { tag: 'meta', attrs: { property: 'twitter:image', content: image } },
            { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(personSchema) },
            { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(websiteSchema) },
          ] as HtmlTagDescriptor[]).map((tag) => ({ ...tag, injectTo: 'head' as const })),
        };
      } catch (error) {
        if (isBuild) throw error;
        console.error('Error injecting metadata:', error);
        return shelledHtml;
      }
    },
  };
};
