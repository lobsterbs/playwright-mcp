# Patches applied to @playwright/mcp 0.0.82

The upstream image ships the MCP server as one compiled bundle, /app/node_modules/playwright-core/lib/coreBundle.js.
patches/apply-patches.js applies the string ops in patches/patches.json at Docker build time, fails the build on any
drift (image version, playwright-core version, bundle length, occurrence counts), and verifies the patched bundle
with node --check. Upstream source paths refer to the microsoft/playwright monorepo.

## Stale profile locks / deadlock
- ops: browserFactory-helpers, browserFactory-precheck, browserFactory-processsingleton-catch
- upstream: packages/playwright-core/src/tools/browserFactory.ts
- Before launching, stealStaleLock removes SingletonLock/SingletonSocket/SingletonCookie when the pid recorded in the
  lock is dead or no longer a browser process (pid-reuse guard via /proc cmdline). If a live browser still holds the
  default profile, the session falls back to a throwaway mcp-<browser>-iso-<rand> profile (the --isolated equivalent),
  so concurrent clients never block each other. Throwaway dirs are swept when older than 5 minutes and unlocked, and
  removed at process exit. Acceptance tests 1, 2, 5.

## Tool-call watchdog
- op: server-calltool-watchdog
- upstream: packages/playwright-core/src/tools/server.ts
- The whole tool call races a wall-clock watchdog (env PLAYWRIGHT_MCP_TOOL_TIMEOUT_MS, default 110000 ms, just under
  the client-side 120 s). On expiry the backend is disposed (browser closed, profile released) so the next call starts
  fresh, and a structured tool_timeout error is returned. Acceptance test 1.

## Structured error surface
- ops: backend-error-helpers, backend-messages-meta
- upstream: packages/playwright-core/src/tools/backend/browserBackend.ts
- Every tool error ends with an ErrorMeta JSON line: code (tool_error, tool_timeout, browser_profile_locked) and a
  recoverable flag, so callers can tell retry-later from must-reset. Thrown objects are JSON-stringified instead of
  collapsing to [object Object]. Fixes the raw browser_tabs error surfaces.

## Shadow-DOM click fallback
- ops: click-shadow-dom-fallback, click-description
- upstream: packages/playwright-core/src/tools/snapshot.ts
- When Playwright visibility/actionability heuristics reject a visible custom element (shadow DOM hosts,
  display:contents internals), the click falls back to a shadow-piercing elementFromPoint hit test (walking shadow
  roots and the composed tree) plus a positional mouse click; if that also fails, the error names the target, tag,
  label and rect. The tool description documents DOM-order matching for selectors. Acceptance test 4.

## Session semantics and tab pinning
- ops: runcode-description, runcode-tab-schema, runcode-handle-tab
- upstream: packages/playwright-core/src/tools/backend/runCode.ts
- browser_run_code_unsafe accepts an optional tab index (from browser_tabs, DOM order) to pin the page for the call.
  The tool description documents that browser-context state persists across calls and states the wall-clock budget.

## browser_reset
- ops: tools-var-browserreset, tools-reset-register
- upstream: packages/playwright-core/src/tools/backend/tools.ts
- New browser_reset tool: clears stale Singleton* lock files in every mcp-* profile and closes the browser
  unconditionally. Idempotent; use after a wedge or timeout. Acceptance tests 2, 5.

## browser_close
- No patch needed: once launching can no longer fail on stale locks, close is idempotent (a second close initializes
  a fresh browser and closes it). Acceptance test 3.
