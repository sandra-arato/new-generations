import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTools(server: McpServer, sourcesIO: {
  readSources: () => any[],
  writeSources: (sources: any[]) => void
}, logger: { info: Function, warn: Function, error: Function }) {
  server.tool(
    'add-link',
    `
    Add a new link to the sources list.

    Parameters:
    - url: The URL of the link to add.
    - metadata: Optional metadata to add to the link.
    `,
    {
      url: z.string().url(),
      metadata: z.record(z.any()).optional(),
    },
    async ({ url, metadata }: { url: string; metadata?: Record<string, unknown> }) => {
      try {
        const sources = sourcesIO.readSources();
        if (sources.find((s: any) => s.url === url)) {
          return {
            content: [
              { type: 'text', text: 'Link already exists.' },
            ],
            isError: true,
          };
        }
        sources.push({ url, metadata, compiled: false });
        sourcesIO.writeSources(sources);
        logger.info('Successfully added link:', url);
        return {
          content: [
            { type: 'text', text: 'Link added successfully.' },
          ],
        };
      } catch (error) {
        logger.error('Error in add-link:', error);
        return {
          content: [
            { type: 'text', text: 'Failed to add link.' },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'uncompiled-links',
    `
    List all links that have not yet been compiled.
    `,
    async () => {
      try {
        const sources = sourcesIO.readSources();
        const uncompiled = sources.filter((s: any) => !s.compiled);
        return {
          content: [
            { type: 'text', text: JSON.stringify(uncompiled, null, 2) },
          ],
        };
      } catch (error) {
        logger.error('Error in uncompiled-links:', error);
        return {
          content: [
            { type: 'text', text: 'Failed to retrieve uncompiled links.' },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'mark-compiled',
    `
    Mark a link as compiled in the sources list.

    Parameters:
    - url: The URL of the link to mark as compiled.
    `,
    {
      url: z.string().url(),
    },
    async ({ url }: { url: string }) => {
      try {
        const sources = sourcesIO.readSources();
        const idx = sources.findIndex((s: any) => s.url === url);
        if (idx === -1) {
          return {
            content: [
              { type: 'text', text: 'Link not found.' },
            ],
            isError: true,
          };
        }
        sources[idx].compiled = true;
        sourcesIO.writeSources(sources);
        return {
          content: [
            { type: 'text', text: 'Link marked as compiled.' },
          ],
        };
      } catch (error) {
        logger.error('Error in mark-compiled:', error);
        return {
          content: [
            { type: 'text', text: 'Failed to mark link as compiled.' },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'generateDrafts',
    `
    Generate drafts for up to 5 uncompiled links. For each link, fetch content, summarize, generate relevance, and create both styled and unstyled drafts for all platforms. Save drafts and mark links as compiled if successful.
    `,
    async () => {
      const fs = await import('fs/promises');
      const fetch = (await import('node-fetch')).default;
      const { adjustTone } = await import('./textgen.js');
      const { renderLinkedinNewsletter } = await import('../templates/linkedin-newsletter.js');
      const { renderMediumPost } = await import('../templates/medium-post.js');
      const { renderSubstackPost } = await import('../templates/substack-post.js');
      // MJML template will be loaded as a string
      const mjmlTemplate = await fs.readFile(join(__dirname, '../templates/newsletter.mjml'), 'utf8');

      // Helper: extract main text and title from HTML (improved)
      async function extractMainTextAndTitle(html: string, url: string): Promise<{ mainText: string, title: string }> {
        try {
          const { extractFromHtml } = await import('@extractus/article-extractor');
          const article = await extractFromHtml(html, url);
          if (article && article.content && article.title) {
            // Remove HTML tags from content
            const mainText = article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return { mainText, title: article.title };
          }
        } catch (e) {
          logger.warn('Article extraction failed, falling back to basic extraction:', e);
        }
        // Fallback: old method
        const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let body = match ? match[1] : html;
        const mainText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return { mainText, title: url };
      }

      // Helper: summarize text using Anthropic API (Claude)
      async function summarizeText(text: string): Promise<string> {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const prompt = `Summarize the following article in 2-3 concise sentences for a technical but non-expert audience.\n\n${text.slice(0, 4000)}`;
        const response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 256,
          messages: [
            { role: 'user', content: prompt }
          ],
        });
        const textBlock = response.content.find((block: any) => block.type === 'text' && typeof block.text === 'string');
        return textBlock ? (textBlock as { text: string }).text.trim() : '';
      }

      // Helper: generate relevance note
      async function relevanceNote(text: string, topic: string): Promise<string> {
        return (await adjustTone(`Why is this article relevant to the topic '${topic}'? ${text.slice(0, 1000)}`))[0];
      }

      // Helper: render MJML
      function renderMjml({ title, intro, articles }: { title: string, intro: string, articles: { title: string, summary: string, url: string }[] }): string {
        let out = mjmlTemplate
          .replace('{{title}}', title)
          .replace('{{intro}}', intro);
        let articlesBlock = articles.map((article: { title: string, summary: string, url: string }) => `\n<mj-section>\n  <mj-column>\n    <mj-text font-size="18px" font-weight="bold">${article.title}</mj-text>\n    <mj-text>${article.summary}</mj-text>\n    <mj-button href="${article.url}">Read more</mj-button>\n  </mj-column>\n</mj-section>`).join('');
        out = out.replace(/{{#each articles}}[\s\S]*{{\/each}}/, articlesBlock);
        return out;
      }

      try {
        const sources = sourcesIO.readSources();
        const uncompiled = sources.filter((s) => !s.compiled);
        if (uncompiled.length === 0) {
          logger.info('No uncompiled links found.');
          return { content: [{ type: 'text', text: 'No uncompiled links found.' }] };
        }
        logger.info(`Processing ${uncompiled.length} uncompiled link(s):`, uncompiled.map(l => l.url));

        // Fetch and process all links in parallel
        const processedLinks = await Promise.all(uncompiled.map(async (link) => {
          try {
            logger.info('Fetching URL:', link.url);
            const res = await fetch(link.url);
            const html = await res.text();
            logger.info('Fetched HTML for:', link.url);
            const { mainText, title } = await extractMainTextAndTitle(html, link.url);
            logger.info('Extracted main text and title for:', link.url);
            const summary = await summarizeText(mainText);
            logger.info('Generated summary for:', link.url);
            const relevance = await relevanceNote(mainText, 'the main topic');
            logger.info('Generated relevance note for:', link.url);
            const styledSummary = await adjustTone(summary);
            logger.info('Styled summary for:', link.url);
            const styledRelevance = await adjustTone(relevance);
            logger.info('Styled relevance for:', link.url);
            return {
              ...link,
              mainText,
              title,
              summary,
              relevance,
              styledSummary: styledSummary[0],
              styledRelevance: styledRelevance[0],
              ok: true,
            };
          } catch (err) {
            logger.error('Failed to process link', link.url, err);
            return { ...link, ok: false };
          }
        }));

        // Only keep successfully processed links
        const successful = processedLinks.filter(l => l.ok);
        if (successful.length === 0) {
          return { content: [{ type: 'text', text: 'No links could be processed.' }], isError: true };
        }

        logger.info('Generating intro and CTA...');
        const allSummaries = successful.map(l => l.summary).join(' ');
        const intro = (await adjustTone(`Write an engaging intro about these articles: ${allSummaries.slice(0, 2000)}`))[0];
        logger.info('Generated intro.');
        const styledIntro = (await adjustTone(intro))[0];
        logger.info('Styled intro.');
        const cta = (await adjustTone('Write a summary of the new ways these links tackle a concept, and add a call to action for sharing.'))[0];
        logger.info('Generated CTA.');
        const styledCta = (await adjustTone(cta))[0];
        logger.info('Styled CTA.');

        // Prepare articles for templates
        const articlesUnstyled = successful.map(l => ({
          title: l.title,
          summary: `${l.summary}\n${l.relevance}`,
          url: l.url,
        }));
        const articlesStyled = successful.map(l => ({
          title: l.title,
          summary: `${l.styledSummary}\n${l.styledRelevance}`,
          url: l.url,
        }));

        // Draft title
        const now = new Date();
        const dateStr = now.toISOString().slice(0,10);
        const timeStr = now.toTimeString().slice(0,8).replace(/:/g, '-');
        const title = `New Generations - ${dateStr}`;
        const fileBase = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timeStr}`;

        // Render and save for each platform and style
        const platforms = [
          {
            name: 'linkedin',
            render: renderLinkedinNewsletter,
            ext: 'md',
          },
          {
            name: 'medium',
            render: renderMediumPost,
            ext: 'md',
          },
          {
            name: 'substack',
            render: renderSubstackPost,
            ext: 'md',
          },
          {
            name: 'newsletter',
            render: renderMjml,
            ext: 'mjml',
          },
        ];

        for (const platform of platforms) {
          logger.info(`Rendering and saving drafts for platform: ${platform.name}`);
          const dirPath = join('drafts', platform.name);
          await fs.mkdir(dirPath, { recursive: true });
          // Unstyled: aggregate all articles into one draft
          const draftUnstyled = platform.render({
            title,
            intro,
            articles: articlesUnstyled,
          });
          const unstyledPath = join(dirPath, `${fileBase}_unstyled.${platform.ext}`);
          await fs.writeFile(unstyledPath, draftUnstyled, 'utf8');
          logger.info(`Saved unstyled draft: ${unstyledPath}`);

          // Styled: aggregate all articles into one draft
          const draftStyled = platform.render({
            title,
            intro: styledIntro,
            articles: articlesStyled,
          });
          const styledPath = join(dirPath, `${fileBase}_styled.${platform.ext}`);
          await fs.writeFile(styledPath, draftStyled, 'utf8');
          logger.info(`Saved styled draft: ${styledPath}`);
        }

        // Mark links as compiled
        for (const l of successful) {
          const idx = sources.findIndex((s) => s.url === l.url);
          if (idx !== -1) sources[idx].compiled = true;
        }
        sourcesIO.writeSources(sources);

        return { content: [{ type: 'text', text: `Drafts generated for ${successful.length} links.` }] };
      } catch (err) {
        logger.error('Error in generateDrafts:', err);
        return { content: [{ type: 'text', text: 'Failed to generate drafts.' }], isError: true };
      }
    },
  );
} 