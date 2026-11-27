# Styl środka raportów „grupy stref” (Grzegorz 26/11/2026: „pilnuj tego stylu”, 27/11/2026: „wszystkie inspekcje i inne zadania na ten styl”).
# JEDYNE miejsce stylu dla skryptów środków (flush-basic-wzory.py, reactive-srodek.py, grupy-srodek.py): kolory, granatowy pasek, ramki,
# szara ramka, odstęp i pusty dokument środka. Skrypty środków importują stąd i nie mają własnych funkcji stylu.
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
WZORY = os.path.join(ROOT, "moduly", "wzory")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
TEAL, GRAY, LINE = "1F4E5F", "F2F2F2", "B0B7BB"
SZEROKOSC = 15.52  # cm – szerokość tabel środka (= komórka ramki basic.docx)

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

def srodek():
    # plik SAMEGO środka (Grzegorz 21/11/2026 17:33): ramki tu nie ma – apka wkłada środek w aktualny basic.docx (OESTWzory.bajty).
    # Dokument startuje z basic.docx tylko po style i stronę; ciało = sam środek, bez nagłówka i stopki. Zwraca (dokument, dodaj(element)).
    d = Document(os.path.join(WZORY, "basic.docx")); body = d.element.body; sect = body.find(W + "sectPr")
    for ch in list(body):
        if ch is not sect: body.remove(ch)
    for h in sect.findall(W + "headerReference") + sect.findall(W + "footerReference"): sect.remove(h)
    return d, sect.addprevious

def tag(d, s):  # akapit z samym znacznikiem pętli – docxtemplater (paragraphLoop) usuwa go z raportu
    p = d.add_paragraph(); p.paragraph_format.space_after = Pt(0); run(p, s, 11); return p._p

def pasek(t, tekst):  # granatowy pasek grupy w pierwszym wierszu tabeli: tekst biały, pogrubiony, WIELKIMI
    h = t.rows[0].cells[0].merge(t.rows[0].cells[-1]) if len(t.rows[0].cells) > 1 else t.rows[0].cells[0]; shade(h, TEAL)
    r = run(par(h), tekst, 10.5, True, "FFFFFF"); r.font.all_caps = True
    return h

def szara(d, tekst):  # szara ramka ze stałym zdaniem / podsumowaniem pod grupami → element tabeli
    t = d.add_table(rows=1, cols=1); borders(t, 4, LINE); c = t.rows[0].cells[0]; shade(c, GRAY)
    p = par(c); p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4); run(p, tekst, 11)
    t.autofit = False; t.columns[0].width = Cm(SZEROKOSC); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    return t
