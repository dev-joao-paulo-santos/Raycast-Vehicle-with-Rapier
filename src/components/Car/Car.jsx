import CarPhysics from './CarPhysics'

export default function Car() {
  return (
    <CarPhysics>
      <mesh castShadow position={[0, 1, 0]}>
        <boxGeometry args={[1.2, 0.5, 2]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </CarPhysics>
  )
}