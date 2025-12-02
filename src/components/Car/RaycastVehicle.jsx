// src/components/Car/RaycastVehicle.jsx
import React, { useRef, useEffect } from "react";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Wheel from "./Wheel";
import useVehicleController from "./useVehicleController";

/**
 * RaycastVehicle - Arcade leve (versão limpa)
 *
 * Principais ajustes:
 * - tração aplicada 1x por frame no centro do corpo (fora do loop das rodas)
 * - suspensão por roda via raycast (mantida)
 * - anti-drift por roda (mantido, mas suave)
 * - steering via torque suave
 */

export default function RaycastVehicle({
  position = [0, 8, 0],
  color = "lime"
}) {
  const body = useRef(null);
  const wheelsRef = useRef([]);
  const controls = useVehicleController();
  const { world, rapier } = useRapier();

  // pontos de raycast RELATIVOS ao centro do chassis (Y negativo = abaixo do corpo)
  const wheelOffsets = [
    new THREE.Vector3(-0.9, -0.25, 1.1), // front left
    new THREE.Vector3(0.9, -0.25, 1.1),  // front right
    new THREE.Vector3(-0.9, -0.25, -1.1),// rear left
    new THREE.Vector3(0.9, -0.25, -1.1)  // rear right
  ];

  // ---------- PARÂMETROS (Arcade leve) ----------
  const suspensionRest = 0.45;
  const suspensionStiffness = 7.5;
  const suspensionDamping = 1.6;
  const maxSuspensionForce = 120;

  const engineForce = 60;      // único valor base de tração (será aplicado centralizado)
  const reverseForce = 40;
  const brakeForce = 8;
  const wheelFrictionSide = 0.28;
  const steerAngleMax = 0.6;
  const mass = 1.8;

  useEffect(() => {
    wheelsRef.current = wheelsRef.current.slice(0, 4);
  }, []);

  useFrame(() => {
    const rb = body.current;
    if (!rb || !world || !rapier) return;

    // transform do corpo
    const pos = rb.translation();
    const rot = rb.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

    // forward = -Z no three.js
    const forwardWorld = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

    // steering input (-1..1)
    let steerInput = 0;
    if (controls.left) steerInput += 1;
    if (controls.right) steerInput -= 1;
    const steer = steerInput * steerAngleMax;

    // down world
    const down = new THREE.Vector3(0, -1, 0);
    const rayDir = down.clone().normalize();

    // armazenar velocidaed linear (para reuse)
    const linVel = rb.linvel();
    const velVecGlobal = new THREE.Vector3(linVel.x, linVel.y, linVel.z);

    // ====== loop das rodas: suspensão + correção lateral (mas sem tração) ======
    wheelOffsets.forEach((offset, i) => {
      const localPos = offset.clone();
      const worldOffset = localPos.applyQuaternion(quat);
      const rayOrigin = {
        x: pos.x + worldOffset.x,
        y: pos.y + worldOffset.y,
        z: pos.z + worldOffset.z
      };

      // ray rapier
      const rapierRay = new rapier.Ray(rayOrigin, { x: rayDir.x, y: rayDir.y, z: rayDir.z });
      const maxToi = suspensionRest + 0.35;
      const hit = world.castRay(rapierRay, maxToi, true); // solid=true ignora o próprio corpo

      if (!hit) {
        // roda no ar -> nada (pode aplicar air stabilization se quiser)
        return;
      }

      const distance = Number(hit.toi);
      if (!Number.isFinite(distance)) return;

      // compressão e forças da mola
      const compression = Math.max(0, suspensionRest - distance);
      const springForce = suspensionStiffness * compression;

      const velAlongDown = velVecGlobal.dot(down);
      const dampingForce = suspensionDamping * Math.max(0, -velAlongDown);

      let force = springForce + dampingForce;
      force = THREE.MathUtils.clamp(force, 0, maxSuspensionForce);

      const suspensionImpulse = down.clone().multiplyScalar(-force);

      if (Number.isFinite(suspensionImpulse.x) && Number.isFinite(suspensionImpulse.y) && Number.isFinite(suspensionImpulse.z)) {
        rb.applyImpulseAtPoint(
          { x: suspensionImpulse.x, y: suspensionImpulse.y, z: suspensionImpulse.z },
          rayOrigin,
          true
        );
      }

      // anti-drift por roda (suave)
      if (i >= 2) {
        const sideWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        const lateralSpeed = sideWorld.dot(velVecGlobal);
        const maxLateralCorrection = 6;
        const correction = THREE.MathUtils.clamp(
          -lateralSpeed * wheelFrictionSide,
          -maxLateralCorrection,
          maxLateralCorrection
        );
        const slideImpulse = sideWorld.clone().multiplyScalar(correction * 0.5);
        rb.applyImpulseAtPoint(
          { x: slideImpulse.x, y: 0, z: slideImpulse.z },
          rayOrigin,
          true
        );
        }}); // end wheels.forEach

    // ====== TRAÇÃO CENTRALIZADA (fora do loop) ======
    let tractionForce = 0;
    if (controls.forward) tractionForce = engineForce;
    if (controls.backward) tractionForce = -reverseForce;

    if (tractionForce !== 0) {
      rb.applyImpulse(
        { x: forwardWorld.x * tractionForce, y: 0, z: forwardWorld.z * tractionForce },
        true
      );
    } else {
      // freio quando soltar (opcional, leve desaceleração)
      // pode usar linear damping em vez disso; deixei comentado
      // rb.setLinvel({ x: linVel.x * 0.98, y: linVel.y, z: linVel.z * 0.98 }, true);
    }

    // freio (quando marcha ré) - aplicado diretamente nas rodas via ponto da roda (suave)
    if (controls.backward && !controls.forward) {
      // freio leve no centro para simplificar
      const brakeImpulse = forwardWorld.clone().multiplyScalar(-brakeForce * 0.25);
      rb.applyImpulse({ x: brakeImpulse.x, y: 0, z: brakeImpulse.z }, true);
    }

    // ====== STEERING (torque) ======
    const currentLin = rb.linvel();
    const speed = Math.sqrt(currentLin.x * currentLin.x + currentLin.z * currentLin.z);
    const speedFactor = Math.max(0.15, 1 - speed * 0.06);
    const torqueStrength = steer * 2.0 * speedFactor;
    if (Number.isFinite(torqueStrength)) {
      rb.applyTorqueImpulse({ x: 0, y: torqueStrength, z: 0 }, true);
    }

    // limitar velocidade horizontal
    const maxSpeed = 18;
    const currentHspeed = Math.sqrt(currentLin.x * currentLin.x + currentLin.z * currentLin.z);
    if (currentHspeed > maxSpeed) {
      const scale = maxSpeed / currentHspeed;
      rb.setLinvel({ x: currentLin.x * scale, y: currentLin.y, z: currentLin.z * scale }, true);
    }

    // atualizar visual das rodas
    wheelsRef.current.forEach((w, idx) => {
      if (!w) return;
      const localPos = wheelOffsets[idx].clone();
      const worldPos = localPos.applyQuaternion(quat).add(new THREE.Vector3(pos.x, pos.y, pos.z));
      w.position.set(worldPos.x, worldPos.y, worldPos.z);

      const rotSpeed = rb.linvel().z * 0.18;
      w.rotation.x += rotSpeed * 0.02;

      if (idx <= 1) {
        w.rotation.y = steer * 0.6;
      } else {
        w.rotation.y = 0;
      }
    });
  }); // useFrame

  return (
    <group>
      <RigidBody
        ref={body}
        colliders={false}
        mass={mass}
        position={position}
        linearDamping={0.06}
        angularDamping={0.45}
      >
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.6, 3.2]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>

        <CuboidCollider args={[0.9, 0.3, 1.6]} />
      </RigidBody>

      {/* rodas visuais */}
      {wheelOffsets.map((offset, i) => (
        <group
          key={i}
          ref={(el) => (wheelsRef.current[i] = el)}
          position={offset.toArray()}
        >
          <Wheel />
        </group>
      ))}
    </group>
  );
}
