# Simulatia

Premium iOS-style world simulation dashboard with guided cinematic entry, isometric interior rooms, GLB agents and furniture, and a modular frontend ready for agentic workflows.

## Quick start

```bash
cd simulatia
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## Project structure

```
simulatia/
  index.html              # App shell markup
  public/assets/glb/      # GLB models (agents + furniture)
  src/
    main.js               # Bootstrap
    styles/               # base, layout, glass, mobile
    data/                 # worldConfig, agents, rooms, assetManifest, store
    api/                  # Mock API hooks (replace with backend later)
    simulation/           # Three.js scene, layers, asset loader, intro
    ui/                   # Theme, command bar, panels
```

## Adding GLB assets

Edit `src/data/assetManifest.js`:

```js
{
  id: 'myAgent',
  type: 'agent',           // or 'furniture'
  role: 'Ops Agent',
  src: '/assets/glb/my_model.glb',
  fallback: 'proceduralAgent',
  targetHeight: 1.72,
}
```

Place the file in `public/assets/glb/`. The loader lazy-loads, caches, clones safely, and falls back to procedural geometry if loading fails.

## Backend integration

Replace implementations in `src/api/simulationApi.js`:

- `sendAgentCommand(agentId, message)`
- `createWorkflow(workflowConfig)`
- `assignTask(agentId, task)`
- `getAgentStatus(agentId)`
- `updateSimulationState(patch)`
- `runAutomation(automationId, payload)`

Subscribe to state via `createStore()` from `src/data/store.js`.

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Local dev server   |
| `npm run build`| Production build   |
| `npm run preview` | Preview build   |
