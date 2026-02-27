import { useState, useEffect, useRef, useCallback } from 'react'
import {
  roomRef,
  subscribeRoom,
  writePlayerPosition,
  writePlayerDancing,
  setupOnDisconnect,
  setRoomMusic,
} from './lib/firebase'
import { runTransaction } from 'firebase/database'
import Room from './components/Room'
import VideoComm from './components/VideoComm'

const THROTTLE_MS = 50
const MOVE_STEP = 8
const WALK_DURATION_MS = 200

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
  const [musicStartedAt, setMusicStartedAt] = useState(null)
  const [volume, setVolume] = useState(0.7)
  const [claimed, setClaimed] = useState(false)
  const [viewportSize, setViewportSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 900, h: typeof window !== 'undefined' ? window.innerHeight : 600 })

  const myUserIdRef = useRef(null)
  const lastWriteRef = useRef(0)
  const throttleScheduledRef = useRef(null)
  const pendingPositionRef = useRef(null)
  const lastWrittenPositionRef = useRef(null)
  const audioRef = useRef(null)
  const claimStartedRef = useRef(false)
  const lastMovedAtRef = useRef(0)
  const partnerLastMovedAtRef = useRef(0)
  const prevPartnerPositionRef = useRef(null)
  const [myIsWalking, setMyIsWalking] = useState(false)
  const [partnerIsWalking, setPartnerIsWalking] = useState(false)
  const [myIsDancing, setMyIsDancing] = useState(false)
  const [partnerIsDancing, setPartnerIsDancing] = useState(false)
  const myIsDancingRef = useRef(false)
  const [myFacingRight, setMyFacingRight] = useState(true)

  useEffect(() => {
    myIsDancingRef.current = myIsDancing
  }, [myIsDancing])

  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
      const p1 = data?.player_1
      const p2 = data?.player_2

      if (!claimed && !claimStartedRef.current) {
        claimStartedRef.current = true
        runTransaction(roomRef(roomId), (current) => {
          const cur = current || {}
          const slot1 = cur.player_1
          const slot2 = cur.player_2
          const can1 = !slot1 || !slot1.isOnline
          const can2 = !slot2 || !slot2.isOnline
          if (can1) {
            const next = { ...cur, player_1: { x: 100, y: 150, isOnline: true, userId: myUserId, isDancing: false } }
            if (cur.player_2) next.player_2 = cur.player_2
            return next
          }
          if (can2) {
            const next = { ...cur, player_2: { x: 300, y: 200, isOnline: true, userId: myUserId, isDancing: false } }
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

      if (!data) return

      const me = p1?.userId === myUserId ? p1 : p2?.userId === myUserId ? p2 : null
      const other = p1?.userId === myUserId ? p2 : p2?.userId === myUserId ? p1 : null
      const partnerReallyOnline = other != null && other.isOnline === true && !!other.userId && other.userId !== myUserId

      if (data.music) {
        setMusicPlaying(!!data.music.playing)
        setMusicStartedAt(data.music.playing ? (data.music.startedAt ?? null) : null)
      }
      if (me) {
        setIamPlayer1(me === p1)
        const mePos = { x: me.x, y: me.y }
        const last = lastWrittenPositionRef.current
        const fromOurWrite = last && last.x === mePos.x && last.y === mePos.y
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0d58abb1-ca99-4331-bb9d-ff405728f431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:sub',message:'sub me',data:{mePos,last,fromOurWrite,willSet:!last||fromOurWrite},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (!last || fromOurWrite) {
          setMyPosition(mePos)
          if (!last) lastWrittenPositionRef.current = mePos
        }
        setMyIsDancing(!!me.isDancing)
      }
      if (partnerReallyOnline) {
        const x = typeof other.x === 'number' && Number.isFinite(other.x) ? other.x : 300
        const y = typeof other.y === 'number' && Number.isFinite(other.y) ? other.y : 200
        const nextPartner = { x, y }
        const prev = prevPartnerPositionRef.current
        if (prev && (prev.x !== nextPartner.x || prev.y !== nextPartner.y)) {
          partnerLastMovedAtRef.current = Date.now()
        }
        prevPartnerPositionRef.current = nextPartner
        setPartnerPosition(nextPartner)
        setPartnerOnline(true)
        setPartnerIsDancing(!!other.isDancing)
      } else {
        setPartnerOnline(false)
        setPartnerIsDancing(false)
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
    if (!roomId) return
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0d58abb1-ca99-4331-bb9d-ff405728f431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:keyEffect',message:'keydown listener attached',data:{roomId},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      const step = MOVE_STEP
      const rw = viewportSize.w
      const rh = viewportSize.h
      if (key === ' ') {
        e.preventDefault()
        if (roomId && iamPlayer1 !== null) {
          const next = !myIsDancingRef.current
          myIsDancingRef.current = next
          setMyIsDancing(next)
          const playerKey = iamPlayer1 ? 'player_1' : 'player_2'
          writePlayerDancing(roomId, playerKey, next).catch(() => {})
        }
        return
      }
      if (!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) return
      e.preventDefault()
      lastMovedAtRef.current = Date.now()
      if (key === 'd' || key === 'arrowright') setMyFacingRight(true)
      if (key === 'a' || key === 'arrowleft') setMyFacingRight(false)

      setMyPosition((prev) => {
        let nx = prev.x
        let ny = prev.y
        if (key === 'w' || key === 'arrowup') ny -= step
        if (key === 's' || key === 'arrowdown') ny += step
        if (key === 'a' || key === 'arrowleft') nx -= step
        if (key === 'd' || key === 'arrowright') nx += step
        nx = clamp(nx, 0, rw)
        ny = clamp(ny, 0, rh)
        const next = { x: nx, y: ny }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0d58abb1-ca99-4331-bb9d-ff405728f431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:keydown',message:'move',data:{key,prev,next,rw,rh},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        pendingPositionRef.current = next
        lastWrittenPositionRef.current = next
        const now = Date.now()
        if (roomId && iamPlayer1 !== null) {
          if (now - lastWriteRef.current >= THROTTLE_MS) {
            flushPosition(next)
          } else if (!throttleScheduledRef.current) {
            throttleScheduledRef.current = setTimeout(() => {
              throttleScheduledRef.current = null
              if (pendingPositionRef.current) flushPosition(pendingPositionRef.current)
            }, THROTTLE_MS - (now - lastWriteRef.current))
          }
        }
        return next
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (throttleScheduledRef.current) clearTimeout(throttleScheduledRef.current)
    }
  }, [roomId, iamPlayer1, flushPosition, viewportSize])

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      setMyIsWalking(now - lastMovedAtRef.current < WALK_DURATION_MS)
      setPartnerIsWalking(now - partnerLastMovedAtRef.current < WALK_DURATION_MS)
    }
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [])

  const toggleMusic = () => {
    if (!roomId) return
    if (musicPlaying) {
      setMusicPlaying(false)
      setMusicStartedAt(null)
      setRoomMusic(roomId, { playing: false })
    } else {
      const startedAt = Date.now()
      setMusicPlaying(true)
      setMusicStartedAt(startedAt)
      setRoomMusic(roomId, { playing: true, startedAt })
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (musicPlaying && musicStartedAt != null) {
      const syncCurrentTime = () => {
        const elapsed = (Date.now() - musicStartedAt) / 1000
        if (audio.duration && !Number.isNaN(audio.duration)) {
          audio.currentTime = elapsed % audio.duration
        } else {
          audio.currentTime = Math.min(elapsed, 999999)
        }
      }
      audio.play().catch(() => {})
      syncCurrentTime()
      const id = setInterval(syncCurrentTime, 500)
      return () => clearInterval(id)
    } else {
      audio.pause()
    }
  }, [musicPlaying, musicStartedAt])

  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p>Carregando sala…</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900 text-white overflow-hidden">
      <audio ref={audioRef} loop src="/music.mp3" />
      <div className="absolute inset-0 w-full h-full">
        <Room
          iamPlayer1={iamPlayer1}
          myPosition={myPosition}
          partnerPosition={partnerPosition}
          partnerOnline={partnerOnline}
          roomWidth={viewportSize.w}
          roomHeight={viewportSize.h}
          myIsWalking={myIsWalking}
          partnerIsWalking={partnerIsWalking}
          isDancing={myIsDancing}
          onDancingChange={(value) => {
            setMyIsDancing(value)
            if (roomId && iamPlayer1 !== null) {
              writePlayerDancing(roomId, iamPlayer1 ? 'player_1' : 'player_2', value)
            }
          }}
          partnerDancing={partnerIsDancing}
          myFacingRight={myFacingRight}
        />
      </div>
      <div className="fixed left-0 bottom-0 p-4 flex flex-col gap-3 z-10">
        {partnerOnline && (
          <span className="text-green-400 text-sm">Parceiro online</span>
        )}
        <button
          type="button"
          onClick={toggleMusic}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 w-fit"
        >
          {musicPlaying ? 'Pausar música' : 'Play música'}
        </button>
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-300">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-2 rounded-lg accent-violet-500"
          />
        </label>
      </div>
      <VideoComm roomId={roomId} iamPlayer1={iamPlayer1} />
    </div>
  )
}

export default App
