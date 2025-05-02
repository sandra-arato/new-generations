import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import type { AnyZodObject } from "zod";

const SOURCES_PATH = path.join(__dirname, "../sources.json");

interface Source {
  url: string;
  metadata?: Record<string, unknown>;
  compiled: boolean;
}

function readSources(): Source[] {
  if (!fs.existsSync(SOURCES_PATH)) return [];
  const data = fs.readFileSync(SOURCES_PATH, "utf-8");
  return JSON.parse(data);
}

function writeSources(sources: Source[]): void {
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
}

let serverInstance: McpServer | null = null;
const activeTransports = new Set<StreamableHTTPServerTransport>();

function getServer() {
  if (serverInstance) {
    return serverInstance;
  }
  
  console.log("[MCP] Initializing server...");
  serverInstance = new McpServer({
    name: "new-generation-mcp",
    version: "1.0.0"
  });

  console.log("[MCP] Registering tools...");
  serverInstance.tool(
    "add-link",
    {
      url: z.string().url(),
      metadata: z.record(z.any()).optional()
    },
    async ({ url, metadata }: { url: string; metadata?: Record<string, unknown> }) => {
      try {
        const sources = readSources();
        if (sources.find(s => s.url === url)) {
          return {
            content: [
              { type: "text", text: "Link already exists." }
            ],
            isError: true
          };
        }
        sources.push({ url, metadata, compiled: false });
        writeSources(sources);
        console.log('[MCP] Successfully added link:', url);
        return {
          content: [
            { type: "text", text: "Link added successfully." }
          ]
        };
      } catch (error) {
        console.error("Error in add-link:", error);
        return {
          content: [
            { type: "text", text: "Failed to add link." }
          ],
          isError: true
        };
      }
    }
  );

  serverInstance.tool(
    "uncompiled-links",
    {},
    async () => {
      try {
        const sources = readSources();
        const uncompiled = sources.filter(s => !s.compiled);
        return {
          content: [
            { type: "text", text: JSON.stringify(uncompiled, null, 2) }
          ]
        };
      } catch (error) {
        console.error("Error in uncompiled-links:", error);
        return {
          content: [
            { type: "text", text: "Failed to retrieve uncompiled links." }
          ],
          isError: true
        };
      }
    }
  );

  serverInstance.tool(
    "mark-compiled",
    {
      url: z.string().url()
    },
    async ({ url }: { url: string }) => {
      try {
        const sources = readSources();
        const idx = sources.findIndex(s => s.url === url);
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
      } catch (error) {
        console.error("Error in mark-compiled:", error);
        return {
          content: [
            { type: "text", text: "Failed to mark link as compiled." }
          ],
          isError: true
        };
      }
    }
  );

  console.log("[MCP] Tools registered:", Object.keys((serverInstance as any)._registeredTools));
  return serverInstance;
}

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());

// Add OPTIONS handler for CORS preflight
app.options('/mcp', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(200).end();
});

app.post('/mcp', async (req, res) => {
  console.log(`[MCP] New client connection via POST from ${req.ip}`);
  console.log('[MCP] Request body:', JSON.stringify(req.body, null, 2));
  try {
    const server = getServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    activeTransports.add(transport);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Accept', 'application/json, text/event-stream');
    
    res.on('close', () => {
      console.log(`[MCP] Client disconnected (POST) from ${req.ip}`);
      activeTransports.delete(transport);
      transport.close();
    });
    
    console.log('[MCP] Connecting to transport...');
    await server.connect(transport);
    console.log('[MCP] Handling request...');
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(`[MCP] Error handling POST request from ${req.ip}:`, error);
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
  console.log(`[MCP] New client connection via GET from ${req.ip}`);
  try {
    const server = getServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    activeTransports.add(transport);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Accept', 'application/json, text/event-stream');
    
    res.on('close', () => {
      console.log(`[MCP] Client disconnected (GET) from ${req.ip}`);
      activeTransports.delete(transport);
      transport.close();
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error(`[MCP] Error handling GET request from ${req.ip}:`, error);
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

// Helper to convert Zod schema to JSON schema
const zodToJsonSchema = (zodSchema: AnyZodObject | undefined) => {
  try {
    return require('zod-to-json-schema').zodToJsonSchema(zodSchema, { strictUnions: true });
  } catch {
    return undefined;
  }
};

app.get('/listTools', (req, res) => {
  console.log(`[MCP] Tools listing requested from ${req.ip}`);
  const server = getServer();
  console.log("[MCP] Server instance created for tools listing");
  
  const tools = Object.entries((server as any)._registeredTools)
    .filter(([, tool]) => (tool as any).enabled)
    .map(([name, tool]) => {
      console.log(`[MCP] Processing tool: ${name}`);
      return {
        name,
        description: (tool as any).description,
        inputSchema: (tool as any).inputSchema ? zodToJsonSchema((tool as any).inputSchema) : undefined,
        annotations: (tool as any).annotations,
      };
    });
  
  console.log(`[MCP] Found ${tools.length} tools`);
  console.log("[MCP] Tool names:", tools.map(t => t.name));
  console.log("[MCP] Sending tools response");
  res.json({ tools });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
