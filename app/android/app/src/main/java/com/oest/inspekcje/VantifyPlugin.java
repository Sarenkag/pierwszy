package com.oest.inspekcje;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;

// Vantify w apce (Grzegorz 10/11/2026): otwiera VantifyActivity, po zamknięciu oddaje pobrany eksport Job (csv)
// i zapis „Zbadaj” (log). Pliki przechodzą przez cache, nie przez Intent (limit wielkości). Bez loginu i hasła.
@CapacitorPlugin(name = "Vantify")
public class VantifyPlugin extends Plugin {
    @PluginMethod public void open(PluginCall call) {
        Intent i = new Intent(getContext(), VantifyActivity.class);
        i.putExtra("lang", call.getString("lang", "pl"));
        startActivityForResult(call, i, "done");
    }

    @ActivityCallback private void done(PluginCall call, ActivityResult result) {
        if (call == null) return;
        File dir = new File(getContext().getCacheDir(), "vantify");
        try {
            JSObject out = new JSObject();
            File csv = new File(dir, "export.csv"), name = new File(dir, "name.txt"), log = new File(dir, "log.json");
            if (csv.exists()) { out.put("csv", read(csv)); out.put("name", name.exists() ? read(name) : "export.csv"); }
            out.put("log", log.exists() ? new JSArray(read(log)) : new JSArray());
            for (File f : new File[] { csv, name, log }) f.delete();
            call.resolve(out);
        } catch (Exception e) { call.reject("VANTIFY_RESULT"); }
    }

    private static String read(File f) throws Exception {
        try (FileInputStream in = new FileInputStream(f)) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[16384]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); return new String(o.toByteArray(), StandardCharsets.UTF_8); }
    }
}
