import * as api from '../api/simulationApi.js';

export function initCommandBar(store) {
  const input = document.querySelector('.command-input input');
  const quickBtns = document.querySelectorAll('.v4-quick button');

  if (input) {
    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter' || !input.value.trim()) return;
      const msg = input.value.trim();
      const state = store.getState();
      const agentId = state.selectedAgent || 'command';
      const res = await api.sendAgentCommand(agentId, msg);
      const msgEl = document.getElementById('v4AgentMsg');
      if (msgEl) msgEl.textContent = res.reply || 'Command sent.';
      input.value = '';
    });
  }

  quickBtns.forEach((btn, i) => {
    btn.addEventListener('click', async () => {
      const state = store.getState();
      const agentId = state.selectedAgent || 'command';
      if (i === 0) {
        const status = await api.getAgentStatus(agentId);
        const msgEl = document.getElementById('v4AgentMsg');
        if (msgEl) msgEl.textContent = `Status: ${status.status}, queue: ${status.tasksInQueue}`;
      } else if (i === 1) {
        await api.assignTask(agentId, { title: 'Review operational metrics', priority: 'normal' });
        const msgEl = document.getElementById('v4AgentMsg');
        if (msgEl) msgEl.textContent = 'Task assigned successfully.';
      }
    });
  });

  document.querySelectorAll('.dock-tile').forEach((tile, i) => {
    tile.addEventListener('click', async () => {
      const actions = [api.sendAgentCommand, api.runAutomation, api.updateSimulationState, api.createWorkflow, api.createWorkflow, api.syncWithBackend];
      const fn = actions[i];
      if (!fn) return;
      try {
        await fn(i === 0 ? ['command', 'Execute dock action'] : i === 2 ? { patch: { dock: i } } : { name: `Dock workflow ${i}` });
      } catch {
        /* mock API never throws */
      }
    });
  });
}
