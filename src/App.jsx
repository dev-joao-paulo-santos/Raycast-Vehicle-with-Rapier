import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Car from './components/Car/Car'
import Ground from './components/World/Ground'
import ThirdPersonCamera from './components/Camera/ThirdPersonCamera'
import RaycastVehicle from './components/Car/RaycastVehicle'

export default function App() {
  return (
    <Canvas className='w-screen h-screen' shadows camera={{ position: [8, 6, 8], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight castShadow position={[10, 10, 10]} />

      <Physics gravity={[0, -9.81, 0]} debug>
        <Ground />
        <RaycastVehicle />
        <ThirdPersonCamera />
      </Physics>

      <OrbitControls />
    </Canvas>
  )
}
