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
