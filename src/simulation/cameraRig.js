/** Orbital camera rig (S state) — lives in scene.js animation loop. */
export function createCameraState(THREE, initialFocus) {
  return {
    theta: 0.72,
    phi: 0.96,
    radius: 82,
    targetTheta: 0.72,
    targetPhi: 0.96,
    targetRadius: 82,
    focus: initialFocus.clone(),
    targetFocus: initialFocus.clone(),
    look: initialFocus.clone(),
    targetFov: 42,
    auto: true,
    drag: false,
    pid: null,
    moved: false,
    sx: 0,
    sy: 0,
    lx: 0,
    ly: 0,
    last: performance.now(),
  };
}
