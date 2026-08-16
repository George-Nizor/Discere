# ADR 0001: Keep the learning core independent from the tutor host

**Status:** Accepted

Discere stores curriculum, assessment, guardrails, progression, visuals, and persistence outside ChatGPT-specific code. Tutor providers receive structured operations through an adapter.

This keeps the prototype usable through the local interface and companion packets while account-level plugin support is being confirmed. A future MCP transport can be added without rewriting learning rules.
