// Kreator opisu zlecenia Reactive (Grzegorz 18/11/2026 „Tak, ruszaj”): teksty po angielsku z wyborów, 13 zatwierdzonych zdań,
// ciężkie bez „moved alone”/sprzętu, 3 akapity Job Sheet, nauka kolejności pozycji.
const { test } = require('node:test'), assert = require('node:assert/strict'), K = require('../www/reactive-kreator.js');
test('16 typów pracy, każdy z szablonem zdania i etykietą PL', () => {
  assert.deepEqual(K.TYPES, ['REPAIR', 'FIX', 'HANG', 'TRANSPORT', 'CLEAN', 'ASSEMBLY', 'REPLACE', 'INSTALL', 'ADJUST', 'UNBLOCK', 'INSPECT', 'RESET', 'REMOVE', 'PAINT', 'MOVE', 'LEAK']);
  for (const t of K.TYPES) { assert.ok(K.TYPE_PL[t]); const s = K.sentence(t, 'socket'); assert.match(s, /\.$/); assert.doesNotMatch(s, /[{}]/); }
});
test('zatwierdzone zdania Grzegorza (18/11/2026) bez zmian', () => {
  const ok = [['HANG', 'coat hooks', 'Coat hooks fixed to the door, evenly spaced and checked secure.'], ['HANG', 'LED strip', 'LED strip refitted and secured, tested and working correctly.'],
    ['INSTALL', 'wall cabinet', 'Wall cabinet installed with suitable fixings, levelled and checked secure.'], ['ASSEMBLY', 'cabinet', "Cabinet assembled per manufacturer's instructions and positioned as requested."],
    ['REPAIR', 'parcel trolley', 'Parcel trolley repaired, wheels and frame checked, fit for use.'], ['UNBLOCK', 'toilet', 'Toilet blockage cleared, flushed several times, draining correctly.'],
    ['UNBLOCK', 'sink', 'Sink waste cleared, water draining freely, no leaks.'], ['LEAK', 'pipe', 'Source of leak identified and repaired, checked, no further leaks.'],
    ['ADJUST', 'maglock', 'Maglock checked and realigned, door locking and releasing correctly.'], ['ADJUST', 'closer', 'Door closer adjusted, door closing and latching correctly.'],
    ['REPLACE', 'bulb', 'Faulty bulb replaced, light tested and working.'], ['REPLACE', 'smart lock battery', 'Smart door lock batteries replaced, lock tested with fob and working correctly.']];
  for (const [t, i, s] of ok) assert.equal(K.sentence(t, i), s, t + ' ' + i);
  assert.equal(K.sentence('MOVE', 'heavy item', { weight: 'veryHeavy' }), 'Heavy item (approx. over 100 kg) moved to the requested location.');
  assert.equal(K.sentence('MOVE', 'heavy item', { weight: 'heavy' }), 'Heavy item (approx. 60–100 kg) moved to the requested location.');
});
test('ciężkie: nigdy „alone” ani sprzęt (przepisy UK manual handling)', () => {
  for (const g of K.GROUPS) for (const i of g.items) for (const t of K.TYPES) for (const w of ['', 'heavy', 'veryHeavy']) {
    const s = K.description({ type: t, items: [i.en], weight: w }) + ' ' + K.summary({ type: t, items: [i.en], weight: w });
    assert.doesNotMatch(s, /alone|single-handed|by myself|using (a )?trolley|dolly|sack truck/i, s);
  }
});
test('Summary, opis przy zakładaniu i Description z wyborów', () => {
  const sel = { type: 'HANG', items: ['coat hooks'], on: 'door', where: { building: 'Tower B', level: '5', room: 'Office' } };
  assert.equal(K.summary(sel), 'Hang coat hooks on door – Office, Level 5, Tower B');
  assert.equal(K.request(sel), 'Hang coat hooks on door at Office, Level 5, Tower B.');
  assert.equal(K.description(sel), 'Coat hooks fixed to the door, evenly spaced and checked secure.');
  const two = { type: 'REPLACE', items: ['socket', 'switch'], where: { building: 'Tower A', flat: '1203' } };
  assert.equal(K.summary(two), 'Replace socket and switch – Flat 1203, Tower A');
  assert.equal(K.description(two), 'Faulty socket replaced, tested and working correctly. Faulty switch replaced, tested and working correctly.');
  assert.equal(K.description({ type: 'HANG', items: [] }), '');
});
test('Job Sheet: 3 akapity, własny tekst pusty = znika, zakończenie wg rodzaju i wyłączalne', () => {
  const sel = { type: 'REPLACE', items: ['bulb'] };
  assert.deepEqual(K.jobSheet(sel, 'Also cleaned the diffuser.'), ['Faulty bulb replaced, light tested and working.', 'Also cleaned the diffuser.', K.CLOSING + ' Tested and working correctly.']);
  assert.deepEqual(K.jobSheet(sel, '  '), ['Faulty bulb replaced, light tested and working.', K.CLOSING + ' Tested and working correctly.']);
  assert.deepEqual(K.jobSheet(sel, '', false), ['Faulty bulb replaced, light tested and working.']);
  assert.match(K.closing({ type: 'UNBLOCK', items: ['toilet'] }), /Checked for leaks, no further issues\.$/);
  assert.match(K.closing({ type: 'MOVE', items: ['stone block'], weight: 'veryHeavy' }), /Manual handling procedures followed\.$/);
  assert.equal(K.closing({ type: 'HANG', items: ['coat hooks'] }), K.CLOSING);
});
test('nauka: częste na górę, dopisane przez Grzegorza na końcu grupy, bez duplikatów', () => {
  let st = {}; st = K.learn(st, { items: ['door stop'] }); st = K.learn(st, { items: ['door stop', 'hinge'] });
  const o = K.ordered('doors', st, { doors: [{ en: 'letter box', pl: 'skrzynka na listy' }, { en: 'hinge' }] });
  assert.equal(o[0].en, 'door stop'); assert.equal(o[1].en, 'hinge'); assert.equal(o.at(-1).en, 'letter box'); assert.ok(o.at(-1).own);
  assert.equal(o.filter(e => e.en === 'hinge').length, 1);
  const ids = K.GROUPS.flatMap(g => g.items.map(i => i.en)); assert.equal(new Set(ids).size, ids.length, 'pozycje unikalne');
  for (const g of K.GROUPS) for (const i of g.items) assert.ok(i.pl, g.id + ' ' + i.en + ' bez PL');
});
