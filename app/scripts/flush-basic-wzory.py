# Wzory basic form Weekly Flushing (Grzegorz 21/11/2026, wątek „Pokazać nowe układy środka Flushing”, wariant „grupy stref”):
# ramka = moduly/wzory/basic.docx (jedna, apka wkłada w nią środek przy raporcie), ten skrypt robi TYLKO pliki środków: strefy z ppm.js (forms.flush.*.strefy)
# + stałe zdanie {statement}. Wiersz „Overall Condition” należy do środka i w Flushingu go nie ma (reguła ramki 21/11/2026).
# Nawiasy kranu i (numer na liście taps w ppm.js, od 1): {ok i} ☑ zielony, {no i} ☒ czerwony, {na i} N/A szary, {note i} „ – notatka”; {zone k} = „7/7”.
# Uruchom: python3 app/scripts/flush-basic-wzory.py   (potrzebne: node, python-docx)
import json, os, re, subprocess
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
WZORY = os.path.join(ROOT, "moduly", "wzory")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
TEAL, GRAY, LINE = "1F4E5F", "F2F2F2", "B0B7BB"
PLIKI = {"TA": "flush-ta-srodek.docx", "TB": "flush-tb-srodek.docx", "P": "flush-p-srodek.docx", "GEN": "gen-srodek.docx"}  # GEN: Weekly Generator Check (21/11/2026)

def ppm():
    js = "global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.OEST_PPM.forms.flush))"
    return json.loads(subprocess.check_output(["node", "-e", js, os.path.join(ROOT, "app", "www", "ppm.js")]))

def shade(c, col):
    s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), col); c._tc.get_or_add_tcPr().append(s)

def borders(t, sz, color):
    b = OxmlElement("w:tblBorders")
    for e in ["top", "left", "bottom", "right", "insideH", "insideV"]:
        x = OxmlElement("w:" + e); x.set(qn("w:val"), "single"); x.set(qn("w:sz"), str(sz)); x.set(qn("w:color"), color); b.append(x)
    t._tbl.tblPr.append(b)

def run(p, s, size, bold=False, color=None):
    r = p.add_run(s); r.font.size = Pt(size); r.bold = bold; r.font.name = "Calibri"; r._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    if color: r.font.color.rgb = RGBColor.from_string(color)
    return r

def par(c, align=None):
    p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(0); p.paragraph_format.space_before = Pt(1)
    if align is not None: p.alignment = align
    c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    return p

def spacer():
    p = OxmlElement("w:p"); pp = OxmlElement("w:pPr"); sp = OxmlElement("w:spacing")
    sp.set(qn("w:after"), "0"); sp.set(qn("w:line"), "120"); sp.set(qn("w:lineRule"), "exact"); pp.append(sp); p.append(pp); return p

def build(f, out):
    # plik SAMEGO środka (Grzegorz 21/11/2026 17:33): ramki tu nie ma – apka wkłada środek w aktualny basic.docx (OESTWzory.bajty).
    # Dokument startuje z basic.docx tylko po style i stronę; ciało = sam środek, bez nagłówka i stopki.
    d = Document(os.path.join(WZORY, "basic.docx")); body = d.element.body; sect = body.find(W + "sectPr")
    for ch in list(body):
        if ch is not sect: body.remove(ch)
    for h in sect.findall(W + "headerReference") + sect.findall(W + "footerReference"): sect.remove(h)
    class Kom:  # dokłada elementy przed sectPr
        def append(self, el): sect.addprevious(el)
    tc = Kom()
    taps = f["taps"]
    if f.get("podtytul"):  # jedna linia nad grupami (np. który generator) – tak samo w PDF (OESTFlush.rysujStrefy)
        p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(0); run(p, f["podtytul"], 11, True)
        tc.append(p._p)
    for k, (name, lst) in enumerate(f["strefy"], 1):
        tc.append(spacer())
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
        tc.append(t._tbl)
    tc.append(spacer())
    t = d.add_table(rows=1, cols=1); borders(t, 4, LINE); c = t.rows[0].cells[0]; shade(c, GRAY)
    p = par(c); p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4); run(p, "{statement}", 11)
    t.autofit = False; t.columns[0].width = Cm(15.52); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    tc.append(t._tbl); tc.append(spacer())
    d.core_properties.title = f["title"]
    d.save(out)

if __name__ == "__main__":
    F = ppm()
    for k, plik in PLIKI.items():
        build(F[k], os.path.join(WZORY, plik)); print(plik)
