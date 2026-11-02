const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const J=x=>JSON.parse(JSON.stringify(x)),w={localStorage:{getItem:()=>null,setItem:()=>{}}};w.window=w;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../moduly/model/model.js'),'utf8'),{window:w});
test('model: brakujące liczby porównywane całymi tokenami',()=>{assert.deepEqual(J(w.OESTModel.missingNumbers('ciśnienie 12 bar, 0,85 mg/l','pressure 120 bar, 0.85 mg/l')),['12']);assert.deepEqual(J(w.OESTModel.missingNumbers('SW-12 3 mm','SW-12, 3 mm')),[]);});
test('model: domyślnie E2B',()=>{assert.equal(w.OESTModel.key(),'E2B');});
