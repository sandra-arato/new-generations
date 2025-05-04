import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const config: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      config[key] = value;
      if (value !== 'true') i++;
    }
  }
  return config;
}

const args = parseArgs();

export const config = {
  sourcesPath:
    args.sources ||
    process.env.SOURCES_PATH ||
    path.resolve(process.cwd(), 'sources.json'),
  port: parseInt(args.port || process.env.PORT || '3001', 10),
}; 