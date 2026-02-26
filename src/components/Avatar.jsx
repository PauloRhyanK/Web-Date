export default function Avatar({ x, y, userImage, isLocal, zIndex = 1 }) {
  return (
    <div
      className="absolute w-10 h-12 flex items-end justify-center pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'rotateZ(-45deg) rotateX(-60deg)',
        transformStyle: 'preserve-3d',
        zIndex,
      }}
    >
      <div
        className={`
          w-10 h-12 rounded-t-full border-2 flex items-center justify-center text-xs font-bold
          ${isLocal ? 'bg-violet-600 border-violet-400' : 'bg-emerald-600 border-emerald-400'}
        `}
      >
        {userImage ? (
          <img
            src={userImage}
            alt=""
            className="w-full h-full object-cover rounded-t-full"
          />
        ) : (
          <span className="text-white">{isLocal ? 'Tu' : 'Par'}</span>
        )}
      </div>
    </div>
  )
}
