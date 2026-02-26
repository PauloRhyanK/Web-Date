import Avatar from './Avatar'

const TILE_SIZE = 50
const TILE_COLS = 8
const TILE_ROWS = 8

export default function Room({ myPosition, partnerPosition, partnerOnline, roomWidth, roomHeight }) {
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
          }}
        />
      )
    }
  }

  return (
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
        {tiles}
        <Avatar
          x={myPosition?.x ?? 100}
          y={myPosition?.y ?? 150}
          isLocal
          zIndex={myZ}
        />
        {partnerOnline && (
          <Avatar
            x={partnerPosition?.x ?? 300}
            y={partnerPosition?.y ?? 200}
            isLocal={false}
            zIndex={partnerZ}
          />
        )}
      </div>
    </div>
  )
}
