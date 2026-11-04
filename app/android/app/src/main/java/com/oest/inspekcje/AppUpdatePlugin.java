package com.oest.inspekcje;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Aktualizacja z GitHub Releases: numer wersji w telefonie, pobranie APK do cache i cicha instalacja przez PackageInstaller.
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    @PluginMethod public void info(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject r = new JSObject();
            r.put("versionCode", Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode);
            r.put("versionName", pi.versionName);
            call.resolve(r);
        } catch (Exception e) { call.reject("INFO", e); }
    }

    private void installSession(File apk) throws Exception {
        UpdateStatusReceiver.lastApk = apk;
        UpdateStatusReceiver.activity = new java.lang.ref.WeakReference<>(getActivity());
        PackageInstaller pi = getContext().getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(getContext().getPackageName());
        params.setSize(apk.length());
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        int id = pi.createSession(params);
        boolean committed = false;
        try (PackageInstaller.Session session = pi.openSession(id)) {
            try (InputStream in = new FileInputStream(apk); OutputStream o = session.openWrite("base.apk", 0, apk.length())) {
                byte[] buf = new byte[65536]; int n;
                while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                session.fsync(o);
            }
            Intent cb = new Intent(getContext(), UpdateStatusReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            PendingIntent pend = PendingIntent.getBroadcast(getContext(), id, cb, flags);
            session.commit(pend.getIntentSender());
            committed = true;
        } finally {
            // nieudane wgrywanie (np. brak miejsca): porzuć sesję, żeby nie zostawiać połowy APK w systemie
            if (!committed) try { pi.abandonSession(id); } catch (Exception ignored) {}
        }
    }

    @PluginMethod public void install(PluginCall call) {
        final String url = call.getString("url", "");
        final String name = call.getString("name", "OEST.apk").replaceAll("[^A-Za-z0-9._-]", "_");
        if (!url.startsWith("https://github.com/Sarenkag/pierwszy/releases/download/")) { call.reject("URL"); return; }
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(s);
            call.reject("PERMISSION");
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "update");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("DIR");
                File[] old = dir.listFiles();
                if (old != null) for (File f : old) f.delete();
                File out = new File(dir, name);
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(20000); c.setReadTimeout(60000);
                int code = c.getResponseCode();
                if (code != 200) throw new IllegalStateException("HTTP " + code);
                long total = c.getContentLengthLong(), done = 0; int lastPct = -1; long lastAt = 0;
                try (InputStream in = c.getInputStream(); FileOutputStream o = new FileOutputStream(out)) {
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) > 0) {
                        o.write(buf, 0, n); done += n;
                        // postęp do strony: co 1% (albo co sekundę, gdy serwer nie podał rozmiaru)
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        long now = System.currentTimeMillis();
                        if ((total > 0 && pct != lastPct) || (total <= 0 && now - lastAt > 1000)) {
                            lastPct = pct; lastAt = now;
                            JSObject ev = new JSObject(); ev.put("done", done); ev.put("total", total); ev.put("percent", pct);
                            notifyListeners("progress", ev);
                        }
                    }
                } finally { c.disconnect(); }
                if (total > 0 && done != total) throw new IllegalStateException("przerwane (" + (done / 1048576) + " z " + (total / 1048576) + " MB)");
                // Android 12+: sesja PackageInstaller z USER_ACTION_NOT_REQUIRED – apka aktualizuje sama siebie bez potwierdzania palcem.
                // Gdy system jednak wymaga potwierdzenia (np. pierwszy raz), UpdateStatusReceiver pokaże jego okno.
                installSession(out);
                call.resolve();
            } catch (Exception e) { call.reject("Pobieranie nie powiodło się: " + e.getMessage(), e); }
        }).start();
    }
}
