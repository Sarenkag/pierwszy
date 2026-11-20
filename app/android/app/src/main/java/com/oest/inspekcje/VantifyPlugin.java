package com.oest.inspekcje;

import android.content.Context;
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
import android.view.WindowManager;
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
import java.io.FileOutputStream;
import org.json.JSONObject;

// Vantify w apce (Grzegorz 10/11/2026): otwiera VantifyActivity, po zamknięciu oddaje pobrany eksport Job (csv)
// i zapis „Zbadaj” (log). Pliki przechodzą przez cache, nie przez Intent (limit wielkości). Bez loginu i hasła.
@CapacitorPlugin(name = "Vantify")
public class VantifyPlugin extends Plugin {
    @PluginMethod public void open(PluginCall call) {
        Intent i = new Intent(getContext(), VantifyActivity.class);
        i.putExtra("lang", call.getString("lang", "pl"));
        // przyciski Vantify (PROD-038), pierwsze użycie: okno otwiera się od razu na zakładaniu/zleceniu, z tekstem EN do skopiowania
        // i z gotowym Job Sheet do pola Upload (plik w cache/vantify, udostępniany tylko temu oknu przez FileProvider)
        i.putExtra("hash", call.getString("hash", ""));
        i.putExtra("summary", call.getString("summary", ""));
        i.putExtra("description", call.getString("description", ""));
        i.putExtra("text", call.getString("text", "")); // „Send update” (Grzegorz 20/11/2026): tekst wiadomości do skopiowania
        new File(VantifyActivity.dirOf(getContext()), "events.json").delete();
        String b64 = call.getString("fileB64", ""), name = call.getString("fileName", "");
        File sheets = new File(VantifyActivity.dirOf(getContext()), "jobsheet");
        if (sheets.exists()) for (File f : sheets.listFiles()) f.delete();
        if (!b64.isEmpty() && name.matches("[^/\\\\]{1,180}\\.(pdf|jpg|jpeg|png)")) {
            try { sheets.mkdirs(); File f = new File(sheets, name); try (FileOutputStream o = new FileOutputStream(f)) { o.write(android.util.Base64.decode(b64, android.util.Base64.DEFAULT)); } i.putExtra("file", f.getAbsolutePath()); }
            catch (Exception e) { call.reject("VANTIFY_FILE"); return; }
        }
        startActivityForResult(call, i, "done");
    }

    // Przyciski Vantify (Grzegorz 18/11/2026 „Tak”, PROD-038): jedno zadanie w ukrytym oknie Vantify (vantify-akcje.js):
    // op create | close | status. Wzory zapytań (nauczone w oknie Vantify w apce) dokłada telefon; apka ich nie widzi.
    // Wynik: {status:"ok"|"nowzor"|"differs"|"login"|"error", …}. Zawsze tylko jedno okno naraz.
    @PluginMethod public void action(PluginCall call) {
        Activity a = getActivity();
        JSObject act = call.getObject("action");
        if (a == null || act == null) { call.reject("VANTIFY_ACTION"); return; }
        String wz = Wzory.load(getContext()).toString(), payload = act.toString();
        a.runOnUiThread(() -> {
            if (Sync.current != null) { call.reject("VANTIFY_BUSY"); return; }
            Sync.current = new Sync(a, call, "action", "window.__oestAction=" + payload + ";window.__oestWzory=" + wz + ";"); Sync.current.limit = Sync.actionLimit(act); Sync.current.start();
        });
    }
    // które wzory już są w telefonie (bez treści): {create, commence, complete, attach, update}
    @PluginMethod public void wzory(PluginCall call) {
        JSONObject w = Wzory.load(getContext()); JSObject o = new JSObject();
        for (String k : new String[] { "create", "commence", "complete", "attach", "update" }) o.put(k, w.has(k));
        call.resolve(o);
    }

    // Wzory zapytań Vantify (PROD-038): tylko w tym telefonie, poza kopią zapasową (noBackupFilesDir), bez Summary, Description, dat i plików.
    static final class Wzory {
        static File file(Context c) { return new File(c.getNoBackupFilesDir(), "vantify-wzory.json"); }
        static synchronized JSONObject load(Context c) { try { return new JSONObject(read(file(c))); } catch (Exception e) { return new JSONObject(); } }
        static synchronized void save(Context c, String kind, String json) {
            try {
                JSONObject all = load(c); all.put(kind, new JSONObject(json));
                File tmp = new File(file(c).getPath() + ".tmp");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(all.toString().getBytes(StandardCharsets.UTF_8)); o.getFD().sync(); }
                if (!tmp.renameTo(file(c))) tmp.delete();
            } catch (Exception e) {}
        }
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
        // mode "explore" = „Zbadaj automatycznie”: to samo ukryte okno, tylko odczyt, dłuższy limit czasu, wynik = zapis „Zbadaj”
        String mode = "explore".equals(call.getString("mode", "")) ? "explore" : "list";
        a.runOnUiThread(() -> { if (Sync.current != null && Sync.current.join(call, mode)) return; Sync.current = new Sync(a, call, mode, ""); Sync.current.start(); });
    }

    // Zapamiętany login i hasło (Grzegorz 10/11/2026): zapis z Ustawień, odczyt bez hasła, usunięcie. Szczegóły: VantifyLogin.
    @PluginMethod public void saveLogin(PluginCall call) {
        String u = call.getString("user", ""), p = call.getString("pass", "");
        if (u.trim().isEmpty() || p.isEmpty()) { call.reject("VANTIFY_LOGIN_EMPTY"); return; }
        try { VantifyLogin.save(getContext(), u.trim(), p); call.resolve(info()); } catch (Exception e) { call.reject("VANTIFY_LOGIN_SAVE"); }
    }
    @PluginMethod public void loginInfo(PluginCall call) { call.resolve(info()); }
    // „Pokaż” przy zagwiazdkowanym haśle (Grzegorz 10/11/2026) – tylko na jego dotknięcie.
    // Hasło pokazuje okienko Androida; ekran apki (JS) nigdy go nie dostaje (ustalenie #39, Grzegorz 19/11/2026).
    // Wynik: tylko {ok} – true, gdy okienko pokazało zapisane hasło.
    @PluginMethod public void showLogin(PluginCall call) {
        Activity a = getActivity();
        String[] l = VantifyLogin.load(getContext());
        JSObject o = new JSObject(); o.put("ok", l != null && a != null);
        if (l == null || a == null) { call.resolve(o); return; }
        boolean pl = !"en".equals(call.getString("lang", "pl"));
        a.runOnUiThread(() -> {
            android.app.AlertDialog d = new android.app.AlertDialog.Builder(a)
                .setTitle(pl ? "Zapisane hasło Vantify" : "Saved Vantify password")
                .setMessage(l[1]).setPositiveButton("OK", null).create();
            d.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE); // bez zrzutów ekranu i podglądu w ostatnich apkach
            d.show();
            call.resolve(o);
        });
    }
    @PluginMethod public void clearLogin(PluginCall call) { VantifyLogin.clear(getContext()); call.resolve(info()); }
    private JSObject info() { try { return JSObject.fromJSONObject(VantifyLogin.info(getContext())); } catch (Exception e) { return new JSObject(); } }

    static final class Sync {
        static final long TIMEOUT = 60000, TIMEOUT_EXPLORE = 600000, TIMEOUT_ACTION = 180000, PER_FILE = 60000, MAX_ACTION = 900000;
        // zakładanie ze zdjęciami przed (20/11/2026): każde zdjęcie to 2 zapytania – czas rośnie z liczbą zdjęć, najwyżej 15 min (przegląd Codex #166)
        static long actionLimit(JSObject act) { org.json.JSONArray f = act.optJSONArray("files"); int n = f == null ? 0 : f.length(); return Math.min(MAX_ACTION, TIMEOUT_ACTION + PER_FILE * n); }
        long limit = TIMEOUT_ACTION;
        private String asset(String p) throws Exception {
            try (InputStream in = a.getAssets().open(p)) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); return new String(o.toByteArray(), StandardCharsets.UTF_8); }
        }
        static Sync current; // tylko wątek UI
        private final Activity a; private final java.util.List<PluginCall> calls = new java.util.ArrayList<>();
        private final Handler h = new Handler(Looper.getMainLooper());
        private WebView web; private String script = ""; private volatile String host = ""; private boolean finished;
        private final boolean explore, action; private final String mode, pre;
        Sync(Activity a, PluginCall call, String mode, String pre) { this.a = a; this.mode = mode; this.pre = pre; explore = "explore".equals(mode); action = "action".equals(mode); calls.add(call); }
        // trwające okno: to samo zadanie (odczyt listy, Zbadaj) dołącza; inne zadanie albo przycisk Vantify – odrzucone („spróbuj za chwilę”)
        boolean join(PluginCall c, String m) { if (finished) return false; if (action || !m.equals(mode)) { c.reject("VANTIFY_BUSY"); return true; } calls.add(c); return true; }

        void start() {
            try { script = (explore ? "window.__oestMode='explore';" + asset("public/vantify-rejestr.js") : action ? "window.__oestMode='action';" + pre + asset("public/vantify-akcje.js") : "") + asset("public/vantify-sync.js"); }
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
            // Zbadaj trwa minuty: ekran nie gaśnie, bo uśpiony telefon wstrzymuje okno (Zbadaj 11/11: 20 min przerwy po 150 odczytach)
            if (explore) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            h.postDelayed(() -> finish("{\"status\":\"timeout\"}"), explore ? TIMEOUT_EXPLORE : action ? limit : TIMEOUT);
            web.loadUrl(VantifyActivity.START + "#/user/jobs");
        }

        public final class Bridge {
            // tylko strona Vantify może oddać wynik
            // duży wynik przychodzi częściami (part), potem result("__parts__"); limit całości 32 MB (przegląd Codex #135)
            private final StringBuilder parts = new StringBuilder(); private boolean partsBad;
            @JavascriptInterface public synchronized void part(String c) { if (!VantifyActivity.vantify(host) || c == null || parts.length() + c.length() > 32000000) partsBad = true; else parts.append(c); }
            @JavascriptInterface public synchronized void result(String json) {
                if (!VantifyActivity.vantify(host) || json == null) return;
                if ("__parts__".equals(json)) { String all = partsBad ? "{\"status\":\"error\",\"code\":\"too-big\"}" : parts.toString(); parts.setLength(0); h.post(() -> finish(all)); return; }
                if (json.length() < 4000000) h.post(() -> finish(json));
            }
            // czy jest zapisany login, którym okno może się zalogować (bez hasła)
            @JavascriptInterface public boolean hasLogin() { return VantifyLogin.load(a) != null && !VantifyLogin.bad(a); }
            // formularz logowania gotowy: Android sam wpisuje login i hasło (ustalenia #39 i #41, 19/11/2026)
            @JavascriptInterface public void fillLogin() { h.post(Sync.this::fill); }
        }

        // Login i hasło nie są zmienną strony (dawniej window.__oestLogin). Wpisanie RAZ na okno, tylko gdy strona,
        // która jest teraz otwarta (web.getUrl, sprawdzane w wątku okna), to Vantify. Hasło żyje tylko w tym jednym wywołaniu.
        private long loginVer = -1; // wersja loginu i hasła podanych oknu (VantifyLogin.ver)
        private boolean filled;
        private void fill() {
            if (filled || finished || web == null) return;
            String u = web.getUrl();
            if (u == null || !VantifyActivity.vantify(Uri.parse(u).getHost()) || VantifyLogin.bad(a)) return;
            String[] l = VantifyLogin.load(a);
            if (l == null) return;
            filled = true; loginVer = VantifyLogin.ver(a);
            web.evaluateJavascript(VantifyLogin.fill(l), null);
        }
        private void inject() { VantifyWeb.inject(web, host, VantifyLogin.script(a) + script); }

        private void finish(String json) {
            if (finished) return;
            finished = true;
            h.removeCallbacksAndMessages(null);
            if (explore) a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
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
            File csv = new File(dir, "export.csv"), name = new File(dir, "name.txt"), log = new File(dir, "log.json"), ev = new File(dir, "events.json");
            if (csv.exists()) { out.put("csv", read(csv)); out.put("name", name.exists() ? read(name) : "export.csv"); }
            out.put("log", log.exists() ? new JSArray(read(log)) : new JSArray());
            // przyciski Vantify (PROD-038): co Grzegorz zrobił w oknie – założone/rozpoczęte/zamknięte zlecenia (rodzaj i numer)
            out.put("events", ev.exists() ? new JSArray(read(ev)) : new JSArray());
            for (File f : new File[] { csv, name, log, ev }) f.delete();
            call.resolve(out);
        } catch (Exception e) { call.reject("VANTIFY_RESULT"); }
    }

    private static String read(File f) throws Exception {
        try (FileInputStream in = new FileInputStream(f)) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[16384]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); return new String(o.toByteArray(), StandardCharsets.UTF_8); }
    }
}
