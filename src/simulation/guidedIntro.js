/** Guided cinematic entry: world → city → building → room → agent */
export function createGuidedIntro({
  wrap,
  guidedIntro,
  introText,
  introBar,
  introSkip,
  reduceMotion,
  focusTo,
  enterRoom,
  openAgent,
  agents,
  comm,
  store,
}) {
  let introRunning = false;
  const introTimers = [];

  function setIntroStatus(text, pct) {
    if (introText) introText.textContent = text;
    if (introBar) introBar.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
  }

  function stopGuidedIntro() {
    introRunning = false;
    introTimers.forEach(clearTimeout);
    introTimers.length = 0;
    wrap.classList.remove('guided-intro-running');
    if (guidedIntro) guidedIntro.classList.add('hide');
    if (store) store.setState({ introComplete: true, currentLayer: 'room' });
  }

  function later(ms, fn) {
    const id = setTimeout(() => {
      if (introRunning) fn();
    }, reduceMotion ? Math.min(ms, ms * 0.25 + 80) : ms);
    introTimers.push(id);
    return id;
  }

  function runGuidedIntro(S) {
    introRunning = true;
    introTimers.forEach(clearTimeout);
    introTimers.length = 0;
    if (S) S.auto = false;
    comm?.classList.remove('show');
    wrap.classList.add('guided-intro-running');
    guidedIntro?.classList.remove('hide');
    if (store) store.setState({ introComplete: false, currentLayer: 'world' });

    setIntroStatus('Loading world atlas…', 8);
    focusTo('worlds', true);
    later(1250, () => {
      setIntroStatus('Approaching Austin city layer…', 28);
      if (store) store.setState({ currentLayer: 'city', currentCity: 'Austin' });
      focusTo('overview');
    });
    later(2850, () => {
      setIntroStatus('Locking onto Simulatia HQ…', 48);
      if (store) store.setState({ currentBuilding: 'Simulatia HQ', currentLayer: 'building' });
      focusTo('hq');
    });
    later(4550, () => {
      setIntroStatus('Entering building interior…', 66);
      enterRoom('hq');
    });
    later(6100, () => {
      setIntroStatus('Revealing isometric room network…', 82);
      if (store) store.setState({ currentLayer: 'room', currentRoom: 'hq-room' });
      focusTo('hq-room');
    });
    later(7600, () => {
      setIntroStatus('Connecting to command agent…', 96);
      const agent =
        agents.find((a) => a.userData?.roomAgent && a.userData?.key === 'hq-command') ||
        agents.find((a) => a.userData?.roomAgent);
      if (agent) {
        if (store) store.setState({ selectedAgent: agent.userData?.key || 'hq-command', currentLayer: 'agent' });
        openAgent({
          key: agent.userData.key,
          name: agent.userData.name,
          role: agent.userData.role,
          group: agent,
          roomOnly: true,
        });
      }
    });
    later(9350, () => {
      setIntroStatus('Simulation ready for interaction.', 100);
      later(850, () => {
        stopGuidedIntro();
        if (S) S.auto = true;
      });
    });
  }

  if (introSkip) introSkip.onclick = stopGuidedIntro;

  return { runGuidedIntro, stopGuidedIntro, setIntroStatus };
}
