# Discere on the homelab

Discere runs in two places from the same code. This page explains how the two copies relate, how
each one is updated, and what differs between them. Read it before changing anything that
touches deployment, settings, the tutor provider, saves or Read aloud.

## Two copies, one codebase

There is no fork. Both copies run the code on `main`; what differs is their settings.

| | The PC copy | The homelab copy |
| --- | --- | --- |
| Who uses it | George, on Windows | George's phone, and a couple of testers |
| Address | Opened by Instrumenta on 127.0.0.1 | A public HTTPS address through a Cloudflare tunnel (`DISCERE_ALLOWED_HOSTS` in the homelab's settings) |
| Comes from | A Windows release (`v<version>` tag on `main`), installed and updated by Instrumenta | `scripts/deploy-homelab.sh`, run by hand from a checkout |
| Settings | `launch.env` in `instrumenta/product.json`, shipped in the release | `/srv/discere/discere.env` on the homelab, not in git |
| Progress | One learner, `local-user`, in `%LOCALAPPDATA%\Discere` | One save per browser, in `/srv/discere/data` |
| Tutor | Claude Code on Windows | Gemma 3 4B on the homelab's Ollama (an 8 GB GPU) |
| Read aloud | George (Kokoro) on the PC's CPU, browser voice as fallback | George on the homelab's CPU, with a choice of the phone's own voice |
| Code practice | Rust, Python and SQL through the Windows sandbox | Not available: Bubblewrap is not installed on the homelab |

Progress does not move between the copies. Each browser on the homelab has its own save, and the
PC has its own. Nothing yet carries a save from one browser or copy to another: a learner who
clears the site's data in their browser starts again, though the old save stays in the database.
`pnpm backup` copies the whole database, every save in it.

## Releasing a change to both

1. Make the change on a branch, open a pull request, merge it into `main` once CI passes.
2. **PC:** bump `package.json`, commit to `main` and push a `v<version>` tag. The release workflow
   builds and publishes it, and Instrumenta installs it (`CLAUDE.md` in the workspace parent has
   the details).
3. **Homelab:** from a checkout of `main` that has a `.homelab` file (`user@host`), run
   `scripts/deploy-homelab.sh`. It sends the committed
   `HEAD` of that checkout (never uncommitted work), installs and builds on the homelab, switches
   `/srv/discere/current` to the new release, restarts the service and waits for it to answer. A
   failed build leaves the running release alone. The previous release is kept beside it.

The homelab does not update itself, so step 3 is easy to forget. Deploying from a feature branch
is fine for trying something out; deploy `main` again afterwards so the homelab matches it.

A deploy restarts the service for a few seconds. A phone reading aloud at that moment falls back to
its own voice, and a tutor question in flight fails; both recover on the next try.

## Settings that only the homelab sets

Every hosted behaviour is off unless its setting is on, so the PC copy is unaffected by all of
this. The template is `deploy/homelab/discere.env.example`. **The deploy script copies it only on
the first deploy**: when a new setting is added to the template, add it to
`/srv/discere/discere.env` on the homelab by hand, or it stays off there.

| Setting | What it does | Code |
| --- | --- | --- |
| `DISCERE_DEVICE_SAVES=1` | A random id in a cookie per browser, used as the learner in place of `local-user`. No sign-in, by George's choice: the address is public and a stranger gets an empty save of their own | `apps/server/src/device-saves.ts`, `learner.ts` |
| `DISCERE_ALLOWED_HOSTS` | The tunnel's address; requests addressed to any other name are refused | `host-guard.ts` |
| `DISCERE_TUTOR_PROVIDER=openai-compatible`, `DISCERE_AI_BASE_URL`, `DISCERE_AI_FAST_MODEL`, `DISCERE_AI_SMART_MODEL` | The tutor on the local Ollama | `packages/tutor-providers/src/openai-compatible.ts` |
| `DISCERE_AI_OUTPUT=json` | The reply schema goes in the prompt; Ollama cannot compile it into a grammar ("failed to initialize grammar") | same |
| `DISCERE_AI_REASONING_EFFORT=none` | Stops a thinking model reasoning before every reply | same |
| `DISCERE_TUTOR_CONTEXT=compact` | Sends the lesson as an outline of at most 9,000 characters instead of the full lesson (23,000 typical, half of it diagram SVG) | `lessonOutline` in `apps/server/src/companion.ts` |
| `DISCERE_AI_WARM=1` | Loads the model as a lesson opens | `/api/tutor/warm` in `tutor-routes.ts` |
| `DISCERE_TUTOR_ASK_TIMEOUT_MS=180000` | Room for a model still loading | `tutor-provider.ts` |
| `DISCERE_IMAGE_GENERATION=off` | No Codex CLI on the homelab | `capabilities.ts` |

## The homelab itself

This repository is public, so the homelab's address, its ssh login and its public hostname are
kept out of it. They live in the homelab's own settings file and in `.homelab` (git ignores it)
in a checkout that deploys; the owner's workspace notes outside the repository name them too.

- **Service:** a system service, `discere.service`, run as its own user, `discere`, which has no
  sudo, no docker and no login shell. The unit (`deploy/homelab/discere.service`) lets it write
  only to its data folder. `systemctl status discere`, `journalctl -u discere -n 50`. It listens on
  127.0.0.1 only (port 8790 in the template).
- **Layout:** `/srv/discere/releases/<commit>` (owned by the deploying user, read-only to
  Discere), `/srv/discere/current` (link to the running one), `/srv/discere/discere.env`,
  `/srv/discere/data` (database, backups, George's voice and its cache; Discere's alone).
- **Deploying:** the deploying user may run `systemctl restart discere.service` without a
  password (`/etc/sudoers.d/discere-deploy`) and nothing else. A change to the unit file itself
  is installed by running `deploy/homelab/setup-service-user.sh` again, which is safe to repeat.
- **First setup** (done on 16 November 2026): copy `deploy/homelab` to the homelab and run
  `sudo bash setup-service-user.sh "$USER"` there. It creates the user and folders, copies the
  data and settings from the earlier per-user service in `~/discere` (left in place, to remove
  by hand), installs the service and the sudoers line, and starts it.
- **Tunnel:** a cloudflared tunnel on the same machine forwards the public hostname to
  `http://127.0.0.1:8790` (an ingress line in `/etc/cloudflared/config.yml`, edited by the owner
  with sudo). There is no Cloudflare Access, by the owner's choice.
- **Ollama:** a separate container shared with other tools, reached on 127.0.0.1:11434. For
  Discere it was set to `OLLAMA_KV_CACHE_TYPE=f16` and `OLLAMA_CONTEXT_LENGTH=16384` on
  16 November 2026, with the previous compose file kept beside it.

## Known behaviour of the local tutor

Measured on 16 November 2026; the reasoning is in `docs/phone-plan.md`.

- With the model loaded, a tutor answer takes 9 to 16 seconds. A cold load from the spinning disk
  takes minutes, which is why lessons warm it.
- Ollama 0.20.2 stalls on prompts over about 8,000 tokens: the GPU sits idle while its CPU
  grinds, and it keeps grinding after the request is abandoned. Hence the compact lesson outline,
  and the ask route stopping a generation when its learner leaves. If the tutor goes slow for
  everyone, `docker restart ollama` clears it.
- After weeks of uptime the Ollama container can lose the GPU (`nvidia-smi` inside it fails with
  "Failed to initialize NVML"). The symptom is a tutor that answers at a few words a second.
  `docker restart ollama` restores it.
- Gemma 3 4B was the only one of four local models both fast and right on the tutor prompt. Qwen
  3.5 4B made up a different fraction; Gemma 4 E2B read prompts too slowly on this card.
- Small models slip in ways Claude does not. The tutor's checks still apply to every reply.

## Other people using it

The address is public. Anyone who opens it gets an empty save of their own, cannot see anyone
else's, and can use the tutor and Read aloud, which queue one request at a time on the homelab.
Nothing more is protected, by choice. Real accounts (sign-in, a user per person rather than per
browser) would be a larger change; see "Other people testing it" in `docs/phone-plan.md`.
