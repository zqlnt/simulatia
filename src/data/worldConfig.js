export const worldConfig = {
  currentWorld: 'Earth',
  currentCountry: 'United States',
  currentRegion: 'Texas',
  currentCity: 'Austin',
  currentBuilding: 'Simulatia HQ',
  districts: [
    { key: 'hq', name: 'Austin · Simulatia HQ', kind: 'hq', health: 97 },
    { key: 'harbor', name: 'Harbor City', kind: 'harbor', health: 92 },
    { key: 'research', name: 'Quantum Research Campus', kind: 'research', health: 98 },
  ],
  buildings: [
    { key: 'hq', name: 'Simulatia HQ', district: 'hq', interior: true, health: 97 },
    { key: 'central-hub', name: 'Central Hub T2', district: 'hq', interior: true },
    { key: 'agent-tower', name: 'Agent Tower', district: 'hq', interior: true },
    { key: 'power-grid', name: 'Power Grid', district: 'hq', interior: true },
    { key: 'data-vault', name: 'Data Vault', district: 'hq', interior: true },
  ],
  metrics: {
    health: 97,
    agentsActive: 142,
    tasksCompleted24h: 387,
    successRate: 92,
    automations: 1200,
  },
};
