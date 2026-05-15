/**
 * Placeholder API surface for future backend integration.
 * Replace implementations with fetch/WebSocket calls when ready.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sendAgentCommand(agentId, message) {
  await delay(280);
  return {
    ok: true,
    agentId,
    echo: message,
    reply: `Acknowledged. Agent ${agentId} will process: "${message}"`,
    timestamp: new Date().toISOString(),
  };
}

export async function createWorkflow(workflowConfig) {
  await delay(400);
  return {
    ok: true,
    workflowId: `wf_${Date.now()}`,
    status: 'queued',
    config: workflowConfig,
  };
}

export async function assignTask(agentId, task) {
  await delay(320);
  return {
    ok: true,
    agentId,
    taskId: `task_${Date.now()}`,
    task,
    status: 'assigned',
  };
}

export async function getAgentStatus(agentId) {
  await delay(180);
  return {
    ok: true,
    agentId,
    status: 'online',
    load: 'low',
    tasksInQueue: Math.floor(Math.random() * 4),
    lastActive: new Date().toISOString(),
  };
}

export async function runAutomation(automationId, payload = {}) {
  await delay(350);
  return {
    ok: true,
    automationId,
    runId: `run_${Date.now()}`,
    payload,
    status: 'running',
  };
}

export async function updateSimulationState(patch) {
  await delay(120);
  return { ok: true, patch, appliedAt: new Date().toISOString() };
}

export async function syncWithBackend() {
  await delay(500);
  return { ok: true, synced: true, serverTime: new Date().toISOString() };
}
