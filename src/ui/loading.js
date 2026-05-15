/**
 * Premium boot shell — staged progress, scene preview, smooth creep during long loads.
 */

import { createBootOrbit } from './bootOrbit.js';

const STAGES = [
  { until: 14, label: 'Preparing interface' },
  { until: 36, label: 'Generating worlds' },
  { until: 52, label: 'Building cities' },
  { until: 68, label: 'Placing buildings' },
  { until: 84, label: 'Loading rooms & agents' },
  { until: 100, label: 'Finalizing experience' },
];

const MIN_PREVIEW_BEFORE_FADE_MS = 2200;
const REVEAL_SHARPEN_MS = 900;

function stageLabel(pct) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (pct <= STAGES[i].until) return STAGES[i].label;
  }
  return STAGES[STAGES.length - 1].label;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitFrames(count = 2) {
  return new Promise((resolve) => {
    let n = 0;
    const step = () => {
      n += 1;
      if (n >= count) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export function createBootShell() {
  const shell = document.getElementById('boot-shell');
  const statusEl = document.getElementById('boot-status');
  const orbitHost = document.getElementById('boot-orbit');
  const picks = document.getElementById('boot-agent-picks');
  const skipBtn = document.getElementById('boot-skip');
  const progressFill = document.getElementById('boot-progress-fill');
  const progressPct = document.getElementById('boot-progress-pct');

  let finished = false;
  let onSkip = null;
  let onScenePreview = null;
  let targetProgress = 0;
  let displayProgress = 0;
  let orbit = null;
  let rafId = 0;
  let creepRaf = 0;
  let creepStart = 0;
  let scenePreviewAt = 0;
  let scenePreviewSeen = false;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function paintProgress() {
    const shown = Math.round(displayProgress);
    orbit?.setProgress(displayProgress);
    if (progressFill) progressFill.style.width = `${displayProgress}%`;
    if (progressPct) progressPct.textContent = `${shown}%`;
  }

  function tickProgress() {
    const delta = targetProgress - displayProgress;
    if (Math.abs(delta) < 0.25) {
      displayProgress = targetProgress;
    } else {
      const step = reducedMotion ? 0.45 : 0.12;
      displayProgress += delta * step;
    }
    paintProgress();
    if (!finished && (Math.abs(targetProgress - displayProgress) > 0.15 || targetProgress < 100)) {
      rafId = requestAnimationFrame(tickProgress);
    }
  }

  function startProgressCreep() {
    if (reducedMotion || creepRaf) return;
    creepStart = performance.now();

    const creep = () => {
      if (finished) return;
      const elapsed = performance.now() - creepStart;
      const softCap = Math.min(90, 10 + elapsed / 95);
      if (displayProgress < softCap && displayProgress < targetProgress + 0.5) {
        targetProgress = Math.max(targetProgress, displayProgress + 0.06);
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tickProgress);
      }
      creepRaf = requestAnimationFrame(creep);
    };
    creepRaf = requestAnimationFrame(creep);
  }

  function stopProgressCreep() {
    if (creepRaf) cancelAnimationFrame(creepRaf);
    creepRaf = 0;
  }

  function setBlurPhase(phase) {
    document.body.classList.remove(
      'boot-blur-mid',
      'boot-blur-heavy',
      'boot-scene-live',
      'boot-scene-preview'
    );
    if (phase === 'heavy') document.body.classList.add('boot-blur-heavy');
    else if (phase === 'mid') document.body.classList.add('boot-blur-mid');
    else if (phase === 'live') document.body.classList.add('boot-scene-live');
    else if (phase === 'preview') document.body.classList.add('boot-scene-preview', 'boot-scene-live');
  }

  function setProgress(pct, statusText) {
    targetProgress = Math.max(targetProgress, Math.min(100, pct));
    const label = statusText || stageLabel(targetProgress);
    if (statusEl) statusEl.textContent = label;

    if (scenePreviewSeen) setBlurPhase('preview');
    else if (targetProgress < 28) setBlurPhase('mid');
    else if (targetProgress < 42) setBlurPhase('heavy');
    else if (targetProgress >= 46) setBlurPhase('live');
    else setBlurPhase('');

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tickProgress);
  }

  function markScenePreview(label) {
    const wrap = document.getElementById('scene-wrap');
    if (wrap) wrap.classList.add('scene-has-preview');
    scenePreviewSeen = true;
    if (!scenePreviewAt) scenePreviewAt = performance.now();
    setBlurPhase('preview');
    setProgress(
      Math.max(targetProgress, 54),
      label || 'Rendering city & rooms…'
    );
    onScenePreview?.();
  }

  async function waitForPreviewHold() {
    if (!scenePreviewAt) return;
    const elapsed = performance.now() - scenePreviewAt;
    const remain = MIN_PREVIEW_BEFORE_FADE_MS - elapsed;
    if (remain > 0) await wait(remain);
  }

  function showInteractiveHint({ onContinue } = {}) {
    document.body.classList.add('boot-interactive');
    setBlurPhase('preview');
    setProgress(96, 'Ready — explore the city');
    if (!picks) return;
    picks.hidden = false;
    picks.innerHTML = '';

    const hint = document.createElement('p');
    hint.className = 'boot-hint';
    hint.textContent = 'The city is live behind this panel. Continue when you are ready.';
    picks.appendChild(hint);

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'boot-continue';
    continueBtn.innerHTML = '<i class="ti ti-arrow-right"></i><span>Enter Simulatia</span>';
    continueBtn.addEventListener('click', () => {
      if (finished) return;
      onContinue?.();
    });
    picks.appendChild(continueBtn);
  }

  async function fadeOut() {
    if (finished) return;
    stopProgressCreep();
    await waitForPreviewHold();

    finished = true;
    cancelAnimationFrame(rafId);
    targetProgress = 100;
    displayProgress = 100;
    paintProgress();
    if (statusEl) statusEl.textContent = 'Welcome to Simulatia';
    setBlurPhase('preview');
    picks?.setAttribute('hidden', '');
    skipBtn?.setAttribute('hidden', '');
    shell?.setAttribute('aria-busy', 'false');

    document.body.classList.add('sim-revealing', 'boot-reveal-sharp');
    shell?.classList.add('is-fading');

    const revealPause = reducedMotion ? 50 : 160;
    const revealHold = reducedMotion ? 320 : REVEAL_SHARPEN_MS;

    await wait(revealPause);
    await waitFrames(2);

    document.body.classList.remove(
      'sim-booting',
      'boot-interactive',
      'boot-blur-mid',
      'boot-blur-heavy',
      'boot-scene-live',
      'boot-scene-preview'
    );
    document.body.classList.add('sim-ready');

    orbit?.dispose();
    orbit = null;

    await wait(revealHold);

    document.body.classList.remove('sim-revealing', 'boot-reveal-sharp');
    shell?.classList.add('is-done');
    await wait(reducedMotion ? 80 : 200);
    shell?.remove();
  }

  skipBtn?.addEventListener('click', () => {
    if (finished) return;
    onSkip?.();
  });

  return {
    start() {
      document.body.classList.add('sim-booting');
      document.body.classList.remove('sim-ready', 'sim-revealing', 'boot-reveal-sharp');
      if (orbitHost && !orbit) orbit = createBootOrbit(orbitHost);
      setProgress(4, 'Preparing interface');
      setBlurPhase('mid');
      startProgressCreep();
    },

    setProgress,
    markScenePreview,
    waitForPreviewHold,
    showInteractiveHint,
    startProgressCreep,
    stopProgressCreep,

    onSkip(cb) {
      onSkip = cb;
    },

    onScenePreview(cb) {
      onScenePreview = cb;
    },

    fadeOut,
    finish: fadeOut,
  };
}
