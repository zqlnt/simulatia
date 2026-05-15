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

import { createStore } from './data/store.js';
import { createAssetLoader } from './simulation/assetLoader.js';
import { initSimulation } from './simulation/scene.js';
import { initTheme } from './ui/theme.js';
import { initCommandBar } from './ui/commandBar.js';
import { initSidebar } from './ui/sidebar.js';
import { initInspector } from './ui/inspector.js';
import { initPanels } from './ui/panels.js';
import { initChrome } from './ui/chrome.js';
import { createBootShell } from './ui/loading.js';
import { agents as agentDefs } from './data/agents.js';
import * as THREE from 'three';

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function bootstrap() {
  const boot = createBootShell();
  boot.start();
  await yieldToMain();

  try {
    boot.setProgress(8, 'Preparing interface');
    const store = createStore();
    initTheme();
    await yieldToMain();

    const assetLoader = createAssetLoader(THREE);

    let resolveFirstFrame;
    const firstFrameReady = new Promise((resolve) => {
      resolveFirstFrame = resolve;
    });

    boot.setProgress(12, 'Loading world assets');

    const preloadPromise = assetLoader.preloadCatalog((frac, assetId) => {
      const pct = 12 + frac * 34;
      const label =
        frac < 0.35
          ? 'Loading characters'
          : frac < 0.7
            ? 'Loading furniture'
            : 'Loading world assets';
      boot.setProgress(pct, label);
    });

    const simPromise = (async () => {
      await yieldToMain();
      boot.setProgress(48, 'Building city simulation');
      return initSimulation({
        store,
        assetLoader,
        THREE,
        skipAutoIntro: true,
        onFirstFrame: () => resolveFirstFrame?.(),
      });
    })();

    const [sim] = await Promise.all([simPromise, preloadPromise]);

    if (!sim) {
      document.getElementById('sceneFallback')?.classList.add('show');
      boot.setProgress(100, 'Could not start simulation');
      await boot.fadeOut();
      return;
    }

    boot.setProgress(72, 'Optimizing scene');

    await Promise.race([firstFrameReady, new Promise((r) => setTimeout(r, 4000))]);

    boot.setProgress(82, 'Preparing interface');

    initCommandBar(store);
    initSidebar(store);
    initInspector(store);
    initPanels();
    initChrome();

    await yieldToMain();
    boot.setProgress(88, 'Finalizing experience');

    let bootDismissed = false;
    let bootFading = false;

    const fadeBoot = async () => {
      if (bootFading) return;
      bootFading = true;
      await boot.fadeOut();
    };

    const dismissBoot = async () => {
      if (bootDismissed) return;
      bootDismissed = true;
      clearTimeout(bootFadeFallback);
      sim.stopGuidedIntro?.();
      await fadeBoot();
    };

    const completeBoot = async (agentDef) => {
      await dismissBoot();
      if (agentDef) {
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
      }
    };

    const baseOpenAgent = sim.openAgent.bind(sim);
    sim.openAgent = (item) => {
      if (!bootDismissed && item?.roomOnly) {
        const def = agentDefs.find((a) => a.key === item.key || a.key === item.agentKey);
        completeBoot(def || null);
        return;
      }
      baseOpenAgent(item);
    };

    boot.onSkip(() => dismissBoot());

    const bootFadeFallback = window.setTimeout(() => dismissBoot(), 12000);

    if (sim.runBootSequence) {
      sim.runBootSequence({
        onProgress: (pct, label) => boot.setProgress(pct, label),
        onReady: () => dismissBoot(),
      });
    } else {
      boot.setProgress(96, 'Ready');
      window.setTimeout(() => dismissBoot(), 400);
    }

    window.__simulatia = { ...sim, store, assetLoader, boot };
  } catch (err) {
    console.error('[Simulatia] bootstrap failed', err);
    boot.setProgress(100, 'Something went wrong');
    document.getElementById('sceneFallback')?.classList.add('show');
    await boot.fadeOut();
  }
}

bootstrap();
