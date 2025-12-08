import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';

export const htmlPlugin = (): Plugin => {
  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      try {
        const metadata = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'metadata.json'), 'utf-8'));
        const title = `${metadata.name} - ${metadata.author.role}`;
        const description = metadata.description;
        const keywords = metadata.keywords.join(', ');
        const image = metadata.image.startsWith('http') ? metadata.image : `${metadata.siteUrl}${metadata.image}`;
        
        const personSchema = {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": metadata.author.name,
          "url": metadata.siteUrl,
          "image": image,
          "sameAs": [metadata.social.github, metadata.social.linkedin],
          "jobTitle": metadata.author.role,
          "worksFor": {
            "@type": "Organization",
            "name": "Independent"
          },
          "email": metadata.author.email,
          "knowsAbout": metadata.keywords,
          "description": metadata.description
        };

        const websiteSchema = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "CyberDeck Portfolio",
          "url": metadata.siteUrl,
          "description": metadata.description,
          "author": {
            "@type": "Person",
            "name": metadata.author.name
          },
          "inLanguage": metadata.locale
        };

        return {
          html,
          tags: [
            { tag: 'title', children: title },
            { tag: 'meta', attrs: { name: 'title', content: title } },
            { tag: 'meta', attrs: { name: 'description', content: description } },
            { tag: 'meta', attrs: { name: 'keywords', content: keywords } },
            { tag: 'meta', attrs: { name: 'author', content: metadata.author.name } },
            { tag: 'meta', attrs: { name: 'theme-color', content: metadata.themeColor } },
            { tag: 'link', attrs: { rel: 'canonical', href: metadata.siteUrl } },
            
            // Open Graph
            { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
            { tag: 'meta', attrs: { property: 'og:url', content: metadata.siteUrl } },
            { tag: 'meta', attrs: { property: 'og:title', content: title } },
            { tag: 'meta', attrs: { property: 'og:description', content: description } },
            { tag: 'meta', attrs: { property: 'og:image', content: image } },
            { tag: 'meta', attrs: { property: 'og:site_name', content: 'CyberDeck Portfolio' } }, 
            { tag: 'meta', attrs: { property: 'og:locale', content: metadata.locale } },

            // Twitter
            { tag: 'meta', attrs: { property: 'twitter:card', content: 'summary_large_image' } },
            { tag: 'meta', attrs: { property: 'twitter:url', content: metadata.siteUrl } },
            { tag: 'meta', attrs: { property: 'twitter:title', content: title } },
            { tag: 'meta', attrs: { property: 'twitter:description', content: description } },
            { tag: 'meta', attrs: { property: 'twitter:image', content: image } },

            // JSON-LD
            { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(personSchema) },
            { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(websiteSchema) }
          ]
        };
      } catch (e) {
        console.error('Error injecting metadata:', e);
        return html;
      }
    }
  }
}
