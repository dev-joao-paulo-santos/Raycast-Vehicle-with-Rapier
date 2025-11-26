import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

export default function Ground() {
  return (
<RigidBody type="fixed" friction={0.4} colliders={false}>
  {/* geometria rotacionada */}
  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial color="#4c4c4c" side={THREE.DoubleSide} />
  </mesh>

  {/* collider alinhado (sem rotação) pois já está deitado no eixo Y nativo */}
  <CuboidCollider args={[100, 0.1, 100]} />
</RigidBody>


  )
}
