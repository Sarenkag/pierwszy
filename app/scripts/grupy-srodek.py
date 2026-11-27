# Jeden środek basic form „grupy” dla inspekcji (Grzegorz 27/11/2026: „wszystkie inspekcje i inne zadania na ten styl”): ten sam wygląd co
# Flushing i Generator (granatowy pasek grupy z licznikiem, po 2 punkty w wierszu z ☑/☒/N/A, szara ramka na dole ramki), ale z pętlami, więc
# jeden plik służy każdej inspekcji: z pytaniami (AOV, ATS, rozdzielnice, izolatory, Lighting, Plant Room), Plant Rooms, Temp TB, Spa, AOV TB.
# Ramka = moduly/wzory/basic.docx (apka wkłada środek przy raporcie, OESTWzory.bajty('grupy-basic')); dane robi OESTWzory.grupy().
# Nawiasy: {#podtytul}{tekst}{/podtytul} linia nad grupami; {#grupy} {nazwa} · {licznik}, układ {#dwie} (lewy punkt {n1}{u1} {ok1}{no1}{na1},
# prawy {n2}{u2} {ok2}{no2}{na2}) albo {#jedna} (punkt pod punktem, większy odstęp – Grzegorz 27/11/2026 21:46, ATS), w nich {#wiersze}…{/wiersze};
# {/grupy}; DOL_RAMKI; {#szare}{tekst}{/szare} akapity szarej ramki (na dole ramki).
# Styl TYLKO z app/scripts/wzory_styl.py. Uruchom: python3 app/scripts/grupy-srodek.py   (potrzebne: python-docx)
import os, sys
from docx.shared import Pt, Cm
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wzory_styl as S

def build(out):
    d, add = S.srodek()
    p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER  # linia nad grupami (np. który generator) – jak podtytul we Flushingu
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(0); S.run(p, "{#podtytul}{tekst}{/podtytul}", 11, True)
    add(p._p)
    add(S.tag(d, "{#grupy}"))
    add(S.spacer())
    # {#dwie}: po 2 punkty w wierszu (jak Flushing); {#jedna}: punkt pod punktem, wiersz min. 1,4 cm (tekst na środku wiersza),
    # żeby lista wypełniła mniej więcej kartkę (Grzegorz 27/11/2026 21:46, ATS – 6 punktów)
    for petla, kol in [("dwie", 2), ("jedna", 1)]:
        add(S.tag(d, "{#%s}" % petla))
        t = d.add_table(rows=2, cols=2 * kol); S.borders(t, 4, S.LINE)
        S.pasek(t, "{nazwa}   ·   {licznik}")
        cl = t.rows[1].cells
        for k in range(kol):
            n = str(k + 1); o = "{#wiersze}" if k == 0 else ""; z = "{/wiersze}" if k == kol - 1 else ""
            p = S.par(cl[k * 2])
            S.run(p, o + "{n%s}" % n, 11); S.run(p, "{u%s}" % n, 9.5, color="595959")
            p = S.par(cl[k * 2 + 1], WD_ALIGN_PARAGRAPH.CENTER)
            S.run(p, "{ok%s}" % n, 13, color="1E8A3C"); S.run(p, "{no%s}" % n, 13, color="C62828"); S.run(p, "{na%s}" % n + z, 9.5, True, "595959")
        if kol == 1: t.rows[1].height = Cm(1.4); t.rows[1].height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
        t.autofit = False
        szer = [6.56, 1.2] if kol == 2 else [S.SZEROKOSC - 1.6, 1.6]  # przy 2: jak we Flushingu, równy odstęp z lewej i prawej
        for k, col in enumerate(t.columns): col.width = Cm(szer[k % 2])
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        add(t._tbl)
        add(S.tag(d, "{/%s}" % petla))
    add(S.tag(d, "{/grupy}"))
    add(S.dol(d))  # szara ramka zawsze na dole ramki (Grzegorz 27/11/2026 21:45)
    t = S.szara(d, "{tekst}"); c = t.rows[0].cells[0]  # akapity szarej ramki: podsumowanie, usterki, uwagi, zakres
    c.paragraphs[0]._p.addprevious(S.tag(d, "{#szare}")); c._tc.append(S.tag(d, "{/szare}"))
    add(t._tbl); add(S.spacer())
    d.core_properties.title = "Inspection groups – basic form middle"
    d.save(out)

if __name__ == "__main__":
    build(os.path.join(S.WZORY, "grupy-srodek.docx")); print("grupy-srodek.docx")
