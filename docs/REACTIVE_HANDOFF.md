# Reactive tile

Branch `codex/reactive-tile` starts from refreshed `origin/main` 175ceec. One PR, no merge. No edits to `inspekcje/index.html`, `app/www/ppm.js`, CI, secrets or APK signing. The supplied OEST-basic.docx is copied byte-for-byte to `app/www/templates/OEST-basic.docx`; generated copies are filled without changing that source.

## Flow and data

Home: active jobs, status/days/location/photo, twelve presets, History, fixed main button. New job: category → element → scope where applicable → problem; Other is free text. Details: building/allowed floor, room, before photos, text/audio, requested-by, status/parts/date and quote. Completion adds after photos, action tiles and editable EN report text. All visuals use the existing theme; added CSS is layout plus the six explicitly requested status colors. Header/footer remain fixed; only the middle scrolls. Screenshots are 412×915 in `docs/screenshots/reactive`.

Slash variants are separate choices; missing EN phrases are short factual completions approved by the user. Some synonym action tiles share the same logical outcome (Dokręcone/Zamocowane = Re-secured; Odstawione/Przeniesione = Moved). No categories outside the supplied tree were added.

**Action rules:** Repaired/Replaced/Re-secured/Adjusted/Blockage cleared/Re-sealed/Moved/Door opened close a job. Contractor required remains active with Subcontractor required. Made safe temporarily remains active with Open + Temporary repair. Generating/sharing a report does not change these outcomes. The plain completion button says Save without report for an active outcome, and Close without report for a closing outcome. Legacy Handover's explicit Fixed control remains an explicit manual resolution.

The SAME `OESTHandover.repository`/`oest-handover` IndexedDB is used. No parallel job database or fabricated shifts. Detailed Reactive data is additive under `job.reactive`; legacy statuses remain reported/outstanding/watch/fixed. Awaiting parts/contractor/access map to outstanding, monitoring to watch. Updates invalidate open handover drafts, preserve closed snapshots and synchronize legacy Handover status changes back to Reactive. New jobs attach to the current open shift or latest unarchived shift; if none, no shift is invented. New shifts include unresolved jobs and same-period Reactive completions. Building-manager-requested jobs have a separate Handover statistics counter.

Text/field drafts are queued immediately to IndexedDB; photos/audio are persisted with the draft before a success message. The main action commits the actual job. Reopening offers recovery; a different preset explicitly asks before replacing a draft. Navigation is blocked while a save/recording is pending or after a failed draft save. A process killed mid-write/recording still needs device testing: only committed transactions and finished recordings are guaranteed, not an unfinished microphone buffer. Last confirmed location is remembered. No polling/background model; two-minute recording limit is shared with Handover.

Voice recording/transcription is extracted into `handover-voice.js` and used by both modules, including the same native HandoverTools implementation. Device speech errors leave text/manual entry usable; transcription depends on the phone's configured offline speech service/language. The app does not claim an installed speech model if none exists.

## Reports

Only the report action generates Word/PDF. DOCX uses the existing PizZip/docxtemplater and supplied placeholders. Photos are inserted as DrawingML/package media, before then after, up to ten per gallery page. With zero photos, the photo section/break is removed. No image-module dependency is added. The DOCX creator is the Settings full name; engineer/signature uses the configured form signature. PDF is a local jsPDF rendering of the same report fields and gallery, not a Word conversion service. Non-WinAnsi characters use small transparent canvas text images so names are readable without adding fonts.

Generated fixed sentences are English. Original free notes/audio are retained. On completion the EN report field is editable and explicitly asks the user to translate a Polish note before sharing; **no automatic translation/model is fabricated**. Review that field before choosing the report action. The report title is EN, while the job's UI title is Polish. Site/date/status/building/level/requester/quote follow the brief. The template's Works Complete date is filled as specified even on an active report; the condition field explicitly says Open — Temporary repair / Subcontractor required.

The job and generated report files are saved locally BEFORE invoking `ReportShare.share`. Recipient is Settings profile.companyEmail. The native plugin opens the mail/share application: `shared` means handed to that app, **not sent/delivered**. No email was sent in development; the UI test substitutes a local stub. Failures/cancellations are recorded; completed history offers report retry. Manual close requires no report generation. Native sharing, offline mail outbox behavior and actual attachments must be checked on Pixel. No server, paid service or real test recipient is used.

## Verification

Node covers tree/preset validity, action outcomes, sentence/profile/filename fields, Handover cross-visibility, status mapping, same-day completion carry-in, account isolation and DOCX package fields/gallery/zero-photo cleanup. Browser covers the actual tree, durable draft/reload/photos, generated DOCX/PDF, mocked sharing, active temporary/contractor after report, closure/history, shared Handover jobs and all required screenshots.

Generated DOCX examples were opened read-only in a separate hidden Word instance and rendered: **zero photos = one page**, before+after = two pages, with no empty photo page. Source template/user documents were not edited. PDF and rendered Word pages were visually checked. Sample reports are development outputs, not completed inspections.

Pixel acceptance: airplane mode; capture/gallery before+after; kill/relaunch after “draft saved”; complete recording and restart; missing speech service; every building's floors; status/parts/date, temporary label and contractor after sharing; normal repair closure; Handover ↔ Reactive updates both ways; no-photo report, many photos, mail-app cancellation/retry, company recipient and small readable attachments. Screen reader/real touch/safe-area behavior require device verification. Claude can review this PR without touching its protected inspection branch.

Legacy Settings UI regression script stops at the removed appearance.theme selector on current main. Settings sources are unchanged in this PR; the shared fixed theme no longer exposes that old control. Reactive and Handover UI scenarios pass. This unrelated test expectation is not silently counted as a pass.
