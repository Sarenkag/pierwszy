#!/usr/bin/env python3
"""Wzór Weekly Flushing (Word od Grzegorza, Tower B) → jeden wspólny wzór dla TA/TB/P.

Zostaje strona 1 (rok/miesiąc + tabela kranów + zdanie o Fault Log). Wiersz kranu staje się
szablonem między <!--ROW--> (apka powtarza go dla każdego kranu), komórki dostają pola
{o} {c1}..{c12}; lata {y0}..{y5}, cieniowanie roku/miesiąca {yf0}.. / {mf0}..{mf11}, budynek {bld}.
Użycie: python3 app/scripts/flush-tpl.py wzor.docx inspekcje/tpl-flush.js
"""
import base64, io, re, sys, zipfile

src, out = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
doc = zin.read('word/document.xml').decode('utf8')

def cells(row):
    return re.findall(r'<w:tc>.*?</w:tc>', row, re.S)

def set_text(cell, text):
    """Zostawia właściwości komórki i akapitu, wszystkie przebiegi tekstu → jeden z podanym tekstem."""
    m = re.match(r'(<w:tc>.*?</w:tcPr>)(.*)</w:tc>$', cell, re.S)
    head, body = m.group(1), m.group(2)
    p = re.match(r'(<w:p[ >].*?)(?:(<w:pPr>.*?</w:pPr>))?(.*)</w:p>', body, re.S)
    popen = re.match(r'<w:p[^>]*>', body).group(0)
    ppr = re.search(r'<w:pPr>.*?</w:pPr>', body, re.S)
    ppr = ppr.group(0) if ppr else ''
    rpr = re.search(r'<w:r[ >](?:(?!</w:r>).)*?(<w:rPr>.*?</w:rPr>)', body, re.S)
    rpr = rpr.group(1) if rpr else re.sub(r'.*?<w:rPr>(.*?)</w:rPr>.*', r'<w:rPr>\1</w:rPr>', ppr, flags=re.S) if '<w:rPr>' in ppr else ''
    run = '<w:r>' + rpr + '<w:t xml:space="preserve">' + text + '</w:t></w:r>' if text else ''
    return head + popen + ppr + run + '</w:p></w:tc>'

def shade(cell, token):
    head = re.match(r'<w:tc>.*?</w:tcPr>', cell, re.S).group(0)
    shd = '<w:shd w:val="clear" w:color="auto" w:fill="' + token + '"/>'
    if '<w:shd' in head: new = re.sub(r'<w:shd[^>]*/>', shd, head)
    elif '</w:tcBorders>' in head: new = head.replace('</w:tcBorders>', '</w:tcBorders>' + shd)
    elif '<w:vAlign' in head: new = head.replace('<w:vAlign', shd + '<w:vAlign')
    else: new = head.replace('</w:tcPr>', shd + '</w:tcPr>')
    return new + cell[len(head):]

tbls = re.findall(r'<w:tbl>.*?</w:tbl>', doc, re.S)
body_start = doc.index('<w:body>') + len('<w:body>')
t0, t1, t2 = (doc.index(t) for t in tbls[:3])
pre = doc[body_start:t0]

# lata i miesiące
years = re.findall(r'<w:tr[ >].*?</w:tr>', tbls[0], re.S)
new_rows = []
for ri, row in enumerate(years):
    cs = cells(row)
    for ci in range(1, len(cs)):
        c = cs[ci]
        if ri == 0: c = shade(set_text(c, '{y%d}' % (ci - 1)), '{yf%d}' % (ci - 1))
        else: c = shade(c, '{mf%d}' % ((ri - 1) * 6 + ci - 1))
        row = row.replace(cs[ci], c, 1)
    new_rows.append(row)
tbl0 = tbls[0]
for a, b in zip(years, new_rows): tbl0 = tbl0.replace(a, b, 1)
tbl0 = re.sub(r'<w:highlight [^>]*/>', '', tbl0)  # zakreślenia z papierowej kopii: zielone tło daje apka

# tabela kranów: 3 wiersze nagłówka + jeden wiersz-szablon
rows = re.findall(r'<w:tr[ >].*?</w:tr>', tbls[1], re.S)
tpl = rows[3]
cs = cells(tpl)
assert len(cs) == 13, len(cs)
new = tpl
for ci, c in enumerate(cs): new = new.replace(c, set_text(c, '{o}' if ci == 0 else '{c%d}' % ci), 1)
tbl1 = tbls[1]
for r in rows[3:]: tbl1 = tbl1.replace(r, '', 1)
for r in rows[:3]:  # nagłówek tabeli powtarza się na kolejnej stronie (TB ma 20 kranów)
    h = r.replace('<w:trPr>', '<w:trPr><w:tblHeader/>', 1) if '<w:trPr>' in r else re.sub(r'(<w:tr[^>]*>)', r'\1<w:trPr><w:tblHeader/></w:trPr>', r, count=1)
    tbl1 = tbl1.replace(r, h, 1)
tbl1 = tbl1.replace('</w:tbl>', '<!--ROW-->' + new + '<!--ROW--></w:tbl>')

# akapity po tabeli do zdania o Fault Log włącznie
mid = doc[t1 + len(tbls[1]):t2]
paras = re.findall(r'<w:p[ >].*?</w:p>|<w:p/>', mid, re.S)
keep = []
for p in paras:
    if '<w:sectPr' in p: break
    keep.append(p)
    if 'FAULT' in ''.join(re.findall(r'<w:t[^>]*>([^<]*)', p)) and 'RECTIFY' not in ''.join(re.findall(r'<w:t[^>]*>([^<]*)', p)):
        pass
    txt = ''.join(''.join(re.findall(r'<w:t[^>]*>([^<]*)', q)) for q in keep)
    if 'THE FAULT' in txt.replace('  ', ' ') or txt.rstrip().endswith('FAULT'): break
sect = re.search(r'<w:sectPr(?:(?!<w:sectPr).)*</w:sectPr></w:body>', doc, re.S).group(0)
doc2 = doc[:body_start] + pre + tbl0 + doc[t0 + len(tbls[0]):t1] + tbl1 + ''.join(keep) + sect + '</w:document>'
assert doc2.count('<w:tbl>') == 2

hdr = zin.read('word/header1.xml').decode('utf8')
hdr = re.sub(r'(<w:t[^>]*>) B(</w:t>)', r'\1 {bld}\2', hdr, count=1)
hdr = re.sub(r'(<w:t[^>]*>)TOWER(</w:t>)', r'\1{twr}\2', hdr, count=1)
assert '{bld}' in hdr and '{twr}' in hdr

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    for i in zin.infolist():
        data = zin.read(i.filename)
        if i.filename == 'word/document.xml': data = doc2.encode('utf8')
        elif i.filename == 'word/header1.xml': data = hdr.encode('utf8')
        z.writestr(i, data)
b64 = base64.b64encode(buf.getvalue()).decode()
open(out, 'w').write('// Wzór Weekly Taps/Shower Flushing Record (Word od Grzegorza 02/11/2026, TB) — wspólny dla TA/TB/P.\n'
                     '// Generowany: python3 app/scripts/flush-tpl.py wzor.docx inspekcje/tpl-flush.js\n'
                     'window.TPL_FLUSH = "' + b64 + '";\n')
print('ok', len(doc), '->', len(doc2), 'bytes xml;', len(b64), 'b64')
