# Questions implementation plan

Approved: brief 6 plus unique global question IDs with separate legacyKey, and the supplied 27 items seeded as unassigned proposals. No ppm.js/inspection changes; Claude connects the API later.

- [x] Pure core: sections/subsections, immutable IDs, validated pass/scale/measure questions, per-task selections/defaults/pins/overrides, built-in seed/restore and report preview. No measurement defaults or copied values.
- [x] Account-scoped IndexedDB, proposal preview/duplicate warnings, validated transactional JSON backup merge; cached synchronous formFor with explicit ready/onChange lifecycle.
- [x] Settings tile and two tabs; question/section editors, reasons, global scale labels, inspection selection/copy/reorder, metadata and report preview. tempTB stays read-only.
- [x] Focused Node/browser tests, integration handoff/example; separate codex/pytania branch, prepare a draft PR to main, no merge.
