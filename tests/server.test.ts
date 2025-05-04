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