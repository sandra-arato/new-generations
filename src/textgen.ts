import fetch from 'node-fetch';

export async function generateText(prefix: string, temperature = 0.5, n = 1): Promise<string[]> {
  const response = await fetch('http://127.0.0.1:8000/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, temperature, n }),
  });
  const data = await response.json();
  return data.results;
} 