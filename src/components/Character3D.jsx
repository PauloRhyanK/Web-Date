import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const CHARACTER_MODEL_URL = '/models/character.glb'
const CHARACTER_SCALE = 25
const IDLE_NAMES = ['Idle', 'idle', 'IDLE']
const WALK_NAMES = ['Walk', 'walk', 'Walking', 'walking']

function findClipByName(animations, names) {
  if (!animations?.length) return null
  for (const name of names) {
    const clip = animations.find((c) => c.name === name)
    if (clip) return clip
  }
  return animations[0] || null
}

export default function Character3D({ position = [0, 0, 0], isWalking = false }) {
  const groupRef = useRef(null)
  const { scene, animations } = useGLTF(CHARACTER_MODEL_URL)
  const clone = useMemo(() => (scene ? scene.clone() : null), [scene])
  const mixerRef = useRef(null)
  const idleActionRef = useRef(null)
  const walkActionRef = useRef(null)
  const currentActionRef = useRef(null)

  const idleClip = useMemo(() => findClipByName(animations, IDLE_NAMES), [animations])
  const walkClip = useMemo(() => findClipByName(animations, WALK_NAMES), [animations])

  useEffect(() => {
    if (!clone || !animations?.length) return
    const mixer = new THREE.AnimationMixer(clone)
    mixerRef.current = mixer
    if (idleClip) {
      const action = mixer.clipAction(idleClip)
      action.clampWhenFinished = true
      idleActionRef.current = action
    }
    if (walkClip) {
      const action = mixer.clipAction(walkClip)
      action.clampWhenFinished = true
      walkActionRef.current = action
    }
    const idle = idleActionRef.current || mixer.existingAction(animations[0])
    if (idle) {
      idle.play()
      currentActionRef.current = 'idle'
    }
    return () => {
      mixer.stopAllAction()
    }
  }, [clone, animations, idleClip, walkClip])

  useEffect(() => {
    const mixer = mixerRef.current
    const idle = idleActionRef.current
    const walk = walkActionRef.current
    if (!mixer || (!idle && !walk)) return
    const duration = 0.2
    if (isWalking && walk && currentActionRef.current !== 'walk') {
      idle?.fadeOut(duration)
      walk?.reset().fadeIn(duration).play()
      currentActionRef.current = 'walk'
    } else if (!isWalking && idle && currentActionRef.current !== 'idle') {
      walk?.fadeOut(duration)
      idle?.reset().fadeIn(duration).play()
      currentActionRef.current = 'idle'
    }
  }, [isWalking])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  if (!clone) return null

  return (
    <group ref={groupRef} position={position} scale={[CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE]}>
      <primitive object={clone} />
    </group>
  )
}

useGLTF.preload(CHARACTER_MODEL_URL)
