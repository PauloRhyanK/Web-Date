import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, onDisconnect } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

export function roomRef(roomId) {
  return ref(db, roomId)
}

export function playerRef(roomId, playerKey) {
  return ref(db, `${roomId}/${playerKey}`)
}

export function peerIdHostRef(roomId) {
  return ref(db, `${roomId}/peerIdHost`)
}

export async function writePlayerPosition(roomId, playerKey, x, y, isOnline = true, userId = null) {
  const data = { x, y, isOnline }
  if (userId != null) data.userId = userId
  await set(playerRef(roomId, playerKey), data)
}

export function subscribeRoom(roomId, callback) {
  return onValue(roomRef(roomId), (snapshot) => {
    const data = snapshot.val()
    callback(data)
  })
}

export function setupOnDisconnect(roomId, playerKey) {
  const ref = playerRef(roomId, playerKey)
  onDisconnect(ref).update({ isOnline: false })
}

export function setPeerIdHost(roomId, peerId) {
  return set(peerIdHostRef(roomId), peerId)
}

export function subscribePeerIdHost(roomId, callback) {
  return onValue(peerIdHostRef(roomId), (snapshot) => {
    callback(snapshot.val())
  })
}

export function musicRef(roomId) {
  return ref(db, `${roomId}/music`)
}

export function setRoomMusic(roomId, data) {
  return set(musicRef(roomId), data)
}
