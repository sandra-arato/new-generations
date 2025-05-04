# new-generations-mcp

> **Beta** · ESM · npx-ready · pnpm · Extendable MCP server for Cursor & LLMs

A robust, extendable Model Context Protocol (MCP) server for use with [Cursor](https://cursor.so), LLMs, and other MCP clients. Built with ESM, designed for npx, and easily configurable.

## Features
- **npx one-liner:** Start a stateless MCP server anywhere
- **Configurable sources file:** Track links or data per project
- **SOLID, modular code:** Easy to extend with new tools
- **Compatible with Cursor, Claude, and more**

## Quick Start (npx)

```sh
npx new-generations
```

- By default, the server runs on `http://localhost:3001/mcp` and uses `sources.json` in the current directory.

### Options

- `--sources <path>`: Specify a custom sources file location
- `--port <number>`: Specify a custom port (default: 3001)

Example:
```sh
npx new-generations --sources ./data/my-sources.json --port 4000
```

## Use with Cursor

Add this to your `.cursor/mcp.json` (global or project):

```json
{
  "mcpServers": {
    "new-generations-mcp": {
      "command": "npx",
      "args": ["-y", "new-generations"]
    }
  }
}
```

Or, if running locally:
```json
{
  "mcpServers": {
    "new-generations-mcp": {
      "url": "http://localhost:3001/mcp",
      "name": "new-generations-mcp"
    }
  }
}
```

## Local Development

```sh
pnpm install
pnpm test
pnpm run build
```

## Extending
- Add new tools in `src/tools.ts` and register them in `src/server.ts`.
- Follow SOLID principles for maintainability.

## License
MIT 