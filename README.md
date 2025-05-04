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

## Local-First Content Automation Workflow

This project is designed for a local-first, code-driven workflow. All automation logic and data live in the repository, and you interact with the MCP server using HTTP endpoints or via Cursor as an MCP client.

### Sources File Structure

The `sources.json` file is an array of link objects. Each link has:
- `url` (string): The link URL
- `metadata` (object, optional): Any extra data
- `compiled` (boolean): Whether the link has been used/compiled

Example:
```json
[
  {
    "url": "https://example.com/article",
    "metadata": { "tag": "news" },
    "compiled": false
  }
]
```

### MCP Tools

#### Add a Link
Add a new link to the sources list.

**HTTP Example:**
```sh
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "add-link",
    "params": { "url": "https://example.com/article" },
    "id": 1,
    "jsonrpc": "2.0"
  }'
```

#### List Uncompiled Links
List all links that have not yet been compiled.

**HTTP Example:**
```sh
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "uncompiled-links",
    "params": {},
    "id": 2,
    "jsonrpc": "2.0"
  }'
```

#### Mark a Link as Compiled
Mark a link as compiled in the sources list.

**HTTP Example:**
```sh
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "mark-compiled",
    "params": { "url": "https://example.com/article" },
    "id": 3,
    "jsonrpc": "2.0"
  }'
```

### Using with Cursor

Add the MCP server to your `.cursor/mcp.json` and use the built-in tools from Cursor's command palette. No additional CLI wrapper is required.

### Drafts and Generated Content Storage

Generated content and drafts are stored in the `drafts/` directory, organized by output target:

- `drafts/newsletter/` — Newsletter drafts
- `drafts/substack/` — Substack drafts
- `drafts/medium/` — Medium drafts
- `drafts/linkedin/` — LinkedIn drafts

Each generated draft is saved as a file in the appropriate subfolder. You can edit these files directly in your code editor (e.g., Cursor). No additional versioning or UI is required; simply save your changes in the editor.

## License
MIT 