# playwright-mcp

Patched Playwright MCP server deployed on Render (port 8931).

Base image mcr.microsoft.com/playwright/mcp:v0.0.82 plus build-time patches to the playwright-core server bundle.
See PATCHES.md for the full list. The patches fix:

- stale profile lock deadlocks (lock stealing plus isolated fallback profiles)
- tool-call timeouts that leave zombie runs (server-side watchdog covering tool execution and browser startup,
  default 110 s, PLAYWRIGHT_MCP_TOOL_TIMEOUT_MS)
- hung browser launches (explicit launch timeout, default 60 s, PLAYWRIGHT_MCP_LAUNCH_TIMEOUT_MS)
- click failures on visible shadow-DOM custom elements (hit-test fallback with enriched errors)
- undocumented session semantics (documented; browser_run_code_unsafe gains a tab pin argument)
- inconsistent error surfaces (every error carries an ErrorMeta JSON line with code and recoverable flag)

New tool: browser_reset (force-clear locks and restart the browser).
