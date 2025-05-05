#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { startServer } from './server.js';
import { registerTools } from './tools.js';
import { readFileSync, writeFileSync } from 'fs';

const logger = { info: console.log, warn: console.warn, error: console.error };
const sourcesPath = join(__dirname, '../sources.json');
const sourcesIO = {
  readSources: () => JSON.parse(readFileSync(sourcesPath, 'utf8')),
  writeSources: (sources: any[]) => writeFileSync(sourcesPath, JSON.stringify(sources, null, 2)),
};

if (process.argv[2] === 'generate-drafts') {
  // Only register and call generateDrafts
  const server = {
    tool: (name: string, _desc: string, _schemaOrFn: any, fn?: any) => {
      if (name === 'generateDrafts') {
        if (typeof _schemaOrFn === 'function') fn = _schemaOrFn;
        fn().then(console.log).catch(console.error);
      }
    }
  };
  registerTools(server as any, sourcesIO, logger);
} else {
  startServer();
} 