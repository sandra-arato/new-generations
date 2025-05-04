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
} 