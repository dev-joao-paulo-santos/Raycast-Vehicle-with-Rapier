// src/components/Car/Wheel.jsx
import React from "react";

export default function Wheel({ radius = 0.35, width = 0.25 }) {
  return (
    <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, width, 16]} />
      <meshStandardMaterial metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
