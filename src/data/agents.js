/** One agent per tile — each uses a distinct GLB where possible. */
export const agents = [
  {
    id: 'command',
    key: 'hq-command',
    name: 'Atlas',
    role: 'Command Agent',
    status: 'online',
    assetId: 'adultMale',
    roomKey: 'hq-room',
    tileKey: 'hq-room',
    scale: 1.02,
    rot: 0.35,
  },
  {
    id: 'sage',
    key: 'sage-room',
    name: 'Sage',
    role: 'Healthcare Research Agent',
    status: 'online',
    assetId: 'doctor',
    roomKey: 'research-room',
    tileKey: 'research-room',
    scale: 0.98,
    rot: -0.25,
  },
  {
    id: 'mira',
    key: 'creative-room',
    name: 'Mira',
    role: 'Creative Design Agent',
    status: 'online',
    assetId: 'painter',
    roomKey: 'design-room',
    tileKey: 'design-room',
    scale: 0.49,
    rot: 0.15,
  },
  {
    id: 'alice',
    key: 'alice',
    name: 'Alice',
    role: 'Growth Analyst',
    status: 'online',
    assetId: 'doctorClipboard',
    roomKey: 'tile-alice',
    tileKey: 'tile-alice',
    scale: 0.94,
    rot: 0.5,
  },
  {
    id: 'ledger',
    key: 'ledger-room',
    name: 'Ledger',
    role: 'Finance Agent',
    status: 'busy',
    assetId: 'painterAlt',
    roomKey: 'tile-ledger',
    tileKey: 'tile-ledger',
    scale: 0.94,
    rot: -0.4,
  },
  {
    id: 'ops',
    key: 'ops-room',
    name: 'Ops Lead',
    role: 'Operations',
    status: 'online',
    assetId: 'adultMale',
    roomKey: 'tile-ops',
    tileKey: 'tile-ops',
    scale: 0.96,
    rot: 3.1,
  },
];

export function getAgentByKey(key) {
  return agents.find((a) => a.key === key) || null;
}

export function getAgentById(id) {
  return agents.find((a) => a.id === id) || null;
}
