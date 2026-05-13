
// ─── Firebase Configuration ───────────────────────────────────────────────────
// هذا الإعداد يعمل تلقائياً لكل المتصفحات و OBS بدون أي إعداد يدوي
// المزامنة عبر Firebase Realtime Database — WebSocket حقيقي، تأخر < 50ms

export const firebaseConfig = {
  apiKey:            "AIzaSyAfkyI_m3pcUI35XfRAAz_YXYR-Vxw_7Cs",
  authDomain:        "unoreo.firebaseapp.com",
  databaseURL:       "https://unoreo-default-rtdb.firebaseio.com",
  projectId:         "unoreo",
  storageBucket:     "unoreo.firebasestorage.app",
  messagingSenderId: "798724151849",
  appId:             "1:798724151849:web:a8e08b7bbce3e7f9c29a38",
  measurementId:     "G-L97QDYFPVZ",
};

const ENABLE_BUNDLED_FIREBASE_SYNC = false;

export const isFirebaseConfigured = () => ENABLE_BUNDLED_FIREBASE_SYNC;
