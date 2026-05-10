# Contributing to n8n-nodes-growero

Thanks for your interest. This is a small project with a single maintainer —
I respond to PRs and issues when I can, usually within a week. Please read
this short doc before opening anything.

## What's in scope

- **Bug fixes** — wrong field names, broken operations, mishandled API responses
- **New operations** that wrap *existing, already-public* Growero API endpoints
- **Type/typo/doc fixes** in the README, SECURITY.md, or this file
- **CI / build improvements**

## What's NOT in scope

- **Feature requests for Growero itself** (e.g. "support a new platform", "add
  AI rewrite", "expose analytics"). These belong on the Growero product
  feedback channel: https://growero.io. New endpoints get added there first;
  this repo wraps what already exists in the public API.
- **Bypassing the public API** — calls to non-public Growero endpoints,
  scraping, or workarounds for rate limits won't be accepted.
- **Bundling vendored dependencies** — this package is intentionally
  zero-runtime-dep. PRs that introduce npm dependencies will be declined unless
  there's a strong reason.

## Development setup

Requirements: Node ≥ 18.

```bash
git clone https://github.com/social-frost/growero-n8n.git
cd growero-n8n
npm install                 # installs nothing (zero deps); creates lockfile
npm run build               # mirrors source → dist/
```

## Before opening a PR

1. **Branch** off `develop`, not `main` — that's where work lands first.
2. **Run the build** — `npm run build` must succeed.
3. **Smoke-test in n8n** — install the local tarball into a real n8n instance:
   ```bash
   npm pack
   # then in your n8n container:
   cd /home/node/.n8n/nodes && npm install /path/to/n8n-nodes-growero-X.Y.Z.tgz
   ```
4. **Keep PRs small.** One concern per PR; one commit per concern is ideal.
5. **Match commit style** — see existing commits for shape:
   `feat(node): add foo`, `fix(credentials): bar`, `docs(readme): baz`.

## Reporting a bug

Use the bug report issue template. It will ask you for:
- n8n version
- Node.js version
- Package version (`n8n-nodes-growero@X.Y.Z`)
- Minimal repro steps

If you don't fill those in, I'll close the issue with a pointer back to the
template — not because I'm grumpy, but because without the version/repro I
can't reproduce or even start triage.

## Reporting a security issue

**Do not** open a public issue. See [SECURITY.md](./SECURITY.md) for the
responsible-disclosure email.

## License

By submitting a PR you agree your contribution is licensed under the project's
[MIT license](./LICENSE).
