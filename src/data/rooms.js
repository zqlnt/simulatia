/** Isometric lattice — one GLB occupant per tile, floor below character feet. */
export const TILE_RADIUS = 1.22;
export const TILE_STEP = 3.45;
export const FLOOR_BASE_Y = -0.38;
export const FLOOR_SURFACE_Y = -0.3;
export const GRID_OVERLAY_Y = -0.288;
export const TILE_SLAB_H = 0.003;
export const AGENT_STAND_Y = 0.78;
export const FURNITURE_Y = 0.02;
/** Multiplier for room GLB characters & furniture (2 = 100% larger than legacy sizing). */
export const ROOM_OCCUPANT_SCALE_MUL = 2;
export const ROOM_AGENT_SCALE_DEFAULT = 0.52;
export const ROOM_FURNITURE_SCALE_DEFAULT = 0.38;

export const rooms = [
  {
    key: 'hq-room',
    name: 'Command Room',
    active: true,
    position: { x: 0, z: 0 },
    size: TILE_RADIUS,
    occupant: { type: 'agent', agentId: 'command' },
  },
  {
    key: 'research-room',
    name: 'Research Bay',
    active: true,
    position: { x: -TILE_STEP * 1.5, z: 0 },
    size: TILE_RADIUS,
    occupant: { type: 'agent', agentId: 'sage' },
  },
  {
    key: 'design-room',
    name: 'Design Studio',
    active: true,
    position: { x: TILE_STEP * 1.5, z: 0 },
    size: TILE_RADIUS,
    occupant: { type: 'agent', agentId: 'mira' },
  },
  {
    key: 'tile-alice',
    name: 'Analyst Pod',
    active: true,
    position: { x: -TILE_STEP, z: -TILE_STEP },
    size: TILE_RADIUS * 0.92,
    occupant: { type: 'agent', agentId: 'alice' },
  },
  {
    key: 'tile-ledger',
    name: 'Finance Pod',
    active: true,
    position: { x: TILE_STEP, z: TILE_STEP },
    size: TILE_RADIUS * 0.92,
    occupant: { type: 'agent', agentId: 'ledger' },
  },
  {
    key: 'tile-ops',
    name: 'Operations Pod',
    active: true,
    position: { x: 0, z: TILE_STEP * 1.4 },
    size: TILE_RADIUS,
    occupant: { type: 'agent', agentId: 'ops' },
  },
  {
    key: 'tile-rest',
    name: 'Rest Node',
    active: true,
    position: { x: 0, z: -TILE_STEP * 1.4 },
    size: TILE_RADIUS,
    occupant: { type: 'furniture', assetId: 'futuristicChairAlt', scale: 0.4, rot: 0 },
  },
  {
    key: 'tile-lab',
    name: 'Lab Node',
    active: true,
    position: { x: -TILE_STEP, z: TILE_STEP },
    size: TILE_RADIUS * 0.92,
    occupant: { type: 'furniture', assetId: 'officeCubicle', scale: 0.38, rot: 0.6 },
  },
  {
    key: 'tile-launch',
    name: 'Launch Node',
    active: true,
    position: { x: TILE_STEP, z: -TILE_STEP },
    size: TILE_RADIUS * 0.92,
    occupant: { type: 'furniture', assetId: 'executiveDesk', scale: 0.36, rot: -0.8 },
  },
  {
    key: 'slot-nw',
    name: 'Expansion',
    active: false,
    locked: true,
    position: { x: -TILE_STEP * 2.1, z: TILE_STEP * 1.2 },
    size: TILE_RADIUS * 1.1,
    plus: true,
  },
  {
    key: 'slot-ne',
    name: 'Expansion',
    active: false,
    locked: true,
    position: { x: TILE_STEP * 2.1, z: -TILE_STEP * 1.2 },
    size: TILE_RADIUS * 1.1,
    plus: true,
  },
  {
    key: 'slot-sw',
    name: 'Expansion',
    active: false,
    locked: true,
    position: { x: -TILE_STEP * 2.1, z: -TILE_STEP * 1.2 },
    size: TILE_RADIUS * 1.1,
    plus: true,
  },
  {
    key: 'slot-se',
    name: 'Expansion',
    active: false,
    locked: true,
    position: { x: TILE_STEP * 2.1, z: TILE_STEP * 1.2 },
    size: TILE_RADIUS * 1.1,
    plus: true,
  },
];

export const roomConnections = [
  [0, 0, -TILE_STEP * 1.5, 0],
  [0, 0, TILE_STEP * 1.5, 0],
  [0, 0, 0, -TILE_STEP * 1.4],
  [0, 0, 0, TILE_STEP * 1.4],
  [0, 0, -TILE_STEP, -TILE_STEP],
  [0, 0, TILE_STEP, TILE_STEP],
  [-TILE_STEP * 1.5, 0, -TILE_STEP, TILE_STEP],
  [TILE_STEP * 1.5, 0, TILE_STEP, -TILE_STEP],
];

export function getRoomByKey(key) {
  return rooms.find((r) => r.key === key) || null;
}

export function getRoomForAgent(agentId) {
  return rooms.find((r) => r.occupant?.agentId === agentId) || null;
}
