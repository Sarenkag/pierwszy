# Handover handoff — brief 2, 31 October 2026

Branch codex/handover starts from corrected Settings commit d007632. PR targets main, never merged automatically. Settings PR #5 remains separate. Existing inspection sources, ppm.js, CI, APK signing and secrets are untouched. No package dependency added.

## Delivered

- Real Handover tile; offline, account-scoped IndexedDB store oest-handover v1. states holds metadata, media holds immutable Blobs by [owner,id]. Media and entry save in one transaction; errors propagate, no volatile fallback.
- Shift dates suggested from Settings.scheduleOn with 4/4, weekdays/weekends and manual period selection. Off days and dates outside a shift are explicit. Without a schedule, proposed dates are editable and marked unconfigured.
- Photo camera/gallery, one-time JPEG compression (long edge <=1600, quality .7), Polish/English original text, location, reactive/general entry. Status reported/fixed/outstanding/watch, immutable status history; current statistics update on status change.
- All non-fixed jobs carry into a new shift. Archived handovers contain immutable snapshots; later resolution does not rewrite old reports. Original media references stay readable.
- English template with Summary, Statistics, Reactive jobs, Items to watch, Notes and Photo N references. Polish text is explicitly untranslated until reviewed. Audio-only evidence is not invented as text.
- Editable saved draft. Content revisions invalidate old drafts after new entries or status changes. Updated template is regenerated with old manual draft visible; prior edited drafts retained in draftHistory on replacement.
- Archive read-only, recipients from Settings.recipients('handover') selectable. Native share uses email body, subject, recipients and JPEG attachments with content-URI read grants. It reports shared, NEVER sent/delivered. Browser mailto only without photos and below URL length bound; refuses silent loss of photo attachments.
- Native HandoverTools microphone permission, PCM/WAV recording up to two minutes; Android 13+ on-device speech recognition from recorded PCM, Polish, no cloud fallback. Unsupported language/service gives explicit error, audio and editable text remain. Audio recording stops capturing when activity pauses. Browser recorder fallback tested with a fake microphone.
- Explicit AI and Drive adapters only. No model/LLM installed in this task. Model is a required eventual feature but currently visibly not configured. No fake translations or fake Drive backup. Optional PPM stat omitted without a verified adapter.

## Shared interfaces

window.OESTReactive.createRepository({owner,backend?,clock?,id?}) exposes get(), startShift(start,end), addEntry(shiftId,{kind,text,language,location,status,media}), setJobStatus(), saveDraft(), recordDelivery(), archive(), media(id). Reuse this for future Reactive UI. Owner is the current Settings owner. Serialized IndexedDB transactions avoid overlapping writers silently losing updates. A finalized archive is a snapshot, not references to mutable job objects.

window.OESTHandover.registerAdapters({
  ai: {rewriteHandover: async ({body,source,statistics,model,targetLanguage,preserveFacts}) => ({body})},
  ppmStats: async ({start,end}) => ({closed:integer}),
  backupHandover: async ({body,recipients,shift,photos}) => ({fileId})
})

No adapters auto-connect. Model must be configured AND runtime adapter provided for AI button. Numeric token changes are rejected; semantic correctness still needs human review. Sources and Polish originals are retained. Cloud selection in Settings does not auto-upload anything from Handover. Drive requires a genuine fileId receipt, not an optimistic flag.

## Verification

33 Node tests PASS including Settings routes, persistence failure, status history/grouping, carry-forward, schedule, immutable archive, draft invalidation. Real Chrome checks PASS: Settings at 390/360px and Handover at 390px, real IndexedDB persistence/reload, offline save, actual image resizing, fake-device audio Blob recording, draft and unavailable-adapter states, share payload using stub ONLY, archive/carry-forward and no horizontal overflow. copy-web packaging PASS. Screenshots generated separately with fictional data.

Fresh reviewer found Back-navigation loss of unsaved evidence, stale draft after later changes and audio-stop failure trapping editor. All three have regression scenarios observed failing then passing. No reviewer-deferred minor items.

Native Android SDK/JDK/device not available in this workspace. Java plugin compilation, Pixel microphone, installed Polish recognizer support for EXTRA_AUDIO_SOURCE, native chooser attachment/recipient behavior and Gmail receipt NOT verified locally. Existing CI may build APK after PR creation; do not confuse web checks with native checks. User must verify actual target mail app keeps body, recipients and photos. Audio is intentionally not attached to the email; original recordings remain local evidence. Native photo-share copies live in cache; plugin cleans only its copies older than one day on next share.

## Remaining acceptance

1. Build Android APK via existing CI; install on Pixel 8 Pro without touching signing/secrets. Test microphone denial, start/stop, app pause, original WAV replay, PL offline speech and fallback to text on unavailable service.
2. Open actual Gmail share sheet, verify body + all Photo N attachments + selected recipients. Cancel and retry; app must never claim delivered. No real send was performed by Codex.
3. Later install/test selected small local text model through native runtime adapter. OCR/photo vision engine and full backup/inspection integration remain owned by respective modules, outside this task.

No merges or production publication performed. PR is reviewable code, with native verification limits explicitly listed.
