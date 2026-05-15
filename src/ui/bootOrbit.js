/**
 * Boot loader — cycles Worlds → Cities → Buildings → Rooms with blurred stage backdrops.
 */
import * as THREE from 'three';

const STAGES = [
  {
    id: 'worlds',
    label: 'Worlds',
    color: 0xd8d8dc,
    emissive: 0x4a4a50,
    backdrop: 'radial-gradient(circle at 50% 42%, rgba(110, 159, 255, 0.14) 0%, rgba(236, 236, 240, 0.92) 68%)',
    orbitR: 3.8,
    scale: 0.52,
  },
  {
    id: 'cities',
    label: 'Cities',
    color: 0xc8c8ce,
    emissive: 0x404048,
    backdrop: 'radial-gradient(circle at 50% 40%, rgba(90, 120, 160, 0.12) 0%, rgba(228, 230, 236, 0.94) 70%)',
    orbitR: 3.4,
    scale: 0.46,
  },
  {
    id: 'buildings',
    label: 'Buildings',
    color: 0xb8b8c0,
    emissive: 0x383840,
    backdrop: 'linear-gradient(165deg, rgba(200, 208, 220, 0.35) 0%, rgba(236, 238, 242, 0.95) 55%)',
    orbitR: 2.9,
    scale: 0.4,
  },
  {
    id: 'rooms',
    label: 'Rooms',
    color: 0xacacb4,
    emissive: 0x323238,
    backdrop: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(255, 255, 255, 0.5) 0%, rgba(240, 242, 246, 0.96) 72%)',
    orbitR: 2.5,
    scale: 0.36,
  },
];

function makeStageMesh(stage, index) {
  const root = new THREE.Group();
  root.userData.stageIndex = index;

  if (stage.id === 'buildings') {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.9, 0.55),
      new THREE.MeshPhongMaterial({ color: stage.color, emissive: stage.emissive, emissiveIntensity: 0.28, shininess: 40 })
    );
    base.position.y = 0.45;
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.12, 0.62),
      new THREE.MeshPhongMaterial({ color: 0xe8eaee, shininess: 52 })
    );
    cap.position.y = 0.96;
    root.add(base, cap);
  } else if (stage.id === 'rooms') {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.04, 0.72),
      new THREE.MeshPhongMaterial({ color: 0xe4e6ea, shininess: 18 })
    );
    floor.position.y = 0.02;
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.22, 0.28),
      new THREE.MeshPhongMaterial({ color: stage.color, emissive: stage.emissive, emissiveIntensity: 0.22, shininess: 36 })
    );
    pod.position.set(0.12, 0.16, 0.1);
    root.add(floor, pod);
  } else {
    const geo = new THREE.SphereGeometry(stage.scale, 28, 20);
    const mat = new THREE.MeshPhongMaterial({
      color: stage.color,
      emissive: stage.emissive,
      emissiveIntensity: 0.32,
      shininess: 48,
      specular: 0x8899bb,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = stage.scale;
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(stage.scale * 1.1, 20, 14),
      new THREE.MeshBasicMaterial({
        color: stage.color,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    mesh.add(atm);
    root.add(mesh);
  }

  root.userData.orbitR = stage.orbitR;
  root.userData.orbitSpeed = 0.28 + index * 0.06;
  root.userData.orbitPhase = (index / STAGES.length) * Math.PI * 2;
  return root;
}

export function createBootOrbit(container) {
  if (!container) return { setProgress() {}, dispose() {} };

  const width = Math.min(320, container.clientWidth || 320);
  const height = 168;

  const backdrop = document.createElement('div');
  backdrop.className = 'boot-orbit-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  container.appendChild(backdrop);

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
    new THREE.SphereGeometry(0.28, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff8ee })
  );
  scene.add(core);

  const progressArc = new THREE.Mesh(
    new THREE.RingGeometry(3.85, 3.98, 64, 1, 0, 0.01),
    new THREE.MeshBasicMaterial({
      color: 0x6e9fff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  progressArc.rotation.x = Math.PI / 2;
  scene.add(progressArc);

  const stageMeshes = STAGES.map((s, i) => {
    const g = makeStageMesh(s, i);
    g.visible = i === 0;
    g.scale.setScalar(i === 0 ? 1 : 0.01);
    scene.add(g);
    return g;
  });

  const stageDots = document.createElement('div');
  stageDots.className = 'boot-orbit-stages';
  stageDots.innerHTML = STAGES.map(
    (w, i) => `<span class="boot-orbit-stage" data-idx="${i}">${w.label}</span>`
  ).join('');
  container.appendChild(stageDots);

  let progress = 0;
  let raf = 0;
  let t0 = performance.now();
  let disposed = false;
  let cycleIndex = 0;
  let cycleT = 0;

  function setBackdrop(idx) {
    const stage = STAGES[idx];
    if (stage && backdrop) backdrop.style.background = stage.backdrop;
  }

  function setProgress(pct) {
    progress = Math.max(progress, Math.min(100, pct));
    const lit = Math.min(STAGES.length, Math.ceil((progress / 100) * STAGES.length));
    const current = Math.max(0, lit - 1);

    stageMeshes.forEach((g, i) => {
      const on = i <= current;
      g.visible = on || g.scale.x > 0.05;
      const target = on && i === current ? 1 : on ? 0.72 : 0.01;
      g.scale.x = g.scale.y = g.scale.z = THREE.MathUtils.lerp(g.scale.x, target, 0.14);
    });

    setBackdrop(current);
    cycleIndex = current;

    progressArc.geometry.dispose();
    const arc = (progress / 100) * Math.PI * 2;
    progressArc.geometry = new THREE.RingGeometry(3.85, 3.98, 64, 1, -Math.PI / 2, Math.max(0.02, arc));

    stageDots.querySelectorAll('.boot-orbit-stage').forEach((el, i) => {
      el.classList.toggle('is-active', i <= current);
      el.classList.toggle('is-current', i === current);
    });
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const t = (now - t0) * 0.001;
    cycleT += 0.016;
    if (cycleT > 2.8) {
      cycleT = 0;
      cycleIndex = (cycleIndex + 1) % STAGES.length;
      setBackdrop(cycleIndex);
      stageDots.querySelectorAll('.boot-orbit-stage').forEach((el, i) => {
        el.classList.toggle('is-current', i === cycleIndex);
      });
    }

    core.rotation.y = t * 0.4;
    stageMeshes.forEach((g, i) => {
      const ang = t * g.userData.orbitSpeed + g.userData.orbitPhase;
      const r = g.userData.orbitR;
      g.position.set(Math.cos(ang) * r, Math.sin(ang * 0.7) * 0.28, Math.sin(ang) * r);
      g.rotation.y = ang * 0.45;
      if (i === cycleIndex) g.scale.x = g.scale.y = g.scale.z = THREE.MathUtils.lerp(g.scale.x, 1, 0.08);
    });
    renderer.render(scene, camera);
  }

  setBackdrop(0);
  raf = requestAnimationFrame(tick);
  setProgress(0);

  return {
    setProgress,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      stageMeshes.forEach((g) => {
        g.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => m.dispose?.());
          }
        });
      });
      progressArc.geometry?.dispose();
      canvas.remove();
      backdrop.remove();
      stageDots.remove();
    },
  };
}
