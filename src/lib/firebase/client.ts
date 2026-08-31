import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

/**
 * 환경변수가 없으면 이 앱 전용 Firebase 프로젝트(diaryecho)로 폴백한다.
 * 덕분에 클론 직후 `npm run dev`가 바로 뜨고, 배포 워크플로에도 시크릿을
 * 넣을 필요가 없다.
 *
 * 웹 Firebase 설정값은 비밀이 아니다 — 어차피 브라우저 번들에 그대로 실린다.
 * 실제 보안은 firestore.rules가 담당한다(본인 문서만 읽고 쓸 수 있다).
 *
 * 본인 프로젝트를 따로 쓰려면 .env.local에 NEXT_PUBLIC_FIREBASE_* 를 채우면 된다.
 */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyCdUqtm9hTfd15JmMm4pOBDmnrcpRfG86Q",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "diaryecho.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "diaryecho",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "diaryecho.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "270637658182",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:270637658182:web:b5f9c10055d8b3a9985a47",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-X7HQGRF0LM",
}

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
