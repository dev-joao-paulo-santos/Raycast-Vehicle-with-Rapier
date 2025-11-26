import { create } from 'zustand'

const useControls = create((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,

  init: () => {
    const handleKey = (e, pressed) => {
      if (e.code === 'KeyW') set({ forward: pressed })
      if (e.code === 'KeyS') set({ backward: pressed })
      if (e.code === 'KeyA') set({ left: pressed })
      if (e.code === 'KeyD') set({ right: pressed })
    }

    window.addEventListener('keydown', (e) => handleKey(e, true))
    window.addEventListener('keyup', (e) => handleKey(e, false))
  }
}))

useControls.getState().init()

export default useControls
