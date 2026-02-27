import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Character3D from './Character3D'

const ROOM_SIZE = 400
const HALF = ROOM_SIZE / 2

function toThreePosition(x, y) {
  return [x - HALF, 0, y - HALF]
}

function Floor({ roomWidth, roomHeight }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[roomWidth, roomHeight]} />
      <meshStandardMaterial color="#92400e" />
    </mesh>
  )
}

function SceneContent({
  myPosition,
  partnerPosition,
  partnerOnline,
  roomWidth,
  roomHeight,
  myIsWalking,
  partnerIsWalking,
}) {
  const mx = myPosition?.x ?? 100
  const my = myPosition?.y ?? 150
  const px = partnerPosition?.x ?? 300
  const py = partnerPosition?.y ?? 200
  const myPos = toThreePosition(mx, my)
  const partnerPos = toThreePosition(px, py)

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[HALF, 200, HALF]} intensity={1} castShadow />
      <Floor roomWidth={roomWidth} roomHeight={roomHeight} />
      <Character3D position={myPos} isWalking={myIsWalking} />
      {partnerOnline && (
        <Character3D position={partnerPos} isWalking={partnerIsWalking} />
      )}
    </>
  )
}

export default function Room3D(props) {
  const { roomWidth = ROOM_SIZE, roomHeight = ROOM_SIZE } = props
  return (
    <div
      className="rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-2 ring-amber-600/80"
      style={{ width: roomWidth, height: roomHeight }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{
          position: [280, 320, 280],
          zoom: 1.4,
          near: 0.1,
          far: 2000,
        }}
        orthographic
        shadows
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0)
          camera.updateProjectionMatrix()
        }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
