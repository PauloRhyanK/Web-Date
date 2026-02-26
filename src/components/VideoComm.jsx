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

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 px-3 py-2 rounded bg-slate-700 text-sm text-amber-200">
        {error}
      </div>
    )
  }

  if (!localStream) {
    return (
      <div className="fixed bottom-4 right-4 px-3 py-2 rounded bg-slate-700 text-sm">
        A pedir permissão de câmera…
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-40 h-30 object-cover rounded border-2 border-emerald-500 bg-black"
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="w-32 h-24 object-cover rounded border-2 border-violet-500 bg-black"
      />
    </div>
  )
}
