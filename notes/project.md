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
