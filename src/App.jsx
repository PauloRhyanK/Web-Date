import { useState, useEffect, useRef, useCallback } from 'react'
import {
  roomRef,
  subscribeRoom,
  writePlayerPosition,
  setupOnDisconnect,
} from './lib/firebase'
import { runTransaction } from 'firebase/database'
import Room from './components/Room'
import VideoComm from './components/VideoComm'

const ROOM_WIDTH = 400
const ROOM_HEIGHT = 400
const THROTTLE_MS = 50
const MOVE_STEP = 8

function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('room')
}

function generateRoomId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function ensureRoomInUrl(roomId) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  window.history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString())
}

function App() {
  const [roomId, setRoomId] = useState(null)
  const [myPosition, setMyPosition] = useState({ x: 100, y: 150 })
  const [partnerPosition, setPartnerPosition] = useState({ x: 300, y: 200 })
  const [iamPlayer1, setIamPlayer1] = useState(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const myUserIdRef = useRef(null)
  const lastWriteRef = useRef(0)
  const throttleScheduledRef = useRef(null)
  const pendingPositionRef = useRef(null)
  const audioRef = useRef(null)
  const claimStartedRef = useRef(false)

  if (!myUserIdRef.current) {
    myUserIdRef.current = crypto.randomUUID()
  }
  const myUserId = myUserIdRef.current

  useEffect(() => {
    let id = getRoomIdFromUrl()
    if (!id) {
      id = generateRoomId()
      ensureRoomInUrl(id)
    }
    setRoomId(id)
  }, [])

  useEffect(() => {
    if (!roomId) return

    const unsub = subscribeRoom(roomId, (data) => {
      if (!data) return

      const p1 = data.player_1
      const p2 = data.player_2

      if (!claimed && !claimStartedRef.current) {
        claimStartedRef.current = true
        runTransaction(roomRef(roomId), (current) => {
          const cur = current || {}
          const slot1 = cur.player_1
          const slot2 = cur.player_2
          const can1 = !slot1 || !slot1.isOnline
          const can2 = !slot2 || !slot2.isOnline
          if (can1) {
            const next = { ...cur, player_1: { x: 100, y: 150, isOnline: true, userId: myUserId } }
            if (cur.player_2) next.player_2 = cur.player_2
            return next
          }
          if (can2) {
            const next = { ...cur, player_2: { x: 300, y: 200, isOnline: true, userId: myUserId } }
            if (cur.player_1) next.player_1 = cur.player_1
            return next
          }
          return undefined
        }).then(() => {
          setClaimed(true)
        }).catch(() => {
          claimStartedRef.current = false
        })
        return
      }

      const me = p1?.userId === myUserId ? p1 : p2?.userId === myUserId ? p2 : null
      const other = p1?.userId === myUserId ? p2 : p2?.userId === myUserId ? p1 : null

      if (me) {
        setIamPlayer1(me === p1)
        setMyPosition({ x: me.x, y: me.y })
      }
      if (other) {
        setPartnerPosition({ x: other.x, y: other.y })
        setPartnerOnline(!!other.isOnline)
      } else {
        setPartnerOnline(false)
      }
    })

    return () => unsub()
  }, [roomId, myUserId, claimed])

  useEffect(() => {
    if (!roomId || !claimed || iamPlayer1 === null) return

    const playerKey = iamPlayer1 ? 'player_1' : 'player_2'
    setupOnDisconnect(roomId, playerKey)
  }, [roomId, claimed, iamPlayer1])

  const flushPosition = useCallback((pos) => {
    if (!roomId || iamPlayer1 === null) return
    const playerKey = iamPlayer1 ? 'player_1' : 'player_2'
    writePlayerPosition(roomId, playerKey, pos.x, pos.y, true, myUserId)
    lastWriteRef.current = Date.now()
    pendingPositionRef.current = null
  }, [roomId, iamPlayer1, myUserId])

  useEffect(() => {
    if (!roomId || iamPlayer1 === null) return

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      const step = MOVE_STEP
      setMyPosition((prev) => {
        let nx = prev.x
        let ny = prev.y
        if (key === 'w' || key === 'arrowup') ny -= step
        if (key === 's' || key === 'arrowdown') ny += step
        if (key === 'a' || key === 'arrowleft') nx -= step
        if (key === 'd' || key === 'arrowright') nx += step
        nx = clamp(nx, 0, ROOM_WIDTH)
        ny = clamp(ny, 0, ROOM_HEIGHT)
        const next = { x: nx, y: ny }
        pendingPositionRef.current = next
        const now = Date.now()
        if (now - lastWriteRef.current >= THROTTLE_MS) {
          flushPosition(next)
        } else if (!throttleScheduledRef.current) {
          throttleScheduledRef.current = setTimeout(() => {
            throttleScheduledRef.current = null
            if (pendingPositionRef.current) flushPosition(pendingPositionRef.current)
          }, THROTTLE_MS - (now - lastWriteRef.current))
        }
        return next
      })
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (throttleScheduledRef.current) clearTimeout(throttleScheduledRef.current)
    }
  }, [roomId, iamPlayer1, flushPosition])

  const copyRoomLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return
    if (musicPlaying) {
      audio.pause()
      setMusicPlaying(false)
    } else {
      audio.play().catch(() => {})
      setMusicPlaying(true)
    }
  }

  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p>Carregando sala…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <audio ref={audioRef} loop src="/music.mp3" />
      <div className="flex items-center gap-4 mb-4 flex-wrap justify-center">
        <button
          type="button"
          onClick={copyRoomLink}
          className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500"
        >
          {linkCopied ? 'Link copiado!' : 'Copiar link da sala'}
        </button>
        <button
          type="button"
          onClick={toggleMusic}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500"
        >
          {musicPlaying ? 'Pausar música' : 'Play música'}
        </button>
        {partnerOnline && (
          <span className="text-green-400 text-sm">Parceiro online</span>
        )}
      </div>
      <Room
        myPosition={myPosition}
        partnerPosition={partnerPosition}
        partnerOnline={partnerOnline}
        roomWidth={ROOM_WIDTH}
        roomHeight={ROOM_HEIGHT}
      />
      <VideoComm roomId={roomId} iamPlayer1={iamPlayer1} />
    </div>
  )
}

export default App
