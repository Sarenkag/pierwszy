package com.oest.inspekcje;

import android.accounts.Account;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import java.util.ArrayList;
import java.util.List;

/**
 * Ciche odnowienie pozwolenia Google (Grzegorz 04/11/2026: „ma być smoothly”, bez łączenia za każdym razem).
 * Gdy Grzegorz raz zgodził się na dany zakres (Gmail, Dysk…), Google daje nowy token bez żadnego okna.
 * Jeśli potrzebna jest zgoda (pierwszy raz albo cofnięta), NIC nie pokazujemy: odrzucamy z NEEDS_UI
 * i apka wraca do zwykłego logowania (okno „Połącz ponownie”).
 */
@CapacitorPlugin(name = "OESTGoogleToken")
public class GoogleTokenPlugin extends Plugin {

    @PluginMethod
    public void token(PluginCall call) {
        JSArray arr = call.getArray("scopes");
        String email = call.getString("email", "");
        List<Scope> scopes = new ArrayList<>();
        try {
            for (int i = 0; arr != null && i < arr.length(); i++) scopes.add(new Scope(arr.getString(i)));
        } catch (Exception e) { call.reject("SCOPES"); return; }
        if (scopes.isEmpty() || email == null || email.isEmpty()) { call.reject("SCOPES"); return; }
        AuthorizationRequest.Builder b = AuthorizationRequest.builder().setRequestedScopes(scopes);
        b.setAccount(new Account(email, "com.google"));
        Identity.getAuthorizationClient(getContext()).authorize(b.build())
            .addOnSuccessListener(r -> {
                if (r.hasResolution() || r.getAccessToken() == null) { call.reject("NEEDS_UI"); return; }
                JSObject out = new JSObject();
                out.put("token", r.getAccessToken());
                out.put("email", email);
                call.resolve(out);
            })
            .addOnFailureListener(e -> call.reject("SILENT_FAILED: " + e.getMessage()));
    }
}
