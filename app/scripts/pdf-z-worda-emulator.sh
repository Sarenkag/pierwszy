#!/usr/bin/env bash
# PDF z Worda na emulatorze Androida: instalacja OEST (debug, z silnikiem), start, konwersja wzorów firmy, logcat z awarii.
set -u
mkdir -p lo-emu
PKG=com.oest.inspekcje
adb install -r android/app/build/outputs/apk/debug/app-debug.apk || exit 1
adb logcat -c
adb shell am start -n $PKG/$PKG.MainActivity
sleep 25
PID=$(adb shell pidof $PKG | tr -d '\r')
echo "PID=$PID"
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
node scripts/pdf-z-worda-emulator.cjs | tee lo-emu/wynik.txt
command -v pdftotext >/dev/null || sudo apt-get install -y -qq poppler-utils >/dev/null
for f in lo-emu/*.pdf; do [ -f "$f" ] && { echo "===== $f: $(pdfinfo "$f" 2>/dev/null | grep Pages) ====="; pdftotext -layout "$f" - 2>/dev/null | head -60; }; done
sleep 3
echo "Proces po próbie: $(adb shell pidof $PKG | tr -d '\r')"
adb logcat -d > lo-emu/logcat.txt
echo "===== LOGCAT (awaria / LibreOffice) ====="
grep -nE "FATAL|Abort message|LibreOfficeKit|Bootstrapping exception|UnsatisfiedLink|JNI DETECTED|AndroidRuntime" lo-emu/logcat.txt | head -80
grep -q "^WYNIK OK" lo-emu/wynik.txt
