import { startServer } from '../src/server.js';
import { config } from '../src/config.js';
import fs from 'fs';
import path from 'path';
import supertest from 'supertest';

const TEST_PORT = 34567;
const TEST_SOURCES = path.join(process.cwd(), 'test-sources.json');

beforeAll(() => {
  fs.writeFileSync(TEST_SOURCES, '[]');
  process.argv.push('--sources', TEST_SOURCES, '--port', TEST_PORT.toString());
  startServer();
});

afterAll(() => {
  fs.unlinkSync(TEST_SOURCES);
});

test('GET /listTools returns registered tools', async () => {
  const res = await supertest(`http://localhost:${TEST_PORT}`).get('/listTools');
  expect(res.status).toBe(200);
  expect(res.body.tools).toBeInstanceOf(Array);
  expect(res.body.tools.some((t: any) => t.name === 'add-link')).toBe(true);
});

test('POST /mcp add-link adds a new link', async () => {
  const url = 'https://test.com/article';
  const res = await supertest(`http://localhost:${TEST_PORT}`)
    .post('/mcp')
    .send({
      method: 'add-link',
      params: { url },
      id: 10,
      jsonrpc: '2.0',
    });
  expect(res.status).toBe(200);
  expect(res.body.result.content[0].text).toMatch(/added successfully|already exists/);
  const sources = JSON.parse(fs.readFileSync(TEST_SOURCES, 'utf-8'));
  expect(sources.some((s: any) => s.url === url)).toBe(true);
});

test('POST /mcp uncompiled-links lists uncompiled links', async () => {
  const res = await supertest(`http://localhost:${TEST_PORT}`)
    .post('/mcp')
    .send({
      method: 'uncompiled-links',
      params: {},
      id: 11,
      jsonrpc: '2.0',
    });
  expect(res.status).toBe(200);
  expect(res.body.result.content[0].text).toMatch(/https:\/\/test.com\/article/);
});

test('POST /mcp mark-compiled marks a link as compiled', async () => {
  const url = 'https://test.com/article';
  const res = await supertest(`http://localhost:${TEST_PORT}`)
    .post('/mcp')
    .send({
      method: 'mark-compiled',
      params: { url },
      id: 12,
      jsonrpc: '2.0',
    });
  expect(res.status).toBe(200);
  expect(res.body.result.content[0].text).toMatch(/marked as compiled/);
  const sources = JSON.parse(fs.readFileSync(TEST_SOURCES, 'utf-8'));
  const link = sources.find((s: any) => s.url === url);
  expect(link.compiled).toBe(true);
});

test('POST /mcp uncompiled-links returns empty after marking compiled', async () => {
  const res = await supertest(`http://localhost:${TEST_PORT}`)
    .post('/mcp')
    .send({
      method: 'uncompiled-links',
      params: {},
      id: 13,
      jsonrpc: '2.0',
    });
  expect(res.status).toBe(200);
  const uncompiled = JSON.parse(res.body.result.content[0].text);
  expect(Array.isArray(uncompiled)).toBe(true);
  expect(uncompiled.length).toBe(0);
}); 