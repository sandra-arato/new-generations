# New Generations: Automated Newsletter & Blog Drafts with AI & MCP

> **Pet Project** · Generative AI · MCP · pnpm · Scripting & Automation

## Project Aim

This repository is a personal project to automate the creation of newsletters and blog posts simultaneously, leveraging generative AI and the Model Context Protocol (MCP). The goal is to streamline content curation and drafting for multiple platforms with minimal manual effort.

_**NOTE**_ - If you are trying to run this on a Silicon Chip (M1 - M3) Macbook, you are going in for a ride! I had to modify the dependency `textgenrnn` as the home machine only supports a single core processing for GPU (?), so I would _NOT_ expect this repo to work out of the box. But, you can work your way through it with a smart editor (eg. Cursor with sonnet 3.7).

## How It Works

The workflow for generating text and drafts is as follows:

1. **Curate Tone Samples**
   - Add example sources of your desired tone in the `samples/` folder as `.txt` files (one sentence per line).

2. **Train the Tone Model**
   - Train your model to adjust tone using `train.py`:
     ```bash
     pnpm run train  # or run train.py directly with Python
     ```
   - This uses your samples to train a [textgenrnn](https://github.com/minimaxir/textgenrnn) model.

3. **Expose the Model via Inference Service**
   - Serve the trained model for inference using `textgen_inference_service.py`:
     ```bash
     pnpm run start:textgenrnn  # or run the Python file directly
     ```
   - This exposes a REST API for tone adjustment, used by the MCP tools.

4. **Draft Generation (Scripting Approach)**
   - Due to timing issues with direct MCP tool calls, scripting is used to generate text:
     - **Via MCP CLI:** Use the CLI in `src/cli.ts` to invoke draft generation.
     - **Via Scripts:** Use scripts in the `scripts/` folder for direct execution.

5. **Source Links**
   - Links to be processed are listed in `sources.json`.
   - The main processing logic is in `src/tools.ts` (`generateDrafts` tool), which:
     - Fetches and summarizes each link
     - Adjusts tone using your trained model
     - Generates both styled and unstyled drafts for all platforms
     - Outputs drafts to the `drafts/` folder
     - Marks processed links as compiled in `sources.json`

## Directory Structure

- `samples/` — Example tone/style samples (one sentence per line, .txt)
- `model_weights/` — Trained model weights for textgenrnn
- `textgen_inference_service.py` — FastAPI service for model inference
- `train.py` — Script to train the tone adjustment model
- `sources.json` — List of links to process
- `src/tools.ts` — Main MCP tools, including `generateDrafts`
- `src/cli.ts` — CLI for running tools/scripts
- `scripts/` — Additional scripts for automation
- `drafts/` — Output folder for generated drafts (by platform)

## Example Workflow

1. Add `.txt` samples to `samples/`.
2. Train the model:
   ```bash
   pnpm train
   ```
3. Start the inference service:
   ```bash
   pnpm start:textgenrnn
   ```
4. Add links to `sources.json`.
5. Generate drafts:
   ```bash
   pnpm generate-drafts  # or use the CLI/scripts as needed
   ```
6. Find your drafts in the `drafts/` folder, ready for review and publishing.

## Notes
- This project is experimental and tailored for personal workflow automation.
- Uses [pnpm](https://pnpm.io/) as the package manager.
- Extend or adapt as needed for your own content automation needs.

## License
MIT 