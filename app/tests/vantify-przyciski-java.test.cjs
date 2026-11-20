// Przyciski Vantify (PROD-038), strona Androida: ukryte okno wykonuje jedno zadanie naraz, wzory zapytań tylko w telefonie
// (poza kopią zapasową), okno Vantify w apce uczy się tylko na stronach vantify.com, otwiera wyłącznie dozwolone ekrany
// i podaje Job Sheet do pola Upload przez FileProvider. Test czyta źródła (bez emulatora; kompilację robi CI Androida).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const J = path.join(__dirname, '../android/app/src/main/java/com/oest/inspekcje/');
const P = fs.readFileSync(J + 'VantifyPlugin.java', 'utf8'), A = fs.readFileSync(J + 'VantifyActivity.java', 'utf8');
test('VantifyPlugin.action: jedno zadanie naraz, wzory z telefonu, skrypt akcji przed vantify-sync.js', () => {
  assert.match(P, /@PluginMethod public void action\(PluginCall call\)/);
  assert.match(P, /if \(Sync\.current != null\) \{ call\.reject\("VANTIFY_BUSY"\); return; \}/, 'przycisk nie dołącza do trwającego okna');
  assert.match(P, /if \(action \|\| !m\.equals\(mode\)\) \{ c\.reject\("VANTIFY_BUSY"\)/, 'odczyt listy nie dołącza do zadania przycisku');
  assert.match(P, /action \? "window\.__oestMode='action';" \+ pre \+ asset\("public\/vantify-akcje\.js"\) : ""\) \+ asset\("public\/vantify-sync\.js"\)/);
  assert.match(P, /TIMEOUT_ACTION = 180000/);
});
test('wzory: noBackupFilesDir, zapis atomowy, do JS tylko informacja które są', () => {
  assert.match(P, /new File\(c\.getNoBackupFilesDir\(\), "vantify-wzory\.json"\)/);
  assert.match(P, /getFD\(\)\.sync\(\); \}\s*if \(!tmp\.renameTo\(file\(c\)\)\)/);
  assert.match(P, /o\.put\(k, w\.has\(k\)\)/, 'wzory() oddaje tylko true/false');
});
test('okno Vantify: nauka tylko z vantify.com i trzech rodzajów, dozwolone ekrany startowe, Job Sheet przez FileProvider', () => {
  assert.match(A, /public void wzor\(String kind, String tpl, String id\) \{\s*if \(!vantify\(host\) \|\| kind == null \|\| !kind\.matches\("create\|commence\|complete"\)/);
  assert.match(A, /hash\.matches\("#\/user\/jobs\(\/\[0-9\]\+\/status\|\/add\/\/site\)\?"\)/);
  assert.match(A, /FileProvider\.getUriForFile\(this, getPackageName\(\) \+ "\.fileprovider", sheet\)/);
  assert.match(A, /setOnCancelListener\(x -> \{ if \(pick != null\) \{ pick\.onReceiveValue\(null\); pick = null; \} \}\)/, 'anulowanie zawsze odpowiada stronie');
  assert.match(A, /VantifyWeb\.inject\(web, host, rejestr \+ "\\n" \+ akcje\)/); // jedno miejsce wstrzykiwania, tylko *.vantify.com (S1, #42)
  assert.match(P, /name\.matches\("\[\^\/\\\\\\\\\]\{1,180\}\\\\\.pdf"\)/, 'nazwa Job Sheet bez ścieżek, tylko .pdf');
});
