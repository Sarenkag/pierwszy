# Power trace — implementation plan

Approved scope: brief-codex-5.md, stage 1 only; multiple markers per circuit across multiple box photos. Keep original board codes/descriptions. Human approves all OCR rows. No floor-plan UI, server communication or inspection/CI/signing changes.

Architecture: pure `powertrace-core.js` for OCR drafts/search/schema/merge, `powertrace-store.js` for account-scoped IndexedDB and photo-inclusive JSON, `powertrace.js`/CSS for catalog/editor/search and zoomable markers. Reuse Keys media/native capture, bundled OCR and system export. Stage-2 collections remain empty, explicitly reserved in v1.

- [x] Tests first: OCR without invented fields, number-normalized search, coordinate mapping at zoom, merge/deduplication and account boundaries.
- [x] Implement schema and transactional repository; exact text preservation, photo validation, reference checks and cascade deletion.
- [x] Add Power trace tile, editor/manual circuit rows, OCR review, photo annotations with pinch/pan, searchable evidence views and backup controls. No automatic OCR saves. Optional voice omitted if not a simple existing live-speech call.
- [x] Run focused Node/UI checks plus Keys regression after shared-helper changes; document Pixel acceptance (three boards, ten searches, airplane mode); prepare publication of `codex/power-trace` as a draft PR to main without merging.
