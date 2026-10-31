# Settings implementation plan

Approved scope: user explicitly asked to start Config/Settings on isolated codex branch. Existing app remains plain HTML/JS in Capacitor, inspection modules reserved to Claude.

1. Shared versioned Settings store. Migrate legacy profile preserving unknown fields; isolate accounts; profile signature independent of real name; consistent routing; immutable schedule history; restore preview and merge; tests RED→GREEN.
2. Modular Settings UI: tiled hub, short subpages, PL/EN switch, theme tokens/accent/density. Profile/photo, transparent optional signature, dated schedule, contact roles, Gmail/Drive, backup/restore, calendar settings; temperature placeholder only. Do not claim PIN/biometrics implemented if unavailable.
3. Google adapter: use existing SocialLogin and memory-only scoped access tokens. Contacts selected label only, explicit refresh; Drive select folder and settings backup, local export/restore. All real network actions explicit. Calendar config and export preference only, actual calendar engine owned by Claude. Integration contracts for queue stats and future adapters.
4. Test durable migration/failure/restore, account isolation, no duplicate contacts, shift overlap, document language EN, theme reload. Browser check on 360dp and desktop, PL/EN, offline reload and backup. Review diff, syntax, package copy pipeline. No edits to inspekcje/ or ppm.js. No public deploy/main push.

Review focus: save failures without false success; restore preserves secrets and does not imply full inspection restore; old profile migration never copies across Google users; arbitrary input never goes into innerHTML unsanitized; policy controls never pretend inspection transport is integrated.
