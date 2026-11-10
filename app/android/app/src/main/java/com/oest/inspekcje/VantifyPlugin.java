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
import android.app.Activity;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.File;
import java.io.InputStream;
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

    // „Pobierz z Vantify” i sprawdzanie przy starcie (Grzegorz 10/11/2026): ukryte okno Vantify z zalogowaniem zapamiętanym
    // w WebView (to samo co w „Otwórz Vantify w apce”) i skrypt vantify-sync.js, który czyta listę zleceń (tylko GET).
    // Wynik: {status:"ok", count, jobs} | {status:"login", code?:"bad"} | {status:"error"|"timeout", code}. Bez hasła i tokenu.
    // Gdy logowanie wygasło, a login i hasło są zapisane (VantifyLogin), okno loguje się samo – najwyżej raz.
    @PluginMethod public void sync(PluginCall call) {
        Activity a = getActivity();
        if (a == null) { call.reject("VANTIFY_SYNC"); return; }
        // jedno ukryte okno naraz: drugie wywołanie (np. „Pobierz” w trakcie sprawdzania przy starcie) czeka na ten sam wynik,
        // więc zapisane hasło nie trafia do dwóch formularzy logowania równocześnie (blokada konta)
        a.runOnUiThread(() -> { if (Sync.current != null && Sync.current.join(call)) return; Sync.current = new Sync(a, call); Sync.current.start(); });
    }

    // Zapamiętany login i hasło (Grzegorz 10/11/2026): zapis z Ustawień, odczyt bez hasła, usunięcie. Szczegóły: VantifyLogin.
    @PluginMethod public void saveLogin(PluginCall call) {
        String u = call.getString("user", ""), p = call.getString("pass", "");
        if (u.trim().isEmpty() || p.isEmpty()) { call.reject("VANTIFY_LOGIN_EMPTY"); return; }
        try { VantifyLogin.save(getContext(), u.trim(), p); call.resolve(info()); } catch (Exception e) { call.reject("VANTIFY_LOGIN_SAVE"); }
    }
    @PluginMethod public void loginInfo(PluginCall call) { call.resolve(info()); }
    // „Pokaż” przy zagwiazdkowanym haśle (Grzegorz 10/11/2026) – tylko na jego dotknięcie
    @PluginMethod public void showLogin(PluginCall call) {
        String[] l = VantifyLogin.load(getContext());
        JSObject o = new JSObject(); o.put("user", l != null ? l[0] : ""); o.put("pass", l != null ? l[1] : ""); call.resolve(o);
    }
    @PluginMethod public void clearLogin(PluginCall call) { VantifyLogin.clear(getContext()); call.resolve(info()); }
    private JSObject info() { try { return JSObject.fromJSONObject(VantifyLogin.info(getContext())); } catch (Exception e) { return new JSObject(); } }

    static final class Sync {
        static final long TIMEOUT = 60000;
        static Sync current; // tylko wątek UI
        private final Activity a; private final java.util.List<PluginCall> calls = new java.util.ArrayList<>();
        private final Handler h = new Handler(Looper.getMainLooper());
        private WebView web; private String script = ""; private volatile String host = ""; private boolean finished;
        Sync(Activity a, PluginCall call) { this.a = a; calls.add(call); }
        boolean join(PluginCall c) { if (finished) return false; calls.add(c); return true; }

        void start() {
            try (InputStream in = a.getAssets().open("public/vantify-sync.js")) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); script = new String(o.toByteArray(), StandardCharsets.UTF_8); }
            catch (Exception e) { finish("{\"status\":\"error\",\"code\":\"asset\"}"); return; }
            web = new WebView(a);
            CookieManager.getInstance().setAcceptCookie(true);
            WebSettings s = web.getSettings();
            s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setSupportMultipleWindows(false);
            web.addJavascriptInterface(new Bridge(), "OESTVantifySync");
            web.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !"https".equals(r.getUrl().getScheme()); }
                @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) { host = Uri.parse(url).getHost(); inject(); }
                @Override public void onPageFinished(WebView v, String url) { host = Uri.parse(url).getHost(); inject(); }
            });
            // niewidoczne (1×1 px, przezroczyste), ale podpięte do okna, żeby strona działała jak zwykle
            web.setAlpha(0f);
            ((ViewGroup) a.getWindow().getDecorView()).addView(web, new FrameLayout.LayoutParams(1, 1));
            h.postDelayed(() -> finish("{\"status\":\"timeout\"}"), TIMEOUT);
            web.loadUrl(VantifyActivity.START + "#/user/jobs");
        }

        public final class Bridge {
            // tylko strona Vantify może oddać wynik
            @JavascriptInterface public void result(String json) { if (VantifyActivity.vantify(host) && json != null && json.length() < 2000000) h.post(() -> finish(json)); }
        }

        // login i hasło tylko dla strony Vantify, tylko w tym ukrytym oknie
        private long loginVer = -1; // wersja loginu i hasła podanych oknu (VantifyLogin.ver)
        private void inject() { if (web != null && VantifyActivity.vantify(host)) { if (loginVer < 0) loginVer = VantifyLogin.ver(a); web.evaluateJavascript(VantifyLogin.script(a) + script, null); } }

        private void finish(String json) {
            if (finished) return;
            finished = true;
            h.removeCallbacksAndMessages(null);
            try {
                JSObject r = new JSObject(json);
                // Vantify odrzucił zapisane hasło: nie próbuj więcej, dopóki nie wpiszesz nowego (blokada konta)
                if ("login".equals(r.optString("status")) && "bad".equals(r.optString("code"))) VantifyLogin.markBad(a, loginVer);
                for (PluginCall c : calls) c.resolve(r);
            } catch (Exception e) { for (PluginCall c : calls) c.reject("VANTIFY_SYNC"); }
            if (current == this) current = null;
            if (web != null) {
                try { CookieManager.getInstance().flush(); ViewGroup p = (ViewGroup) web.getParent(); if (p != null) p.removeView(web); web.destroy(); } catch (Exception e) {}
                web = null;
            }
        }
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
