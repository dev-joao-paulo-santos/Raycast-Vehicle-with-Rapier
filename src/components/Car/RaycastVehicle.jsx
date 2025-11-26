// src/components/Car/RaycastVehicle.jsx
import React, { useRef, useEffect } from "react";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Wheel from "./Wheel";
import useVehicleController from "./useVehicleController";

export default function RaycastVehicle({
  position = [0, 8, 0],
  color = "lime"
}) {
  const body = useRef(null);
  const wheelsRef = useRef([]);
  const { world, rapier } = useRapier();

  // offsets locais das rodas (x, y, z) — ajuste Y para posicionar as rodas no nível do chassi
  // wheelOffsets: rodas EMBAIXO do chassi
    const wheelOffsets = [
    new THREE.Vector3(-0.9, -0.2, 1.2),
    new THREE.Vector3(0.9, -0.2, 1.2),
    new THREE.Vector3(-0.9, -0.2, -1.2),
    new THREE.Vector3(0.9, -0.2, -1.2),
    ];

    // depois, useEffect pra setRotation:
    useEffect(() => {
    if (!body.current) return;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    body.current.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    }, []);
  // parâmetros "safe" (arcade)
  const suspensionRest = 0.45;      // descanso da mola (m)
  const suspensionStiffness = 8;    // <= 10 é seguro
  const suspensionDamping = 1.8;    // damping proporcional ao vel
  const maxSuspensionForce = 80;    // clamp pra não explodir
  const engineForce = 350;           // empuxo por roda (ajustar)
  const brakeForce = 12;             // freio (valor para impulso negativo)
  const wheelFrictionSide = .3;    // anti-drift (menor -> mais drift)
  const steerAngleMax = 0.7;
  const mass = 800;

  useEffect(() => {
    wheelsRef.current = wheelsRef.current.slice(0, 4);
    
  }, []);

  useEffect(() => {
  if (!body.current) return;

  // Euler desejada — desenrosque conforme necessário
  const euler = new THREE.Euler(0, Math.PI, 0); // gira 180º no Y
  const q = new THREE.Quaternion().setFromEuler(euler);

  // setRotation espera um objeto {x,y,z,w}
  // o segundo arg 'true' desperta / sincroniza o corpo na simulação
  try {
    body.current.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  } catch (err) {
    // fallback: usar setRotation do rapier raw (algumas versões)
    body.current.setRotation(q, true);
  }
}, []);


  useFrame(() => {
    const rb = body.current;

    

    if (!rb || !world || !rapier) return;

    const controls = useVehicleController.getState();

    // leitura da posição e rotação do RigidBody
    const pos = rb.translation(); // {x,y,z}
    const rot = rb.rotation(); // {x,y,z,w}
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

    // forward do carro no mundo
    const forwardWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

    // steering input
    let steerInput = 0;
    if (controls.left) steerInput += 1;
    if (controls.right) steerInput -= 1;
    const steer = steerInput * steerAngleMax;

    // direção vertical world (sempre estável)
    const down = new THREE.Vector3(0, -1, 0);
    const rayDir = down.clone().normalize();

    // iterate wheels
    wheelOffsets.forEach((offset, i) => {
      // posição do ponto de raycast em world space
      const localPos = offset.clone();
      const worldOffset = localPos.applyQuaternion(quat);
      const rayOrigin = {
        x: pos.x + worldOffset.x,
        y: pos.y + worldOffset.y,
        z: pos.z + worldOffset.z,
      };

      // build rapier ray (origin, direction)
      const rapierRay = new rapier.Ray(rayOrigin, { x: rayDir.x, y: rayDir.y, z: rayDir.z });

      // distância máxima a testar
      const maxToi = suspensionRest + 0.3;

      // castRay(solid = true) para ignorar o próprio corpo
      const hit = world.castRay(rapierRay, maxToi, true);

      if (hit) {
        // sanity check
        const distance = Number(hit.toi);
        if (!Number.isFinite(distance)) return;

        // compressão da mola
        const compression = Math.max(0, suspensionRest - distance);

        // spring (F = k * x) e damping baseado na velocidade ao longo do eixo down
        const springForce = suspensionStiffness * compression;

        // velocidade linear do body e componente ao longo de 'down'
        const vel = rb.linvel(); // {x,y,z}
        const velVec = new THREE.Vector3(vel.x, vel.y, vel.z);
        const velAlongDown = velVec.dot(down); // velocidade na direção -Y

        // damping: positivo se a roda estiver se aproximando do chão (reduz oscillation)
        const dampingForce = suspensionDamping * Math.max(0, -velAlongDown);

        // força total (capada)
        let force = springForce + dampingForce; // soma porque velAlongDown é negativo quando se aproxima
        force = THREE.MathUtils.clamp(force, 0, maxSuspensionForce);

        // aplicar impulso no ponto da roda (direção para cima = -down)
        const suspensionImpulse = down.clone().multiplyScalar(-force);

        // safety: small epsilon to avoid zero-length weirdness
        if (Number.isFinite(suspensionImpulse.x) && Number.isFinite(suspensionImpulse.y) && Number.isFinite(suspensionImpulse.z)) {
          rb.applyImpulseAtPoint(
            { x: suspensionImpulse.x, y: suspensionImpulse.y, z: suspensionImpulse.z },
            rayOrigin,
            true
          );
        }

        // ---------- TRAÇÃO (aplicada nas rodas traseiras) ----------
        let push = 0;
        if (controls.forward) push = engineForce;
        if (controls.backward) push = -engineForce * 0.7;

// ---------- TRAÇÃO SIMPLES E QUE SEMPRE FUNCIONA ----------
if (i >= 2) { // só rodas traseiras (índices 2 e 3)
  const push = controls.forward ? 350 : controls.backward ? -200 : 0;
  if (push !== 0) {
    const traction = forwardWorld.clone().multiplyScalar(push);
    rb.applyImpulseAtPoint(
      { x: traction.x, y: traction.y, z: traction.z },
      rayOrigin,
      true
    );
  }
}

        // freio suave ao reverter
        if (controls.backward && Math.abs(push) > 0) {
          const brakeImpulse = forwardWorld.clone().multiplyScalar(push * -0.25);
          rb.applyImpulseAtPoint(
            { x: brakeImpulse.x, y: 0, z: brakeImpulse.z },
            rayOrigin,
            true
          );
        }

        // ---------- ANTI-DRIFT / FORÇA LATERAL ----------
        const sideWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        const lateralSpeed = sideWorld.dot(velVec);

        // clamp lateral correction pra não explodir
        const maxLateralCorrection = 6;
        const correction = THREE.MathUtils.clamp(-lateralSpeed * wheelFrictionSide, -maxLateralCorrection, maxLateralCorrection);

        const slideImpulse = sideWorld.clone().multiplyScalar(correction * 0.5); // suave
        rb.applyImpulseAtPoint(
          { x: slideImpulse.x, y: 0, z: slideImpulse.z },
          rayOrigin,
          true
        );
      } // if hit
      else {
        // roda no ar -> podemos aplicar uma força menor de "down" para estabilizar (opcional)
        // const airStab = new THREE.Vector3(0, -0.6, 0);
        // rb.applyImpulseAtPoint({ x: airStab.x, y: airStab.y, z: airStab.z }, rayOrigin, true);
      }
    }); // forEach wheels

    // steering: apply torque scaled by speed (mais suave em alta velocidade)
    const linVel = rb.linvel();
    const speed = Math.sqrt(linVel.x * linVel.x + linVel.z * linVel.z);
    const speedFactor = Math.max(0.15, 1 - speed * 0.06);
    const torqueStrength = steer * 0.45 * speedFactor;
    // small safeguard
    if (Number.isFinite(torqueStrength)) rb.applyTorqueImpulse({ x: 0, y: torqueStrength, z: 0 }, true);

    // limitar velocidade horizontal
    const maxSpeed = 18;
    const currentHspeed = Math.sqrt(linVel.x * linVel.x + linVel.z * linVel.z);
    if (currentHspeed > maxSpeed) {
      const scale = maxSpeed / currentHspeed;
      rb.setLinvel({ x: linVel.x * scale, y: linVel.y, z: linVel.z * scale }, true);
    }

    // atualizar visual das rodas
    wheelsRef.current.forEach((w, idx) => {
      if (!w) return;
      const localPos = wheelOffsets[idx].clone();
      const worldPos = localPos.applyQuaternion(quat).add(new THREE.Vector3(pos.x, pos.y, pos.z));
      w.position.set(worldPos.x, worldPos.y, worldPos.z);

      // giro visual baseado na velocidade longitudinal (suave)
      const rotSpeed = rb.linvel().z * 0.18;
      w.rotation.x += rotSpeed * 0.02;

      // steer visual nas rodas frontais
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
        linearDamping={0.15}
        angularDamping={0.45}
      >
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.6, 3.2]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>

        {/* collider manual ajustado ao corpo */}
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
