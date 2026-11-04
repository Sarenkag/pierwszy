package com.oest.inspekcje;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.widget.Toast;

// Wynik sesji instalacji. Gdy Android mimo wszystko chce potwierdzenia (np. pierwsza cicha aktualizacja), otwiera jego okno.
public class UpdateStatusReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context ctx, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = Build.VERSION.SDK_INT >= 33
                ? intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                : intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) { confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); ctx.startActivity(confirm); }
        } else if (status != PackageInstaller.STATUS_SUCCESS) {
            boolean pl = !"en".equals(java.util.Locale.getDefault().getLanguage());
            Toast.makeText(ctx, pl ? "Aktualizacja nie powiodła się. Spróbuj ponownie." : "Update failed. Please try again.", Toast.LENGTH_LONG).show();
        }
    }
}
