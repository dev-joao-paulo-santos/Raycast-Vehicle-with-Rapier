import { RigidBody, useRapier } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import useControls from '../physics/controls'
import { useRef } from 'react'
import * as THREE from 'three'

export default function CarPhysics({ children }) {
  const body = useRef()
  const controls = useControls()

  useFrame(() => {
    const rb = body.current
    if (!rb) return

    // Obter a orientação do carro
    const rot = rb.rotation()
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)

    // Vetor para frente baseado na rotação
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)

    // Aceleração
    const impulseForce = 0.2

    if (controls.forward) {
      rb.applyImpulse(
        {
          x: forwardVec.x * impulseForce,
          y: 0,
          z: forwardVec.z * impulseForce
        },
        true
      )
    }

    if (controls.backward) {
      rb.applyImpulse(
        {
          x: -forwardVec.x * impulseForce,
          y: 0,
          z: -forwardVec.z * impulseForce
        },
        true
      )
    }

    // Rotação
    const torque = 0.23
    if (controls.left) {
      rb.applyTorqueImpulse({ x: 0, y: torque, z: 0 }, true)
    }
    if (controls.right) {
      rb.applyTorqueImpulse({ x: 0, y: -torque, z: 0 }, true)
    }
  })

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      mass={1}
      friction={1.2}
      restitution={0}
    >
      {children}
    </RigidBody>
  )
}
