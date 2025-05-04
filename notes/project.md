## IDO-14: Implement Approval and Staggered Publishing Workflow

**Restated Requirements:**
- After draft generation, show each content type in Cursor for approval.
- On approval, publish automatically to each platform using their APIs (where possible).
- Stagger publishing times (e.g., Medium first, then Substack, etc.).
- Mark links as "compiled" to avoid reuse.

**Shippable Subtasks:**
- Implement approval UI in Cursor for content types.
- Integrate platform APIs for automated publishing (one subtask per platform).
- Implement staggered publishing logic with configurable schedule.
- Add logic to mark links as 'compiled' after publishing.
- Error handling and user feedback for publishing failures.
- Documentation and tests for the workflow.

**Clarifying Questions:**
Q: Which platforms must be supported for automated publishing?
Q: What should the approval UI in Cursor look like, and what actions should be available (edit, approve, reject)?
Q: What is the required granularity and configuration for staggered publishing?
Q: How should API credentials be managed for each platform?
Q: What is the expected behavior if publishing fails on one or more platforms?
Q: How should 'compiled' links be stored and tracked?

---

## IDO-13: Create Platform-Specific Templates and Human-in-the-Loop Composition Workflow

**Restated Requirements:**
- Develop templates and structure for each content type (Medium, Substack, LinkedIn, Email).
- Integrate AI to adapt tone, voice, and content per platform.
- Enable review and manual tweaking of drafts in Cursor before publishing.

**Shippable Subtasks:**
- Define and implement templates for each platform.
- Integrate AI for tone, voice, and content adaptation per platform.
- Build UI for human-in-the-loop review and manual tweaking in Cursor.
- Implement tracking/versioning for user edits if required.
- Document the review process and provide usage instructions.
- Write tests for template and review logic.

**Clarifying Questions:**
Q: Can you provide examples or requirements for each platform's template?
Q: What AI model/service should be used for tone and voice adaptation?
Q: What is the expected UI/UX for manual tweaking—should it support suggestions, inline editing, or both?
Q: Should user edits be tracked or versioned?
Q: How should the review process be documented and surfaced to users?

---

## IDO-12: Voice Modeling with Hungarian and English Samples

**Restated Requirements:**
- Use Hungarian writing samples to extract tone, style, and structure.
- Enable prompt engineering to mimic Hungarian tone in English content.
- Optionally, translate samples for style transfer.
- Support both Hungarian and English content generation.

**Shippable Subtasks:**
- Collect and preprocess Hungarian and English writing samples.
- Analyze samples to extract tone, style, and structure features.
- Develop prompt templates for style transfer between languages.
- Implement prompt engineering logic for configurable style adaptation.
- Integrate translation workflow if required.
- Support content generation in both languages.
- Write documentation and tests for the modeling process.

**Clarifying Questions:**
Q: What is the preferred format and source for Hungarian writing samples?
A: Make a folder for example soruces for tone. I will later add multiple documents in md format. 
Q: How many samples are needed for effective modeling?
A: Use whatever you have in the folder.
Q: Should translation for style transfer be automated, manual, or both?
A: automated.
Q: What are the requirements for prompt engineering—should users be able to customize prompts?
A: the user should be able to regenerate certain drafts with a tone adjustments, after they manually review the draft. 
Q: How should the system distinguish and select between Hungarian and English content generation?
A: default should be English, and user can reprompt to generate in Hungarian too.
Q: What is the expected output format for generated content?
A: Generated draft will be different for each format. Newsletter should be mjml, 

---

## IDO-11: Implement Local Storage for Links, Drafts, and Generated Content

**Restated Requirements:**
- Store the list of links and their metadata in a local file (e.g., sources.json).
- Store drafts and generated content locally for review and versioning.
- Ensure easy access and versioning of all content assets.

**Shippable Subtasks:**
- Define and implement sources.json structure for link management.
- Implement local storage logic for drafts and generated content.
- Add versioning mechanism for all content assets.
- Build or update UI for accessing and managing stored content if required.
- Document storage and versioning approach.
- Write tests for storage and versioning logic.

**Clarifying Questions:**
Q: What metadata fields are required for each link in sources.json?
A: Just the URL - the mcp tool needs to be updated I think. sources.json is already defined.
Q: Where should drafts and generated content be stored—single directory, per-user, or per-project?
A: I would probably want to store the generated content per output target, eg. the newsletter one folder, the substack posts another. Assume that the current repository is one user, one project, and it will be cloned if someone wants to replicate the process.
Q: What versioning approach is preferred—file copies, git, or custom logic?
A: no need for versioning - generated content will be reviewed in the code editor and edited if needed.
Q: Should there be a UI for managing stored content?
A: no - I will use Cursor to edit the drafts.
Q: How should access control be handled, if at all?
A: no need - ignore this
Q: What is the expected workflow for reviewing and updating stored content?
A: once content is generated, it will be saved as a draft, and I will use the code editor to edit the content as necessary and save it. 

---

## IDO-10: Set Up Local-First, Code-Driven Workflow for Content Automation

**Restated Requirements:**
- Ensure all workflow logic, data, and automation scripts live in the repository.
- Confirm local MCP server is set up with custom tools for adding links, marking links as 'compiled', and fetching uncompiled links.
- Document the workflow in the repo.

**Shippable Subtasks:**
- Implement local source list (JSON/YAML) and logic for adding links.
- Implement logic for marking links as 'compiled'.
- Implement logic for fetching uncompiled links.
- Set up MCP server with required tools (CLI or UI).
- Document the workflow and usage in the repo.
- Write tests for automation scripts and server tools.

**Clarifying Questions:**
Q: What language/framework should be used for automation scripts and MCP server?
A: Typescript or bash, depending on usecase. Use your best judgment based on context and already available resoures or packages.
Q: What is the preferred format for the local source list?
A: just keep it a json for now
Q: Should the MCP server have a UI, or is CLI sufficient?
A: We stick with CLI for now, and we'll use Cursor as an MCP Client to interact with the MCP server.
Q: How should links be marked as 'compiled'—field in the source list or separate file?
A: There is already a method for this if you look up the tools in the src/tools.ts file.
Q: What is the expected workflow for adding, marking, and fetching links?
A: the expectations is that the user prompts in Cursor and uses the mcp tools to add links, then the system fetches and marks them autonomously.
Q: How should documentation be structured?
A: keep documentation in the readme file in the root folder
Q: Are there any security or access control requirements?
A: not at the moment, just keep secrets in the .env file if they are needed