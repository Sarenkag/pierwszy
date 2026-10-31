# Settings handoff for Claude

Branch: codex/efa-design-spec. Existing Capacitor app retained. Only Settings/shell integration; no changes to inspekcje/ or ppm.js.

Implemented: account-scoped versioned profile migration, independent printed signature, optional transparent PNG signature and photo, dated shift history, Google Contacts label import, contact routing, settings JSON export/preview/restore and Drive backup adapter, Gmail TEST adapter, Drive folder access/creation, calendar destination preferences, PL/EN Settings, token-based themes/accent/density, Wi-Fi policy and queue warning preferences, AI model configuration slots.

Shared API: window.OESTSettings.get(), update(fn), recipients('inspection'|'handover'), scheduleOn(day), exportBackup(), previewRestore(backup), restore(backup,true). oest:settings-changed event. Existing insp.cfg receives signature/name and only the work email, preserving unrelated fields. OAuth tokens are memory-only. Google OAuth client ID remains blank in existing config.js; real Google integration needs configured APIs/scopes and device authorization. No real mail was sent.

Integration boundary: Settings does NOT implement inspection queue transport, photo editor, model runtime, report generator, calendar events or full inspection backup. It exposes policy/preferences, not fake functioning engines. OESTSettingsUI.registerAdapters({queueStats,sendNow}) and setQueueStats({count,bytes}) connect the owner's queue. Hooks are explicit; account/profile data remains local and must not be assumed encrypted. Biometrics not implemented. JSON backup is settings only; Android download behavior needs device verification.

Latest AI decisions: models run on phone, text PL to professional EN is priority; preserve original/facts/numbers. Every new in-app photo MUST get local OCR + vision asynchronously, serially, once per image/model version; defer for thermal/battery conditions, never block save or silently omit. OCR ~1s/vision ~2s is an UNVERIFIED target, not benchmark evidence. Optional OpenAI/Claude/Gemini cloud assistance is explicit and never automatic fallback. API keys require a future secure runtime adapter, never localStorage/JSON. UI model slots do not install models. Original undecided handwritten editor is optional PNG import for now.

Verification: 20 Node unit tests PASS; JS syntax PASS; scripts/copy-web.js PASS with existing dependencies; no new dependency added. Browser check exists in app/tests/settings-ui-check.cjs but could not launch in restricted environment; elevated attempt was NOT executed because automatic approval review hit account usage limit. Screenshots/Android APK/real OAuth not verified. Do not call the UI or integrations device-tested. Need next: run browser test then Android smoke and real OAuth permissions, wire owner modules to policy.

Run: cd app; node --test tests/*.test.cjs. Browser check requires Playwright; optional OEST_PLAYWRIGHT_PATH and OEST_BROWSER_PATH point to an installed runtime/browser. Never publish or merge automatically.

## Update 2 — Settings routing fix

Fixed undefined settingsRoute and routed settings subpages / legacy profile paths correctly; index.html normalized to LF. Regression tests reproduced the error before the fix and now pass (4/4). Browser Settings check PASS in installed Chrome at 390/360 px, including account-seeded #settings, profile save/reload, shift history, themes, PL/EN, offline save and existing PPM. This supersedes the earlier unverified browser status. Real OAuth/Android checks remain unverified.
