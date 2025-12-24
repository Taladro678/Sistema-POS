import { initializeApp } from "firebase/app";
import {
  getFirestore,
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from "firebase/firestore";

// CONFIGURACIÓN: Reemplaza estos valores con los de tu proyecto en Firebase Console
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Inicializar app
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con caché ilimitada para mejorar funcionamiento OFFLINE
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Habilitar persistencia Offline (IndexedDB)
// Esto asegura que la app funcione sin internet y guarde los datos localmente de forma segura
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('La persistencia falló: Probablemente hay multiples pestañas abiertas.');
    } else if (err.code == 'unimplemented') {
      console.warn('El navegador no soporta persistencia offline.');
    }
  });

export { db };
