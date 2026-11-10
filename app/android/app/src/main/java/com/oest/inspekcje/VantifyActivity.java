package com.oest.inspekcje;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

// Vantify w apce (Grzegorz 10/11/2026, PROD-035): strona Vantify w osobnym oknie apki.
// Logujesz się sam na stronie Vantify; apka NIE zapisuje loginu ani hasła (może je podpowiedzieć menedżer haseł Google
// przez autouzupełnianie Androida). Zalogowanie (ciasteczka) zostaje w WebView, więc logowanie bywa rzadkie.
// Gdy w Vantify pobierzesz eksport Job (Download), apka bierze plik i oddaje go do wczytania (podgląd + zapis po OK).
// Zapis „Zbadaj” (vantify-rejestr.js): adresy wywołań i kształt odpowiedzi, bez haseł, tokenów i danych osób.
public class VantifyActivity extends Activity {
    static final String START = "https://savillsuk.cafm.vantify.com/";
    static final int MAX_FILE = 5 * 1024 * 1024, MAX_LOG = 600;
    private WebView web;
    private TextView info;
    private final JSONArray log = new JSONArray();
    private volatile String host = "";
    private String rejestr = "", csv = null, csvName = null;
    private boolean pl = true;

    static File dir(Activity a) { File d = new File(a.getCacheDir(), "vantify"); d.mkdirs(); return d; }
    static boolean vantify(String h) { return h != null && (h.equals("vantify.com") || h.endsWith(".vantify.com")); }
    static boolean jobExport(String text) { if (text == null) return false; int nl = text.indexOf('\n'); String head = nl > 0 ? text.substring(0, nl) : text; return head.contains("jobType") && head.contains("completeBy"); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        pl = !"en".equals(getIntent().getStringExtra("lang"));
        File[] old = dir(this).listFiles(); if (old != null) for (File f : old) f.delete();
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(11, 22, 32));
        LinearLayout bar = new LinearLayout(this); bar.setGravity(Gravity.CENTER_VERTICAL); bar.setPadding(32, 24, 24, 24);
        info = new TextView(this); info.setTextColor(Color.WHITE); info.setTextSize(15);
        info.setText(pl ? "Vantify · zaloguj się, potem Jobs → Export → Download" : "Vantify · sign in, then Jobs → Export → Download");
        bar.addView(info, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        Button done = new Button(this); done.setText(pl ? "Zakończ" : "Done"); done.setOnClickListener(v -> finishWithResult());
        bar.addView(done);
        web = new WebView(this);
        root.addView(bar, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
        // Android 15+ rysuje okno pod paskami (edge-to-edge, targetSdk 36): odsuń treść od pasków, wycięcia i klawiatury
        root.setOnApplyWindowInsetsListener((v, in) -> {
            int l, t, r, btm;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = in.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout() | android.view.WindowInsets.Type.ime());
                l = i.left; t = i.top; r = i.right; btm = i.bottom;
            } else { l = in.getSystemWindowInsetLeft(); t = in.getSystemWindowInsetTop(); r = in.getSystemWindowInsetRight(); btm = in.getSystemWindowInsetBottom(); }
            v.setPadding(l, t, r, btm);
            return in;
        });
        // Android 13+: systemowy Wstecz (przy targetSdk 36 onBackPressed nie jest wołane)
        if (android.os.Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        if (android.os.Build.VERSION.SDK_INT >= 26) web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES); // menedżer haseł Google może podpowiedzieć login
        try { rejestr = asset("public/vantify-rejestr.js"); } catch (Exception e) { rejestr = ""; }
        web.addJavascriptInterface(new Bridge(), "OESTVantifyBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !"https".equals(r.getUrl().getScheme()); // tylko https w tym oknie (bez mailto:, intent: itp.)
            }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) { host = Uri.parse(url).getHost(); inject(); }
            @Override public void onPageFinished(WebView v, String url) { host = Uri.parse(url).getHost(); inject(); }
        });
        web.setDownloadListener((url, ua, cd, mime, len) -> {
            String name = URLUtil.guessFileName(url, cd, mime);
            // do zapisu „Zbadaj” tylko bezpieczne metadane: host i rozszerzenie pliku (nazwa i ścieżka mogą zawierać dane osób)
            add("download", url.startsWith("blob:") ? "blob" : Uri.parse(url).getHost(), ext(name));
            info.setText(pl ? "Pobieranie " + name + "…" : "Downloading " + name + "…");
            if (url.startsWith("blob:")) {
                web.evaluateJavascript("fetch(" + JSONObject.quote(url) + ").then(function(r){return r.text()}).then(function(t){OESTVantifyBridge.file(t," + JSONObject.quote(name) + ")})", null);
                return;
            }
            if (!url.startsWith("https://")) return;
            new Thread(() -> {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    String cookie = CookieManager.getInstance().getCookie(url);
                    if (cookie != null) c.setRequestProperty("Cookie", cookie);
                    c.setRequestProperty("User-Agent", ua);
                    c.setConnectTimeout(20000); c.setReadTimeout(60000);
                    try (InputStream in = c.getInputStream()) {
                        ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buf = new byte[16384]; int n;
                        while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); if (out.size() > MAX_FILE) throw new IllegalStateException("VANTIFY_FILE_SIZE"); }
                        String text = new String(out.toByteArray(), StandardCharsets.UTF_8);
                        runOnUiThread(() -> onFile(text, name));
                    }
                } catch (Exception e) { runOnUiThread(() -> info.setText(pl ? "Nie udało się pobrać pliku. Spróbuj jeszcze raz." : "Could not download the file. Try again.")); }
            }).start();
        });
        web.loadUrl(START);
    }

    private void inject() { if (vantify(host) && !rejestr.isEmpty()) web.evaluateJavascript(rejestr, null); }

    private void onFile(String text, String name) {
        if (!jobExport(text)) { info.setText(pl ? "Pobrany plik to nie eksport Job: " + name : "The downloaded file is not a Job export: " + name); return; }
        csv = text; csvName = name;
        info.setText(pl ? "Mam eksport " + name : "Got export " + name);
        finishWithResult(); // od razu do podglądu w apce
    }

    static String ext(String name) { int i = name == null ? -1 : name.lastIndexOf('.'); String e = i >= 0 ? name.substring(i).toLowerCase() : ""; return e.matches("\\.[a-z0-9]{1,5}") ? e : ""; }

    private synchronized void add(String k, String u, String name) {
        try { if (log.length() < MAX_LOG) log.put(new JSONObject().put("t", System.currentTimeMillis()).put("k", k).put("u", u).put("name", name)); } catch (Exception e) {}
    }

    private class Bridge {
        // Strony spoza vantify.com (np. logowanie firmowe) nic tu nie zapisują.
        @JavascriptInterface public void log(String json) {
            if (!vantify(host) || json == null || json.length() > 20000) return;
            synchronized (VantifyActivity.this) { try { if (log.length() < MAX_LOG) log.put(new JSONObject(json)); } catch (Exception e) {} }
        }
        @JavascriptInterface public void file(String text, String name) {
            if (!vantify(host) || text == null || text.length() > MAX_FILE) return;
            runOnUiThread(() -> onFile(text, name));
        }
    }

    private String asset(String path) throws Exception {
        try (InputStream in = getAssets().open(path)) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); return new String(o.toByteArray(), StandardCharsets.UTF_8); }
    }

    private void write(String name, String text) throws Exception { try (FileOutputStream o = new FileOutputStream(new File(dir(this), name))) { o.write(text.getBytes(StandardCharsets.UTF_8)); } }

    private void finishWithResult() {
        try {
            synchronized (this) { write("log.json", log.toString()); }
            if (csv != null) { write("export.csv", csv); write("name.txt", csvName == null ? "export.csv" : csvName); }
        } catch (Exception e) {}
        setResult(RESULT_OK, new Intent());
        finish();
    }

    // Wstecz: poprzednia strona Vantify, a na pierwszej stronie wyjście z zapisem wyniku (eksport, zapis „Zbadaj”)
    private void back() { if (web != null && web.canGoBack()) web.goBack(); else finishWithResult(); }
    @Override public void onBackPressed() { back(); }

    @Override protected void onDestroy() { CookieManager.getInstance().flush(); if (web != null) web.destroy(); super.onDestroy(); }
}
