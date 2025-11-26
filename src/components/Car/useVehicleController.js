// src/components/Car/useVehicleController.js
import { useEffect } from "react";
import { create } from "zustand";

const useVehicleController = create((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
}));

const handleKeyDown = (e) => {
  const state = useVehicleController.getState();
  if (e.code === "KeyW" && !state.forward) useVehicleController.setState({ forward: true });
  if (e.code === "KeyS" && !state.backward) useVehicleController.setState({ backward: true });
  if (e.code === "KeyA" && !state.left) useVehicleController.setState({ left: true });
  if (e.code === "KeyD" && !state.right) useVehicleController.setState({ right: true });
};

const handleKeyUp = (e) => {
  if (e.code === "KeyW") useVehicleController.setState({ forward: false });
  if (e.code === "KeyS") useVehicleController.setState({ backward: false });
  if (e.code === "KeyA") useVehicleController.setState({ left: false });
  if (e.code === "KeyD") useVehicleController.setState({ right: false });
};

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

export default useVehicleController;
