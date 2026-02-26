import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import { setPeerIdHost, subscribePeerIdHost } from '../lib/firebase'

export default function VideoComm({ roomId, iamPlayer1 }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [error, setError] = useState(null)
  const [peerIdHost, setPeerIdHostState] = useState(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const [peerReady, setPeerReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setLocalStream(stream)
      })
      .catch((err) => {
        if (!cancelled) setError('Câmera/microfone negado ou indisponível')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!localStream) return
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (!remoteStream) return
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (!roomId || iamPlayer1 === null || !localStream) return

    const peer = new Peer({
      host: import.meta.env.VITE_PEERJS_HOST || '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    })
    peerRef.current = peer

    peer.on('open', (id) => {
      setPeerReady(true)
      if (iamPlayer1) {
        setPeerIdHost(roomId, id).catch(() => {})
      }
    })

    if (iamPlayer1) {
      peer.on('call', (call) => {
        call.answer(localStream)
        call.on('stream', (stream) => {
          setRemoteStream(stream)
        })
      })
    }

    peer.on('error', () => {})

    return () => {
      peer.destroy()
      peerRef.current = null
      setRemoteStream(null)
      setPeerReady(false)
    }
  }, [roomId, iamPlayer1, localStream])

  useEffect(() => {
    if (!roomId || iamPlayer1 !== false || !localStream || !peerRef.current) return

    const unsub = subscribePeerIdHost(roomId, (hostId) => {
      if (!hostId || hostId === peerRef.current?.id) return
      setPeerIdHostState(hostId)
    })
    return () => unsub()
  }, [roomId, iamPlayer1, localStream])

  useEffect(() => {
    if (!peerIdHost || !localStream || !peerRef.current || !peerReady) return
    const peer = peerRef.current
    const call = peer.call(peerIdHost, localStream)
    if (!call) return
    call.on('stream', (stream) => setRemoteStream(stream))
    call.on('error', () => {})
  }, [peerIdHost, localStream, peerReady])

  const videoPanelClass = 'w-72 h-56 rounded-lg border-2 bg-slate-900 overflow-hidden flex flex-col shadow-xl'
  const labelClass = 'text-xs font-semibold px-2 py-1 text-white/90'

  return (
    <>
      <div className="fixed top-4 left-4 flex flex-col gap-1">
        <div className={`${videoPanelClass} border-violet-500`}>
          <span className={`${labelClass} bg-violet-600/80`}>Tu</span>
          {error && (
            <div className="flex-1 flex items-center justify-center p-3 text-amber-200 text-sm text-center">
              {error}
            </div>
          )}
          {!localStream && !error && (
            <div className="flex-1 flex items-center justify-center p-3 text-slate-400 text-sm">
              A pedir permissão de câmera…
            </div>
          )}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="flex-1 w-full h-full min-h-0 object-cover bg-black"
            />
          )}
        </div>
      </div>
      <div className="fixed top-4 right-4 flex flex-col gap-1">
        <div className={`${videoPanelClass} border-emerald-500`}>
          <span className={`${labelClass} bg-emerald-600/80`}>Parceiro</span>
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="flex-1 w-full h-full min-h-0 object-cover bg-black"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-3 text-slate-500 text-sm">
              À espera do parceiro…
            </div>
          )}
        </div>
      </div>
    </>
  )
}
