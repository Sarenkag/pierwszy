#!/usr/bin/env bash
# PRÓBA LO na emulatorze: instalacja, start, PDF z Worda przez stronę próby (DevTools WebView), logcat z awarii.
set -u
mkdir -p lo-emu
PKG=com.oest.inspekcje.probalo
adb shell getprop ro.product.cpu.abilist
adb install -r android/app/build/outputs/apk/debug/app-debug.apk || exit 1
adb logcat -c
adb shell am start -n $PKG/com.oest.inspekcje.MainActivity
sleep 25
PID=$(adb shell pidof $PKG | tr -d '\r')
echo "PID=$PID"
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
node scripts/lo-emulator-cdp.cjs | tee lo-emu/wynik.txt
command -v pdftotext >/dev/null || sudo apt-get install -y -qq poppler-utils >/dev/null
for f in lo-emu/*.pdf; do [ -f "$f" ] && { echo "===== $f (tekst) ====="; pdftotext -layout "$f" - 2>/dev/null | head -80; }; done
sleep 5
echo "Proces po próbie: $(adb shell pidof $PKG | tr -d '\r')"
adb logcat -d > lo-emu/logcat.txt
echo "===== LOGCAT (awaria / LibreOffice) ====="
grep -nE "FATAL|DEBUG +:|libc +:|backtrace|#[0-9]{2} pc|LibreOfficeKit|LOK|lo-native|AndroidRuntime|Abort|SIGSEGV|SIGABRT|UnsatisfiedLink|JNI DETECTED|LibreOffice" lo-emu/logcat.txt | head -300
echo "===== LOGCAT procesu apki od startu silnika ====="
awk '/Initializing LibreOfficeKit/{f=1} f' lo-emu/logcat.txt | grep -E " $PID +[0-9]+ " | grep -v "Capacitor" | head -400
adb exec-out run-as $PKG ls -la . cache cache/lok 2>&1 | head -60
exit 0
