import { useState, useEffect, useRef } from 'react'

const FRAME_WIDTH = 32
const FRAME_HEIGHT = 48
const FRAME_COUNT = 4
const WALK_FRAME_INTERVAL_MS = 100

export default function Avatar({
  x,
  y,
  userImage,
  isLocal,
  zIndex = 1,
  spriteSheetUrl = null,
  isWalking = false,
}) {
  const [frameIndex, setFrameIndex] = useState(0)
  const [spriteError, setSpriteError] = useState(false)
  const walkIntervalRef = useRef(null)

  const useSprite = spriteSheetUrl && !spriteError

  useEffect(() => {
    if (!useSprite) return
    if (isWalking) {
      walkIntervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev >= FRAME_COUNT - 1 ? 1 : prev + 1))
      }, WALK_FRAME_INTERVAL_MS)
    } else {
      setFrameIndex(0)
    }
    return () => {
      if (walkIntervalRef.current) clearInterval(walkIntervalRef.current)
    }
  }, [useSprite, isWalking])

  const bgClass = isLocal ? 'bg-violet-600' : 'bg-emerald-600'
  const borderClass = isLocal ? 'border-violet-400' : 'border-emerald-400'

  if (useSprite) {
    return (
      <div
        className="absolute flex flex-col items-center justify-end pointer-events-none"
        style={{
          left: x,
          top: y,
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: 'rotateZ(-45deg) rotateX(-60deg)',
          transformStyle: 'preserve-3d',
          zIndex,
        }}
      >
        <div
          className="absolute bottom-0 w-10 h-1.5 rounded-full bg-black/50"
          aria-hidden
        />
        <img
          src={spriteSheetUrl}
          alt=""
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          onError={() => setSpriteError(true)}
          aria-hidden
        />
        <div
          role="img"
          aria-label={isLocal ? 'Tu' : 'Parceiro'}
          style={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            backgroundImage: `url(${spriteSheetUrl})`,
            backgroundPosition: `-${frameIndex * FRAME_WIDTH}px 0`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            imageRendering: 'crisp-edges',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="absolute flex flex-col items-center justify-end pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 48,
        height: 64,
        transform: 'rotateZ(-45deg) rotateX(-60deg)',
        transformStyle: 'preserve-3d',
        zIndex,
      }}
    >
      <div
        className="absolute bottom-0 w-12 h-2 rounded-full bg-black/50"
        aria-hidden
      />
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold overflow-hidden ${bgClass} ${borderClass}`}
        >
          {userImage ? (
            <img
              src={userImage}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white">{isLocal ? 'Tu' : 'Par'}</span>
          )}
        </div>
        <div
          className={`w-7 h-8 -mt-1 rounded-b-md border-2 border-t-0 ${bgClass} ${borderClass}`}
        />
      </div>
    </div>
  )
}
