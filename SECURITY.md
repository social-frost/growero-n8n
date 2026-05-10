# Security policy

We take security seriously. If you find a vulnerability — please report it
responsibly so we can fix it before it's exploited.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security findings.

Instead, email **security@growero.io** with:
- A description of the issue
- Reproduction steps (or a minimal proof-of-concept)
- Your contact info for follow-up

You will get an acknowledgment within **48 hours** and a fix or status update
within **7 days** for confirmed issues.

If the report is valid and we ship a fix, we are happy to credit you in the
release notes (or honor an anonymity request).

## Supply-chain hardening

This package is intentionally minimalist for security:

- **Zero runtime dependencies.** The published tarball contains only our
  source files — no transitive surface for end users.
- **No `postinstall` or `preinstall` scripts.** Installing this package
  does not execute any of our code on your machine.
- **`engines.node` constraint** declared (≥ 18) to prevent accidental
  install on unsupported runtimes.
- **`files` allowlist** in `package.json` — only `dist/`, `package.json`,
  and `LICENSE` are published. Source files, tests, dev configs are
  excluded automatically.
- **Published with npm `--provenance`** (npm ≥ 9.5). You can verify the
  package's GitHub source-link via:
  ```bash
  npm audit signatures n8n-nodes-growero
  ```

## What this node does NOT do

- Does not persist your API key anywhere outside n8n's credential store.
- Does not phone home, beacon, or send telemetry.
- Does not access local files or environment variables beyond the n8n
  credential.
- Does not log credentials, even at debug level.

## Known third-party advisories

None at this time. (n8n itself is the only "dependency" — it provides
the runtime helpers `httpRequestWithAuthentication` and credential
storage. We do not bundle n8n.)

## Recent npm ecosystem incidents

Following the September 2025 supply-chain attacks against npm-published
maintainers, we have audited our publish posture:

- Maintainer accounts use 2FA with hardware keys.
- Granular access tokens for CI publishing (no classic tokens).
- `--provenance` flag on every publish.
- No `postinstall`/`preinstall` scripts in this package or any of its
  (currently zero) dependencies.
- Lock-file is shipped only for our development; published consumers
  install our hoisted minimum.
