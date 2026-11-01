package com.oest.inspekcje;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;

// Tłumaczenie komentarza PL→EN w telefonie (ML Kit, offline). Za pierwszym razem pobiera model (~30 MB).
@CapacitorPlugin(name = "Translate")
public class TranslatePlugin extends Plugin {
    private Translator translator;

    @PluginMethod public void plToEn(PluginCall call) {
        final String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) { JSObject r = new JSObject(); r.put("text", ""); call.resolve(r); return; }
        if (translator == null) translator = Translation.getClient(new TranslatorOptions.Builder()
            .setSourceLanguage(TranslateLanguage.POLISH).setTargetLanguage(TranslateLanguage.ENGLISH).build());
        translator.downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .addOnSuccessListener(v -> translator.translate(text)
                .addOnSuccessListener(t -> { JSObject r = new JSObject(); r.put("text", t); call.resolve(r); })
                .addOnFailureListener(e -> call.reject("Tłumaczenie nie powiodło się", e)))
            .addOnFailureListener(e -> call.reject("Nie udało się pobrać słownika (potrzebna sieć za pierwszym razem)", e));
    }

    @Override protected void handleOnDestroy() { if (translator != null) translator.close(); }
}
