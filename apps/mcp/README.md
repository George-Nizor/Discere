# Discere MCP adapter

This package defines the tools that a ChatGPT or MCP host can expose. The handlers call the same local API used by the web interface.

A network transport is intentionally absent from version 0.1. The target ChatGPT account must first pass the compatibility checks in `docs/compatibility-report.md`. Once the supported host surface is known, add the transport in this package without changing the learning, assessment, or persistence layers.
