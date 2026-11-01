package com.oest.inspekcje;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.UUID;

/**
 * Edycja zdjęcia gotowym edytorem z telefonu (Markup / Google Zdjęcia) — nie piszemy własnego.
 * edit({base64}) → {changed, base64?, editor}. Zdjęcie leży tylko w cache apki i jest kasowane po powrocie.
 */
@CapacitorPlugin(name = "OESTPhotoEdit")
public class PhotoEditPlugin extends Plugin {
    // Google Zdjęcia najpierw: ich edytor przyjmuje cudze pliki (content://) i oddaje wynik; Markup wywalał się na pliku z apki (zgłoszenie 01/11)
    private static final String[] EDITORS = {"com.google.android.apps.photos", "com.google.android.markup"};

    private File dir() { File d = new File(getContext().getCacheDir(), "photo-edit"); d.mkdirs(); return d; }

    @PluginMethod public void edit(PluginCall call) {
        String b64 = call.getString("base64", "");
        if (b64.isEmpty() || b64.length() > 40_000_000) { call.reject("PHOTO_EDIT_SIZE"); return; }
        File file = null;
        try {
            file = new File(dir(), UUID.randomUUID() + ".jpg");
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(Base64.decode(b64, Base64.DEFAULT)); }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_EDIT);
            intent.setDataAndType(uri, "image/*");
            intent.setClipData(ClipData.newRawUri("Photo", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            PackageManager pm = getContext().getPackageManager();
            String editor = "";
            for (String pkg : EDITORS) { intent.setPackage(pkg); if (intent.resolveActivity(pm) != null) { editor = pkg; break; } }
            if (editor.isEmpty()) { intent.setPackage(null); if (intent.resolveActivity(pm) == null) throw new IllegalStateException("PHOTO_EDIT_NO_EDITOR"); }
            call.getData().put("editPath", file.getAbsolutePath());
            call.getData().put("editUri", uri.toString());
            call.getData().put("editStamp", file.lastModified());
            call.getData().put("editSize", file.length());
            call.getData().put("editor", editor);
            startActivityForResult(call, intent, "edited");
        } catch (Throwable e) {
            if (file != null) file.delete();
            call.reject("PHOTO_EDIT_FAILED: " + e.getMessage());
        }
    }

    @ActivityCallback private void edited(PluginCall call, ActivityResult result) {
        if (call == null) return;
        File file = new File(call.getString("editPath", ""));
        getBridge().execute(() -> {
            try {
                if (!file.getParentFile().getCanonicalPath().equals(dir().getCanonicalPath())) throw new IllegalStateException("PHOTO_EDIT_PATH");
                byte[] bytes = null;
                Intent data = result.getData();
                Uri back = data != null ? data.getData() : null;
                // Edytor może zwrócić nowy plik (Markup) albo nadpisać nasz (EXTRA_OUTPUT)
                if (result.getResultCode() == Activity.RESULT_OK && back != null && !back.toString().equals(call.getString("editUri", ""))) bytes = read(back);
                else if (file.exists() && (file.lastModified() != call.getLong("editStamp", 0L) || file.length() != call.getLong("editSize", 0L))) bytes = read(Uri.fromFile(file));
                JSObject out = new JSObject();
                out.put("editor", call.getString("editor", ""));
                out.put("changed", bytes != null && bytes.length > 0);
                if (bytes != null && bytes.length > 0) out.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
                call.resolve(out);
            } catch (Throwable e) {
                call.reject("PHOTO_EDIT_FAILED: " + e.getMessage());
            } finally { file.delete(); }
        });
    }

    private byte[] read(Uri uri) throws Exception {
        try (InputStream in = getContext().getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IllegalStateException("PHOTO_EDIT_READ");
            byte[] buf = new byte[65536]; int n; long total = 0;
            while ((n = in.read(buf)) != -1) { total += n; if (total > 30L * 1024 * 1024) throw new IllegalStateException("PHOTO_EDIT_SIZE"); out.write(buf, 0, n); }
            return out.toByteArray();
        }
    }
}
