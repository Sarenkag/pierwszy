// Reactive „Zrobione → Vantify” (Grzegorz 13/11/2026): rubryki Vantify przy zadaniu Reactive (app/www/reactive-vantify.js)
// i numer zlecenia Vantify w worksheet (reactive-core.js report()).
const test = require('node:test'), assert = require('node:assert/strict');
const V = require('../www/reactive-vantify.js'), C = require('../www/reactive-core.js');
const profile = { first: 'Greg', last: 'Sarna', formSignature: '' };
const job = over => ({ title: 'Repair light fixture on book shelf', note: 'Light fitting on the book shelf not working.', afterNote: 'Loose connection re-terminated, fitting tested', completedAt: '2026-11-13T15:00:00', building: 'Tower A', level: '49', requestedBy: 'self', status: 'open', beforeMediaIds: ['b'], afterMediaIds: ['a'], vantify: { ...V.defaults(), jobGroup: 'Lighting' }, ...over });

test('domyślne rubryki = ręczne założenie zlecenia 13/11/2026', () => {
  const d = V.defaults();
  assert.equal(d.serviceProvider, 'HR Facilities Limited t/a Smart Managed Solutions');
  assert.equal(d.priority, 'P5 - Within 5 Days');
  assert.equal(d.relationship, 'Service Provider');
  assert.equal(d.statutory, false); assert.equal(d.documentRequired, ''); assert.equal(d.siteContactAvailable, true); assert.equal(d.jobNo, '');
  assert.ok(!('summary' in d) && !('description' in d), 'Summary/Description bez osobnych pól');
});

test('Summary = nazwa zadania, Description = dopisek przed, Update = dopisek po + data (jedno źródło z worksheetem)', () => {
  const d = job(), rows = V.rubrics(d, profile), get = k => rows.find(r => r[1] === k)[2];
  assert.equal(get('Summary'), d.title); assert.equal(get('Description'), d.note);
  assert.equal(get('Update'), 'Loose connection re-terminated, fitting tested.\nWork completed on 13/11/2026.');
  assert.match(C.details(d), /Work carried out: Loose connection re-terminated/, 'dopisek po w worksheet');
  assert.equal(get('Operative'), 'Greg Sarna'); assert.equal(get('Is Statutory Type?'), 'No'); assert.equal(get('Document Required'), '');
  assert.deepEqual(rows.slice(0, 15).map(r => r[1]), ['I am the Site Contact', 'Relationship to the property', 'Site contact available', 'Summary', 'Description', 'Location', 'Is Statutory Type?', 'Document Required', 'Service Provider', 'Operative', 'Job Group', 'Asset', 'Priority', 'File', 'PO Number']);
});

test('braki: oba dopiski, Job Group, Priority, zdjęcie przed i po', () => {
  assert.deepEqual(V.missing(job()), []);
  const m = V.missing(job({ beforeMediaIds: [], afterMediaIds: [], vantify: { ...V.defaults(), priority: '' } })).map(x => x[1]);
  assert.deepEqual(m, ['Job Group', 'Priority', 'photo before', 'photo after']);
  assert.deepEqual(V.missing(job({ title: '', note: '', afterNote: ' ' })).map(x => x[1]), ['job name (Summary)', 'note before (Description)', 'note after (Update)']);
  assert.deepEqual(V.missing(job({ title: 'x'.repeat(256) })).map(x => x[1]), ['shorter job name (Summary up to 255 characters)']);
});

test('kontrola: numer z cyframi, stałe rubryki niezmienione', () => {
  assert.doesNotThrow(() => V.validate(job({ vantify: { ...V.defaults(), jobNo: '3051375' } })));
  assert.throws(() => V.validate(job({ vantify: { ...V.defaults(), jobNo: '30A' } })), /VANTIFY_JOB_NO/);
  assert.throws(() => V.validate(job({ vantify: { ...V.defaults(), statutory: true } })), /VANTIFY_FIELDS/);
  assert.throws(() => V.validate(job({ vantify: { ...V.defaults(), serviceProvider: 'Other' } })), /VANTIFY_FIELDS/);
  assert.throws(() => V.validate(job({ vantify: null })), /VANTIFY_FIELDS/);
});

test('listy tylko z zapisu odczytu Vantify; bez zapisu puste', () => {
  const mem = v => ({ getItem: () => v });
  assert.deepEqual(V.lists(mem(null)), { locations: [], jobGroups: [], priorities: [], at: '' });
  assert.deepEqual(V.lists(mem('{bad')).jobGroups, []);
  const l = V.lists(mem(JSON.stringify({ at: 't', locations: [{ name: 'Roof' }], jobGroups: ['Lighting', ''], priorities: [{ name: 'P5 - Within 5 Days' }] })));
  assert.deepEqual(l, { locations: ['Roof'], jobGroups: ['Lighting'], priorities: ['P5 - Within 5 Days'], at: 't' });
});

test('worksheet: numer zlecenia Vantify na początku treści, bez numeru bez zmian', () => {
  const d = job({ vantify: { ...V.defaults(), jobNo: '3051375' } });
  assert.match(C.report(d, profile).details, /^Vantify Job No\.: 3051375\n/);
  assert.doesNotMatch(C.report(job(), profile).details, /Vantify/);
  assert.doesNotMatch(C.details(d), /Vantify Job No/, 'Description do Vantify bez numeru');
});
