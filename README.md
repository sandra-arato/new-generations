# New Generations MCP Server

This project implements an MCP (Model Context Protocol) server using the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) in TypeScript. It exposes a set of tools for managing links, designed to be compatible with Cursor and other MCP clients.

## Features
- **add-link**: Add a new link with optional metadata.
- **uncompiled-links**: List all links that have not been marked as compiled.
- **mark-compiled**: Mark a link as compiled.

## Setup

1. **Install dependencies:**
   ```sh
   pnpm install
   ```

2. **Run the server:**
   ```sh
   pnpm start
   ```
   (Requires `ts-node` and `typescript` as dev dependencies.)

3. **Configure Cursor:**
   Add the following to your `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "new-generation-mcp": {
         "url": "http://localhost:3001/mcp",
         "name": "new-generation-mcp"
       }
     }
   }
   ```

## Usage
- The server exposes a `/mcp` endpoint for both POST (JSON-RPC requests) and GET (SSE/streaming).
- Tools are auto-discovered by MCP clients like Cursor.

## License
See [LICENSE](LICENSE). 