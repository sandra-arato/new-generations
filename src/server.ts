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

  app.post('/mcp', async (req, res) => {
    logger.info('New client connection via POST from', req.ip);
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Accept', 'application/json, text/event-stream');
      res.on('close', () => {
        logger.info('Client disconnected (POST) from', req.ip);
        transport.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Error handling POST request from', req.ip, error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req, res) => {
    logger.info('New client connection via GET from', req.ip);
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Accept', 'application/json, text/event-stream');
      res.on('close', () => {
        logger.info('Client disconnected (GET) from', req.ip);
        transport.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error('Error handling GET request from', req.ip, error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
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

  app.listen(config.port, () => {
    logger.info(`MCP Server listening on port ${config.port}`);
    logger.info(`Sources file: ${config.sourcesPath}`);
  });
} 