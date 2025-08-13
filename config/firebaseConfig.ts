// config/firebaseConfig.ts - 구글 콘솔 ID로 수정 완료
import { initializeApp } from "firebase/app";
import { 
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAG2bCoMJpTWpEeZkHWWNs6HSrRryYREKc",
  authDomain: "emotion-diary-ca91e.firebaseapp.com",
  projectId: "emotion-diary-ca91e",
  storageBucket: "emotion-diary-ca91e.appspot.com",
  messagingSenderId: "232207972245",
  appId: "1:232207972245:web:c6ca804f71cfcaade2289c",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 간단한 Auth 초기화
const auth = getAuth(app);

// Firestore 초기화
const db = getFirestore(app);

// Google OAuth 설정
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// ✅ Google 웹 클라이언트 ID (구글 콘솔 ID로 수정)
export const GOOGLE_CLIENT_ID = "232207972245-eqs5voukc84bq1ehumq8kue98v58pap8.apps.googleusercontent.com";

// Export
export { app, auth, db, googleProvider };