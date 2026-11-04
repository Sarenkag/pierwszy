package com.oest.inspekcje;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.lang.ref.WeakReference;

// Wynik sesji instalacji.
// - Android chce potwierdzenia (np. pierwsza cicha aktualizacja) → pokazuje jego okno.
// - Cicha instalacja się nie udała → otwiera zwykły instalator z tym samym pobranym APK, żeby aktualizacja zawsze doszła do końca.
public class UpdateStatusReceiver extends BroadcastReceiver {
    static WeakReference<Activity> activity = new WeakReference<>(null); // ustawia AppUpdatePlugin – okno z aktywności nie jest blokowane w tle
    static File lastApk = null;

    private static void open(Context ctx, Intent i) {
        Activity a = activity.get();
        if (a != null && !a.isFinishing()) a.runOnUiThread(() -> a.startActivity(i));
        else { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); ctx.startActivity(i); }
    }

    @Override public void onReceive(Context ctx, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        boolean pl = !"en".equals(java.util.Locale.getDefault().getLanguage());
        if (status == PackageInstaller.STATUS_SUCCESS) return;
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = Build.VERSION.SDK_INT >= 33
                ? intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                : intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) { open(ctx, confirm); return; }
        }
        if (status == PackageInstaller.STATUS_FAILURE_ABORTED) {
            Toast.makeText(ctx, pl ? "Aktualizacja anulowana." : "Update cancelled.", Toast.LENGTH_LONG).show();
            return;
        }
        // każdy inny błąd: zwykły instalator Androida z tym samym plikiem (jak przed cichą aktualizacją)
        try {
            if (lastApk == null || !lastApk.exists()) throw new IllegalStateException("APK");
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", lastApk);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            open(ctx, i);
        } catch (Exception e) {
            Toast.makeText(ctx, pl ? "Aktualizacja nie powiodła się. Spróbuj ponownie." : "Update failed. Please try again.", Toast.LENGTH_LONG).show();
        }
    }
}
