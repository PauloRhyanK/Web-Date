export default function Avatar({ x, y, userImage, isLocal, zIndex = 1 }) {
  const bgClass = isLocal ? 'bg-violet-600' : 'bg-emerald-600'
  const borderClass = isLocal ? 'border-violet-400' : 'border-emerald-400'

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
