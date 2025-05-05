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
      const path = await import('path');
      const fetch = (await import('node-fetch')).default;
      const { adjustTone } = await import('./textgen');
      const { renderLinkedinNewsletter } = await import('../templates/linkedin-newsletter');
      const { renderMediumPost } = await import('../templates/medium-post');
      const { renderSubstackPost } = await import('../templates/substack-post');
      // MJML template will be loaded as a string
      const mjmlTemplate = await fs.readFile(path.join(__dirname, '../templates/newsletter.mjml'), 'utf8');

      // Helper: extract main text from HTML (very basic, can be improved)
      function extractMainText(html: string): string {
        const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let body = match ? match[1] : html;
        // Remove all tags
        return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      // Helper: summarize text (prompt-based, can be improved)
      async function summarize(text: string): Promise<string> {
        return (await adjustTone(`Summarize this article: ${text.slice(0, 2000)}`))[0];
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
        const uncompiled = sources.filter((s) => !s.compiled).slice(0, 1);
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
            const mainText = extractMainText(html);
            logger.info('Extracted main text for:', link.url);
            const summary = await summarize(mainText);
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
          title: l.url,
          summary: `${l.summary}\n${l.relevance}`,
          url: l.url,
        }));
        const articlesStyled = successful.map(l => ({
          title: l.url,
          summary: `${l.styledSummary}\n${l.styledRelevance}`,
          url: l.url,
        }));

        // Draft title
        const title = `Curated Insights - ${new Date().toLocaleDateString()}`;
        const timestamp = Date.now();

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
          // Unstyled
          const draftUnstyled = platform.render({
            title,
            intro,
            articles: articlesUnstyled,
          });
          const unstyledPath = path.join('drafts', platform.name, `${title.replace(/\s+/g, '_')}_${timestamp}_unstyled.${platform.ext}`);
          await fs.writeFile(unstyledPath, draftUnstyled, 'utf8');
          logger.info(`Saved unstyled draft: ${unstyledPath}`);

          // Styled
          const draftStyled = platform.render({
            title,
            intro: styledIntro,
            articles: articlesStyled,
          });
          const styledPath = path.join('drafts', platform.name, `${title.replace(/\s+/g, '_')}_${timestamp}_styled.${platform.ext}`);
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