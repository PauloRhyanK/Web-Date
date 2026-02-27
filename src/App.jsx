import { useState, useEffect, useRef, useCallback } from 'react'
import {
  roomRef,
  subscribeRoom,
  writePlayerPosition,
  writePlayerDancing,
  writeQuestionIndex,
  setupOnDisconnect,
  setRoomMusic,
} from './lib/firebase'
import { runTransaction } from 'firebase/database'
import Room from './components/Room'
import VideoComm from './components/VideoComm'

const THROTTLE_MS = 50
const MOVE_STEP = 8
const WALK_DURATION_MS = 200

const QUESTIONS = [
  "What each of us has learned about ourselves since our relationship began.",
  "A big or unusual dream that we haven't shared with each other yet.",
  "A personal insecurity we feel the other doesn't fully understand yet.",
  "The most memorable and incredible moment we have shared so far.",
  "The exact detail that caught our attention and made us want to talk at the very beginning.",
  "The trait that attracts us most to each other today, and how it has evolved over time.",
  "What love truly means to each of us.",
  "What gives us the strength and motivation to face and overcome the distance every day.",
  "The scenario of our future together that replays most often in our thoughts.",
  "The simplest, most ordinary daily routines we can't wait to experience when we are finally together every day.",
  "The moments when we feel most supported and cared for by each other, regardless of the physical distance.",
  "The non-negotiable principle or value we want as the foundation of the home and life we will build.",
  "The topic or conversation we feel we still need to dive deeper into before taking our next big steps.",
  "The differences in our worldviews that challenge us the most or that we find hard to accept.",
  "The little gestures and quirks the other does without realizing, but that we secretly love.",
  "The exact moment or attitude that gave us the absolute certainty that the distance would be worth it.",
  "The things we do that manage to annoy each other.",
  "How we see each other's flaws and how we can help each other handle them.",
  "That part of our personality or essence that we only reveal and that only exists when we are together.",
  "Our completely honest thoughts about these questions."
]

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
  const [questionIndex, setQuestionIndex] = useState(0)

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
    const idFromUrl = getRoomIdFromUrl()
    let id = idFromUrl
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
      if (typeof data.questionIndex === 'number' && Number.isFinite(data.questionIndex)) {
        const clamped = Math.max(0, Math.min(QUESTIONS.length - 1, Math.floor(data.questionIndex)))
        setQuestionIndex(clamped)
      }
      if (me) {
        setIamPlayer1(me === p1)
        const mePos = { x: me.x, y: me.y }
        const last = lastWrittenPositionRef.current
        const fromOurWrite = last && last.x === mePos.x && last.y === mePos.y
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
      <div className="fixed inset-0 z-20 pointer-events-none flex justify-center" style={{ alignItems: 'center', paddingBottom: '300px' }}>
        <div className="pointer-events-auto bg-black/70 text-white px-6 py-4 rounded-xl text-lg md:text-xl font-semibold shadow-2xl flex flex-col items-center gap-3 max-w-xl text-center">
          <span className="text-slate-300 text-sm font-normal">{questionIndex + 1}/{QUESTIONS.length}</span>
          <span>{QUESTIONS[questionIndex]}</span>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium"
              onClick={() => {
                const next = questionIndex === 0 ? QUESTIONS.length - 1 : questionIndex - 1
                setQuestionIndex(next)
                if (roomId) writeQuestionIndex(roomId, next).catch(() => {})
              }}
            >
              Anterior
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium"
              onClick={() => {
                const next = questionIndex === QUESTIONS.length - 1 ? 0 : questionIndex + 1
                setQuestionIndex(next)
                if (roomId) writeQuestionIndex(roomId, next).catch(() => {})
              }}
            >
              Próxima
            </button>
          </div>
        </div>
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
