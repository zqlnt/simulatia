/**
 * Boot loader — orbital worlds (visual only, not interactive buttons).
 */
import * as THREE from 'three';

const WORLDS = [
  { color: 0xe2e2e4, emissive: 0x5a5a5e, label: 'Atlas' },
  { color: 0xd4d4d8, emissive: 0x4a4a4e, label: 'Colony' },
  { color: 0xc8c8cc, emissive: 0x404044, label: 'Research' },
  { color: 0xbcbcc0, emissive: 0x38383c, label: 'Network' },
  { color: 0xb0b0b4, emissive: 0x323236, label: 'Agents' },
];

function makePlanet(radius, color, emissive) {
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.MeshPhongMaterial({
    color,
    emissive,
    emissiveIntensity: 0.35,
    shininess: 48,
    specular: 0x8899bb,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.08, 24, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  mesh.add(atm);
  return mesh;
}

export function createBootOrbit(container) {
  if (!container) return { setProgress() {}, dispose() {} };

  const width = Math.min(320, container.clientWidth || 320);
  const height = 168;

  const canvas = document.createElement('canvas');
  canvas.className = 'boot-orbit-canvas';
  canvas.width = width * (window.devicePixelRatio > 1 ? 1.5 : 1);
  canvas.height = height * (window.devicePixelRatio > 1 ? 1.5 : 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
  camera.position.set(0, 2.2, 11);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xccccd0, 0.35);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff8ee })
  );
  scene.add(core);
  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x888890, transparent: true, opacity: 0.08 })
  );
  scene.add(coreGlow);

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.02, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0xaaaaae, transparent: true, opacity: 0.12 })
  );
  orbitRing.rotation.x = Math.PI / 2.4;
  scene.add(orbitRing);

  const progressArc = new THREE.Mesh(
    new THREE.RingGeometry(4.05, 4.18, 64, 1, 0, 0.01),
    new THREE.MeshBasicMaterial({
      color: 0x6e9fff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  progressArc.rotation.x = Math.PI / 2;
  scene.add(progressArc);

  const planets = WORLDS.map((w, i) => {
    const p = makePlanet(0.42 + (i % 2) * 0.06, w.color, w.emissive);
    p.userData.orbitR = 3.6 + i * 0.35;
    p.userData.orbitSpeed = 0.35 + i * 0.08;
    p.userData.orbitPhase = (i / WORLDS.length) * Math.PI * 2;
    p.userData.index = i;
    p.visible = false;
    p.scale.setScalar(0.01);
    scene.add(p);
    return p;
  });

  const stageDots = document.createElement('div');
  stageDots.className = 'boot-orbit-stages';
  stageDots.innerHTML = WORLDS.map(
    (w, i) => `<span class="boot-orbit-stage" data-idx="${i}">${w.label}</span>`
  ).join('');
  container.appendChild(stageDots);

  let progress = 0;
  let raf = 0;
  let t0 = performance.now();
  let disposed = false;

  function setProgress(pct) {
    progress = Math.max(progress, Math.min(100, pct));
    const lit = Math.ceil((progress / 100) * WORLDS.length);
    planets.forEach((p, i) => {
      const on = i < lit;
      p.visible = on || p.scale.x > 0.05;
      const target = on ? 1 : 0.01;
      p.scale.x = p.scale.y = p.scale.z = THREE.MathUtils.lerp(p.scale.x, target, 0.12);
    });
    progressArc.geometry.dispose();
    const arc = (progress / 100) * Math.PI * 2;
    progressArc.geometry = new THREE.RingGeometry(4.05, 4.18, 64, 1, -Math.PI / 2, Math.max(0.02, arc));
    stageDots.querySelectorAll('.boot-orbit-stage').forEach((el, i) => {
      el.classList.toggle('is-active', i < lit);
      el.classList.toggle('is-current', i === lit - 1);
    });
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const t = (now - t0) * 0.001;
    core.rotation.y = t * 0.4;
    coreGlow.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    orbitRing.rotation.z = t * 0.12;
    planets.forEach((p) => {
      const ang = t * p.userData.orbitSpeed + p.userData.orbitPhase;
      const r = p.userData.orbitR;
      p.position.set(Math.cos(ang) * r, Math.sin(ang * 0.7) * 0.35, Math.sin(ang) * r);
      p.rotation.y = ang * 0.5;
    });
    renderer.render(scene, camera);
  }

  raf = requestAnimationFrame(tick);
  setProgress(0);

  return {
    setProgress,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      planets.forEach((p) => {
        p.geometry?.dispose();
        p.material?.dispose();
      });
      progressArc.geometry?.dispose();
      orbitRing.geometry?.dispose();
      canvas.remove();
      stageDots.remove();
    },
  };
}
