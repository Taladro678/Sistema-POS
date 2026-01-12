/**
 * Servicio de Audio para notificaciones del sistema POS
 * Maneja sonidos de notificación para eventos importantes
 */

class AudioService {
    constructor() {
        this.isEnabled = localStorage.getItem('audioNotifications') !== 'false';
        this.volume = parseFloat(localStorage.getItem('notificationVolume') || '0.7');

        // Contexto de audio para generar tonos
        this.audioContext = null;
        if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Genera un tono de notificación usando Web Audio API
     */
    playBeep(frequency = 800, duration = 200, volume = this.volume) {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.error('Error playing beep:', error);
        }
    }

    /**
     * Notificación para nuevo pedido en cocina
     * Tono ascendente triple
     */
    playNewOrderSound() {
        if (!this.isEnabled) return;

        this.playBeep(600, 150);
        setTimeout(() => this.playBeep(800, 150), 200);
        setTimeout(() => this.playBeep(1000, 200), 400);
    }

    /**
     * Notificación para pedido listo
     * Tono doble más suave
     */
    playOrderReadySound() {
        if (!this.isEnabled) return;

        this.playBeep(1200, 200);
        setTimeout(() => this.playBeep(1000, 250), 300);
    }

    /**
     * Notificación de éxito (venta completada, etc)
     */
    playSuccessSound() {
        if (!this.isEnabled) return;

        this.playBeep(800, 100);
        setTimeout(() => this.playBeep(1000, 150), 120);
    }

    /**
     * Notificación de error/alerta
     */
    playAlertSound() {
        if (!this.isEnabled) return;

        this.playBeep(400, 300);
        setTimeout(() => this.playBeep(350, 300), 350);
    }

    /**
     * Habilitar/deshabilitar notificaciones de audio
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('audioNotifications', enabled.toString());
    }

    /**
     * Configurar volumen de notificaciones (0.0 - 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('notificationVolume', this.volume.toString());
    }

    /**
     * Reproducir sonido de prueba
     */
    testSound() {
        this.playBeep(800, 200);
    }
}

// Exportar instancia singleton
export const audioService = new AudioService();
