import { worldConfig } from './worldConfig.js';
import { agents } from './agents.js';
import { rooms } from './rooms.js';

export function createStore(initial = {}) {
  const listeners = new Set();

  const state = {
    currentLayer: 'world',
    currentWorld: worldConfig.currentWorld,
    currentCity: worldConfig.currentCity,
    currentBuilding: worldConfig.currentBuilding,
    currentRoom: null,
    selectedAgent: null,
    introComplete: false,
    activeWorkflow: null,
    agents: [...agents],
    rooms: [...rooms],
    buildings: [...worldConfig.buildings],
    notifications: [
      { id: 'n1', type: 'alert', count: 3 },
      { id: 'n2', type: 'approval', count: 5 },
    ],
    viewMode: '3d',
    theme: 'light',
    ...initial,
  };

  function getState() {
    return { ...state };
  }

  function setState(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(getState()));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}

export const defaultStore = createStore();
