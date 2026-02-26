import Avatar from './Avatar'

export default function Room({ myPosition, partnerPosition, partnerOnline, roomWidth, roomHeight }) {
  const myY = myPosition?.y ?? 0
  const partnerY = partnerPosition?.y ?? 0
  const myZ = myY > partnerY ? 1 : 2
  const partnerZ = partnerY > myY ? 1 : 2

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ perspective: '800px' }}
    >
      <div
        className="relative bg-amber-900/80 rounded-lg border-2 border-amber-700"
        style={{
          width: roomWidth,
          height: roomHeight,
          transform: 'rotateX(60deg) rotateZ(45deg)',
          transformStyle: 'preserve-3d',
        }}
      >
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
