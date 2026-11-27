package com.oest.inspekcje;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

// Wysyłka raportu bez serwera: zapisuje pliki (DOCX/PDF) w cache i otwiera wybór apki (Gmail itp.) z załącznikami.
@CapacitorPlugin(name = "ReportShare")
public class ReportSharePlugin extends Plugin {
    @PluginMethod public void share(PluginCall call) {
        String subject = call.getString("subject", "Report"), body = call.getString("body", "");
        JSArray to = call.getArray("to", new JSArray()), files = call.getArray("files", new JSArray());
        if (files.length() == 0 || files.length() > 40) { call.reject("SHARE_INPUT"); return; }
        try {
            ArrayList<String> addr = new ArrayList<>();
            for (int i = 0; i < to.length(); i++) { String a = to.getString(i); if (a != null && a.matches("[^\\s@,;<>]+@[^\\s@,;<>]+\\.[^\\s@,;<>]+")) addr.add(a); }
            File dir = new File(getContext().getCacheDir(), "report-share");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException();
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) if (f.lastModified() < System.currentTimeMillis() - 86400000L) f.delete();
            File sub = new File(dir, java.util.UUID.randomUUID().toString());
            if (!sub.mkdirs()) throw new IllegalStateException();
            ArrayList<Uri> uris = new ArrayList<>();
            for (int i = 0; i < files.length(); i++) {
                JSObject f = JSObject.fromJSONObject(files.getJSONObject(i));
                uris.add(uri(write(sub, f)));
            }
            Intent send = new Intent(uris.size() > 1 ? Intent.ACTION_SEND_MULTIPLE : Intent.ACTION_SEND);
            send.setType("*/*");
            if (!addr.isEmpty()) send.putExtra(Intent.EXTRA_EMAIL, addr.toArray(new String[0]));
            send.putExtra(Intent.EXTRA_SUBJECT, subject);
            send.putExtra(Intent.EXTRA_TEXT, body);
            if (uris.size() > 1) send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris); else send.putExtra(Intent.EXTRA_STREAM, uris.get(0));
            ClipData clips = ClipData.newUri(getContext().getContentResolver(), "Report", uris.get(0));
            for (int i = 1; i < uris.size(); i++) clips.addItem(new ClipData.Item(uris.get(i)));
            send.setClipData(clips);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().runOnUiThread(() -> {
                try { getActivity().startActivity(Intent.createChooser(send, subject)); call.resolve(new JSObject().put("status", "shared")); }
                catch (Exception e) { call.reject("SHARE_UNAVAILABLE"); }
            });
        } catch (Exception e) { call.reject("SHARE_FAILED"); }
    }

    // Sam tekst do dowolnej aplikacji (Grzegorz 27/11/2026: odpowiedź z czatu Gemmy, np. handover) – bez plików i bez adresów
    @PluginMethod public void text(PluginCall call) {
        String body = call.getString("body", ""), subject = call.getString("subject", "OEST");
        if (body.isEmpty() || body.length() > 100000) { call.reject("SHARE_INPUT"); return; }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, subject);
        send.putExtra(Intent.EXTRA_TEXT, body);
        getActivity().runOnUiThread(() -> {
            try { getActivity().startActivity(Intent.createChooser(send, subject)); call.resolve(new JSObject().put("status", "shared")); }
            catch (Exception e) { call.reject("SHARE_UNAVAILABLE"); }
        });
    }

    // Podgląd raportu (Grzegorz 26/11/2026): ten sam PDF co do wysyłki, otwarty w przeglądarce PDF telefonu.
    // Jeden plik podglądu: każde otwarcie nadpisuje poprzedni (składany od nowa z poprawionych pól).
    @PluginMethod public void open(PluginCall call) {
        JSObject f = call.getObject("file");
        if (f == null || f.getString("data", "").isEmpty()) { call.reject("OPEN_INPUT"); return; }
        try {
            File dir = new File(new File(getContext().getCacheDir(), "report-share"), "podglad");
            File[] old = dir.listFiles();
            if (old != null) for (File x : old) x.delete();
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException();
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri(write(dir, f)), f.getString("type", "application/pdf"));
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().runOnUiThread(() -> {
                try { getActivity().startActivity(view); call.resolve(new JSObject().put("status", "opened")); }
                catch (android.content.ActivityNotFoundException e) { call.reject("OPEN_NO_APP"); }
                catch (Exception e) { call.reject("OPEN_FAILED"); }
            });
        } catch (Exception e) { call.reject("OPEN_FAILED"); }
    }

    // plik {name, data (base64)} zapisany w katalogu dir
    private static File write(File dir, JSObject f) throws Exception {
        String name = f.getString("name", "file").replaceAll("[\\\\/:*?\"<>|]", "_");
        byte[] bytes = Base64.decode(f.getString("data", ""), Base64.DEFAULT);
        File out = new File(dir, name);
        try (FileOutputStream o = new FileOutputStream(out)) { o.write(bytes); }
        return out;
    }
    private Uri uri(File f) { return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f); }
}
