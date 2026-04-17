import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

function readEnv(name) {
  const v = import.meta.env[name]
  if (v == null || String(v).trim() === '') return undefined
  return String(v).trim()
}

export function isFirebaseClientConfigured() {
  return Boolean(
    readEnv('VITE_FIREBASE_API_KEY') &&
      readEnv('VITE_FIREBASE_AUTH_DOMAIN') &&
      readEnv('VITE_FIREBASE_PROJECT_ID')
  )
}

export function getFirebaseApp() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase client env is not configured')
  }
  if (getApps().length > 0) {
    return getApps()[0]
  }
  return initializeApp({
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  })
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}
