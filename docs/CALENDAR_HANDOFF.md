# Calendar handoff — codex/kalendarz

## Agreed scope

Android CalendarContract, no OAuth or Calendar API and no new dependencies. The user creates a **private, unshared Google calendar named exactly `OEST PPM`**; the app selects it. Android owns Google synchronization. No inspection-engine, PPM strip, CI or signing changes.

`codex/kalendarz` starts at `codex/handover`; the PR to main therefore includes its unmerged ancestor. Calendar-only review: compare against `codex/handover`. Do not merge automatically.

## Use

1. Create the private calendar in Google Calendar, enable its synchronization on the Pixel and wait until it appears on the phone.
2. Settings → Kalendarz i grafik → Włącz / wybierz kalendarz. Calendar permission is requested only here. Choose the account/calendar and confirm that it is private. The provider exposes ownership, not Google sharing ACLs; privacy confirmation is the user's responsibility.
3. Default: PPM inspections, all groups, eight weeks; shift markers OFF. Save preferences before syncing. Workday filtering needs a profile schedule effective throughout the affected dates; missing schedules produce an error rather than invented workdays.
4. Google Calendar's calendar list lets you show/hide OEST PPM separately from your family shift calendar. The app neither reads nor writes that family calendar. The home Calendar tile opens Settings; its Open button launches the phone calendar.
5. Disable offers removal of this profile's app-marked events, or keeping them. It never deletes the manually created calendar or unmarked events. If permissions were revoked or the calendar was removed/renamed, deletion fails visibly and sync stays disabled.

## Behavior and boundaries

- All-day UTC events, exclusive next-day end; group colors requested from the provider. Google may display its own palette.
- Recurrence uses the saved due date as a fixed anchor, with the shortest configured period, matching PPM. Month-end anchors do not drift after February. Missing due dates create no events; overdue schedules project their next fixed occurrences into the window.
- Workday move changes only the calendar display date. Source due dates and stable keys remain unchanged. Filters remove unmatched future pending app events, preserving past/completed history.
- Updates reuse matching future events; completion is never inferred from a changed date. Existing completed entries are not downgraded if local receipt history is unavailable.
- Scope-hashed description markers isolate profiles. Every write rechecks the owned Google calendar, binding and exact prior event marker; manual events are untouched. Calendar IDs restored onto another device require reselection.
- Startup/pageshow, foreground/focus, Settings changes and cross-document due-storage changes request a debounced sync. No polling, background worker or always-running calendar service. Settings offers a forced reconciliation button. An identical same-session snapshot is skipped; manual sync checks the provider again.
- Provider success means **saved on the phone**, not confirmed delivery to Google's servers. Offline writes can succeed locally; Android synchronizes when available. Errors remain visible and do not advance the last-success timestamp. Large batches may hit Android transaction limits and fail visibly; reconcile again after resolving the limit, without claiming success.
- Settings backup includes preferences, not native bindings or the separate calendar completion/status journal. Existing marked completion history in the provider remains protected. The inspection completion producer should retain its durable receipts in its own backup design.

## Completion integration — Claude's remaining task (explicit user decision)

The inspection module does not provide an unambiguous original scheduled due date in its existing delivery queue. The user chose **“Podłączenie doda Claude”**. No completion producer is added here, and automatic ✓ will not work until this is connected. Never derive completion from Update, a date change, report filename or email/share intent.

Provide `{taskId, due: 'YYYY-MM-DD', status: 'completed' | 'sent'}` after durable report finalization, retaining the **original scheduled due date before PPM.close advances it**. Do not mark after a failed save or a send attempt alone.

When the shell modules are loaded: `await window.OESTCalendar.recordCompletion(receipt)`; alternatively dispatch `oest:inspection-completed` with that detail. These calls persist the receipt before calendar synchronization. A disabled calendar still retains explicit receipts for later use.

For the separate inspection document, write a durable shared-origin inbox, then return to the shell. Key: `oest.calendar.inbox.v1.` + `encodeURIComponent(OESTSettings.get().owner)` (use exactly the Settings account identity). Value: JSON array of the receipts above. Deduplicate by taskId + due. The shell reads this inbox at the next sync, validates task IDs/status/dates and merges it into its account-scoped journal. It intentionally does not delete the inbox, so reconciliation is retry-safe. The producer owns pruning/backup and must not overwrite another writer's receipts. A DOM event on an unloaded shell is insufficient.

## Pixel 8 Pro checks (native behavior not verified here)

- App launch with calendar disabled: no permission request. Denial/revocation: visible error; inspections still usable.
- Two Google accounts; family/shared calendars excluded from the selection. Only owned exact-name OEST PPM calendars appear. Confirm no family/manual events changed.
- Enable offline; events present locally; reconnect and confirm eventual appearance in Google Calendar. Last-success label describes local provider storage only.
- Eight weeks, month-end, year boundary, all five group colors, UTC all-day dates over DST. Same sync twice produces no duplicates.
- Update an inspection due date: events move, no ✓. Workday skip/move and group/range changes leave PPM source dates untouched. Profile changes recalculate markers; markers OFF creates none.
- After Claude adds the receipt producer: finalize/send a report, including offline finalization; return to shell; exactly its original task/date gains ✓, retained after restart and next due advances. Test failure, duplicate receipt and account switch.
- Disable → keep versus remove; manual events and the OEST PPM calendar itself remain. Rename/delete calendar and retry: truthful error, no fallback into a different calendar.
- Account switch/restore/reinstall must require the correct native binding, never silently select a different calendar with a recycled numeric ID.

## Validation

Node tests cover forecasting, recurrence, keys, filters, reconciliation, explicit completion, account Settings migration and truthful runtime failures. Browser check covers Settings navigation and mobile layout. Android SDK/device compilation is unavailable locally; the existing unchanged CI build and the Pixel checklist remain required. No claim of native end-to-end verification.
