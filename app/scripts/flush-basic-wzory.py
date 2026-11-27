# Wzory basic form Weekly Flushing (Grzegorz 21/11/2026, wątek „Pokazać nowe układy środka Flushing”, wariant „grupy stref”):
# ramka = moduly/wzory/basic.docx (jedna, apka wkłada w nią środek przy raporcie), ten skrypt robi TYLKO pliki środków: strefy z ppm.js (forms.flush.*.strefy)
# + stałe zdanie {statement}. Wiersz „Overall Condition” należy do środka i w Flushingu go nie ma (reguła ramki 21/11/2026).
# Nawiasy kranu i (numer na liście taps w ppm.js, od 1): {ok i} ☑ zielony, {no i} ☒ czerwony, {na i} N/A szary, {note i} „ – notatka”; {zone k} = „7/7”.
# Uruchom: python3 app/scripts/flush-basic-wzory.py   (potrzebne: node, python-docx)
import json, os, re, subprocess, sys
from docx.shared import Pt, Cm
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wzory_styl import ROOT, WZORY, TEAL, LINE, shade, borders, run, par, spacer, srodek, szara, dol  # styl: tylko app/scripts/wzory_styl.py

PLIKI = {"TA": "flush-ta-srodek.docx", "TB": "flush-tb-srodek.docx", "P": "flush-p-srodek.docx", "GEN": "gen-srodek.docx"}  # GEN: Weekly Generator Check (21/11/2026)

def ppm():
    js = "global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.OEST_PPM.forms.flush))"
    return json.loads(subprocess.check_output(["node", "-e", js, os.path.join(ROOT, "app", "www", "ppm.js")]))

def build(f, out):
    d, dodaj = srodek()  # plik SAMEGO środka (wzory_styl.srodek)
    taps = f["taps"]
    if f.get("podtytul"):  # jedna linia nad grupami (np. który generator) – tak samo w PDF (OESTFlush.rysujStrefy)
        p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(0); run(p, f["podtytul"], 11, True)
        dodaj(p._p)
    for k, (name, lst) in enumerate(f["strefy"], 1):
        dodaj(spacer())
        t = d.add_table(rows=(len(lst) + 1) // 2 + 1, cols=4); borders(t, 4, LINE)
        h = t.rows[0].cells[0].merge(t.rows[0].cells[-1]); shade(h, TEAL)
        run(par(h), name.upper() + "   ·   {zone%d}" % k, 10.5, True, "FFFFFF")
        for j, tap in enumerate(lst):
            i = taps.index(tap) + 1; r, c = divmod(j, 2); cl = t.rows[r + 1].cells
            p = par(cl[c * 2]); run(p, re.sub(f["etykieta"], "", tap) if f.get("etykieta") else tap, 11); run(p, "{note%d}" % i, 9.5, color="595959")
            p = par(cl[c * 2 + 1], WD_ALIGN_PARAGRAPH.CENTER)
            run(p, "{ok%d}" % i, 13, color="1E8A3C"); run(p, "{no%d}" % i, 13, color="C62828"); run(p, "{na%d}" % i, 9.5, True, "595959")
        t.autofit = False
        for k2, col in enumerate(t.columns): col.width = Cm(6.56 if k2 % 2 == 0 else 1.2)  # = szerokość komórki: równy odstęp z lewej i prawej
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        dodaj(t._tbl)
    dodaj(dol(d))  # stałe zdanie zawsze na dole ramki (Grzegorz 27/11/2026 21:45)
    t = szara(d, "{statement}")
    dodaj(t._tbl); dodaj(spacer())
    d.core_properties.title = f["title"]
    d.save(out)

if __name__ == "__main__":
    F = ppm()
    for k, plik in PLIKI.items():
        build(F[k], os.path.join(WZORY, plik)); print(plik)
