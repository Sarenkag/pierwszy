package com.oest.inspekcje;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import com.getcapacitor.WebViewListener;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// Logowanie Google: ekran zgody Google wraca tutaj, a stąd do wtyczki SocialLogin (wymóg wtyczki).
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HandoverPlugin.class);
        registerPlugin(CalendarPlugin.class);
        registerPlugin(KeysPlugin.class);
        registerPlugin(ReportSharePlugin.class);
        registerPlugin(TranslatePlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(PhotoEditPlugin.class);
        registerPlugin(ModelPlugin.class);
        super.onCreate(savedInstanceState);
        // Każda strona (menu → inspekcje → menu) ładuje się od nowa: prosimy system o ponowne podanie wysokości pasków,
        // żeby przyciski na dole nie chowały się pod paskiem nawigacji telefonu (test w terenie 03/11/2026).
        getBridge().addWebViewListener(new WebViewListener() {
            @Override public void onPageLoaded(WebView webView) { ViewCompat.requestApplyInsets(getWindow().getDecorView()); }
        });
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle handle = getBridge().getPlugin("SocialLogin");
            if (handle == null) return;
            SocialLoginPlugin plugin = (SocialLoginPlugin) handle.getInstance();
            plugin.handleGoogleLoginIntent(requestCode, data);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
