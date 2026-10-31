# Settings implementation ledger
Plan: docs/settings-plan.md
Base: 678504dea3c7975767de32c8fa0b5d19e492030b; branch codex/efa-design-spec.
Scope authorized by user: Config/Settings only, common profile and integration contracts, preserve Claude inspection modules.
Baseline: node --check app/www/ppm.js PASS. No existing automated test script. Native worktree helper refused nested sourceRoot, so isolated git worktree used; branch fast-forwarded locally to origin/main.
Tasks: 1 store/migration/contracts/tests; 2 tiled bilingual UI/theme/profile/schedule; 3 authorized Google adapters/contact-label and settings backup; 4 browser verification, branch review and handoff.
Ruling: no report/inspection/calendar engine rewrites. Provide honest capability states and shared contracts; unavailable integration stays disconnected.
Ruling: keep current Capacitor stack, local JS settings with versioned account scope; OAuth tokens memory only, excluded from export.
Ruling: transfer policy stores maxConcurrent=1; existing inspection engine is not silently claimed to obey it. Handoff documents integration boundary.
Ruling: optional handwritten signature initially import transparent PNG only, no mandatory signature editor. Explicit transparent preview; no automatic report insertion.
Ruling: native Google APIs may require project credentials/scopes; do not simulate success. Never auto-send test email or create calendar events on a save.
