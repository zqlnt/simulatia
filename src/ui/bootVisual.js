/**
 * Boot visual — SVG progress ring morphs into a tilt-shift planet ring as load completes.
 */

const STAGES = [
  { id: 'worlds', label: 'Worlds', tone: '#b8bcc6', glow: 'rgba(110, 159, 255, 0.45)', size: 14 },
  { id: 'cities', label: 'Cities', tone: '#a8acb8', glow: 'rgba(90, 120, 160, 0.4)', size: 12 },
  { id: 'buildings', label: 'Buildings', tone: '#9ca0ae', glow: 'rgba(80, 88, 100, 0.38)', size: 11 },
  { id: 'rooms', label: 'Rooms', tone: '#9096a4', glow: 'rgba(255, 255, 255, 0.35)', size: 10 },
];

const CIRC = 327;
const PLANET_RADIUS = 52;

export function createBootVisual(container) {
  if (!container) return { setProgress() {}, pause() {}, dispose() {} };

  container.innerHTML = '';
  container.classList.add('boot-visual-host');

  const root = document.createElement('div');
  root.className = 'boot-visual';

  const ring = document.createElement('div');
  ring.className = 'boot-visual-ring';
  ring.setAttribute('aria-hidden', 'true');

  const tiltBandTop = document.createElement('div');
  tiltBandTop.className = 'boot-visual-tilt-band boot-visual-tilt-band--top';

  const tiltBandBottom = document.createElement('div');
  tiltBandBottom.className = 'boot-visual-tilt-band boot-visual-tilt-band--bottom';

  const stage3d = document.createElement('div');
  stage3d.className = 'boot-visual-stage';

  const morph = document.createElement('div');
  morph.className = 'boot-visual-morph';

  const loaderLayer = document.createElement('div');
  loaderLayer.className = 'boot-visual-loader';
  loaderLayer.innerHTML = `<svg viewBox="0 0 120 120" class="boot-visual-svg" aria-hidden="true">
      <circle class="boot-visual-track" cx="60" cy="60" r="52" fill="none" stroke-width="3.5"></circle>
      <circle class="boot-visual-arc" cx="60" cy="60" r="52" fill="none" stroke-width="3.5"
        stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"
        transform="rotate(-90 60 60)"></circle>
    </svg>`;

  const planetsRing = document.createElement('div');
  planetsRing.className = 'boot-planets-ring';

  STAGES.forEach((stage, i) => {
    const planet = document.createElement('span');
    planet.className = 'boot-planet';
    planet.dataset.stage = stage.id;
    planet.dataset.idx = String(i);
    planet.style.setProperty('--planet-tone', stage.tone);
    planet.style.setProperty('--planet-glow', stage.glow);
    planet.style.setProperty('--planet-size', `${stage.size}px`);
    const angle = -90 + (360 / STAGES.length) * i;
    planet.style.setProperty('--planet-angle', `${angle}deg`);
    planetsRing.appendChild(planet);
  });

  morph.append(loaderLayer, planetsRing);
  stage3d.append(morph);
  ring.append(tiltBandTop, tiltBandBottom, stage3d);

  const core = document.createElement('div');
  core.className = 'boot-visual-core';
  ring.appendChild(core);

  const stagesEl = document.createElement('div');
  stagesEl.className = 'boot-orbit-stages boot-visual-stages';
  stagesEl.innerHTML = STAGES.map(
    (s, i) => `<span class="boot-orbit-stage" data-idx="${i}">${s.label}</span>`
  ).join('');

  root.append(ring, stagesEl);
  container.appendChild(root);

  const arc = loaderLayer.querySelector('.boot-visual-arc');
  const planets = planetsRing.querySelectorAll('.boot-planet');
  let progress = 0;
  let spinRaf = 0;
  let spinAngle = 0;
  let disposed = false;

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function paintMorph(pct) {
    const t = easeOut(Math.min(1, pct / 100));
    const tilt = 52 * t;
    const skew = 7 * t;
    const scaleY = 1 - 0.48 * t;
    const loaderOpacity = 1 - t * 0.35;
    const planetOpacity = 0.12 + 0.88 * t;
    const orbitRadius = PLANET_RADIUS * (1 - 0.06 * t);

    container.style.setProperty('--boot-progress', String(pct));
    container.style.setProperty('--boot-tilt', String(tilt));
    container.style.setProperty('--boot-skew', String(skew));
    container.style.setProperty('--boot-scale-y', String(scaleY));
    container.style.setProperty('--boot-loader-opacity', String(loaderOpacity));
    container.style.setProperty('--boot-planet-opacity', String(planetOpacity));
    container.style.setProperty('--boot-orbit-radius', `${orbitRadius}px`);
    container.style.setProperty('--boot-spin', `${spinAngle}deg`);

    planets.forEach((el, i) => {
      const stageStart = (i / STAGES.length) * 100;
      const stageLit = pct >= stageStart + 8;
      const local = Math.min(1, Math.max(0, (pct - stageStart) / 24));
      el.classList.toggle('is-lit', stageLit);
      el.style.setProperty('--planet-scale', String(0.4 + 0.6 * local * t));
    });
  }

  function paintStages(pct) {
    const lit = Math.min(STAGES.length, Math.ceil((pct / 100) * STAGES.length));
    const current = Math.max(0, lit - 1);
    stagesEl.querySelectorAll('.boot-orbit-stage').forEach((el, i) => {
      el.classList.toggle('is-active', i <= current);
      el.classList.toggle('is-current', i === current);
    });
  }

  function tickSpin() {
    if (disposed) return;
    spinAngle = (spinAngle + 0.22) % 360;
    container.style.setProperty('--boot-spin', `${spinAngle}deg`);
    spinRaf = requestAnimationFrame(tickSpin);
  }

  function setProgress(pct) {
    progress = Math.max(progress, Math.min(100, pct));
    if (arc) arc.style.strokeDashoffset = String(CIRC - (CIRC * progress) / 100);
    paintMorph(progress);
    paintStages(progress);
    const skewing = progress >= 8;
    root.classList.toggle('boot-visual--skewing', skewing);
    root.classList.toggle('boot-visual--planets', progress >= 38);
    root.classList.toggle('boot-visual--tilted', progress >= 62);
    root.classList.toggle('boot-visual--orbit', progress >= 38);
    container.classList.toggle('boot-visual-host--orbit', progress >= 38);
  }

  paintMorph(0);
  paintStages(0);
  spinRaf = requestAnimationFrame(tickSpin);

  return {
    setProgress,
    pause() {
      root.classList.add('is-paused');
      cancelAnimationFrame(spinRaf);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(spinRaf);
      container.classList.remove('boot-visual-host');
      container.innerHTML = '';
    },
  };
}
