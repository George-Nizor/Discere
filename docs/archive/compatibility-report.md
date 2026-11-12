# ChatGPT Host Compatibility Report

Status: **not yet tested in George's target account**

Do not add a ChatGPT-specific transport until each required host capability has been checked.

## Required checks

- [ ] Developer Mode or equivalent custom plugin surface is visible
- [ ] a private MCP endpoint can be connected
- [ ] read and write tools can be invoked
- [ ] the custom interface can render
- [ ] fullscreen presentation works
- [ ] a widget can send a follow-up message into the conversation
- [ ] file upload is available to the widget
- [ ] an uploaded image can be inspected by the model
- [ ] generated image handoff can return a usable asset reference
- [ ] tool results remain scoped to the correct session
- [ ] clean disconnect and local shutdown work

## Security requirement

When an HTTP MCP transport is added, create an isolated server and transport for each client session. Never share a stateful MCP server or transport across clients. Pin a patched SDK release and review its security advisories before enabling the adapter.

## Fallback

Until this report passes, use the ChatGPT companion adapter. It creates a complete structured request packet, copies it into ChatGPT, and validates the pasted JSON response locally.
