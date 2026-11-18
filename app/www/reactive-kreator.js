/* i18n-ok-file: nazwy pozycji po angielsku (do Vantify i Job Sheet), etykiety PL obok w danych.
   Kreator opisu zlecenia Reactive (Grzegorz 18/11/2026 „Tak, ruszaj”, PROD-039): TYP pracy → CO (grupa → pozycje, kilka naraz)
   → NA CZYM → GDZIE; apka składa po angielsku Summary, Description (Open Vantify) i opis Job Sheet (3 akapity).
   13 zdań do najczęstszych robót zatwierdził Grzegorz 18/11/2026 17:02 („Jest ok”) – nie zmieniać bez jego zgody.
   Reszta zdań z szablonu typu pracy. Ciężkie: tylko „(approx. 60–100 kg)” / „(approx. over 100 kg)”; nigdy „moved alone”
   ani sprzętu (przepisy UK manual handling). Moduł czysty (bez DOM); ekran kreatora korzysta z niego, testy też. */
(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.OESTKreator = api; })(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const TYPES = ['REPAIR', 'FIX', 'HANG', 'TRANSPORT', 'CLEAN', 'ASSEMBLY', 'REPLACE', 'INSTALL', 'ADJUST', 'UNBLOCK', 'INSPECT', 'RESET', 'REMOVE', 'PAINT', 'MOVE', 'LEAK'];
  const TYPE_PL = { REPAIR: 'Naprawa', FIX: 'Mocowanie', HANG: 'Powieszenie', TRANSPORT: 'Transport', CLEAN: 'Czyszczenie', ASSEMBLY: 'Składanie', REPLACE: 'Wymiana', INSTALL: 'Montaż', ADJUST: 'Regulacja', UNBLOCK: 'Odetkanie', INSPECT: 'Sprawdzenie', RESET: 'Reset', REMOVE: 'Demontaż', PAINT: 'Malowanie', MOVE: 'Przeniesienie', LEAK: 'Przeciek' };
  /* czasownik do Summary („Hang coat hooks – …”) */
  const VERB = { REPAIR: 'Repair', FIX: 'Fix', HANG: 'Hang', TRANSPORT: 'Transport', CLEAN: 'Clean', ASSEMBLY: 'Assemble', REPLACE: 'Replace', INSTALL: 'Install', ADJUST: 'Adjust', UNBLOCK: 'Unblock', INSPECT: 'Inspect', RESET: 'Reset', REMOVE: 'Remove', PAINT: 'Paint', MOVE: 'Move', LEAK: 'Repair leak –' };
  /* zdanie z szablonu typu: {i} = pozycje, {I} = pozycje wielką literą, {on} = „ on the door” */
  const TEMPLATE = {
    REPAIR: '{I} repaired, checked and working correctly.',
    FIX: '{I} fixed{on} and checked secure.',
    HANG: '{I} hung{on}, level and checked secure.',
    TRANSPORT: '{I} transported to the requested location.',
    CLEAN: '{I} cleaned.',
    ASSEMBLY: "{I} assembled per manufacturer's instructions and positioned as requested.",
    REPLACE: 'Faulty {i} replaced, tested and working correctly.',
    INSTALL: '{I} installed{on} with suitable fixings and checked secure.',
    ADJUST: '{I} adjusted and working correctly.',
    UNBLOCK: '{I} unblocked, draining freely.',
    INSPECT: '{I} inspected, no further issues found.',
    RESET: '{I} reset and working correctly.',
    REMOVE: '{I} removed{on} and area made good.',
    PAINT: '{I} painted.',
    MOVE: '{I} moved to the requested location.',
    LEAK: 'Source of leak at the {i} identified and repaired, checked, no further leaks.'
  };
  /* 13 zdań zatwierdzonych przez Grzegorza 18/11/2026 (klucz: TYP:pozycja; '*' = dowolna pozycja tego typu) */
  const FIXED = {
    'HANG:coat hooks': 'Coat hooks fixed to the door, evenly spaced and checked secure.',
    'HANG:LED strip': 'LED strip refitted and secured, tested and working correctly.',
    'INSTALL:wall box': 'Wall cabinet installed with suitable fixings, levelled and checked secure.',
    'INSTALL:wall cabinet': 'Wall cabinet installed with suitable fixings, levelled and checked secure.',
    'ASSEMBLY:cabinet': "Cabinet assembled per manufacturer's instructions and positioned as requested.",
    'REPAIR:parcel trolley': 'Parcel trolley repaired, wheels and frame checked, fit for use.',
    'UNBLOCK:toilet': 'Toilet blockage cleared, flushed several times, draining correctly.',
    'UNBLOCK:sink': 'Sink waste cleared, water draining freely, no leaks.',
    'LEAK:*': 'Source of leak identified and repaired, checked, no further leaks.',
    'ADJUST:maglock': 'Maglock checked and realigned, door locking and releasing correctly.',
    'REPAIR:maglock': 'Maglock checked and realigned, door locking and releasing correctly.',
    'ADJUST:closer': 'Door closer adjusted, door closing and latching correctly.',
    'ADJUST:self-closing door': 'Door closer adjusted, door closing and latching correctly.',
    'REPLACE:bulb': 'Faulty bulb replaced, light tested and working.',
    'REPLACE:smart lock battery': 'Smart door lock batteries replaced, lock tested with fob and working correctly.',
    'MOVE:heavy item': 'Heavy item {w} moved to the requested location.',
    'TRANSPORT:heavy item': 'Heavy item {w} moved to the requested location.'
  };
  /* gotowe zdanie z konkretną powierzchnią – tylko gdy wybrana ta sama albo żadna (przegląd Codex #147) */
  const FIXED_ON = { 'HANG:coat hooks': 'door' };
  const WEIGHT = { heavy: '(approx. 60–100 kg)', veryHeavy: '(approx. over 100 kg)' };
  const it = (en, pl) => ({ en, pl });
  /* grupy „Co” – najczęstsze roboty Grzegorza na początku grup (potem kolejność z nauki) */
  const GROUPS = [
    { id: 'doors', en: 'Doors', pl: 'Drzwi', kind: 'doors', items: [it('maglock', 'zamek magnetyczny'), it('closer', 'samozamykacz'), it('self-closing door', 'drzwi samozamykające'), it('smart lock battery', 'bateria w klamce na fob'), it('handle', 'klamka'), it('lock', 'zamek'), it('cylinder', 'wkładka'), it('hinge', 'zawias'), it('door stop', 'odbojnik'), it('kick plate', 'płyta ochronna'), it('seal', 'uszczelka'), it('exit button', 'przycisk wyjścia'), it('access reader', 'czytnik dostępu'), it('smart lock (fob)', 'klamka na fob')] },
    { id: 'furniture', en: 'Furniture', pl: 'Meble', kind: 'general', items: [it('coat hooks', 'haczyki na ubrania'), it('wall cabinet', 'szafka wisząca'), it('wall box', 'skrzynka ścienna'), it('cabinet', 'szafka'), it('desk', 'biurko'), it('chair', 'krzesło'), it('table', 'stół'), it('shelf', 'półka'), it('drawer', 'szuflada'), it('locker', 'szafka osobista'), it('coat stand', 'wieszak stojący'), it('mirror', 'lustro'), it('blinds', 'rolety'), it('curtain rail', 'karnisz'), it('picture', 'obraz')] },
    { id: 'lighting', en: 'Lighting', pl: 'Oświetlenie', kind: 'electrical', items: [it('bulb', 'żarówka'), it('LED strip', 'taśma LED'), it('light fitting', 'oprawa'), it('downlight', 'oczko sufitowe'), it('emergency light', 'oświetlenie awaryjne'), it('exit sign light', 'znak wyjścia'), it('PIR sensor', 'czujnik ruchu'), it('light switch', 'włącznik światła')] },
    { id: 'electrical', en: 'Electrical', pl: 'Elektryka', kind: 'electrical', items: [it('socket', 'gniazdko'), it('switch', 'włącznik'), it('fused spur', 'wyłącznik z bezpiecznikiem'), it('extension lead', 'przedłużacz'), it('cable', 'kabel'), it('plug', 'wtyczka'), it('isolator', 'izolator'), it('timer', 'programator'), it('electrical wall box', 'puszka elektryczna')] },
    { id: 'plumbing', en: 'Plumbing', pl: 'Hydraulika', kind: 'plumbing', items: [it('toilet', 'toaleta'), it('sink', 'zlew'), it('tap', 'kran'), it('mixer', 'bateria'), it('cistern', 'spłuczka'), it('flush', 'przycisk spłuczki'), it('urinal', 'pisuar'), it('basin', 'umywalka'), it('drain', 'odpływ'), it('shower head', 'słuchawka prysznica'), it('hose', 'wąż'), it('valve', 'zawór'), it('pipe', 'rura')] },
    { id: 'kitchen', en: 'Kitchen', pl: 'Kuchnia', kind: 'general', items: [it('kitchen cupboard', 'szafka kuchenna'), it('worktop', 'blat'), it('kitchen tap', 'kran kuchenny'), it('kitchen sink', 'zlew kuchenny'), it('dishwasher', 'zmywarka'), it('fridge', 'lodówka'), it('microwave', 'mikrofalówka'), it('kettle', 'czajnik')] },
    { id: 'washroom', en: 'Washroom', pl: 'Łazienka', kind: 'general', items: [it('soap dispenser', 'dozownik mydła'), it('paper towel dispenser', 'podajnik ręczników'), it('hand dryer', 'suszarka do rąk'), it('toilet roll holder', 'uchwyt na papier'), it('grab rail', 'poręcz'), it('sanitary bin', 'kosz sanitarny')] },
    { id: 'building', en: 'Walls / Floors / Ceiling', pl: 'Ściany / podłogi / sufit', kind: 'general', items: [it('wall', 'ściana'), it('floor', 'podłoga'), it('ceiling tile', 'płyta sufitowa'), it('skirting', 'listwa przypodłogowa'), it('carpet', 'wykładzina'), it('floor tile', 'płytka podłogowa'), it('wall tile', 'płytka ścienna'), it('silicone seal', 'silikon')] },
    { id: 'signage', en: 'Signage', pl: 'Oznakowanie', kind: 'general', items: [it('sign', 'tabliczka'), it('notice board', 'tablica ogłoszeń'), it('door sign', 'tabliczka na drzwiach')] },
    { id: 'hvac', en: 'HVAC', pl: 'HVAC', kind: 'general', items: [it('fan', 'wentylator'), it('extract fan', 'wyciąg'), it('grille', 'kratka'), it('radiator', 'grzejnik'), it('thermostat', 'termostat'), it('air conditioning unit', 'klimatyzator')] },
    { id: 'fire', en: 'Fire / Safety', pl: 'Ppoż. / BHP', kind: 'general', items: [it('fire door', 'drzwi ppoż.'), it('fire extinguisher', 'gaśnica'), it('call point', 'ręczny ostrzegacz'), it('smoke detector', 'czujka dymu'), it('first aid box', 'apteczka')] },
    { id: 'windows', en: 'Windows', pl: 'Okna', kind: 'general', items: [it('window', 'okno'), it('window handle', 'klamka okienna'), it('window restrictor', 'ogranicznik okna'), it('window blind', 'roleta okienna')] },
    { id: 'equipment', en: 'Equipment', pl: 'Sprzęt', kind: 'general', items: [it('parcel trolley', 'wózek na paczki'), it('cage', 'klatka'), it('ladder', 'drabina'), it('bin', 'kosz')] },
    { id: 'heavy', en: 'Heavy items', pl: 'Ciężkie', kind: 'heavy', items: [it('heavy item', 'ciężki przedmiot'), it('stone block', 'blok kamienny'), it('large plant pot', 'duża donica'), it('planter', 'donica'), it('heavy furniture', 'ciężki mebel')] },
    { id: 'other', en: 'Other / Moves', pl: 'Inne / przeprowadzki', kind: 'general', items: [it('boxes', 'kartony'), it('furniture', 'meble'), it('item', 'przedmiot')] }
  ];
  const SURFACES = [it('door', 'drzwi'), it('wall', 'ściana'), it('floor', 'podłoga'), it('ceiling', 'sufit'), it('window', 'okno'), it('cabinet', 'szafka')];
  /* zakończenie Job Sheet (akapit 3) + dodatek wg rodzaju grupy */
  const CLOSING = 'Work carried out in a safe manner, in line with health and safety procedures. Area left clean and tidy.';
  const CLOSING_ADD = { heavy: 'Manual handling procedures followed.', electrical: 'Tested and working correctly.', plumbing: 'Checked for leaks, no further issues.' };

  /* grupa pozycji; własne pozycje („＋ Dodaj”) niosą swoją grupę w wyborach (sel.groups), np. własny ciężki przedmiot */
  const groupOf = (name, own) => GROUPS.find(g => g.items.some(i => i.en === name)) || (own && own[name] ? GROUPS.find(g => g.id === own[name]) || null : null);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  function list(a) { a = a.filter(Boolean); return a.length < 2 ? a[0] || '' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  /* jedno zdanie dla jednej pozycji (zatwierdzone albo z szablonu) */
  function sentence(type, item, o) {
    o = o || {}; const w = o.weight && WEIGHT[o.weight] ? WEIGHT[o.weight] : '';
    const key = type + ':' + item, on = FIXED_ON[key];
    let s = (on && o.on && o.on !== on) ? '' : FIXED[key] || FIXED[type + ':*'] || '';
    if (s) return s.replace('{w}', w).replace(/\s+/g, ' ').replace(' .', '.');
    const name = item + (w && (groupOf(item, o.groups) || {}).kind === 'heavy' ? ' ' + w : '');
    return (TEMPLATE[type] || '{I} done.').replace('{i}', name).replace('{I}', cap(name)).replace('{on}', o.on ? ' on the ' + o.on : '');
  }
  /* wybory → teksty po angielsku. sel = {type, items:[en], on, weight:'heavy'|'veryHeavy', where:{building, level, flat, room}} */
  function where(w) { w = w || {}; return [w.flat ? 'Flat ' + w.flat : '', w.room || '', w.level ? (/^\d/.test(w.level) ? 'Level ' + w.level : w.level) : '', w.building || ''].filter(Boolean).join(', '); }
  /* max długość: nazwa zadania (limit 300) i Summary w Vantify (pole 250) – przy wielu pozycjach „… and N more”, pełna lista zostaje w opisie (przegląd Codex #147) */
  const MAX = 200;
  function summary(sel, max) {
    const items = (sel.items || []).slice(), verb = VERB[sel.type] || cap(String(sel.type || '').toLowerCase()), lim = max || MAX;
    const w = sel.weight && WEIGHT[sel.weight] && items.some(i => (groupOf(i, sel.groups) || {}).kind === 'heavy') ? ' ' + WEIGHT[sel.weight] : '';
    const place = where(sel.where), build = n => (verb + ' ' + (n < items.length ? items.slice(0, n).join(', ') + ' and ' + (items.length - n) + ' more' : list(items)) + w + (sel.on ? ' on ' + sel.on : '')).replace(/\s+/g, ' ').trim() + (place ? ' – ' + place : '');
    let n = items.length, out = build(n);
    while (out.length > lim && n > 1) out = build(--n);
    return out.length > lim ? out.slice(0, lim - 1).trimEnd() + '…' : out;
  }
  function description(sel) {
    const t = sel.type, items = sel.items || [];
    if (!t || !items.length) return '';
    const seen = new Set(), out = [];
    for (const i of items) { const s = sentence(t, i, sel); if (!seen.has(s)) { seen.add(s); out.push(s); } }
    return out.join(' ');
  }
  /* opis przy zakładaniu (Open Vantify): co trzeba zrobić, bez „zrobione” */
  function request(sel) { const s = summary(sel, Infinity); /* pełna lista pozycji – skraca się tylko Summary (przegląd Codex #147) */ return s ? s.replace(/ – /, ' at ').replace(/^./, c => c.toUpperCase()) + '.' : ''; }
  /* unfinished: naprawa tymczasowa / firma – bez dodatków „tested and working” (przegląd Codex #147) */
  function closing(sel, on, unfinished) {
    if (on === false) return '';
    if (unfinished) return CLOSING;
    const kinds = new Set((sel.items || []).map(i => (groupOf(i, sel.groups) || {}).kind));
    if (sel.weight) kinds.add('heavy');
    if (sel.type === 'LEAK' || sel.type === 'UNBLOCK') kinds.add('plumbing');
    return [CLOSING, ...['heavy', 'electrical', 'plumbing'].filter(k => kinds.has(k)).map(k => CLOSING_ADD[k])].join(' ');
  }
  /* Job Sheet: 3 akapity – opis z wyborów / własny tekst (pusty = znika) / zakończenie (wyłączalne) */
  function jobSheet(sel, own, closingOn) { return [description(sel), String(own || '').trim(), closing(sel, closingOn)].filter(Boolean); }
  /* nauka: najczęściej wybierane pozycje grupy na górę (licznik w danych użytkownika), dopisane przez niego na końcu grupy */
  function ordered(groupId, stats, added) {
    const g = GROUPS.find(x => x.id === groupId); if (!g) return [];
    const own = ((added || {})[groupId] || []).filter(e => e && e.en && !g.items.some(i => i.en === e.en)).map(e => ({ en: e.en, pl: e.pl || e.en, own: true }));
    const all = g.items.concat(own), n = e => (stats || {})[e.en] || 0;
    return all.map((e, k) => ({ e, k })).sort((a, b) => n(b.e) - n(a.e) || a.k - b.k).map(x => x.e);
  }
  function learn(stats, sel) { const s = { ...(stats || {}) }; for (const i of sel.items || []) s[i] = (s[i] || 0) + 1; return s; }
  /* karta Reactive → wybory kreatora (draft.jobType + draft.kreator = {items, on, weight, closing}); bez pozycji = null */
  function fromDraft(d, room) {
    const k = d && d.kreator; if (!k || !Array.isArray(k.items) || !k.items.length) return null;
    return { type: TYPES.includes(d.jobType) ? d.jobType : 'REPAIR', items: k.items.slice(), groups: { ...(k.groups || {}) }, on: k.on || '', weight: k.weight || '', closing: k.closing !== false, where: { building: d.building || '', level: d.level || '', flat: d.flat || '', room: room === undefined ? d.room || '' : room } };
  }
  const heavy = sel => !!sel && (sel.items || []).some(i => (groupOf(i, sel.groups) || {}).kind === 'heavy');
  return { fromDraft, heavy, TYPES, TYPE_PL, GROUPS, SURFACES, WEIGHT, FIXED, CLOSING, sentence, summary, description, request, closing, jobSheet, ordered, learn, where, groupOf };
});
