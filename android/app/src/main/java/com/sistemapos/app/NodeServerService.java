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
            // Android 10+ (API 29) prefer LOW_LATENCY for background servers
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                wifiLock = wifiManager.createWifiLock(android.net.wifi.WifiManager.WIFI_MODE_FULL_LOW_LATENCY,
                        "SistemaPOS:WifiLock");
            } else {
                wifiLock = wifiManager.createWifiLock(android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                        "SistemaPOS:WifiLock");
            }
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

        // --- ARRANQUE NATIVO (TERMUX-STYLE) ---
        Log.e(TAG, "🚀 Invocando arranque nativo de Node.js...");
        try {
            com.janeasystems.cdvnodejsmobile.NodeJS.startEngineDirectly(this, "main.js");
            Log.d(TAG, "✅ Llamada a startEngineDirectly completada.");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error fatal arrancando Node nativamente: " + e.getMessage());
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Esto se dispara cuando el usuario desliza la app en recientes
        Log.d(TAG, "onTaskRemoved: App swiped away. Restarting service to keep server alive.");

        // Reiniciar el servicio en primer plano inmediatamente
        Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
        restartServiceIntent.setPackage(getPackageName());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartServiceIntent);
        } else {
            startService(restartServiceIntent);
        }

        super.onTaskRemoved(rootIntent);
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
                    "Servidor POS (Inmortal)",
                    NotificationManager.IMPORTANCE_HIGH); // Subir a HIGH para mayor visibilidad/prioridad
            channel.setDescription("Mantiene el servidor POS activo permanentemente");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

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
                .setContentTitle("Servidor POS Encendido")
                .setContentText("El sistema está operando en segundo plano (Modo Persistente)")
                .setSmallIcon(iconResId)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX) // Prioridad máxima
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();
    }
}
