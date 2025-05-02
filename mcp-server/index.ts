import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const SOURCES_PATH = path.join(__dirname, "../sources.json");

function readSources() {
  if (!fs.existsSync(SOURCES_PATH)) return [];
  const data = fs.readFileSync(SOURCES_PATH, "utf-8");
  return JSON.parse(data);
}

function writeSources(sources: any[]) {
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
}

function getServer() {
  const server = new McpServer({
    name: "new-generation-mcp",
    version: "1.0.0"
  });

  server.tool(
    "add-link",
    {
      url: z.string(),
      metadata: z.record(z.any()).optional()
    },
    async ({ url, metadata }: { url: string; metadata?: Record<string, unknown> }) => {
      const sources = readSources();
      if (sources.find((s: any) => s.url === url)) {
        return {
          content: [
            { type: "text", text: "Link already exists." }
          ],
          isError: true
        };
      }
      sources.push({ url, metadata, compiled: false });
      writeSources(sources);
      return {
        content: [
          { type: "text", text: "Link added successfully." }
        ]
      };
    }
  );

  server.tool(
    "uncompiled-links",
    {},
    async () => {
      const sources = readSources();
      const uncompiled = sources.filter((s: any) => !s.compiled);
      return {
        content: [
          { type: "text", text: JSON.stringify(uncompiled, null, 2) }
        ]
      };
    }
  );

  server.tool(
    "mark-compiled",
    {
      url: z.string()
    },
    async ({ url }: { url: string }) => {
      const sources = readSources();
      const idx = sources.findIndex((s: any) => s.url === url);
      if (idx === -1) {
        return {
          content: [
            { type: "text", text: "Link not found." }
          ],
          isError: true
        };
      }
      sources[idx].compiled = true;
      writeSources(sources);
      return {
        content: [
          { type: "text", text: "Link marked as compiled." }
        ]
      };
    }
  );

  return server;
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/mcp', async (req, res) => {
  try {
    const server = getServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  try {
    const server = getServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
