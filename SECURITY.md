# Security

Discere is currently a local single-user prototype. Bind services to `127.0.0.1`; do not expose the server to a public network. The service has no sign-in. It refuses to listen on a non-loopback address unless `DISCERE_ALLOW_REMOTE=1` is set, and it refuses requests addressed to a host name that is not a loopback name or listed in `DISCERE_ALLOWED_HOSTS`.

The repository stores learning progress in `data/discere.sqlite`. That file is ignored by Git and should remain private. Course content belongs in `content/` and must not contain secrets.

Report a security problem through a private GitHub security advisory. Do not include personal learning data in a public issue.
