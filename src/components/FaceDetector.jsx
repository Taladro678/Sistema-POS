import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

/**
 * FaceDetector Component
 * 
 * Componente que maneja la detección facial en tiempo real usando la cámara web.
 * Características:
 * - Carga modelos de face-api.js
 * - Accede a la cámara del dispositivo
 * - Detecta rostros en tiempo real
 * - Dibuja un canvas overlay con el bounding box del rostro
 * - Retorna estado de detección y captura de foto
 */

const FaceDetector = ({ onFaceDetected, onCapture, isActive = true }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [error, setError] = useState('');
    const detectionIntervalRef = useRef(null);

    // Cargar modelos de face-api.js
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Cargar modelos desde carpeta local /public/models
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelLoaded(true);
                console.log('✅ Face detection models loaded from local files');
            } catch (err) {
                console.error('Error loading face-api models:', err);
                setError('No se pudieron cargar los modelos de detección facial. Asegúrate de tener la carpeta /public/models con los archivos necesarios.');
            }
        };

        loadModels();
    }, []);

    // Iniciar cámara
    useEffect(() => {
        if (!isModelLoaded || !isActive) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        setIsCameraReady(true);
                    };
                }
            } catch (err) {
                console.error('Error accessing camera:', err);
                setError('No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara en tu navegador.');
            }
        };

        startCamera();

        return () => {
            // Cleanup: detener cámara
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [isModelLoaded, isActive]);

    // Detección facial en tiempo real
    useEffect(() => {
        if (!isCameraReady || !isActive) return;

        const detectFace = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Ajustar canvas al tamaño del video
            const displaySize = {
                width: video.videoWidth,
                height: video.videoHeight
            };
            faceapi.matchDimensions(canvas, displaySize);

            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Limpiar canvas
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dibujar detecciones
            if (resizedDetections.length > 0) {
                setFaceDetected(true);
                onFaceDetected && onFaceDetected(true);

                // Dibujar bounding box verde
                resizedDetections.forEach(detection => {
                    const box = detection.detection.box;
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    // Dibujar landmarks (opcional)
                    // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                });
            } else {
                setFaceDetected(false);
                onFaceDetected && onFaceDetected(false);
            }
        };

        // Ejecutar detección cada 300ms
        detectionIntervalRef.current = setInterval(detectFace, 300);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [isCameraReady, isActive, onFaceDetected]);

    // Función para capturar foto
    const capturePhoto = () => {
        if (!videoRef.current || !faceDetected) {
            return null;
        }

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    };

    // Exponer función de captura al padre
    useEffect(() => {
        if (onCapture) {
            // Crear función que el padre puede llamar
            window.captureAttendancePhoto = capturePhoto;
        }
    }, [onCapture, faceDetected]);

    if (error) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)' }}>
                <p style={{ marginBottom: '1rem' }}>⚠️ {error}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Para habilitar la cámara, ve a la configuración de tu navegador y permite el acceso.
                </p>
            </div>
        );
    }

    if (!isModelLoaded) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>Cargando modelos de detección facial...</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto' }}>
            {/* Video de cámara */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    borderRadius: '8px',
                    transform: 'scaleX(-1)', // Espejo
                    display: 'block'
                }}
            />

            {/* Canvas overlay para dibujar detecciones */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'scaleX(-1)' // Espejo
                }}
            />

            {/* Indicador de estado */}
            <div
                style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: faceDetected ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
            >
                <span style={{ fontSize: '1.2rem' }}>{faceDetected ? '✓' : '✗'}</span>
                {faceDetected ? 'Rostro Detectado' : 'Posicione su rostro'}
            </div>
        </div>
    );
};

export default FaceDetector;
