const test = require('node:test');
const assert = require('node:assert');
const W = require('../../moduly/wiedza/wiedza.js');

function baza() {
  let t = 0;
  return W.create({ magazyn: W.magazynPamiec(), zegar: () => new Date(Date.UTC(2026, 10, 1, 12, 0, t++)).toISOString() });
}
async function budynekB(w) {
  await w.zapisz({ kod: 'B', typ: 'budynek', nazwa: 'Building B' });
  await w.zapisz({ kod: 'B-UG', typ: 'pietro', nazwa: 'Upper Ground', miejsce: 'B' });
  await w.zapisz({ kod: 'B-UG-SPA-PLANT', typ: 'pomieszczenie', nazwa: 'Plant room SPA', miejsce: 'B-UG' });
}

test('miejsce jest obowiązkowe i musi istnieć', async () => {
  const w = baza();
  await budynekB(w);
  await assert.rejects(w.zapisz({ kod: 'S2-UV', typ: 'urzadzenie', nazwa: 'UV NEO 12' }), /WIEDZA_MIEJSCE_WYMAGANE/);
  await assert.rejects(w.zapisz({ kod: 'S2-UV', typ: 'urzadzenie', nazwa: 'UV', miejsce: 'B-XX' }), /WIEDZA_BRAK_MIEJSCA/);
  await assert.rejects(w.zapisz({ kod: 'X', typ: 'robot', nazwa: 'x', miejsce: 'B' }), /WIEDZA_TYP/);
  const o = await w.zapisz({ kod: 's2-uv', typ: 'urzadzenie', nazwa: 'UV NEO 12', miejsce: 'b-ug-spa-plant' });
  assert.strictEqual(o.kod, 'S2-UV');
  assert.strictEqual(o.status, 'propozycja');
});

test('brak pętli w miejscach', async () => {
  const w = baza();
  await budynekB(w);
  await assert.rejects(w.zapisz({ kod: 'B-UG', typ: 'pietro', nazwa: 'UG', miejsce: 'B-UG-SPA-PLANT' }), /WIEDZA_PETLA/);
});

test('adres, zawartość miejsca, wyszukiwanie bez polskich znaków', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'S1-P1', typ: 'urzadzenie', nazwa: 'Pompa obiegowa spa', miejsce: 'B-UG-SPA-PLANT', notatka: 'Astral' });
  await w.zapisz({ kod: 'L-1', typ: 'oprawa', nazwa: 'Żarówka LED', miejsce: 'B-UG' });
  const p = await w.pobierz('S1-P1');
  assert.deepStrictEqual(p.adres, ['Building B', 'Upper Ground', 'Plant room SPA']);
  assert.deepStrictEqual((await w.lista({ miejsce: 'B-UG' })).map(o => o.kod), ['B-UG-SPA-PLANT', 'L-1', 'S1-P1']);
  assert.deepStrictEqual((await w.szukaj('pompa SPA')).map(o => o.kod), ['S1-P1']);
  assert.deepStrictEqual((await w.szukaj('zarowka')).map(o => o.kod), ['L-1']);
  assert.deepStrictEqual((await w.szukaj('upper ground plant')).map(o => o.kod).sort(), ['B-UG-SPA-PLANT', 'S1-P1']);
});

test('powiązania i łańcuch zasilania wstecz (Power trace)', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'B-L10', typ: 'pietro', nazwa: 'Level 10', miejsce: 'B' });
  await w.zapisz({ kod: 'B-L10-KOR', typ: 'pomieszczenie', nazwa: 'Korytarz', miejsce: 'B-L10' });
  await w.zapisz({ kod: 'MSDB-TB-10', typ: 'rozdzielnica', nazwa: 'MSDB', miejsce: 'B-L10' });
  await w.zapisz({ kod: 'LL-10', typ: 'rozdzielnica', nazwa: 'Landlord DB', miejsce: 'B-L10' });
  await w.zapisz({ kod: 'LL-10-L7', typ: 'obwod', nazwa: 'L7 oświetlenie korytarza', miejsce: 'B-L10', pola: { zabezpieczenie: 'B10' } });
  await w.powiaz('MSDB-TB-10', 'zasila', 'LL-10');
  await w.powiaz('LL-10', 'zasila', 'LL-10-L7');
  await w.powiaz('LL-10-L7', 'zasila', 'B-L10-KOR');
  await assert.rejects(w.powiaz('LL-10', 'zasila', 'LL-10-L7'), /WIEDZA_POWIAZANIE_JEST/);
  await assert.rejects(w.powiaz('LL-10', 'lubi', 'B'), /WIEDZA_RELACJA/);
  await assert.rejects(w.powiaz('LL-10', 'zasila', 'NIE-MA'), /WIEDZA_BRAK_OBIEKTU/);
  const droga = await w.lancuch('B-L10-KOR', 'zasila', 'wstecz');
  assert.deepStrictEqual(droga.map(x => [x.kod, x.glebokosc]), [['LL-10-L7', 1], ['LL-10', 2], ['MSDB-TB-10', 3]]);
  assert.deepStrictEqual((await w.lancuch('LL-10', 'zasila')).map(x => x.kod), ['LL-10-L7', 'B-L10-KOR']);
});

test('usuwanie: nie usunie miejsca z zawartością, czyści powiązania', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'KL-RISER', typ: 'klucz', nazwa: 'Riser', miejsce: 'B-UG' });
  await w.powiaz('KL-RISER', 'otwiera', 'B-UG-SPA-PLANT');
  await assert.rejects(w.usun('B-UG'), /WIEDZA_MA_ZAWARTOSC/);
  assert.strictEqual(await w.usun('B-UG-SPA-PLANT'), true);
  assert.deepStrictEqual((await w.pobierz('KL-RISER')).powiazania, []);
});

test('punkt na planie w procentach, plan musi istnieć', async () => {
  const w = baza();
  await budynekB(w);
  await assert.rejects(w.zapisz({ kod: 'D1', typ: 'drzwi', nazwa: 'Drzwi', miejsce: 'B-UG', punkt: { plan: 'B-UG-PLAN', x: 10, y: 10 } }), /WIEDZA_BRAK_PLANU/);
  await w.zapisz({ kod: 'B-UG-PLAN', typ: 'plan', nazwa: 'Plan UG', miejsce: 'B-UG' });
  await assert.rejects(w.zapisz({ kod: 'D1', typ: 'drzwi', nazwa: 'Drzwi', miejsce: 'B-UG', punkt: { plan: 'B-UG-PLAN', x: 120, y: 10 } }), /WIEDZA_PUNKT/);
  const d = await w.zapisz({ kod: 'D1', typ: 'drzwi', nazwa: 'Drzwi', miejsce: 'B-UG', punkt: { plan: 'b-ug-plan', x: 33.333, y: 50 } });
  assert.deepStrictEqual(d.punkt, { plan: 'B-UG-PLAN', x: 33.3, y: 50 });
});

test('sprawdz pilnuje propozycji, zdjęć i duplikatów; zatwierdzanie', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'K1', typ: 'kran', nazwa: 'Kran', miejsce: 'B-UG', zdjecia: ['https://drive/x'], status: 'zatwierdzone' });
  await w.zapisz({ kod: 'K2', typ: 'kran', nazwa: 'kran', miejsce: 'B-UG' });
  const r = (await w.sprawdz()).filter(p => p.kod === 'K2').map(p => p.rodzaj).sort();
  assert.deepStrictEqual(r, ['bez_zdjecia', 'do_zatwierdzenia', 'duplikat']);
  await w.zatwierdz('K2');
  assert.strictEqual((await w.pobierz('K2')).status, 'zatwierdzone');
});

test('eksport/import JSON: nowsze wygrywa, kolejność rodziców nie ma znaczenia', async () => {
  const a = baza();
  await budynekB(a);
  await a.zapisz({ kod: 'S1-P1', typ: 'urzadzenie', nazwa: 'Pompa', miejsce: 'B-UG-SPA-PLANT' });
  await a.powiaz('B-UG-SPA-PLANT', 'zwiazany', 'S1-P1');
  const json = await a.eksportJSON();
  const dane = JSON.parse(json);
  // odwrócona kolejność: dziecko przed rodzicem
  dane.obiekty = Object.fromEntries(Object.entries(dane.obiekty).reverse());
  const b = baza();
  const wynik = await b.importJSON(JSON.stringify(dane));
  assert.strictEqual(wynik.dodane, 4);
  assert.deepStrictEqual(wynik.pominiete, []);
  assert.strictEqual((await b.pobierz('S1-P1')).powiazania.length, 1);
  const drugi = await b.importJSON(json);
  assert.strictEqual(drugi.dodane + drugi.zmienione, 0);
  await assert.rejects(b.importJSON('{"x":1}'), /WIEDZA_IMPORT_FORMAT/);
});

test('arkusz i CSV jak w rejestrze Google', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'S2-UV', typ: 'urzadzenie', nazwa: 'UV, NEO "12"', miejsce: 'B-UG-SPA-PLANT' });
  const t = await w.arkusz();
  assert.strictEqual(t.Obiekty[0][0], 'Kod');
  const uv = t.Obiekty.find(r => r[0] === 'S2-UV');
  assert.strictEqual(uv[4], 'Building B → Upper Ground → Plant room SPA');
  const c = await w.csv();
  assert.ok(c.obiekty.includes('"UV, NEO ""12"""'));
});

test('zapisy idą po kolei (dwa szybkie zapisy się nie gubią)', async () => {
  const w = baza();
  await budynekB(w);
  await Promise.all([1, 2, 3, 4, 5].map(i => w.zapisz({ kod: 'G' + i, typ: 'gniazdko', nazwa: 'Gniazdko ' + i, miejsce: 'B-UG' })));
  assert.strictEqual((await w.lista({ typ: 'gniazdko' })).length, 5);
});

test('dwie instancje na jednym magazynie się nie nadpisują', async () => {
  const m = W.magazynPamiec();
  const a = W.create({ magazyn: m }), b = W.create({ magazyn: m });
  await a.zapisz({ kod: 'B', typ: 'budynek', nazwa: 'Building B' });
  await Promise.all([a.zapisz({ kod: 'X1', typ: 'kran', nazwa: 'Kran 1', miejsce: 'B' }), b.zapisz({ kod: 'X2', typ: 'kran', nazwa: 'Kran 2', miejsce: 'B' })]);
  assert.deepStrictEqual((await a.lista({ typ: 'kran' })).map(o => o.kod), ['X1', 'X2']);
});

test('łańcuch: zbiegające się gałęzie dają obiekt raz, na najkrótszej głębokości', async () => {
  const w = baza();
  await w.zapisz({ kod: 'B', typ: 'budynek', nazwa: 'B' });
  for (const k of ['A', 'C', 'D', 'E']) await w.zapisz({ kod: k, typ: 'rozdzielnica', nazwa: k, miejsce: 'B' });
  await w.powiaz('A', 'zasila', 'C'); await w.powiaz('A', 'zasila', 'D'); await w.powiaz('C', 'zasila', 'E'); await w.powiaz('D', 'zasila', 'E'); await w.powiaz('A', 'zasila', 'E');
  assert.deepStrictEqual((await w.lancuch('A', 'zasila')).map(x => [x.kod, x.glebokosc]), [['C', 1], ['D', 1], ['E', 1]]);
});

test('nie usunie planu, na którym są kropki', async () => {
  const w = baza();
  await budynekB(w);
  await w.zapisz({ kod: 'B-UG-PLAN', typ: 'plan', nazwa: 'Plan UG', miejsce: 'B-UG' });
  await w.zapisz({ kod: 'D1', typ: 'drzwi', nazwa: 'Drzwi', miejsce: 'B-UG', punkt: { plan: 'B-UG-PLAN', x: 1, y: 1 } });
  await assert.rejects(w.usun('B-UG-PLAN'), /WIEDZA_PLAN_UZYWANY/);
});

test('import przestawiający drzewo (chwilowa pętla) kończy się poprawnie', async () => {
  const stary = baza();
  await stary.zapisz({ kod: 'B', typ: 'budynek', nazwa: 'B' });
  await stary.zapisz({ kod: 'A', typ: 'pomieszczenie', nazwa: 'A', miejsce: 'B' });
  await stary.zapisz({ kod: 'C', typ: 'pomieszczenie', nazwa: 'C', miejsce: 'A' });
  const nowy = baza();
  await nowy.importJSON(await stary.eksportJSON());
  await new Promise(r => setTimeout(r, 5));
  const n = W.create({ magazyn: W.magazynPamiec(JSON.parse(await nowy.eksportJSON())), zegar: () => '2027-01-01T00:00:00.000Z' });
  await n.zapisz({ kod: 'C', typ: 'pomieszczenie', nazwa: 'C', miejsce: 'B' });
  await n.zapisz({ kod: 'A', typ: 'pomieszczenie', nazwa: 'A', miejsce: 'C' });
  const dane = JSON.parse(await n.eksportJSON());
  dane.obiekty = { A: dane.obiekty.A, C: dane.obiekty.C, B: dane.obiekty.B }; // A przed C
  const r = await stary.importJSON(JSON.stringify(dane));
  assert.deepStrictEqual(r.pominiete, []);
  assert.deepStrictEqual((await stary.pobierz('A')).adres, ['B', 'C']);
});
