package com.sistemapos.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Solicitar permiso de notificaciones en Android 13+
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(
                    android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[] { android.Manifest.permission.POST_NOTIFICATIONS }, 101);
            }
        }

        // Iniciar el servicio en primer plano para mantener el servidor activo
        Intent serviceIntent = new Intent(this, NodeServerService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (Build.VERSION.SDK_INT >= 34) {
                // Android 14 requiere especificar el tipo si no se hace en el Manifest.
                // Pero startForegroundService es suficiente aqui, el tipo se valida al llamar
                // startForeground en el servicio.
            }
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}
