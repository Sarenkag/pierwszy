package com.oest.inspekcje;

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

// PRÓBA (Grzegorz 20/11/2026: „Tak, LibreOfficeKit”): PDF z tego samego Worda przez silnik LibreOffice w telefonie, bez internetu.
// Silnik = oficjalny LibreOffice Viewer 26.2.7.3 (F-Droid, MPL-2.0) – biblioteki i pliki dokładane przez CI tylko w buildzie próbnym.
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
                    LibreOfficeKit.putenv("SAL_LOG=+WARN+INFO"); // jak w ich apce: ostrzeżenia silnika w logcat (diagnoza)
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

    private static byte[] read(File f) throws Exception {
        try (InputStream i = new FileInputStream(f); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[65536]; int n;
            while ((n = i.read(b)) > 0) o.write(b, 0, n);
            return o.toByteArray();
        }
    }
}
