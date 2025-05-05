import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools.js';
import { config } from './config.js';
import { logger } from './logger.js';
import type { AnyZodObject } from 'zod';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function makeSourcesIO(sourcesPath: string) {
  return {
    readSources: () => {
      if (!fs.existsSync(sourcesPath)) {
        logger.warn('Sources file not found at', sourcesPath, '- returning empty list.');
        return [];
      }
      try {
        const data = fs.readFileSync(sourcesPath, 'utf-8');
        return JSON.parse(data);
      } catch (e) {
        logger.error('Failed to read sources file:', e);
        return [];
      }
    },
    writeSources: (sources: any[]) => {
      try {
        fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
      } catch (e) {
        logger.error('Failed to write sources file:', e);
      }
    },
  };
}

function zodToJsonSchema(zodSchema: AnyZodObject | undefined) {
  try {
    return require('zod-to-json-schema').zodToJsonSchema(zodSchema, { strictUnions: true });
  } catch {
    return undefined;
  }
}

export function startServer() {
  const app = express();
  app.use((req, res, next) => {
    logger.info('ALL INCOMING', { method: req.method, url: req.url, headers: req.headers });
    next();
  });
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['Content-Type'],
    credentials: true,
  }));
  app.use(express.json());

  app.options('/mcp', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.status(200).end();
  });

  const sourcesIO = makeSourcesIO(config.sourcesPath);
  const server = new McpServer({
    name: 'new-generations-mcp',
    version: '0.1.0-beta.1',
  });
  registerTools(server, sourcesIO, logger);
  logger.info('Registered tools:', Object.entries((server as any)._registeredTools).map(([name, tool]) => ({ name, description: (tool as any).description })));

  // Session-based transport management
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  // SSE transport management
  const sseTransports: { [sessionId: string]: SSEServerTransport } = {};

  // Streamable HTTP POST /mcp (session-based)
  app.post('/mcp', async (req, res) => {
    const { randomUUID } = await import('node:crypto');
    const { isInitializeRequest } = await import('@modelcontextprotocol/sdk/types.js');
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    logger.info('Incoming /mcp POST', {
      headers: req.headers,
      body: req.body,
      isInit: isInitializeRequest(req.body)
    });

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  });

  // Streamable HTTP GET /mcp (notifications)
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // SSE GET /mcp (legacy Cursor support)
  app.get('/mcp-sse', async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    // Wait for the transport to initialize and get its sessionId
    await server.connect(transport);
    const sessionId = transport.sessionId;
    logger.info('SSE: New client connection, sessionId:', sessionId);
    sseTransports[sessionId] = transport;
    res.on('close', () => {
      logger.info('SSE: Client disconnected, sessionId:', sessionId);
      delete sseTransports[sessionId];
    });
  });

  // SSE POST /messages (legacy Cursor support)
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    logger.info('SSE: Incoming message for sessionId:', sessionId);
    const transport = sseTransports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  app.get('/listTools', (req, res) => {
    logger.info('Tools listing requested from', req.ip);
    const tools = Object.entries((server as any)._registeredTools)
      .filter(([, tool]) => (tool as any).enabled)
      .map(([name, tool]) => ({
        name,
        description: (tool as any).description,
        inputSchema: (tool as any).inputSchema ? zodToJsonSchema((tool as any).inputSchema) : undefined,
        annotations: (tool as any).annotations,
      }));
    res.json({ tools });
  });

  // Add HTTP endpoint for generateDrafts
  app.post('/generate-drafts', async (req, res) => {
    let result: any = null;
    const server = {
      tool: (_name: string, _desc: string, _schemaOrFn: any, fn?: any) => {
        if (typeof _schemaOrFn === 'function') fn = _schemaOrFn;
        result = fn();
      }
    };
    registerTools(server as any, sourcesIO, logger);
    try {
      const output = await result;
      res.json(output);
    } catch (err) {
      logger.error('Error in /generate-drafts:', err);
      res.status(500).json({ error: (err as any)?.message || err });
    }
  });

  app.listen(config.port, () => {
    logger.info(`MCP Server listening on port ${config.port}`);
    logger.info(`Sources file: ${config.sourcesPath}`);
  });
} 