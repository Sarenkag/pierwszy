# Keys — handoff

## Scope and use

Branch `codex/keys` starts from `codex/kalendarz`; draft PR targets main without merging. Review just this module against `codex/kalendarz`, because the main PR also contains its unmerged ancestors. No inspection files, ppm.js, CI, signing or secrets changed.

Keys catalogs ordinary edge-cut euro keys and smaller edge-cut cabinet/mailbox keys. Unusual keys can be stored as **catalog only**; no recognition claim. The app never asserts that a candidate definitely opens a door.

1. Keys → Dodaj klucz. Enter a label and, optionally, the stamped number. Add one clear key photo; the reverse side is optional.
2. Lay one key flat on a bright, uniform background, head left and teeth up. The silhouette guide appears before capture. **Aparat systemowy** launches Google Camera on Pixel, falling back to the installed camera if unavailable. Check Macro Focus/focus in that camera; the app cannot force a particular lens, camera resolution setting or macro mode.
3. The capture intent uses a full output file, not its thumbnail. The original key-image bytes are stored in IndexedDB unchanged. Processing uses a separate image no larger than 1200 px on its longest side and does not enlarge small source images. Preview JPEGs are at most 512 px. Door images are compressed copies, up to 1200 px.
4. After capture, inspect the turquoise contour. Rotate/flip if needed; adjust the blade start, end and alignment correction. The line must follow the teeth, excluding head/shoulder and tip. A detected contour is not proof it is correct. Blurry/low-contrast/too-small edge-key captures cannot be accepted into the catalog until corrected or retaken.
5. Add every door the key opens: name, Tower A / Tower B / Pavilion, floor and at least one photo per door (up to ten). More doors can be added. Save explicitly; the app confirms only after the IndexedDB transaction commits. Existing records can be edited or deleted.
6. Find a key using camera/gallery or a manually entered code. Review/correct OCR text. Exact normalized number matches come first; up to three candidates then use the normalized cutting profile. Candidate cards show the matched side, similarity, door locations and door thumbnails. Tap a photo for its full stored image.

## Recognition and limits

- `keys-core.js`: threshold on a bright background, largest connected foreground component, PCA alignment, user-adjustable blade interval, median edge sampling, 128 normalized samples. Match search allows small horizontal shifts and ±4% scale adjustment. The selected blade interval should cover the same physical section in reference and query photos.
- This is a lightweight contour baseline, not a trained locksmith system. Shadows, reflections, oblique photos, a differently sized key head, missing tooth edges and cutouts can defeat segmentation. Tiny differences between neighboring bittings may be lost in downsampling. Real accuracy is **unknown** until measured on actual keys.
- Quality thresholds are initial heuristics. They can reject usable photos or accept a wrong contour; inspect the overlay and calibrate on Pixel samples. They are not a universal camera focus measurement.
- A displayed percentage is a deterministic profile similarity, **not calibrated probability or identification confidence**. Poor candidates still appear when the database has profiles; always check the actual key and location. OCR uses literal letters/digits after removing separators; it does not guess O↔0 or I↔1. Manufacturer text must not be mistaken for a stamped code; the add form does not silently copy an arbitrary OCR line into the stored number.
- Native OCR uses the bundled Latin ML Kit model (`com.google.mlkit:text-recognition:16.0.1`), available without a first-run model download. It processes a bounded local copy. In browser preview, native OCR/camera are unavailable; gallery and manual code/profile matching work. No photos are sent to a server.
- Local vision extension: `OESTKeys.visionCompare(photoA, photoB)` returns `null` when disconnected. `OESTKeys.setVisionCompare(fn)` attaches a future local provider returning a score 0–100. A user-requested second opinion runs serially on up to three candidates and displays separately; it never reorders the contour/OCR results. No model is installed by this change and no cloud adapter is provided.
- Processing is on demand, one operation at a time. No worker polling, background recognition or automatic downloading. Originals can use significant disk space; use JSON export and deliberate catalog cleanup. Individual image inputs are limited to 40 MiB; PNG/JPEG/WebP are supported. Very large/unsupported headers are rejected visibly.

## Storage and backup

`oest-keys` IndexedDB contains separate account states, original key Blobs, compressed door photos/previews, profiles and labeled test outcomes. There is no volatile fallback. Records never appear under another app account, and account changes during operations are rejected.

JSON schema `oest.keys`, version 1, includes all catalog records, photos (base64), profiles and account identity. Import is for the same account, validates required fields and image SHA-256, then merges atomically. Matching record IDs or identical key-photo hashes merge without creating another key; matching doors merge photos by hash. Existing labels/numbers win, so import does not silently replace them. Distinct photos of the same physical key cannot be deduplicated reliably unless the record ID is retained. Test counters are local and are not part of the catalog export.

On Android, export uses the system **Create document** picker and streams UTF-8 chunks to a temporary file, then copies into the selected destination. No general storage permission is requested. Cancel/error never reports a saved backup. Browser export uses a download. Export/import JSON is limited to 200 MiB and import to 500 records; large collections should be split before hitting the limit. Full originals/base64 may make files large. A system picker offering a cloud drive is a user-selected export destination, not automatic photo analysis/upload by the module.

Camera temp files are deleted once the web layer has read them, or on cancellation. A killed process can leave temporary files; verify this on the phone and clear app cache/temporary captures as needed. Do not clear app data before exporting: that removes IndexedDB.

## Real-key acceptance test (Pixel 8 Pro)

1. Add ten **different** ordinary edge-cut keys, including similar-looking keys and a small cabinet key. Label their real doors; include door photos. Check every saved contour against the tooth edge.
2. Take three **new** query photos of each key, varying distance, slight rotation and normal lighting: 30 searches total. Do not reuse the stored photo as the query.
3. In test mode, inspect the overlay before accepting each query. In results choose the **actual** key, even when missing from TOP 3, and save the trial once. The catalog shows total trials, number ranked first and number in TOP 3. Report both raw counts and fractions out of 30; do not describe the synthetic tests as real accuracy.
4. Repeat some searches with code hidden and some with visible stamped numbers; record the difference separately. Check all similar keys by trying the real locks, following building procedures.
5. Airplane mode, including first OCR use after installing the APK: camera, bundled OCR, catalog, profile matching and saving should work. Verify original capture size/bytes, optional reverse-side matching and all door thumbnails/full views.
6. Add a deliberately blurred, dark and too-small photo: visible quality failure, no imaginary successful profile. Correct crop/rotation and verify the overlay follows the teeth. Unusual keys remain catalog-only.
7. Save/edit/relaunch; export to a local file, import twice and confirm no duplicates or missing door images. Try a corrupt file and wrong-account file: the prior database must remain unchanged. Switch accounts and confirm isolation. Test camera/export cancellation and low disk space.

## Verification status

Node tests cover extraction on synthetic contours, alignment, profile comparison/ranking, OCR precedence, input rejection, account isolation, photo-preserving JSON roundtrip, duplicate imports, tamper rejection and trial counting. Browser verification exercises the gallery → contour → catalog/door photo → offline query → test counter → import/reload/account flow on a synthetic PNG.

Android compilation and physical Google Camera / bundled ML Kit / system export behavior still require the unchanged CI and Pixel tests. There is no claim of verified native behavior or real-key recognition accuracy.

Official ML Kit installation reference: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
