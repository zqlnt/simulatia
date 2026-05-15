/** Inspector — tabs, agent cards, prompt composer, live analytics sparklines */

import { getAgentByKey } from '../data/agents.js';

const INSPECTOR_AGENT_KEYS = {
  strategy: 'hq-command',
  research: 'sage-room',
  ops: 'ops-room',
};

const SPARK_POINTS = 14;

function parseNumeric(text) {
  if (!text) return null;
  const m = String(text).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function buildSparkPath(values, width = 120, height = 36) {
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / Math.max(1, values.length - 1);

  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(2)},${height} L${pts[0][0].toFixed(2)},${height} Z`;
  const last = pts[pts.length - 1];

  return { line, area, dot: last };
}

function renderSpark(svg, values) {
  if (!svg || !values.length) return;
  const { line, area, dot } = buildSparkPath(values);
  svg.innerHTML = `
    <path class="spark-area" d="${area}"/>
    <path class="spark-line" d="${line}"/>
    <circle class="spark-dot" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="2.5"/>
  `;
}

export function initInspector() {
  const body = document.querySelector('.inspector-body');
  const tabs = document.querySelectorAll('.inspector .tabs button');
  const chatLog = document.getElementById('inspector-chat-log');
  const promptInput = document.getElementById('inspector-prompt-input');
  const sendBtn = document.getElementById('inspector-prompt-run');

  const flowEl = document.getElementById('v7Flow');
  const vehiclesEl = document.getElementById('v7Vehicles');
  const analyticsFlow = document.getElementById('analytics-flow-val');
  const analyticsVehicles = document.getElementById('analytics-vehicles-val');
  const sparkFlow = document.getElementById('spark-flow');
  const sparkVehicles = document.getElementById('spark-vehicles');

  const flowHistory = [];
  const vehicleHistory = [];

  function pushHistory(arr, value) {
    if (value == null || Number.isNaN(value)) return;
    arr.push(value);
    while (arr.length > SPARK_POINTS) arr.shift();
    if (arr.length < 3) {
      while (arr.length < 3) arr.unshift(value);
    }
  }

  function syncAnalytics() {
    const flowText = flowEl?.textContent?.trim();
    const vehicleText = vehiclesEl?.textContent?.trim();

    if (flowText && analyticsFlow) {
      analyticsFlow.textContent = flowText;
      const n = parseNumeric(flowText);
      if (n != null) {
        pushHistory(flowHistory, n);
        renderSpark(sparkFlow, flowHistory);
        analyticsFlow.classList.toggle('trend-up', n >= 0);
        analyticsFlow.classList.toggle('trend-down', n < 0);
      }
    }

    if (vehicleText && analyticsVehicles) {
      analyticsVehicles.textContent = vehicleText;
      const n = parseNumeric(vehicleText);
      if (n != null) {
        pushHistory(vehicleHistory, n);
        renderSpark(sparkVehicles, vehicleHistory);
      }
    }
  }

  function setTab(tab) {
    const key = tab || 'overview';
    tabs.forEach((btn) => {
      const on = btn.dataset.tab === key;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (!body) return;

    body.querySelectorAll(':scope > div, :scope > p').forEach((block) => {
      if (block.matches('.copy') || block.querySelector('.stat-grid')) {
        block.hidden = key !== 'overview';
        return;
      }
      if (block.querySelector('.inspector-agent-feed')) {
        block.hidden = key !== 'overview' && key !== 'agents';
        return;
      }
      if (block.querySelector('.inspector-automation')) {
        block.hidden = key !== 'overview' && key !== 'activity' && key !== 'automate';
        return;
      }
      if (block.matches('.workflow')) {
        block.hidden = key !== 'overview' && key !== 'activity';
        return;
      }
      if (block.matches('.inspector-prompt')) {
        block.hidden = key !== 'overview' && key !== 'automate';
      }
    });
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  function appendChat(kind, author, text) {
    if (!chatLog) return;
    const msg = document.createElement('div');
    msg.className = `inspector-chat-msg ${kind}`;
    msg.innerHTML = `<b>${author}</b>${text}`;
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  document.querySelectorAll('.inspector-agent-card').forEach((card) => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-agent');
      const def = slug ? getAgentByKey(INSPECTOR_AGENT_KEYS[slug] || slug) : null;
      const sim = window.__simulatia;

      if (def && sim?.openAgent) {
        sim.openAgent({
          key: def.key,
          name: def.name,
          role: def.role,
          roomOnly: true,
        });
      }

      const name = def?.name || card.querySelector('b')?.textContent || 'Agent';
      appendChat('agent', name.split(' ')[0], `Focused on ${name}. Ready for instructions.`);
    });
  });

  function sendPrompt() {
    const text = promptInput?.value?.trim();
    if (!text) return;
    appendChat('user', 'You', text);
    promptInput.value = '';
    window.setTimeout(() => {
      appendChat('agent', 'Strategy', 'Acknowledged. Queuing workflow and updating city parameters.');
    }, 500);
  }

  sendBtn?.addEventListener('click', sendPrompt);
  promptInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  });

  document.getElementById('inspector-prompt-suggest')?.addEventListener('click', () => {
    if (promptInput) {
      promptInput.value = 'Summarize node health and recommend the next automation step.';
    }
  });

  document.getElementById('inspector-prompt-automate')?.addEventListener('click', () => {
    appendChat('system', 'Automation', 'Night routing policy armed for the selected node.');
  });

  const statGrid = body?.querySelector('.stat-grid');
  statGrid?.classList.add('inspector-metrics-premium');

  setTab('overview');
  syncAnalytics();
  window.setInterval(syncAnalytics, 1200);
}
