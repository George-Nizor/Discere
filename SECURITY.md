# Security

Discere is currently a local single-user prototype. Bind services to `127.0.0.1`; do not expose the server to a public network.

The repository stores learning progress in `data/discere.sqlite`. That file is ignored by Git and should remain private. Course content belongs in `content/` and must not contain secrets.

Report a security problem through a private GitHub security advisory. Do not include personal learning data in a public issue.
