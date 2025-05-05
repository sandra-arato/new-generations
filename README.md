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

## Voice Modeling with Hungarian and English Samples

To enable advanced tone and style modeling, place example writing samples in the following folders:

- `samples/hungarian/` — Hungarian writing samples (markdown files)
- `samples/english/` — English writing samples (markdown files)

The system will use these samples to extract tone, style, and structure for prompt engineering. You can regenerate drafts with tone adjustments or in Hungarian after manual review. By default, drafts are generated in English; you can reprompt for Hungarian as needed.

- Newsletter output will be in MJML format.
- Other formats will match their respective platform requirements.

## License
MIT 

# Text Generation Integration

## 1. Training the Model
- Train your textgenrnn model manually and save the weights to `./model_weights/your_model_weights.hdf5`.
- Example training (run in Python):
  ```python
  from textgenrnn import textgenrnn
  textgen = textgenrnn()
  textgen.train_from_file('your_samples.txt', num_epochs=10)
  textgen.save('model_weights/your_model_weights.hdf5')
  ```

## 2. Running the Inference Service
- Start the Python FastAPI service:
  ```bash
  pnpm run start:textgenrnn
  ```
- This will load the model weights from `./model_weights/your_model_weights.hdf5` and expose a REST API at `http://127.0.0.1:8000/generate`.

## 3. Starting the MCP Server
- Start both the MCP server and the inference service together:
  ```bash
  pnpm start
  ```

## 4. Generating Text from TypeScript
- Use the provided `generateText` function in `src/textgen.ts` to call the inference service:
  ```typescript
  import { generateText } from './textgen';
  const results = await generateText('Your prompt', 0.7, 3);
  console.log(results);
  ```

## 5. Model Weights Directory
- Place your trained model weights in the `./model_weights/` directory at the root of the project.
- The default filename expected is `your_model_weights.hdf5`. 