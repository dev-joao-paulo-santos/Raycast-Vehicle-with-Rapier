// Ground.jsx
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

export default function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      
      {/* Apenas a MESH gira */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4c4c4c" side={THREE.DoubleSide} />
      </mesh>

      {/* Collider sem rotação (deitado por padrão) */}
      <CuboidCollider args={[100, 0.1, 100]} />
    </RigidBody>
  )
}
