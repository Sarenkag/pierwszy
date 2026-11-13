// Zadanie Reactive „Zrobione → Vantify” (Grzegorz 13/11/2026): robota zlecona ustnie i już zrobiona trafia do Vantify
// jako zlecenie Reactive ze zdjęciem przed, zdjęciem po i informacją, co zrobiono. To TEN SAM moduł Reactive
// (szkic, zdjęcia, notatki, worksheet Word/PDF) – tu są tylko rubryki formularza Vantify „Add a new job” i ich kontrola.
// Rubryki 1:1 ze zrzutów formularza Vantify (13/11/2026): Site Contact (I am the Site Contact, Relationship,
// Site contact available) i Job Details (Summary*, Description, Location, Is Statutory Type, Document Required,
// Service Provider, Operative, Job Group*, Asset, Priority*, File, PO Number). Gwiazdka = wymagane w Vantify.
// Listy Location / Job Group / Priority pochodzą wyłącznie z Vantify (zapis w localStorage LOOKUP_KEY po odczycie
// z Vantify); apka nie trzyma własnej kopii list – dopóki ich nie pobrano, rubryka jest polem tekstowym.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.OESTReactiveVantify = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const LOOKUP_KEY = 'oest.vantify.lookup';
  // stałe ustalone z Grzegorzem 13/11/2026 (ręczne założenie zlecenia w Vantify, status Pending Approval)
  const SERVICE_PROVIDER = 'HR Facilities Limited t/a Smart Managed Solutions';
  const RELATIONSHIP = 'Service Provider';
  const PRIORITY = 'P5 - Within 5 Days';
  // Dwa kroki (Grzegorz 13/11/2026, numer zlecenia jest dopiero po założeniu):
  //  1. założenie zlecenia: Summary = nazwa zadania, Description = dopisek PRZED (pole „Opis” zadania), File = zdjęcie przed;
  //  2. od razu Update: dopisek PO (afterNote) + „Work completed on DD/MM/YYYY”, File = zdjęcie po.
  // Worksheet (Word/PDF) zostaje w telefonie; do Vantify trafia dopiero przy Complete (wybór Grzegorza 13/11/2026).
  // Nazwa i dopiski są wpisane raz – te same w Vantify i w worksheet (bez osobnych pól Summary/Description).
  // jobNo = numer zlecenia nadany przez Vantify (Grzegorz 13/11/2026: zapisać przy zadaniu i w worksheet)
  const KEYS = ['jobNo', 'location', 'jobGroup', 'priority', 'asset', 'po'];
  const LIMITS = { jobNo: 20, location: 300, jobGroup: 120, priority: 120, asset: 300, po: 60 };

  function defaults() {
    return { jobNo: '', location: '', jobGroup: '', priority: PRIORITY, asset: '', po: '', statutory: false, documentRequired: '', serviceProvider: SERVICE_PROVIDER, siteContactSelf: true, relationship: RELATIONSHIP, siteContactAvailable: true };
  }
  function lists(store) {
    try {
      const s = store || (typeof localStorage !== 'undefined' ? localStorage : null), v = s ? JSON.parse(s.getItem(LOOKUP_KEY) || 'null') : null;
      const ok = a => Array.isArray(a) ? a.map(x => String(x?.name ?? x ?? '').trim()).filter(Boolean) : [];
      return { locations: ok(v?.locations), jobGroups: ok(v?.jobGroups), priorities: ok(v?.priorities), at: v?.at || '' };
    } catch (e) { return { locations: [], jobGroups: [], priorities: [], at: '' }; }
  }
  const name = profile => [profile?.first, profile?.last].filter(Boolean).join(' ').trim();
    function summary(d) { return String(d?.title || d?.problem || '').trim(); }
  function description(d) { return String(d?.note || '').trim(); }
  function after(d) { return String(d?.afterNote || '').trim(); }
  const ymd = t => t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  const dmy = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s.split('-').reverse().join('/') : '';
  // tekst Update w kroku 2: dopisek po + data wykonania (pole „Data wykonania” = najpóźniejsze zdjęcie po; bez daty – brak)
  function update(d) { const a = after(d); return (a ? a.replace(/[.\s]+$/, '') + '.\n' : '') + 'Work completed on ' + (dmy(d?.doneDate) || '—') + '.'; }
  function missing(d) {
    const v = d?.vantify || {}, m = [];
    if (!summary(d)) m.push(['nazwa zadania (Summary)', 'job name (Summary)']);
    else if (summary(d).length > 255) m.push(['krótsza nazwa zadania (Summary do 255 znaków)', 'shorter job name (Summary up to 255 characters)']);
    if (!description(d)) m.push(['dopisek przed (Description)', 'note before (Description)']);
    if (!after(d)) m.push(['dopisek po (Update)', 'note after (Update)']);
    if (!dmy(d?.doneDate)) m.push(['data wykonania', 'date completed']);
    if (!String(v.jobGroup || '').trim()) m.push(['Job Group', 'Job Group']);
    if (!String(v.priority || '').trim()) m.push(['Priority', 'Priority']);
    if (!(d?.beforeMediaIds || []).length) m.push(['zdjęcie przed', 'photo before']);
    if (!(d?.afterMediaIds || []).length) m.push(['zdjęcie po', 'photo after']);
    return m;
  }
  function validate(d) {
    const v = d?.vantify;
    if (!v || typeof v !== 'object') throw Error('VANTIFY_FIELDS');
    for (const k of KEYS) if (String(v[k] ?? '').length > LIMITS[k]) throw Error('VANTIFY_FIELDS');
    if (d.doneDate && !dmy(d.doneDate)) throw Error('VANTIFY_FIELDS');
    if (String(d.afterNote || '').length > 4000) throw Error('VANTIFY_FIELDS');
    if (v.jobNo && !/^\d{1,20}$/.test(String(v.jobNo).trim())) throw Error('VANTIFY_JOB_NO');
    if (v.statutory !== false || v.documentRequired || v.serviceProvider !== SERVICE_PROVIDER) throw Error('VANTIFY_FIELDS');
    return d;
  }
  // Wszystkie rubryki formularza Vantify w jego kolejności – do podsumowania przed wysłaniem
  function rubrics(d, profile) {
    const v = { ...defaults(), ...(d?.vantify || {}) }, me = name(profile);
    return [
      ['Site Contact', 'I am the Site Contact', v.siteContactSelf ? 'Yes — ' + (me || '—') : 'No'],
      ['Site Contact', 'Relationship to the property', v.relationship],
      ['Site Contact', 'Site contact available', v.siteContactAvailable ? 'Yes' : 'No (Keyholder required)'],
      ['Job Details', 'Summary', summary(d)],
      ['Job Details', 'Description', description(d)],
      ['Job Details', 'Location', v.location],
      ['Job Details', 'Is Statutory Type?', v.statutory ? 'Yes' : 'No'],
      ['Job Details', 'Document Required', v.documentRequired],
      ['Job Details', 'Service Provider', v.serviceProvider],
      ['Job Details', 'Operative', me],
      ['Job Details', 'Job Group', v.jobGroup],
      ['Job Details', 'Asset', v.asset],
      ['Job Details', 'Priority', v.priority],
      ['Job Details', 'File', (d?.beforeMediaIds || []).length + ' before'],
      ['Job Details', 'PO Number', v.po],
      ['Update', 'Update', update(d)],
      ['Update', 'File', (d?.afterMediaIds || []).length + ' after'],
    ];
  }
  return { ymd, dmy, update, after, LOOKUP_KEY, SERVICE_PROVIDER, RELATIONSHIP, PRIORITY, KEYS, LIMITS, defaults, lists, summary, description, missing, validate, rubrics };
});
