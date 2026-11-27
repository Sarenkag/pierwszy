// Bot Vantify (tools/bot-vantify, Grzegorz 26/11/2026 „Tak, buduj bota”): zbudowany plik Apps Script uruchomiony w Node na udawanych
// usługach Google i udawanym Vantify. Odpowiedzi Vantify w kształcie z zapisu „Zbadaj” 18/11/2026 (statusy, _links.commence/complete,
// Commence/Complete 204, POST /files z polityką) i z testu logowania 26/11/2026 (POST /auth → email, token, expiration; Bearer).
// To nie są surowe nagrania – pola nieznane z zapisu (np. typ pliku na liście Files) test sprawdza w obu wariantach.
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm"), path = require("node:path");
const { zbuduj } = require("../../tools/bot-vantify/zbuduj.cjs");
const SITE = "/sites/6324/jobs/", API = "https://savillsuk-api.cafm.vantify.com", HASLO = "tajne-haslo-123", TOKEN = "tok.en.jwt";

// udawany Vantify: zlecenia {nr: {status, files:[...]}}; zapisuje każde zapytanie
function vantify(jobs, o = {}) {
  const calls = [];
  function job(nr) {
    const j = jobs[nr], l = {}; if (!j) return null;
    if (j.status === "acknowledged") l.commence = { href: API + SITE + nr + "/workflow/operation/commence" };
    if (j.status === "acknowledged" || j.status === "commenced") l.complete = { href: API + SITE + nr + "/workflow/operation/complete" };
    l.files = { href: API + SITE + nr + "/files" };
    return { id: Number(nr), status: j.status, is_final_status: j.status === "completed", summary: "Assemble parcel trolley", requiredDocumentTypes: { count: 1, documentTypes: [{ id: 1, _links: { self: { href: "/documenttypes/1" } } }] }, _links: l };
  }
  function http(m, url, opt) {
    calls.push({ m, url, opt });
    if (o.down) return { code: 503, text: "" };
    const u = url.replace(API, ""), body = opt.json;
    if (m === "POST" && u === "/auth") return body.password === HASLO ? { code: 200, text: JSON.stringify({ email: "x@y", token: TOKEN, expiration: 1 }) } : { code: 401, text: "{}" };
    if (url.startsWith("https://storage.googleapis.com/")) return { code: 204, text: "" };
    if (opt.auth !== "Bearer " + TOKEN) return { code: 401, text: "" };
    let r;
    if (m === "GET" && (r = /^\/sites\/6324\/jobs\/(\d+)$/.exec(u))) { const j = job(r[1]); return j ? { code: 200, text: JSON.stringify(j) } : { code: 404, text: '{"message":"Not found"}' }; }
    if (m === "GET" && (r = /^\/sites\/6324\/jobs\/(\d+)\/files$/.exec(u))) return { code: 200, text: JSON.stringify({ files: jobs[r[1]].files || [] }) };
    if (m === "POST" && u === "/files") return { code: 201, text: JSON.stringify({ _links: { file: { href: API + "/files/999" }, remote: { href: "https://storage.googleapis.com/bucket" } }, policy: { key: "k", policy: "p" } }) };
    if (m === "POST" && (r = /^\/sites\/6324\/jobs\/(\d+)\/workflow\/operation\/(commence|complete)$/.exec(u))) {
      if (o.reject === r[2]) return { code: 400, text: JSON.stringify({ errors: { children: { files: { errors: ["This value should not be blank."] } } } }) };
      jobs[r[1]].status = r[2] === "commence" ? "commenced" : "completed"; return { code: 204, text: "" };
    }
    return { code: 500, text: "" };
  }
  return { calls, http, posts: () => calls.filter(c => c.m === "POST" && !/\/auth$/.test(c.url)) };
}
const A = require("../www/vantify-akcje.js");
function env(V, o = {}) {
  const props = o.props || {}, mails = [], logs = [];
  return { mails, logs, props, e: { dry: !!o.dry, now: () => o.now || Date.now(), user: "greg", pass: o.pass || HASLO, props: { get: k => props[k] || null, set: (k, v) => { props[k] = v; } },
    szukaj: () => (o.subjects || []).map(s => ({ subject: s })), stop: nr => !!(o.stop || {})[nr], dysk: nr => (o.dysk || {})[nr] || null, http: V.http, mail: (t, b) => mails.push({ t, b }), log: s => logs.push(s) } };
}
const BOT = (() => { const c = { console }; vm.createContext(c); vm.runInContext(zbuduj(), c); return c; })().BOT;
const ASSIGNED = n => "Your issue has been assigned - " + n;
const SHEET = { title: "JOB SHEET REACTIVE Assemble parcel trolley 27112026 3084999", _links: { file: { href: API + "/files/1" }, documentType: { href: "/documenttypes/1" } } };

test("Job Sheet już w Vantify: Commence + Complete bez nowego pliku, mail o zamknięciu, hasło i token nigdzie", () => {
  const V = vantify({ 3084999: { status: "acknowledged", files: [SHEET] } }), E = env(V, { subjects: [ASSIGNED(3084999)] });
  BOT.run(E.e, A);
  const p = V.posts();
  assert.deepEqual(p.map(c => c.url.replace(API, "")), [SITE + "3084999/workflow/operation/commence", SITE + "3084999/workflow/operation/complete"]);
  assert.deepEqual(Object.keys(p[0].opt.json).sort(), ["_links", "files", "onSiteDate"]);
  assert.ok(Array.isArray(p[1].opt.json.files) && p[1].opt.json.files.length === 0, "Complete bez nowego pliku");
  assert.ok(p[1].opt.json.completionDate && p[1].opt.json.escalationFiles);
  assert.ok(new Date(p[0].opt.json.onSiteDate) < new Date(p[1].opt.json.completionDate) && new Date(p[1].opt.json.completionDate) <= new Date());
  assert.equal(E.mails.length, 1); assert.match(E.mails[0].t, /#3084999 zamknięte/);
  const all = JSON.stringify([E.mails, E.logs, E.props]); assert.ok(!all.includes(HASLO) && !all.includes(TOKEN) && !all.includes("greg"));
  // następny przebieg: zlecenie zrobione – żadnego zapytania do Vantify
  const n = V.calls.length; BOT.run(E.e, A); assert.equal(V.calls.length, n);
});

test("Job Sheet tylko na Dysku: wysyłka PDF i Complete z tym plikiem (Visibility Partnership, typ Job Sheet), bez Commence po Commence", () => {
  const V = vantify({ 3084999: { status: "commenced", files: [] } });
  const pdf = { name: "JOB SHEET REACTIVE Assemble parcel trolley 27112026 3084999.pdf", size: 3, bytes: () => [1, 2, 3] };
  const E = env(V, { subjects: [ASSIGNED(3084999)], dysk: { 3084999: pdf } });
  BOT.run(E.e, A);
  const p = V.posts().map(c => c.url.replace(API, ""));
  assert.deepEqual(p, ["/files", "https://storage.googleapis.com/bucket", SITE + "3084999/workflow/operation/complete"]);
  const f = V.posts()[2].opt.json.files;
  assert.equal(f.length, 1); assert.equal(f[0].title, "JOB SHEET REACTIVE Assemble parcel trolley 27112026 3084999");
  assert.equal(f[0]._links.file.href, API + "/files/999"); assert.equal(f[0]._links.documentType.href, "/documenttypes/1"); assert.equal(f[0].visibility, "partnerships");
  assert.equal(V.posts()[1].opt.form.key, "k"); assert.equal(V.posts()[1].opt.file, pdf);
});

test("Bez Job Sheetu nic nie zamyka; zdjęcie z typem „Job Sheet” albo plik nie-PDF się nie liczy; Vantify najwyżej co godzinę", () => {
  const foto = { title: "After 1", _links: { documentType: { href: "/documenttypes/1" } } }, jpg = { ...SHEET, type: "image/jpeg" }, inny = { ...SHEET, _links: { documentType: { href: "/documenttypes/3" } } };
  const V = vantify({ 3084999: { status: "acknowledged", files: [foto, jpg, inny] } }), t0 = Date.now(), E = env(V, { subjects: [ASSIGNED(3084999)], now: t0 });
  BOT.run(E.e, A);
  assert.equal(V.posts().length, 0); assert.equal(E.mails.length, 0);
  const n = V.calls.length;
  BOT.run(env(V, { subjects: [ASSIGNED(3084999)], now: t0 + 50 * 60e3, props: E.props }).e, A);
  assert.equal(V.calls.length, n, "przed upływem godziny bez zapytań do Vantify");
  BOT.run(env(V, { subjects: [ASSIGNED(3084999)], now: t0 + 61 * 60e3, props: E.props }).e, A);
  assert.ok(V.calls.length > n); assert.equal(V.posts().length, 0);
});

test("Awaria Vantify: jeden mail, odstępy 30 min → 1 h, po powrocie normalnie", () => {
  const jobs = { 3084999: { status: "acknowledged", files: [SHEET] } }, V = vantify(jobs, { down: true }), t0 = Date.now();
  const E = env(V, { subjects: [ASSIGNED(3084999)], now: t0 });
  BOT.run(E.e, A); assert.equal(E.mails.length, 1); assert.match(E.mails[0].t, /nie odpowiada/);
  const n = V.calls.length, run = (dt, V2) => { const e = env(V2 || V, { subjects: [ASSIGNED(3084999)], now: t0 + dt, props: E.props }); BOT.run(e.e, A); return e; };
  assert.equal(run(29 * 60e3).mails.length, 0); assert.equal(V.calls.length, n);
  assert.equal(run(31 * 60e3).mails.length, 0); assert.equal(V.calls.length, n + 1);
  run(31 * 60e3 + 59 * 60e3); assert.equal(V.calls.length, n + 1, "drugi odstęp = 1 h");
  const V2 = vantify(jobs), e = run(31 * 60e3 + 61 * 60e3, V2);
  assert.equal(V2.posts().length, 2); assert.equal(e.mails.length, 1); assert.match(e.mails[0].t, /zamknięte/);
  assert.ok(!JSON.parse(E.props.OEST_BOT_STAN).przerwa);
});

test("Złe hasło: jeden mail o logowaniu, bez hasła w treści; odmowa Complete: mail „zamknij ręcznie” z powodem, bez ponawiania", () => {
  const V = vantify({ 3084999: { status: "acknowledged", files: [SHEET] } }), E = env(V, { subjects: [ASSIGNED(3084999)], pass: "zle" });
  BOT.run(E.e, A); assert.equal(E.mails.length, 1); assert.match(E.mails[0].t, /zalogować/); assert.ok(!JSON.stringify(E.mails).includes("zle"));
  const V2 = vantify({ 3084999: { status: "acknowledged", files: [SHEET] } }, { reject: "complete" }), E2 = env(V2, { subjects: [ASSIGNED(3084999)] });
  BOT.run(E2.e, A);
  assert.equal(E2.mails.length, 1); assert.match(E2.mails[0].t, /zamknij ręcznie/); assert.match(E2.mails[0].b, /should not be blank/); assert.match(E2.mails[0].b, /Commence mogło już przejść/);
  const n = V2.calls.length; BOT.run(E2.e, A); assert.equal(V2.calls.length, n);
});

test("Już zamknięte i „sprawdz” (próba): nic nie wysyła, próba niczego nie zapisuje ani nie wysyła maili", () => {
  const V = vantify({ 3084000: { status: "completed" }, 3084999: { status: "acknowledged", files: [SHEET] } }), E = env(V, { subjects: [ASSIGNED(3084000), ASSIGNED(3084999), "New Job Created 3084998 - One Eastside"], dry: true });
  const raport = BOT.run(E.e, A);
  assert.equal(V.posts().length, 0); assert.equal(E.mails.length, 0); assert.deepEqual(E.props, {});
  assert.ok(raport.some(s => /#3084999 \[próba/.test(s) && /Commence \+ Complete/.test(s)));
  assert.ok(!V.calls.some(c => /3084998/.test(c.url)), "tylko maile „assigned”");
  const E2 = env(V, { subjects: [ASSIGNED(3084000)] }); BOT.run(E2.e, A); assert.equal(V.posts().length, 0); assert.equal(E2.mails.length, 0);
});

test("Plik Apps Script: funkcje do wyboru w edytorze i usługi Google (Gmail, Dysk, UrlFetch) – przebieg na udawanych usługach", () => {
  const V = vantify({ 3084999: { status: "acknowledged", files: [SHEET] } }), props = { VANTIFY_USER: "greg", VANTIFY_PASS: HASLO }, mails = [], logs = [], triggers = [];
  const g = {
    console, Logger: { log: s => logs.push(s) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    GmailApp: { search: q => (assert.match(q, /from:savillsuk\.cafm@vantify\.com/), [{ getFirstMessageSubject: () => ASSIGNED(3084999) }]) },
    DriveApp: { searchFiles: () => ({ hasNext: () => false }) },
    UrlFetchApp: { fetch: (url, o) => { const r = V.http(o.method.toUpperCase(), url, { auth: o.headers.Authorization, json: o.payload ? JSON.parse(o.payload) : undefined }); return { getResponseCode: () => r.code, getContentText: () => r.text }; } },
    MailApp: { sendEmail: (to, t, b) => mails.push({ to, t, b }) }, Session: { getEffectiveUser: () => ({ getEmail: () => "ja@gmail.com" }) },
    ScriptApp: { getProjectTriggers: () => triggers, deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1), newTrigger: h => ({ timeBased: () => ({ everyMinutes: m => ({ create: () => triggers.push({ getHandlerFunction: () => h, m }) }) }) }) },
    Utilities: { newBlob: () => ({}) }
  };
  vm.createContext(g); vm.runInContext(zbuduj(), g);
  g.sprawdz(); assert.equal(V.posts().length, 0); assert.equal(mails.length, 0);
  g.uruchom(); assert.equal(V.posts().length, 2); assert.equal(mails.length, 1); assert.equal(mails[0].to, "ja@gmail.com");
  g.wlacz(); g.wlacz(); assert.equal(triggers.length, 1); assert.equal(triggers[0].m, 10);
  g.wylacz(); assert.equal(triggers.length, 0);
  assert.ok(!JSON.stringify(logs).includes(HASLO) && !JSON.stringify(logs).includes(TOKEN));
});

test("Bot wyłączony na zleceniu w apce (plik „BOT STOP <nr>” na Dysku): ani zapytania do Vantify, ani maila; po włączeniu zamyka", () => {
  const V = vantify({ 3084999: { status: "acknowledged", files: [SHEET] } }), stop = { 3084999: true }, E = env(V, { subjects: [ASSIGNED(3084999)], stop });
  BOT.run(E.e, A);
  assert.equal(V.calls.length, 0); assert.equal(E.mails.length, 0); assert.match(E.logs.join("\n"), /bot wyłączony/);
  delete stop[3084999]; BOT.run(E.e, A);
  assert.match(E.mails[0].t, /#3084999 zamknięte/);
  assert.ok(BOT.stopZDysku("BOT STOP 3084999.txt", "3084999")); assert.ok(!BOT.stopZDysku("BOT STOP 30849990.txt", "3084999")); assert.ok(!BOT.stopZDysku("JOB SHEET 3084999.pdf", "3084999"));
});
