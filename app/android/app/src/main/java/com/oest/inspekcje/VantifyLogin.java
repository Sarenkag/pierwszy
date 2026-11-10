package com.oest.inspekcje;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

// Zapamiętany login i hasło do Vantify (Grzegorz 10/11/2026: „zapiszę login i hasło, żeby apka nie musiała mnie pytać,
// jak logowanie wygaśnie”). Hasło zaszyfrowane kluczem z sejfu Androida (Keystore): klucz nie opuszcza telefonu, więc
// kopia zapasowa ani inna apka go nie odczyta. Hasło czyta ukryte okno Vantify; ekran apki dostaje je tylko po „Pokaż”.
// „bad” = Vantify odrzucił zapisane hasło: apka nie próbuje drugi raz (blokada konta), czeka na nowe hasło.
final class VantifyLogin {
    private static final String KEY = "oest_vantify_login", PREFS = "oest_vantify_login";

    private VantifyLogin() {}

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if (ks.containsAlias(KEY)) return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY, null)).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(new KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return g.generateKey();
    }

    static void save(Context c, String user, String pass) throws Exception {
        Cipher x = Cipher.getInstance("AES/GCM/NoPadding"); x.init(Cipher.ENCRYPT_MODE, key());
        byte[] ct = x.doFinal(pass.getBytes(StandardCharsets.UTF_8));
        boolean ok = prefs(c).edit().putString("u", user).putString("iv", Base64.encodeToString(x.getIV(), Base64.NO_WRAP))
            .putString("ct", Base64.encodeToString(ct, Base64.NO_WRAP)).putBoolean("bad", false).commit();
        if (!ok || load(c) == null) throw new Exception("VANTIFY_LOGIN_SAVE"); // DATA-002: zapis potwierdzony odczytem
    }

    // [login, hasło] albo null (brak zapisu, inny telefon po przywróceniu kopii – klucza tam nie ma)
    static String[] load(Context c) {
        SharedPreferences p = prefs(c);
        String u = p.getString("u", null), iv = p.getString("iv", null), ct = p.getString("ct", null);
        if (u == null || iv == null || ct == null) return null;
        try {
            Cipher x = Cipher.getInstance("AES/GCM/NoPadding");
            x.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            return new String[] { u, new String(x.doFinal(Base64.decode(ct, Base64.NO_WRAP)), StandardCharsets.UTF_8) };
        } catch (Exception e) { return null; }
    }

    static void clear(Context c) { prefs(c).edit().clear().commit(); }
    static boolean bad(Context c) { return prefs(c).getBoolean("bad", false); }
    static void markBad(Context c) { prefs(c).edit().putBoolean("bad", true).commit(); }

    // dla ekranu Ustawień: sam login (bez hasła), czy zapisane, czy odrzucone
    static JSONObject info(Context c) {
        JSONObject o = new JSONObject();
        try { String[] l = load(c); o.put("saved", l != null); o.put("user", l != null ? l[0] : ""); o.put("bad", l != null && bad(c)); } catch (Exception e) {}
        return o;
    }

    // skrypt dla ukrytego okna Vantify: login i hasło jako bezpieczne literały JS (JSONObject.quote)
    static String script(Context c) {
        if (bad(c)) return "window.__oestLoginBad=1;"; // bez hasła; okno zgłasza „bad”, apka prosi o aktualne hasło
        String[] l = load(c);
        if (l == null) return "";
        return "window.__oestLogin={u:" + JSONObject.quote(l[0]) + ",p:" + JSONObject.quote(l[1]) + "};";
    }
}
