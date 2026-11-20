#!/usr/bin/env python3
# PRÓBA LibreOfficeKit (Grzegorz 20/11/2026, „Tak, LibreOfficeKit”): tylko w CI na gałęzi proba-lo-*.
# Bierze GOTOWY silnik z oficjalnego LibreOffice Viewer (The Document Foundation, MPL-2.0, zbudowany i podpisany przez F-Droid,
# powtarzalna budowa) – bez budowania LibreOffice od zera. Wyciąga biblioteki arm64 i pliki silnika, kompresję plików
# zostawia tak jak w ich APK, i tworzy lok.gradle: osobna apka „com.oest.inspekcje.probalo”, żeby nie ruszać prawdziwej OEST.
import hashlib, io, json, os, sys, urllib.request, zipfile

URL = "https://f-droid.org/repo/org.documentfoundation.libreoffice_135.apk"  # 26.2.7.3, arm64-v8a, 83 MiB
app = sys.argv[1]  # app/android/app
data = urllib.request.urlopen(URL, timeout=600).read()
sha = hashlib.sha256(data).hexdigest()
print("LibreOffice Viewer APK:", len(data), "B, sha256", sha)
z = zipfile.ZipFile(io.BytesIO(data))
jni, ass = os.path.join(app, "lok-jni"), os.path.join(app, "lok-assets")
stored, n_lib, n_ass, size = set(), 0, 0, {"lib": 0, "assets": 0}
for it in z.infolist():
    if it.is_dir():
        continue
    if it.filename.startswith("lib/arm64-v8a/") and it.filename.endswith(".so"):
        dst = os.path.join(jni, "arm64-v8a", os.path.basename(it.filename)); n_lib += 1; size["lib"] += it.file_size
    elif it.filename.startswith("assets/dexopt/"):
        continue  # profil startu ich apki (narzędzie budowania), nie silnik – nasza apka ma własny
    elif it.filename.startswith("assets/"):
        dst = os.path.join(ass, it.filename[len("assets/"):]); n_ass += 1; size["assets"] += it.file_size
        if it.compress_type == zipfile.ZIP_STORED:
            ext = os.path.splitext(it.filename)[1].lstrip(".")
            if ext: stored.add(ext)
    else:
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(z.read(it))
print("biblioteki:", n_lib, "plików,", size["lib"] // 1048576, "MB | pliki silnika:", n_ass, "plików,", size["assets"] // 1048576, "MB")
print("bez kompresji (jak w ich APK):", sorted(stored))
for clash in ("public", "capacitor.config.json", "capacitor.plugins.json"):
    if os.path.exists(os.path.join(ass, clash)):
        sys.exit("Konflikt z plikami Capacitor: " + clash)
nc = ", ".join(json.dumps(e) for e in sorted(stored))
open(os.path.join(app, "lok.gradle"), "w").write(f"""android {{
    defaultConfig {{ applicationIdSuffix ".probalo" }}
    sourceSets {{ main {{ jniLibs.srcDirs += ['lok-jni']; assets.srcDirs += ['lok-assets'] }} }}
    androidResources {{ noCompress += [{nc}] }}
    packagingOptions {{ jniLibs {{ useLegacyPackaging = true; pickFirsts += ['**/libc++_shared.so'] }} }}
}}
""")
s = os.path.join(app, "src/main/res/values/strings.xml")
t = open(s, encoding="utf-8").read()  # najpierw odczyt, potem zapis (open(..., "w") od razu czyści plik)
assert '<string name="app_name">OEST</string>' in t, "brak app_name"
open(s, "w", encoding="utf-8").write(t.replace('<string name="app_name">OEST</string>', '<string name="app_name">OEST próba LO</string>'))
print("lok.gradle gotowy")
# Przycisk próby (Grzegorz 20/11/2026: nie widział go w lewym górnym rogu – chował się pod paskiem stanu). Tylko w tej
# apce próbnej: duży pomarańczowy przycisk na dole, zawsze widoczny, i pomarańczowy pasek „PRÓBA” na górze, żeby nie
# pomylić jej ze zwykłą OEST. Zmieniamy skopiowaną stronę w APK (assets/public), nie app/www – zwykła apka bez zmian.
p = os.path.join(app, "src/main/assets/public/index.html")
t = open(p, encoding="utf-8").read()
old = ' hidden style="position:fixed;left:12px;top:12px;z-index:9999;padding:8px 12px;border-radius:10px;background:#2f81f7;color:#fff;font:600 13px system-ui;text-decoration:none">'
assert old in t, "brak przycisku probaLo w index.html"
t = t.replace(old, ' style="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 70px);z-index:9999;padding:16px 24px;border-radius:14px;background:#f0883e;color:#000;font:700 18px system-ui;text-decoration:none;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.6)">')
t = t.replace("</body>", '<div style="position:fixed;left:0;right:0;top:0;height:6px;background:#f0883e;z-index:9999;pointer-events:none"></div>\n</body>', 1)
open(p, "w", encoding="utf-8").write(t)
print("przycisk próby widoczny")
