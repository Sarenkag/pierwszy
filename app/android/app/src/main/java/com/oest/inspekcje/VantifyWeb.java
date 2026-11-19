package com.oest.inspekcje;

import android.webkit.WebView;

// Jedno miejsce wstrzykiwania skryptów do okien Vantify (ustalenie #42, 19/11/2026): ukryte okno (VantifyPlugin.Sync)
// i widoczne okno (VantifyActivity) wstrzykują tylko tędy, tylko na stronach *.vantify.com. Skrypty nie zawierają hasła.
final class VantifyWeb {
    private VantifyWeb() {}

    static void inject(WebView web, String host, String js) {
        if (web == null || js == null || js.isEmpty() || !VantifyActivity.vantify(host)) return;
        web.evaluateJavascript(js, null);
    }
}
