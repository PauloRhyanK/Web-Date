import { useState } from 'react'

const SCENARIO_URL = '/scenario.png'
const PLAYER1_URL = '/player1.png'
const PLAYER1_DANCE_URL = '/cat-man-dance.png'
const PLAYER2_URL = '/player2.png'
const PLAYER2_DANCE_URL = '/cat-female-dance.png' // ou '/player2-dance.png' se tiver sprite próprio do parceiro
const GUITAR_URL = '/guitar.png'
const STAGE_WIDTH = 800
const STAGE_HEIGHT = 600

export default function Room({
  iamPlayer1 = true,
  myPosition,
  partnerPosition,
  partnerOnline,
  roomWidth = STAGE_WIDTH,
  roomHeight = STAGE_HEIGHT,
  myIsWalking = false,
  partnerIsWalking = false,
  isDancing = false,
  onDancingChange,
  partnerDancing = false,
  myFacingRight = true,
}) {
  const [bgError, setBgError] = useState(false)
  const w = roomWidth || STAGE_WIDTH
  const h = roomHeight || STAGE_HEIGHT
  const myX = myPosition?.x ?? 0
  const myY = myPosition?.y ?? 0
  const partnerX = partnerPosition?.x ?? w * 0.8
  const partnerY = partnerPosition?.y ?? 0

  const safeW = Math.max(w, 1)
  const safeH = Math.max(h, 1)
  const MAX_BOTTOM = 14.142

  const leftPct = (myX / safeW) * 100
  const partnerLeftPct = (partnerX / safeW) * 100
  const bottomPct = MAX_BOTTOM * (1 - myY / safeH)
  const partnerBottomPct = MAX_BOTTOM * (1 - partnerY / safeH)

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0d58abb1-ca99-4331-bb9d-ff405728f431',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Room.jsx:render',message:'room position',data:{myX,myY,w,h,leftPct,bottomPct},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const mySprite = iamPlayer1 ? (isDancing ? PLAYER1_DANCE_URL : PLAYER1_URL) : (isDancing ? PLAYER2_DANCE_URL : PLAYER2_URL)
  const partnerSprite = iamPlayer1 ? (partnerDancing ? PLAYER2_DANCE_URL : PLAYER2_URL) : (partnerDancing ? PLAYER1_DANCE_URL : PLAYER1_URL)
  const showGuitarOnMe = iamPlayer1 && isDancing
  const showGuitarOnPartner = !iamPlayer1 && partnerDancing
  const myAnimationClass =
    isDancing && !showGuitarOnMe ? 'animate-dance' : isDancing && showGuitarOnMe ? 'animate-dance-bob' : ''
  const partnerAnimationClass =
    partnerDancing && !showGuitarOnPartner ? 'animate-dance' : partnerDancing && showGuitarOnPartner ? 'animate-dance-bob' : ''

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: bgError ? '#78350f' : undefined }}
    >
      {!bgError && (
        <img
          src={SCENARIO_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={() => setBgError(true)}
        />
      )}

      <div
        className={`absolute h-[70%] w-auto max-w-[280px] ${myAnimationClass}`}
        style={{
          zIndex: 2,
          left: `${Math.max(0, Math.min(leftPct, 100) - 8)}%`,
          bottom: `${Math.min(Math.max(bottomPct, 0), MAX_BOTTOM)}%`,
        }}
      >
        <div className="h-full w-full" style={{ transform: myFacingRight ? undefined : 'scaleX(-1)' }}>
        <img
          src={mySprite}
          alt=""
          className="h-full w-auto object-contain object-bottom"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        {showGuitarOnMe && (
          <div
            className="absolute bottom-[5%] left-1/2 h-[38%] w-auto max-w-[140px] origin-bottom"
            style={{
              transform: 'translateX(-50%)',
              zIndex: 3,
            }}
          >
            <img
              src={GUITAR_URL}
              alt=""
              className="h-full w-auto animate-guitar-swing object-contain object-bottom"
              style={{ transformOrigin: 'bottom center' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}
        </div>
      </div>

      {partnerOnline && (
        <div
          className={`absolute h-[70%] w-auto max-w-[280px] ${partnerAnimationClass}`}
          style={{
            zIndex: 2,
            // deslocar ligeiramente mais para a direita
            left: `${Math.max(0, Math.min(partnerLeftPct + 5, 100) - 8)}%`,
            bottom: `${Math.min(Math.max(partnerBottomPct, 0), MAX_BOTTOM)}%`,
          }}
        >
          <img
            src={partnerSprite}
            alt=""
            className="h-full w-auto object-contain object-bottom"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          {showGuitarOnPartner && (
            <div
              className="absolute bottom-[5%] left-1/2 h-[38%] w-auto max-w-[140px] origin-bottom"
              style={{
                transform: 'translateX(-50%)',
                zIndex: 3,
              }}
            >
              <img
                src={GUITAR_URL}
                alt=""
                className="h-full w-auto animate-guitar-swing object-contain object-bottom"
                style={{ transformOrigin: 'bottom center' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
