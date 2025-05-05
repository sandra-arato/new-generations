import 'dotenv/config';
import { registerTools } from '../src/tools';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const logger = { info: console.log, warn: console.warn, error: console.error };
const sourcesPath = join(__dirname, '../sources.json');
const sourcesIO = {
  readSources: () => JSON.parse(readFileSync(sourcesPath, 'utf8')),
  writeSources: (sources: any[]) => writeFileSync(sourcesPath, JSON.stringify(sources, null, 2)),
};

const server = {
  tool: (_name: string, _desc: string, _schemaOrFn: any, fn?: any) => {
    if (typeof _schemaOrFn === 'function') fn = _schemaOrFn;
    fn().then(console.log).catch(console.error);
  }
};

registerTools(server as any, sourcesIO, logger); 