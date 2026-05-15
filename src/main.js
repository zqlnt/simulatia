/**
 * Entry — CSS first, boot shell immediately, heavy runtime loaded in chunks.
 */
import './styles/base.css';
import './styles/layout.css';
import './styles/glass.css';
import './styles/loading.css';
import './styles/performance-boot.css';
import './styles/mobile.css';
import './styles/disconnected-panels.css';
import './styles/chrome.css';
import './styles/viewport.css';
import './styles/shell-layout.css';
import './styles/premium-monochrome.css';
import './styles/inspector-panel.css';
import './styles/ui-polish.css';
import './styles/panel-final-polish.css';
import './styles/scene-atmosphere.css';
import './styles/production-polish.css';
import './styles/mobile-layout-fixes.css';
import './styles/panel-liquid-motion.css';

import { createBootShell } from './ui/loading.js';

const BOOT_TOUR_MS = 4800;
const BOOT_MIN_MS = 5500;
const BOOT_MAX_MS = 24000;
const FIRST_FRAME_TIMEOUT_MS = 10000;
const BOOT_DONE_KEY = 'simulatia_boot_complete';

function bootSessionComplete() {
  if (window.__simulatiaBootstrapped) return true;
  try {
    return sessionStorage.getItem(BOOT_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function stripBootChrome() {
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
  document.getElementById('boot-shell')?.remove();
}

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function loadRuntime() {
  const [
    { createStore },
    { initTheme },
    { createAssetLoader },
    THREE,
    { initSimulation },
    { initCommandBar },
    { initSidebar },
    { initInspector },
    { initPanels },
    { initChrome },
  ] = await Promise.all([
    import('./data/store.js'),
    import('./ui/theme.js'),
    import('./simulation/assetLoader.js'),
    import('three'),
    import('./simulation/scene.js'),
    import('./ui/commandBar.js'),
    import('./ui/sidebar.js'),
    import('./ui/inspector.js'),
    import('./ui/panels.js'),
    import('./ui/chrome.js'),
  ]);

  return {
    createStore,
    initTheme,
    createAssetLoader,
    THREE,
    initSimulation,
    initCommandBar,
    initSidebar,
    initInspector,
    initPanels,
    initChrome,
  };
}

async function bootstrap() {
  if (import.meta.hot && window.__simulatia) return;

  if (bootSessionComplete() && window.__simulatia) {
    stripBootChrome();
    return;
  }

  if (window.__simulatiaBootstrapStarted) {
    if (window.__simulatia) return;
  } else {
    window.__simulatiaBootstrapStarted = true;
  }

  const skipBootUI = bootSessionComplete();
  if (skipBootUI) stripBootChrome();

  const boot = createBootShell();
  if (!skipBootUI) {
    boot.start();
    await yieldToMain();
  }

  let bootFinished = false;
  let bootFadeFallback = null;
  let sim = null;
  const bootStartedAt = performance.now();

  const finishBoot = async () => {
    if (bootFinished) return;
    bootFinished = true;
    window.__simulatiaBootstrapped = true;
    try {
      sessionStorage.setItem(BOOT_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    if (bootFadeFallback) {
      clearTimeout(bootFadeFallback);
      bootFadeFallback = null;
    }
    boot.stopProgressCreep?.();
    try {
      sim?.stopGuidedIntro?.();
    } catch {
      /* ignore */
    }
    try {
      await boot.fadeOut();
    } catch (err) {
      console.warn('[Simulatia] boot fade failed', err);
      document.body.classList.remove('sim-booting');
      document.body.classList.add('sim-ready');
      document.getElementById('boot-shell')?.remove();
    }
  };

  boot.onSkip(() => finishBoot());

  bootFadeFallback = window.setTimeout(() => {
    console.warn('[Simulatia] boot safety timeout');
    finishBoot();
  }, BOOT_MAX_MS);

  try {
    if (!skipBootUI) boot.setProgress(8, 'Loading simulation engine');
    const runtime = await loadRuntime();
    await yieldToMain();

    if (!skipBootUI) boot.setProgress(14, 'Generating your world');
    const store = runtime.createStore();
    runtime.initTheme();
    const assetLoader = runtime.createAssetLoader(runtime.THREE);

    let resolveFirstFrame;
    let firstFrameSeen = false;
    const firstFrameReady = new Promise((resolve) => {
      resolveFirstFrame = resolve;
    });

    if (!skipBootUI) boot.setProgress(22, 'Generating your world');

    const preloadPromise = assetLoader
      .preloadCatalog((frac) => {
        if (!skipBootUI) boot.setProgress(22 + frac * 28, 'Generating your world');
      })
      .catch((err) => {
        console.warn('[Simulatia] asset preload partial failure', err);
      });

    if (!skipBootUI) boot.setProgress(54, 'Generating Agentopia');
    await yieldToMain();

    let simResult = null;
    try {
      simResult = runtime.initSimulation({
        store,
        assetLoader,
        THREE: runtime.THREE,
        skipAutoIntro: true,
        onFirstFrame: () => {
          if (firstFrameSeen) return;
          firstFrameSeen = true;
          if (!skipBootUI) boot.markScenePreview('Generating Agentopia…');
          resolveFirstFrame?.();
        },
      });
    } catch (err) {
      console.error('[Simulatia] initSimulation failed', err);
    }

    await preloadPromise;
    sim = simResult;

    if (!sim) {
      document.getElementById('sceneFallback')?.classList.add('show');
      boot.setProgress(100, 'Could not start simulation');
      await finishBoot();
      return;
    }

    if (!skipBootUI) boot.setProgress(68, 'Rendering city view');
    await Promise.race([firstFrameReady, wait(FIRST_FRAME_TIMEOUT_MS)]);
    if (!skipBootUI) {
      if (!firstFrameSeen) boot.markScenePreview('Generating Agentopia…');
      else boot.markScenePreview('Flying through layers…');
    }

    const bootTourPromise =
      !skipBootUI && sim.runBootSequence
      ? new Promise((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          sim.runBootSequence({
            onProgress: (pct, label) => {
              if (!bootFinished) boot.setProgress(Math.max(58, pct), label);
            },
            onReady: done,
          });
          window.setTimeout(done, BOOT_TOUR_MS + 800);
        })
      : Promise.resolve();

    const uiInitPromise = (async () => {
      await yieldToMain();
      try {
        runtime.initCommandBar(store);
        runtime.initSidebar(store);
        runtime.initInspector(store);
        runtime.initPanels();
        runtime.initChrome();
      } catch (uiErr) {
        console.warn('[Simulatia] UI init warning', uiErr);
      }
    })();

    await Promise.all([bootTourPromise, uiInitPromise]);

    const elapsed = performance.now() - bootStartedAt;
    if (elapsed < BOOT_MIN_MS) await wait(BOOT_MIN_MS - elapsed);

    if (!skipBootUI) boot.setProgress(100, 'Ready');
    await finishBoot();

    window.__simulatia = { ...sim, store, assetLoader, boot };
  } catch (err) {
    console.error('[Simulatia] bootstrap failed', err);
    document.getElementById('sceneFallback')?.classList.add('show');
    boot.setProgress(100, 'Something went wrong');
    await finishBoot();
  }
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted && bootSessionComplete()) stripBootChrome();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    if (window.__simulatiaBootstrapped || window.__simulatia) {
      stripBootChrome();
    }
  });
}

bootstrap();
