const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const J=x=>JSON.parse(JSON.stringify(x)),w={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../moduly/odczyt/odczyt.js'),'utf8'),{window:w});
test('odczyt: liczby z jednostkami i unikalne linie',()=>{const r=w.OESTOdczyt.parse('EZETROL\nCl2 0.85 mg/l\npH 7.2\n  Cl2 0.85 mg/l \n49.8 Hz  12.5A\nSN 4471-B');assert.deepEqual(J(r.lines),['EZETROL','Cl2 0.85 mg/l','pH 7.2','49.8 Hz 12.5A','SN 4471-B']);assert.deepEqual(J(r.numbers),['0.85 mg/l','pH 7.2','49.8 Hz','12.5A','4471']);});
test('odczyt: pusty tekst',()=>{const r=w.OESTOdczyt.parse('');assert.deepEqual(J(r.lines),[]);assert.deepEqual(J(r.numbers),[]);});
