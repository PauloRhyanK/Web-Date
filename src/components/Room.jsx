import { useState } from 'react'
import Avatar from './Avatar'
import Room3D from './Room3D'
import ErrorBoundary from './ErrorBoundary'

const TILE_SIZE = 50
const TILE_COLS = 8
const TILE_ROWS = 8
const SCENARIO_IMAGE_URL = '/scenario.png'
const PLAYER1_SPRITE_URL = '/sprites/player1.png'
const PLAYER2_SPRITE_URL = '/sprites/player2.png'

export default function Room({
  myPosition,
  partnerPosition,
  partnerOnline,
  roomWidth,
  roomHeight,
  myIsWalking = false,
  partnerIsWalking = false,
}) {
  const [scenarioError, setScenarioError] = useState(false)
  const [scenarioLoaded, setScenarioLoaded] = useState(false)
  const myY = myPosition?.y ?? 0
  const partnerY = partnerPosition?.y ?? 0
  const myZ = myY > partnerY ? 1 : 2
  const partnerZ = partnerY > myY ? 1 : 2

  const tiles = []
  for (let row = 0; row < TILE_ROWS; row++) {
    for (let col = 0; col < TILE_COLS; col++) {
      const alt = (row + col) % 2 === 0
      tiles.push(
        <div
          key={`${row}-${col}`}
          className={`absolute border border-amber-800/60 ${alt ? 'bg-amber-800/70' : 'bg-amber-900/90'}`}
          style={{
            left: col * TILE_SIZE,
            top: row * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            zIndex: 1,
          }}
        />
      )
    }
  }

  const room2DFallback = (
    <div
      className="relative flex items-center justify-center"
      style={{ perspective: '800px' }}
    >
      <div
        className="relative rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-2 ring-amber-600/80"
        style={{
          width: roomWidth,
          height: roomHeight,
          transform: 'rotateX(60deg) rotateZ(45deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {!scenarioError && (
          <img
            src={SCENARIO_IMAGE_URL}
            alt=""
            className="absolute left-0 top-0 w-full h-full object-cover pointer-events-none"
            style={{
              zIndex: 0,
              imageRendering: 'pixelated',
              imageRendering: 'crisp-edges',
            }}
            onLoad={() => setScenarioLoaded(true)}
            onError={() => setScenarioError(true)}
          />
        )}
        {(scenarioError || !scenarioLoaded) && tiles}
        <Avatar
          x={myPosition?.x ?? 100}
          y={myPosition?.y ?? 150}
          isLocal
          zIndex={myZ}
          spriteSheetUrl={PLAYER1_SPRITE_URL}
          isWalking={myIsWalking}
        />
        {partnerOnline && (
          <Avatar
            x={partnerPosition?.x ?? 300}
            y={partnerPosition?.y ?? 200}
            isLocal={false}
            zIndex={partnerZ}
            spriteSheetUrl={PLAYER2_SPRITE_URL}
            isWalking={partnerIsWalking}
          />
        )}
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={room2DFallback}>
      <Room3D
        myPosition={myPosition}
        partnerPosition={partnerPosition}
        partnerOnline={partnerOnline}
        roomWidth={roomWidth}
        roomHeight={roomHeight}
        myIsWalking={myIsWalking}
        partnerIsWalking={partnerIsWalking}
      />
    </ErrorBoundary>
  )
}
