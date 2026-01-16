package com.sistemapos.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.pm.ServiceInfo;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service - Just keeps the app alive,
 * Node.js is started by the NodeJS Cordova plugin automatically
 */
public class NodeServerService extends Service {

    private static final String TAG = "NodeServerService";
    private static final String CHANNEL_ID = "NodeServerChannel";
    private static final int NOTIFICATION_ID = 1001;

    private PowerManager.WakeLock wakeLock;
    private android.net.wifi.WifiManager.WifiLock wifiLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "NodeServerService onCreate");

        // Adquirir WakeLock para mantener la CPU encendida
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SistemaPOS:NodeServerLock");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();

        // Adquirir WifiLock para mantener el socket activo
        android.net.wifi.WifiManager wifiManager = (android.net.wifi.WifiManager) getApplicationContext()
                .getSystemService(android.content.Context.WIFI_SERVICE);
        if (wifiManager != null) {
            wifiLock = wifiManager.createWifiLock(android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                    "SistemaPOS:WifiLock");
            wifiLock.setReferenceCounted(false);
            wifiLock.acquire();
        }

        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "NodeServerService onStartCommand");
        Notification notification = createNotification();

        if (Build.VERSION.SDK_INT >= 34) { // Android 14 (Upside Down Cake)
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "NodeServerService onDestroy");
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            wifiLock.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Servidor POS",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Mantiene el servidor POS activo en segundo plano");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        // Usar un icono valido del proyecto
        int iconResId = android.R.drawable.ic_dialog_info;
        try {
            // Intentar obtener el icono de la app si existe
            iconResId = getApplicationInfo().icon;
        } catch (Exception e) {
            Log.e(TAG, "Error getting app icon", e);
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("POS Activo")
                .setContentText("El servidor está funcionando en segundo plano")
                .setSmallIcon(iconResId)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }
}
