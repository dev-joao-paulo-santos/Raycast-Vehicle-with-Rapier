import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useRapier } from '@react-three/rapier'

export default function ThirdPersonCamera() {
  const cameraRef = useRef()
  const { world } = useRapier()

  useFrame(({ camera }) => {
    const car = world.bodies[0] // gambiarra temporária
    if (!car) return

    const pos = car.translation()
    const target = [pos.x, pos.y + 1.5, pos.z + 5]

    camera.position.lerp(
      { x: target[0], y: target[1], z: target[2] },
      0.1
    )

    camera.lookAt(pos.x, pos.y + 1, pos.z)
  })
}
