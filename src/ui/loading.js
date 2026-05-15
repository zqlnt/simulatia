/**
 * Boot shell — CSS-only loader visual, blurred city preview, single stable exit.
 */

import { createBootVisual } from './bootVisual.js';

const BOOT_DONE_KEY = 'simulatia_boot_complete';

const STAGES = [
  { until: 14, label: 'Preparing interface' },
  { until: 32, label: 'Generating your world' },
  { until: 52, label: 'Generating Agentopia' },
  { until: 68, label: 'Building cities' },
  { until: 84, label: 'Loading rooms & agents' },
  { until: 100, label: 'Finalizing experience' },
];

const MIN_PREVIEW_BEFORE_FADE_MS = 1400;
const REVEAL_MS = 700;

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

function bootAlreadyComplete() {
  if (window.__simulatiaBootstrapped) return true;
  try {
    return sessionStorage.getItem(BOOT_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markBootComplete() {
  window.__simulatiaBootstrapped = true;
  try {
    sessionStorage.setItem(BOOT_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}

function stripBootShellDom() {
  document.body.classList.remove(
    'sim-booting',
    'boot-blur-mid',
    'boot-blur-heavy',
    'boot-scene-live',
    'boot-scene-preview',
    'sim-revealing',
    'boot-reveal-sharp'
  );
  document.body.classList.add('sim-ready');
  const shell = document.getElementById('boot-shell');
  shell?.classList.add('is-done');
  shell?.setAttribute('aria-busy', 'false');
  shell?.remove();
}

function createNoopBootShell() {
  return {
    start() {
      stripBootShellDom();
    },
    setProgress() {},
    markScenePreview() {},
    startProgressCreep() {},
    stopProgressCreep() {},
    onSkip() {},
    async fadeOut() {
      stripBootShellDom();
    },
    finish: async () => {
      stripBootShellDom();
    },
    isFinished() {
      return true;
    },
  };
}

export function createBootShell() {
  if (bootAlreadyComplete()) return createNoopBootShell();
  const shell = document.getElementById('boot-shell');
  const statusEl = document.getElementById('boot-status');
  const orbitHost = document.getElementById('boot-orbit');
  const picks = document.getElementById('boot-agent-picks');
  const skipBtn = document.getElementById('boot-skip');
  const progressFill = document.getElementById('boot-progress-fill');
  const progressPct = document.getElementById('boot-progress-pct');

  let finished = false;
  let fading = false;
  let onSkip = null;
  let targetProgress = 0;
  let displayProgress = 0;
  let visual = null;
  let blurPhase = '';
  let progressTimer = null;
  let creepTimer = null;
  let scenePreviewAt = 0;
  let scenePreviewSeen = false;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function paintProgress() {
    const shown = Math.round(displayProgress);
    visual?.setProgress(displayProgress);
    if (progressFill) progressFill.style.width = `${displayProgress}%`;
    if (progressPct) progressPct.textContent = `${shown}%`;
  }

  function stopTimers() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (creepTimer) {
      clearInterval(creepTimer);
      creepTimer = null;
    }
  }

  function startProgressLoop() {
    if (progressTimer || finished) return;
    progressTimer = setInterval(() => {
      if (finished) return;
      const delta = targetProgress - displayProgress;
      if (Math.abs(delta) < 0.35) {
        displayProgress = targetProgress;
      } else {
        displayProgress += delta * (reducedMotion ? 0.32 : 0.11);
      }
      paintProgress();
    }, reducedMotion ? 48 : 32);
  }

  function startProgressCreep() {
    if (reducedMotion || creepTimer || finished) return;
    const started = performance.now();
    creepTimer = setInterval(() => {
      if (finished) return;
      const softCap = Math.min(82, 6 + (performance.now() - started) / 180);
      if (displayProgress < softCap && targetProgress < softCap) {
        targetProgress = Math.max(targetProgress, displayProgress + 0.28);
      }
    }, 160);
  }

  function setBlurPhase(phase) {
    if (phase === blurPhase) return;
    blurPhase = phase;
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
    if (finished) return;
    targetProgress = Math.max(targetProgress, Math.min(100, pct));
    if (statusEl) statusEl.textContent = statusText || stageLabel(targetProgress);

    if (scenePreviewSeen) setBlurPhase('preview');
    else if (targetProgress >= 42) setBlurPhase('live');
    else if (targetProgress >= 24) setBlurPhase('heavy');
    else setBlurPhase('mid');
  }

  function markScenePreview(label) {
    const wrap = document.getElementById('scene-wrap');
    if (wrap) wrap.classList.add('scene-has-preview');
    scenePreviewSeen = true;
    visual?.pause();
    if (!scenePreviewAt) scenePreviewAt = performance.now();
    setBlurPhase('preview');
    setProgress(Math.max(targetProgress, 54), label || 'Generating Agentopia…');
  }

  async function waitForPreviewHold() {
    if (!scenePreviewAt) return;
    const remain = MIN_PREVIEW_BEFORE_FADE_MS - (performance.now() - scenePreviewAt);
    if (remain > 0) await wait(remain);
  }

  function teardownShell() {
    stopTimers();
    finished = true;
    visual?.dispose();
    visual = null;
    markBootComplete();

    document.body.classList.remove(
      'sim-booting',
      'boot-blur-mid',
      'boot-blur-heavy',
      'boot-scene-live',
      'boot-scene-preview',
      'sim-revealing',
      'boot-reveal-sharp'
    );
    document.body.classList.add('sim-ready');

    shell?.classList.add('is-done');
    shell?.setAttribute('aria-busy', 'false');
    shell?.remove();
  }

  async function fadeOut() {
    if (finished || fading) return;
    if (bootAlreadyComplete() && !document.getElementById('boot-shell')) {
      finished = true;
      return;
    }
    fading = true;
    stopTimers();

    try {
      await waitForPreviewHold();
      targetProgress = 100;
      displayProgress = 100;
      paintProgress();
      if (statusEl) statusEl.textContent = 'Welcome to Simulatia';
      picks?.setAttribute('hidden', '');
      skipBtn?.setAttribute('hidden', '');

      document.body.classList.add('sim-revealing', 'boot-reveal-sharp');
      shell?.classList.add('is-fading');

      await wait(reducedMotion ? 120 : REVEAL_MS);
    } catch (err) {
      console.warn('[Simulatia] boot fade warning', err);
    } finally {
      teardownShell();
      fading = false;
    }
  }

  skipBtn?.addEventListener('click', () => {
    if (finished || fading) return;
    onSkip?.();
  });

  return {
    start() {
      if (bootAlreadyComplete() || finished) {
        stripBootShellDom();
        return;
      }
      document.body.classList.add('sim-booting');
      document.body.classList.remove('sim-ready', 'sim-revealing', 'boot-reveal-sharp');
      setBlurPhase('mid');

      if (orbitHost && !visual) {
        try {
          visual = createBootVisual(orbitHost);
        } catch (err) {
          console.warn('[Simulatia] boot visual unavailable', err);
        }
      }

      setProgress(4, 'Generating your world');
      paintProgress();
      startProgressLoop();
      startProgressCreep();
    },

    setProgress,
    markScenePreview,
    startProgressCreep,
    stopProgressCreep: stopTimers,

    onSkip(cb) {
      onSkip = cb;
    },

    fadeOut,
    finish: fadeOut,
    isFinished() {
      return finished;
    },
  };
}
