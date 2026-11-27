package com.oest.inspekcje;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.webkit.WebSettings;
import android.webkit.WebView;
import java.io.File;
import java.io.FileOutputStream;

// Podgląd PDF w apce (Grzegorz 27/11/2026: „tylko podgląd, żeby mógł powiększać”): strony z wbudowanego w Androida PdfRenderer
// jako obrazki w WebView z powiększaniem palcami. Bez wyboru zewnętrznej aplikacji. Wstecz zamyka. Nic nie wysyła i nie zapisuje poza cache.
public class PdfPodgladActivity extends Activity {
    static final String PLIK = "plik";
    static final int SZER = 1400; // px strony: ostre przy powiększeniu, bez nadmiaru pamięci
    private WebView web;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17, 17, 17));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(false);
        s.setAllowFileAccess(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        setContentView(web);
        String sciezka = getIntent().getStringExtra(PLIK);
        if (sciezka == null) { finish(); return; }
        File pdf = new File(sciezka);
        new Thread(() -> {
            String html;
            try { html = strony(pdf); } catch (Exception e) { html = "<p style='color:#fff;font:16px sans-serif;padding:16px'>PDF: " + e.getClass().getSimpleName() + "</p>"; }
            final String h = html;
            runOnUiThread(() -> { if (!isFinishing()) web.loadDataWithBaseURL("file://" + pdf.getParent() + "/", h, "text/html", "utf-8", null); });
        }).start();
    }

    // każda strona → strona-N.jpg obok PDF-a; HTML z obrazkami jedna pod drugą
    private static String strony(File pdf) throws Exception {
        StringBuilder sb = new StringBuilder("<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=8, user-scalable=yes'>"
            + "<style>body{margin:0;background:#111}img{display:block;width:100%;height:auto;margin:0 0 8px;background:#fff}</style></head><body>");
        try (ParcelFileDescriptor fd = ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY); PdfRenderer r = new PdfRenderer(fd)) {
            for (int i = 0; i < r.getPageCount(); i++) {
                try (PdfRenderer.Page p = r.openPage(i)) {
                    int h = Math.max(1, Math.round(SZER * (float) p.getHeight() / p.getWidth()));
                    Bitmap bm = Bitmap.createBitmap(SZER, h, Bitmap.Config.ARGB_8888);
                    bm.eraseColor(Color.WHITE);
                    p.render(bm, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                    File out = new File(pdf.getParentFile(), "strona-" + (i + 1) + ".jpg");
                    try (FileOutputStream o = new FileOutputStream(out)) { bm.compress(Bitmap.CompressFormat.JPEG, 88, o); }
                    bm.recycle();
                    sb.append("<img alt='' src='").append(out.getName()).append("'>");
                }
            }
        }
        return sb.append("</body></html>").toString();
    }

    @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
