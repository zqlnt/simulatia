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

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
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
    { agents: agentDefs },
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
    import('./data/agents.js'),
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
    agentDefs,
  };
}

async function bootstrap() {
  const boot = createBootShell();
  boot.start();
  await yieldToMain();

  let bootDismissed = false;
  let bootFading = false;
  let bootFadeFallback = null;
  let sim = null;

  const dismissBoot = async () => {
    if (bootDismissed || bootFading) return;
    bootFading = true;
    bootDismissed = true;
    if (bootFadeFallback) clearTimeout(bootFadeFallback);
    try {
      sim?.stopGuidedIntro?.();
    } catch {
      /* ignore */
    }
    await boot.fadeOut();
  };

  boot.onSkip(() => dismissBoot());

  try {
    boot.setProgress(10, 'Loading simulation engine');
    const runtime = await loadRuntime();
    await yieldToMain();

    boot.setProgress(16, 'Preparing interface');
    const store = runtime.createStore();
    runtime.initTheme();

    const assetLoader = runtime.createAssetLoader(runtime.THREE);

    let resolveFirstFrame;
    const firstFrameReady = new Promise((resolve) => {
      resolveFirstFrame = resolve;
    });

    boot.setProgress(22, 'Loading world assets');

    const preloadPromise = assetLoader
      .preloadCatalog((frac) => {
        const pct = 22 + frac * 32;
        const label =
          frac < 0.35
            ? 'Loading characters'
            : frac < 0.7
              ? 'Loading furniture'
              : 'Loading rooms & buildings';
        boot.setProgress(pct, label);
      })
      .catch((err) => {
        console.warn('[Simulatia] asset preload partial failure', err);
      });

    const simPromise = (async () => {
      await yieldToMain();
      boot.setProgress(58, 'Building city simulation');
      try {
        return runtime.initSimulation({
          store,
          assetLoader,
          THREE: runtime.THREE,
          skipAutoIntro: true,
          onFirstFrame: () => {
            boot.markScenePreview('Rendering city & rooms…');
            resolveFirstFrame?.();
          },
        });
      } catch (err) {
        console.error('[Simulatia] initSimulation failed', err);
        return null;
      }
    })();

    const [simResult] = await Promise.all([simPromise, preloadPromise]);
    sim = simResult;

    if (!sim) {
      document.getElementById('sceneFallback')?.classList.add('show');
      boot.setProgress(100, 'Could not start simulation');
      await boot.fadeOut();
      return;
    }

    boot.setProgress(78, 'Optimizing scene');
    await Promise.race([firstFrameReady, new Promise((r) => setTimeout(r, 6000))]);
    boot.markScenePreview('Almost ready…');

    boot.setProgress(86, 'Preparing interface');

    try {
      runtime.initCommandBar(store);
      runtime.initSidebar(store);
      runtime.initInspector(store);
      runtime.initPanels();
      runtime.initChrome();
    } catch (uiErr) {
      console.warn('[Simulatia] UI init warning', uiErr);
    }

    await yieldToMain();
    boot.setProgress(92, 'Finalizing experience');

    const completeBoot = async (agentDef) => {
      await dismissBoot();
      if (!agentDef || !sim) return;
      try {
        const roomAgents = sim.getRoomAgents?.() || [];
        const match =
          roomAgents.find((w) => w.userData?.key === agentDef.key) ||
          roomAgents.find((w) => w.userData?.name === agentDef.name);
        if (match) {
          sim.openAgent({
            key: match.userData.key,
            name: match.userData.name,
            role: match.userData.role,
            group: match,
            roomOnly: true,
          });
        }
      } catch {
        /* ignore post-boot agent focus */
      }
    };

    const baseOpenAgent = sim.openAgent?.bind(sim);
    if (baseOpenAgent) {
      sim.openAgent = (item) => {
        if (!bootDismissed && item?.roomOnly) {
          const def = runtime.agentDefs.find(
            (a) => a.key === item.key || a.key === item.agentKey
          );
          completeBoot(def || null);
          return;
        }
        baseOpenAgent(item);
      };
    }

    bootFadeFallback = window.setTimeout(() => dismissBoot(), 18000);

    if (sim.runBootSequence) {
      sim.runBootSequence({
        onProgress: (pct, label) => boot.setProgress(Math.max(58, pct), label),
        onReady: () => dismissBoot(),
      });
    } else {
      boot.setProgress(98, 'Ready');
      window.setTimeout(() => dismissBoot(), 600);
    }

    window.__simulatia = { ...sim, store, assetLoader, boot };
  } catch (err) {
    console.error('[Simulatia] bootstrap failed', err);
    document.getElementById('sceneFallback')?.classList.add('show');
    boot.setProgress(100, 'Something went wrong');
    try {
      await boot.fadeOut();
    } catch {
      document.body.classList.remove('sim-booting');
      document.body.classList.add('sim-ready');
      document.getElementById('boot-shell')?.remove();
    }
  }
}

bootstrap();
