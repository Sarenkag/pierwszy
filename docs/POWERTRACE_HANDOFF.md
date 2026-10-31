# Power trace — stage 1

`codex/power-trace` is based on `codex/keys`. Draft PR to main includes its unmerged ancestors; compare against `codex/keys` for this feature only. No merge, inspection/ppm.js/CI/signing/secret changes or real emails. No new OCR dependency: system capture, bundled Latin ML Kit and document export reuse KeysPlugin. Shared JS media/export helpers remain compatible with Keys.

## Use

1. Power trace → Dodaj rozdzielnię. Enter the **exact sticker code**, building, floor and location. Optional upstream code has existing-code suggestions but accepts unknown codes. Saving preserves case, punctuation and whitespace, including descriptions and circuit numbers.
2. Add at least one box photo (open door, switches visible) and one circuit-card photo, via system camera or gallery. Original files are preserved; previews and bounded OCR copies are separate. Check focus/macro in Google Camera; the app cannot force the lens or camera's resolution settings. Only process one photo at a time.
3. Enter circuit rows manually, or choose a card's **OCR → szkic**, inspect/correct the raw text and add its draft rows to the table. The browser/OCR-error path permits manual entry or pasted text. The parser recognizes explicit leading numbers such as 1, L1-3 and 3P; uncertain lines get a blank number, not an invented one. Optional type/rating remain blank unless entered by the user. OCR layout can be lost: never trust automatically associated number/description pairs without checking the card. All rows remain unsaved until **Zapisz rozdzielnię i obwody**; unresolved required fields block saving.
4. Add/remove/reorder rows. Select one or more evidence cards for each row; OCR drafts inherit the selected source card. Unassigned evidence shows all board cards as **context**, clearly labeled rather than asserting that a specific card proves the row.
5. Select a box photo and circuit, then tap to add markers. Multiple markers on one or several photos are supported. Pinch to zoom; drag a zoomed photo to pan; +/−/Reset are also available. Tap a label for its full text and edit X/Y percentages or remove it. Photo deletion also removes its draft markers/evidence references. Changes persist only on Save.
6. Search descriptions, codes and locations; case and room-number dots/spaces are ignored (512 finds 5.12). Filter by building/floor. Each hit shows board/MCB details, a highlighted marker when assigned and card evidence. Tap photos for full-size zoomable views; tap labels for full descriptions. Boards without circuit rows are already searchable by location/code. Search displays up to 100 hits and asks for a narrower query beyond that.
7. Export/import JSON from the catalog. Android uses the existing system document picker, with an **OEST-PowerTrace** filename; browser uses a download. Check the saved file. Imports are confirmed, same-account only, validated and transactional. Repeated IDs or exact board identity (code/building/floor/location) merge without another board; photo hashes remap references without duplicates. Existing board metadata and circuit text win conflicts. A circuit matches by ID or the same number/description/type/rating; distinct descriptions remain separate. Conflicting photo bytes under one photo ID are rejected. Original circuit ordering is preserved, then imported additions appear. Delete requires confirmation and removes that board's circuits/photos/markers.

## Data and future plans

Account-scoped IndexedDB `oest-powertrace`; no in-memory success fallback, server upload, automatic background scanning or polling. Snapshot/export schema `oest.powertrace`, version 1:

- `boards`: id, exact code, building, floor, location, upstreamCode, boxPhotos[], cardPhotos[], timestamps.
- `circuits`: id, boardId, exact number/description, optional type (`light/socket/other/spare`) and rating, order, sourcePhotoIds[], markers[{id,photoId,x,y}]. Coordinates are percentages of the correctly oriented displayed image, calculated from its current transformed bounds; not screen pixels.
- Reserved, currently empty: `floorPlans`, `rooms`, `points`, `fixtureTypes`. Planned floorPlan: id/building/floor/image; room: id/floorPlanId/name/geometry/circuitIds[]; point: id/floorPlanId/roomId/type (`light/socket/other`), fixtureType, count, x/y, circuitIds[]; fixtureType: id/type/name/specification. Existing circuit IDs are the future links.

There are no plan screens. The search result reserves a hidden “Pokaż na planie” control. This stage rejects imports with nonempty future collections rather than silently discarding unsupported data. Future code must implement their validation and links before enabling them.

Image/backup limits follow Keys: JPEG/PNG/WebP, 40 MiB per original, 200 MiB JSON import/native export; up to 50 photos per role per board, 500 boards and 10,000 circuits. Large backups/base64 can consume memory; keep a confirmed backup before clearing app data. Camera temporary-file and system-picker cancellation behavior still needs Pixel testing. No microphone in this stage: Handover's existing speech path requires a recording/transcription workflow rather than a simple live-search call; the brief explicitly permits omitting it.

## Verification and Pixel acceptance

Node: OCR draft parsing with exact text, room-number search normalization, zoomed coordinate mapping, photo-inclusive JSON roundtrip, remapped-ID deduplication, invalid references/hash rejection, account isolation, storage failure and deletion cascade. Browser: gallery/manual/pasted-OCR draft, absence of autosave, multiple markers/photos, zoom/pinch, coordinate edit/delete, search/highlight/full photo, JSON download/reimport and offline/account boundaries. Keys regression is required after shared helper changes. These checks use synthetic images, not electrical observations.

Native camera, OCR, SAF export and real touch/Pixel behavior remain unverified locally; existing CI must compile the Android app. On Pixel 8 Pro:

1. Catalog **three real boards**, each with clear box and card photos; try optional upstream codes absent from the database.
2. Run OCR, compare every row with the card and correct mistakes, especially multi-column/phase layouts. Confirm nothing appears as saved before Save; relaunch and check exact codes/descriptions.
3. Place multiple markers for one circuit on two photos. Pinch/pan, add at zoom, edit/delete, rotate the phone, save/reopen and check that anchors remain on the right switches. Check full descriptions and highlighted search thumbnails.
4. Search **ten real descriptions/room numbers/codes**, including 5.12 via 512; verify board, MCB and evidence manually. This is a reference tool, not verification that an electrical circuit is isolated.
5. Airplane mode, including first OCR use after install: catalog, manual entry, local OCR/search and saves work. Denied/unavailable OCR/camera must leave manual entry usable.
6. Export to a local file, import twice, check originals/markers/counts, then try a corrupt or wrong-account file without changing existing data. Test picker/camera cancellation and insufficient storage. Switch accounts and verify isolation.
