# n8n-nodes-growero

[n8n](https://n8n.io) community node for [Growero](https://growero.io) — schedule social posts, list scheduled posts, and react to publish events from any n8n workflow.

Supports **9 channels**: LinkedIn, X (Twitter), Facebook, Instagram, Threads, Bluesky, TikTok, Reddit, Pinterest.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n community node](https://img.shields.io/badge/n8n-community%20node-orange)](https://docs.n8n.io/integrations/community-nodes/)

---

## Why this exists

Growero is an AI-powered social media management platform. This node lets you wire Growero into n8n workflows so you can:

- **Auto-publish** content from any source (RSS feeds, databases, AI generators) to one or many social channels
- **Trigger downstream automations** when a post publishes (notify Slack, log to a sheet, generate a follow-up draft)
- **Bulk-import** scheduled posts from CSVs, spreadsheets, or another scheduler you're migrating from

---

## Installation

### From n8n UI (recommended)
1. Open your n8n instance.
2. Go to **Settings → Community Nodes**.
3. Click **Install**.
4. Enter `n8n-nodes-growero` and confirm the install consent.
5. Wait ~10 seconds; the node appears in the workflow palette.

### From a tarball (self-hosted, advanced)
```bash
docker exec -it <n8n-container> sh -c "cd /home/node/.n8n/nodes && npm install /path/to/n8n-nodes-growero-0.1.0.tgz"
docker restart <n8n-container>
```

### Requirements
- n8n version ≥ 1.0
- Node.js ≥ 18

---

## Authentication

Generate an API key at https://app.growero.io/settings/api-keys.

In n8n:
1. Add a new **Growero API** credential.
2. Paste your API key (format: `growero_live_<...>` for production, `growero_test_<...>` for sandbox).
3. (Optional) Override the **Base URL** if you self-host Growero.
4. n8n automatically tests the credential against `/api/v1/whoami` — green check means good to go.

Your key is stored encrypted in n8n's credential store and is never logged.

---

## Operations

### Resource: **Post**

| Operation | What it does | Required scope |
|---|---|---|
| **List** | Get up to 200 posts, optionally filtered by status | `posts:read` |
| **Get** | Fetch a single post by ID | `posts:read` |
| **Create** | Schedule a new post on any of 9 platforms | `posts:write` |
| **Delete** | Delete a scheduled post | `posts:write` |

### Example workflow — RSS-to-Growero
```
Schedule Trigger (every hour)
  ↓
RSS Feed Read (your blog)
  ↓
Filter (only items < 1 hour old)
  ↓
OpenAI (rewrite for LinkedIn tone)
  ↓
Growero (Post → Create, platform: linkedin)
```

### Example workflow — react to publishes
> Today this requires polling the Growero API; native trigger nodes are on the roadmap.

```
Cron (every 5 minutes)
  ↓
Growero (Post → List, status: published)
  ↓
IF (post not yet seen by this workflow)
  ↓
Slack (post a message in #marketing)
```

---

## Security

**This package has zero runtime dependencies.** The published tarball contains 5 files (~3.7 KB):
- 1 LICENSE
- 1 credential definition
- 1 node definition
- 1 SVG icon
- 1 package.json

There is no postinstall/preinstall script. Nothing executes at install time. See [SECURITY.md](./SECURITY.md) for the responsible-disclosure process and our supply-chain hardening notes.

### Verifying provenance
Once published with `--provenance`, you can verify the package came from the linked GitHub repo by running:
```bash
npm audit signatures n8n-nodes-growero
```

---

## Roadmap

- [ ] **Trigger node**: real-time webhook trigger when a post publishes (currently polling-only)
- [ ] **Resource: Webhook** — manage Growero outbound webhooks from n8n
- [ ] **Resource: Inbox** — read comments / mentions, suggest AI replies
- [ ] **Resource: RSS feed** — wire Growero RSS AutoPost from n8n

---

## Support

- 🐛 **Bugs**: https://github.com/social-frost/growero-n8n/issues
- 📖 **API docs**: https://api.growero.io/api/v1/docs
- 💬 **Help**: support@growero.io

---

## License

[MIT](./LICENSE) © 2026 Yash Khivasara / Growero
