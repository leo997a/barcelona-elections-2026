
// إعدادات FIREBASE
// لقد قمت بتعبئة البيانات بناءً على ملفك (unoreo)
// ولكن لا يزال عليك إحضار API KEY من لوحة التحكم لأنه سري ولا يمكن تخمينه.

export const firebaseConfig = {
  // 🔴 هام: اذهب إلى Project Settings -> General -> Your Apps وانسخ الـ apiKey
  apiKey: "ضع_API_KEY_هنا", 
  
  // تم تعبئة هذه البيانات تلقائياً بناءً على Project ID: unoreo
  authDomain: "unoreo.firebaseapp.com",
  databaseURL: "https://unoreo-default-rtdb.firebaseio.com",
  projectId: "unoreo",
  storageBucket: "unoreo.firebasestorage.app",
  messagingSenderId: "1064114078742", // استخرجته من Client ID الذي أرسلته
  appId: "APP_ID_FROM_CONSOLE" // اختياري لقاعدة البيانات ولكن يفضل إضافته
};

// تحقق بسيط
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "ضع_API_KEY_هنا" && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
};
