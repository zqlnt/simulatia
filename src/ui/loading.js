/**
 * Premium boot shell — staged progress, smooth interpolation, scene preview.
 */

import { createBootOrbit } from './bootOrbit.js';

const STAGES = [
  { until: 14, label: 'Preparing interface' },
  { until: 42, label: 'Loading world assets' },
  { until: 58, label: 'Building city simulation' },
  { until: 78, label: 'Loading characters & rooms' },
  { until: 92, label: 'Optimizing scene' },
  { until: 100, label: 'Finalizing experience' },
];

function stageLabel(pct) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (pct <= STAGES[i].until) return STAGES[i].label;
  }
  return STAGES[STAGES.length - 1].label;
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
  let targetProgress = 0;
  let displayProgress = 0;
  let orbit = null;
  let rafId = 0;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function paintProgress() {
    const shown = Math.round(displayProgress);
    orbit?.setProgress(displayProgress);
    if (progressFill) progressFill.style.width = `${displayProgress}%`;
    if (progressPct) progressPct.textContent = `${shown}%`;
  }

  function tickProgress() {
    const delta = targetProgress - displayProgress;
    if (Math.abs(delta) < 0.35) {
      displayProgress = targetProgress;
    } else {
      const step = reducedMotion ? 1 : 0.16;
      displayProgress += delta * step;
    }
    paintProgress();
    if (!finished && (Math.abs(targetProgress - displayProgress) > 0.2 || targetProgress < 100)) {
      rafId = requestAnimationFrame(tickProgress);
    }
  }

  function setBlurPhase(phase) {
    document.body.classList.remove('boot-blur-mid', 'boot-blur-heavy', 'boot-scene-live');
    if (phase === 'heavy') document.body.classList.add('boot-blur-heavy');
    else if (phase === 'mid') document.body.classList.add('boot-blur-mid');
    else if (phase === 'live') document.body.classList.add('boot-scene-live');
  }

  function setProgress(pct, statusText) {
    targetProgress = Math.max(targetProgress, Math.min(100, pct));
    const label = statusText || stageLabel(targetProgress);
    if (statusEl) statusEl.textContent = label;

    if (targetProgress < 35) setBlurPhase('mid');
    else if (targetProgress >= 48) setBlurPhase('live');
    else setBlurPhase('');

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tickProgress);
  }

  function showInteractiveHint({ onContinue, onQuickSelect } = {}) {
    document.body.classList.add('boot-interactive');
    setBlurPhase('live');
    setProgress(96, 'Ready — explore the city');

    if (!picks) return;
    picks.hidden = false;
    picks.innerHTML = '';

    const hint = document.createElement('p');
    hint.className = 'boot-hint';
    hint.textContent = 'The world is live behind this panel. Continue when you are ready.';
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
    finished = true;
    cancelAnimationFrame(rafId);
    targetProgress = 100;
    displayProgress = 100;
    paintProgress();
    if (statusEl) statusEl.textContent = 'Welcome to Simulatia';
    setBlurPhase('live');
    picks?.setAttribute('hidden', '');
    skipBtn?.setAttribute('hidden', '');
    shell?.setAttribute('aria-busy', 'false');

    document.body.classList.add('sim-revealing');
    shell?.classList.add('is-fading', 'is-done');

    const revealPause = reducedMotion ? 40 : 120;
    const revealHold = reducedMotion ? 280 : 720;
    await new Promise((r) => setTimeout(r, revealPause));

    document.body.classList.remove('sim-booting', 'boot-interactive', 'boot-blur-mid', 'boot-blur-heavy', 'boot-scene-live');
    document.body.classList.add('sim-ready');

    orbit?.dispose();
    orbit = null;

    await new Promise((r) => setTimeout(r, revealHold));

    document.body.classList.remove('sim-revealing');
    shell?.remove();
  }

  async function finish() {
    return fadeOut();
  }

  skipBtn?.addEventListener('click', () => {
    if (finished) return;
    onSkip?.();
  });

  return {
    start() {
      document.body.classList.add('sim-booting');
      document.body.classList.remove('sim-ready', 'sim-revealing');
      if (orbitHost && !orbit) orbit = createBootOrbit(orbitHost);
      setProgress(6, 'Preparing interface');
      setBlurPhase('mid');
    },

    setProgress,
    showInteractiveHint,

    onSkip(cb) {
      onSkip = cb;
    },

    fadeOut,
    finish,
  };
}
