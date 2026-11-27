# Środek Job Sheetu Reactive w stylu „grupy stref” (Grzegorz 27/11/2026: „wygląda bardzo elegancko i profesjonalnie”, Job Sheet #3085016).
# Ramka = moduly/wzory/basic.docx (apka wkłada w nią ten środek przy raporcie, OESTWzory.bajty('reactive-basic')).
# Styl (kolory, pasek, ramki, odstęp) TYLKO z app/scripts/flush-basic-wzory.py – tu żadnych własnych funkcji stylu.
# Dane z OESTReactiveReport.uklad(): {#sekcje} = tabela: granatowy pasek {naglowek} WIELKIMI + wiersz na każdy akapit {#akapity}{tekst};
# {#wstep} / {#koniec} = szara ramka: tekst bez nagłówka przed pierwszą sekcją / zdanie końcowe (BHP). Uruchom: python3 app/scripts/reactive-srodek.py   (potrzebne: python-docx)
import importlib.util, os
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.table import WD_TABLE_ALIGNMENT

TU = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("styl", os.path.join(TU, "flush-basic-wzory.py"))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)

def tag(d, s):  # akapit z samym znacznikiem pętli – docxtemplater (paragraphLoop) usuwa go z raportu
    p = d.add_paragraph(); p.paragraph_format.space_after = Pt(0); S.run(p, s, 11); return p._p

def szare(d, add, petla):  # szara ramka akapitów spoza sekcji (pętla {#wstep} przed sekcjami albo {#koniec} na końcu)
    add(tag(d, "{#%s}" % petla)); add(S.spacer())
    t = d.add_table(rows=1, cols=1); S.borders(t, 4, S.LINE); c = t.rows[0].cells[0]; S.shade(c, S.GRAY)
    p = S.par(c); p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4); S.run(p, "{tekst}", 11)
    t.autofit = False; t.columns[0].width = Cm(15.52); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    add(t._tbl); add(tag(d, "{/%s}" % petla))

def build(out):
    d = Document(os.path.join(S.WZORY, "basic.docx")); body = d.element.body; sect = body.find(S.W + "sectPr")
    for ch in list(body):
        if ch is not sect: body.remove(ch)
    for h in sect.findall(S.W + "headerReference") + sect.findall(S.W + "footerReference"): sect.remove(h)
    add = sect.addprevious
    szare(d, add, "wstep")
    add(tag(d, "{#sekcje}"))
    add(S.spacer())
    t = d.add_table(rows=2, cols=1); S.borders(t, 4, S.LINE)
    h = t.rows[0].cells[0]; S.shade(h, S.TEAL)
    p = S.par(h); r = S.run(p, "{naglowek}", 10.5, True, "FFFFFF"); r.font.all_caps = True
    c = t.rows[1].cells[0]; S.run(S.par(c), "{#akapity}", 11)  # akapity jeden pod drugim w komórce (pętla akapitów)
    p = c.add_paragraph(); p.paragraph_format.space_before = Pt(3); p.paragraph_format.space_after = Pt(3); S.run(p, "{tekst}", 11)
    S.run(c.add_paragraph(), "{/akapity}", 11)
    t.autofit = False; t.columns[0].width = Cm(15.52); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    add(t._tbl)
    add(tag(d, "{/sekcje}"))
    szare(d, add, "koniec")
    add(S.spacer())
    d.core_properties.title = "Reactive Job Sheet – basic form middle"
    d.save(out)

if __name__ == "__main__":
    build(os.path.join(S.WZORY, "reactive-srodek.docx")); print("reactive-srodek.docx")
