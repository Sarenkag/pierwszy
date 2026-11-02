# Generuje app/www/vantify-plan.js z eksportu Job z Vantify (CSV). Uruchom z katalogu repo:
#   python3 app/scripts/vantify-plan.py job.csv app/www/vantify-plan.js
# Bierze tylko zlecenia Planned: numer, termin (completeBy), częstotliwość. Bez danych osobowych.
import csv,json,subprocess,re,sys
rows=[x for x in csv.DictReader(open(sys.argv[1],encoding='utf-8-sig')) if x['jobType']=='Planned']
tasks=json.loads(subprocess.check_output(['node','-e','global.window={};global.localStorage={getItem:()=>null,setItem(){}};require("./app/www/ppm.js");console.log(JSON.stringify(window.OEST_PPM.tasks.map(t=>[t.id,t.name])))']))
def norm(s):
    s=s.replace('Pavillion','P').replace('Tower A','TA').replace('Tower B','TB').replace('Roof 1','R1').replace('Roof 2','R2').replace('Operation Testing','Operation Test')
    return re.sub(r'\s+',' ',s).strip().lower()
by={norm(n):i for i,n in tasks}
out={}; miss=set()
for x in rows:
    i=by.get(norm(x['task']))
    if not i: miss.add(x['task']); continue
    out.setdefault(i,[]).append({"no":x['id'],"due":x['completeBy'][:10],"f":x['frequency']})
for v in out.values(): v.sort(key=lambda j:j['due'])
print("missing:",miss,file=sys.stderr)
import hashlib
exp=max(x["createdAt"][:10] for x in rows)
ver=exp+"-"+hashlib.sha1(json.dumps(out,sort_keys=True).encode()).hexdigest()[:8]  # zmiana treści = nowa wersja
js="// Zlecenia PPM z Vantify (eksport Job "+exp+"): numer zlecenia + termin (completeBy). Bez danych osobowych.\n// Aktualizacja: nowy eksport → python3 app/scripts/vantify-plan.py job.csv app/www/vantify-plan.js. Klucz = id karty z ppm.js.\nwindow.OEST_VANTIFY = { exported: \""+ver+"\", jobs: {\n"
js+=",\n".join('  "%s": [%s]'%(k,", ".join('{ no: "%s", due: "%s", f: "%s" }'%(j['no'],j['due'],j['f']) for j in out[k])) for k in sorted(out))
js+="\n} };\n"
open(sys.argv[2],'w').write(js)
