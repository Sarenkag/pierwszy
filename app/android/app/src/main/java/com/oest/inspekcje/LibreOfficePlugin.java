package com.oest.inspekcje;

import android.content.res.AssetManager;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.libreoffice.kit.Document;
import org.libreoffice.kit.LibreOfficeKit;
import org.libreoffice.kit.Office;

// PDF z Worda (Grzegorz 20/11/2026: „Tak, LibreOfficeKit”): PDF z tego samego Worda przez silnik LibreOffice w telefonie, bez internetu.
// Silnik = oficjalny LibreOffice Viewer 26.2.7.3 (F-Droid, MPL-2.0) – biblioteki i pliki dokłada CI (app/scripts/libreoffice-silnik.py).
// JS woła go tylko przez moduly/word-pdf (OESTWordPdf.zWorda).
// Jedno wywołanie: toPdf({ docx: base64 }) → { pdf: base64, ms, initMs, bytes }. LibreOfficeKit działa tylko z jednego wątku.
@CapacitorPlugin(name = "LibreOffice")
public class LibreOfficePlugin extends Plugin {
    private static final ExecutorService LOK = Executors.newSingleThreadExecutor();
    private static Office office;
    private static long initMs = -1;

    @PluginMethod public void toPdf(PluginCall call) {
        String b64 = call.getString("docx");
        if (b64 == null || b64.isEmpty()) { call.reject("NO_DOCX"); return; }
        LOK.execute(() -> {
            try {
                long t0 = System.currentTimeMillis();
                if (office == null) {
                    unpackAssets(); // pliki startowe silnika (program/*.rdb, fonts.conf, czcionki) – inaczej UNO pada przy starcie
                    LibreOfficeKit.init(getActivity());
                    ByteBuffer h = LibreOfficeKit.getLibreOfficeKitHandle();
                    if (h == null) throw new IllegalStateException("LibreOfficeKit nie wystartował");
                    office = new Office(h);
                    initMs = System.currentTimeMillis() - t0;
                }
                File dir = new File(getContext().getCacheDir(), "lok");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("cache");
                File in = new File(dir, "in.docx"), out = new File(dir, "out.pdf");
                out.delete();
                try (FileOutputStream fo = new FileOutputStream(in)) { fo.write(Base64.decode(b64, Base64.DEFAULT)); }
                long t1 = System.currentTimeMillis();
                Document doc = office.documentLoad("file://" + in.getAbsolutePath());
                if (doc == null) throw new IllegalStateException("Nie otworzył Worda: " + office.getError());
                doc.saveAs("file://" + out.getAbsolutePath(), "pdf", "");
                doc.destroy();
                long ms = System.currentTimeMillis() - t1;
                if (!out.exists() || out.length() == 0) throw new IllegalStateException("Brak PDF: " + office.getError());
                byte[] pdf = read(out);
                JSObject r = new JSObject();
                r.put("pdf", Base64.encodeToString(pdf, Base64.NO_WRAP));
                r.put("ms", ms);
                r.put("initMs", initMs);
                r.put("bytes", pdf.length);
                call.resolve(r);
            } catch (Throwable e) {
                call.reject("LOK: " + e);
            }
        });
    }

    // Tak jak w ich apce (LibreOfficeMainActivity.copyFromAssets): assets/unpack/** → dataDir, raz na wersję apki.
    // Bez tego silnik nie znajduje program/udkapi.rdb i kończy się DeploymentException (awaria na Pixelu 20/11/2026).
    private void unpackAssets() throws Exception {
        File data = new File(getContext().getApplicationInfo().dataDir);
        long ver = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).lastUpdateTime;
        File mark = new File(data, "lok-unpacked-" + ver);
        if (mark.exists()) return;
        copyAsset(getContext().getAssets(), "unpack", data);
        if (!new File(data, "program/udkapi.rdb").exists()) throw new IllegalStateException("brak program/udkapi.rdb po rozpakowaniu");
        mark.createNewFile();
    }

    private static void copyAsset(AssetManager am, String path, File dst) throws Exception {
        String[] kids = am.list(path);
        if (kids == null || kids.length == 0) { // plik
            File parent = dst.getParentFile();
            if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("mkdir " + parent);
            try (InputStream i = am.open(path); FileOutputStream o = new FileOutputStream(dst)) {
                byte[] b = new byte[65536]; int n;
                while ((n = i.read(b)) > 0) o.write(b, 0, n);
            }
            return;
        }
        if (!dst.exists() && !dst.mkdirs()) throw new IllegalStateException("mkdir " + dst);
        for (String k : kids) copyAsset(am, path + "/" + k, new File(dst, k));
    }

    private static byte[] read(File f) throws Exception {
        try (InputStream i = new FileInputStream(f); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[65536]; int n;
            while ((n = i.read(b)) > 0) o.write(b, 0, n);
            return o.toByteArray();
        }
    }
}
