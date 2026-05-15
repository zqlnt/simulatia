import {
  rooms as roomDefs,
  roomConnections,
  TILE_RADIUS,
  TILE_STEP,
  FLOOR_BASE_Y,
  FLOOR_SURFACE_Y,
  GRID_OVERLAY_Y,
  TILE_SLAB_H,
  AGENT_STAND_Y,
  FURNITURE_Y,
  ROOM_OCCUPANT_SCALE_MUL,
  ROOM_AGENT_SCALE_DEFAULT,
  ROOM_FURNITURE_SCALE_DEFAULT,
} from '../data/rooms.js';
import { agents as agentDefs, getAgentById } from '../data/agents.js';

export function buildRoomLayer(ctx) {
  const { THREE, interior, pickable, assetLoader, agents, labelData } = ctx;

  const isoRoot = new THREE.Group();
  isoRoot.name = 'Isometric room network';
  interior.add(isoRoot);

  const tileGroups = new Map();
  const agentWrappers = new Map();
  let focusedAgentKey = null;

  const layers = {
    floor: new THREE.Group(),
    tiles: new THREE.Group(),
    grid: new THREE.Group(),
    links: new THREE.Group(),
    props: new THREE.Group(),
    characters: new THREE.Group(),
  };
  Object.values(layers).forEach((g) => isoRoot.add(g));

  const ROOM_PALETTE = {
    light: {
      floor: 0xffffff,
      tile: 0xffffff,
      tileLocked: 0xfafafa,
      edge: 0x1a1a1a,
      edgeOpacity: 0.85,
      dash: 0x2a2a2a,
      dashOpacity: 0.55,
      gridA: 0xececec,
      gridAOpacity: 0.22,
      gridB: 0xf4f4f4,
      gridBOpacity: 0.12,
    },
    dark: {
      floor: 0x060606,
      tile: 0x0c0c0c,
      tileLocked: 0x080808,
      edge: 0x3a3a3a,
      edgeOpacity: 0.65,
      dash: 0x2a2a2a,
      dashOpacity: 0.45,
      gridA: 0x141414,
      gridAOpacity: 0.28,
      gridB: 0x101010,
      gridBOpacity: 0.16,
    },
  };

  const tileFill = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
  });
  const tileLocked = new THREE.MeshBasicMaterial({
    color: 0xfafafa,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85 });
  const dashMat = new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.55 });
  const gridLineMat = new THREE.LineBasicMaterial({
    color: 0xececec,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const gridLineMatB = new THREE.LineBasicMaterial({
    color: 0xf4f4f4,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });

  let roomFloorMesh = null;
  let floorBlendTexture = null;

  function createFloorBlendTexture(dark) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, size * 0.05, cx, cx, size * 0.5);
    if (dark) {
      grad.addColorStop(0, '#121212');
      grad.addColorStop(0.38, '#0a0a0a');
      grad.addColorStop(0.72, '#060606');
      grad.addColorStop(1, '#060606');
    } else {
      grad.addColorStop(0, '#e8e8e8');
      grad.addColorStop(0.32, '#f2f2f2');
      grad.addColorStop(0.58, '#f8f8f8');
      grad.addColorStop(0.8, '#fefefe');
      grad.addColorStop(1, '#ffffff');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  function applyRoomTheme(dark) {
    const p = dark ? ROOM_PALETTE.dark : ROOM_PALETTE.light;
    if (floorBlendTexture) floorBlendTexture.dispose();
    floorBlendTexture = createFloorBlendTexture(dark);
    if (roomFloorMesh?.material) {
      roomFloorMesh.material.map = floorBlendTexture;
      roomFloorMesh.material.color.setHex(0xffffff);
      roomFloorMesh.material.needsUpdate = true;
    }
    tileFill.color.setHex(p.tile);
    tileLocked.color.setHex(p.tileLocked);
    edgeMat.color.setHex(p.edge);
    edgeMat.opacity = p.edgeOpacity;
    dashMat.color.setHex(p.dash);
    dashMat.opacity = p.dashOpacity;
    gridLineMat.color.setHex(p.gridA);
    gridLineMat.opacity = p.gridAOpacity;
    gridLineMatB.color.setHex(p.gridB);
    gridLineMatB.opacity = p.gridBOpacity;
    layers.tiles.traverse((obj) => {
      if (!obj.isMesh || !obj.material?.color) return;
      const variant = obj.userData.tileVariant || 'active';
      obj.material.color.setHex(variant === 'locked' ? p.tileLocked : p.tile);
    });
  }

  function diamondShape(size) {
    const sh = new THREE.Shape();
    sh.moveTo(0, size);
    sh.lineTo(size, 0);
    sh.lineTo(0, -size);
    sh.lineTo(-size, 0);
    sh.closePath();
    return sh;
  }

  function gridFadeOpacity(x, z, extent) {
    const d = Math.sqrt(x * x + z * z) / extent;
    return Math.max(0, 1 - d ** 1.65);
  }

  function addGridLine(x1, y1, z1, x2, y2, z2, mat, extent) {
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const fade = gridFadeOpacity(mx, mz, extent);
    if (fade < 0.04) return;
    const lineMat =
      fade >= 0.98
        ? mat
        : new THREE.LineBasicMaterial({
            color: mat.color.getHex(),
            transparent: true,
            opacity: mat.opacity * fade,
            depthWrite: false,
          });
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ]);
    layers.grid.add(new THREE.Line(geom, lineMat));
  }

  function buildAlignedFloorGrid() {
    const extent = TILE_STEP * 3.2;
    const gridExtent = extent * 0.88;
    const step = TILE_STEP / 2;
    floorBlendTexture = createFloorBlendTexture(false);
    roomFloorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(extent * 2.15, extent * 2.15),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: floorBlendTexture,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnits: 2,
      })
    );
    roomFloorMesh.rotation.x = -Math.PI / 2;
    roomFloorMesh.position.y = FLOOR_BASE_Y;
    roomFloorMesh.receiveShadow = true;
    roomFloorMesh.renderOrder = 0;
    layers.floor.add(roomFloorMesh);

    for (let x = -gridExtent; x <= gridExtent; x += step) {
      addGridLine(
        x,
        GRID_OVERLAY_Y,
        -gridExtent,
        x,
        GRID_OVERLAY_Y,
        gridExtent,
        x % TILE_STEP === 0 ? gridLineMat : gridLineMatB,
        extent
      );
    }
    for (let z = -gridExtent; z <= gridExtent; z += step) {
      addGridLine(
        -gridExtent,
        GRID_OVERLAY_Y,
        z,
        gridExtent,
        GRID_OVERLAY_Y,
        z,
        z % TILE_STEP === 0 ? gridLineMat : gridLineMatB,
        extent
      );
    }

    const isoStep = TILE_STEP;
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        const cx = gx * isoStep + (gz % 2 ? isoStep * 0.5 : 0);
        const cz = gz * isoStep * 0.86;
        const pts = [];
        const s = TILE_RADIUS * 1.02;
        pts.push(new THREE.Vector3(cx, GRID_OVERLAY_Y + 0.002, cz + s));
        pts.push(new THREE.Vector3(cx + s, GRID_OVERLAY_Y + 0.002, cz));
        pts.push(new THREE.Vector3(cx, GRID_OVERLAY_Y + 0.002, cz - s));
        pts.push(new THREE.Vector3(cx - s, GRID_OVERLAY_Y + 0.002, cz));
        pts.push(new THREE.Vector3(cx, GRID_OVERLAY_Y + 0.002, cz + s));
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        layers.grid.add(new THREE.Line(g, gridLineMat));
      }
    }
  }

  function outlineDiamond(parent, size, active) {
    const s = size;
    const y = FLOOR_SURFACE_Y + 0.012;
    const pts = [
      [0, s],
      [s, 0],
      [0, -s],
      [-s, 0],
      [0, s],
    ];
    for (let i = 0; i < 4; i++) {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pts[i][0], y, pts[i][1]),
        new THREE.Vector3(pts[i + 1][0], y, pts[i + 1][1]),
      ]);
      parent.add(new THREE.Line(geom, edgeMat));
    }
  }

  function dashedConnector(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return;
    const ang = Math.atan2(dz, dx);
    const uX = Math.cos(ang);
    const uZ = Math.sin(ang);
    const dash = 0.38;
    const gap = 0.26;
    const y = GRID_OVERLAY_Y + 0.004;
    for (let d = 1.0; d < len - 1.0; d += dash + gap) {
      const seg = Math.min(dash, len - 1.0 - d);
      if (seg < 0.06) continue;
      const cx = x1 + uX * (d + seg / 2);
      const cz = z1 + uZ * (d + seg / 2);
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx - uX * (seg / 2), y, cz - uZ * (seg / 2)),
        new THREE.Vector3(cx + uX * (seg / 2), y, cz + uZ * (seg / 2)),
      ]);
      layers.links.add(new THREE.Line(geom, dashMat));
    }
  }

  function makeTile(room) {
    const tx = room.position.x;
    const tz = room.position.z;
    const s = room.size || TILE_RADIUS;

    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    g.userData.tileKey = room.key;
    layers.tiles.add(g);
    if (room.key) tileGroups.set(room.key, g);

    const isLocked = !room.active || room.locked;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(s * 1.42, TILE_SLAB_H, s * 1.42),
      isLocked ? tileLocked : tileFill
    );
    slab.userData.tileVariant = isLocked ? 'locked' : 'active';
    slab.position.y = FLOOR_SURFACE_Y - TILE_SLAB_H * 0.5;
    slab.receiveShadow = true;
    slab.castShadow = false;
    slab.renderOrder = 0;
    g.add(slab);

    const diamond = new THREE.Mesh(
      new THREE.ShapeGeometry(diamondShape(s)),
      (isLocked ? tileLocked : tileFill).clone()
    );
    diamond.userData.tileVariant = isLocked ? 'locked' : 'active';
    diamond.rotation.x = -Math.PI / 2;
    diamond.position.y = FLOOR_SURFACE_Y + 0.0005;
    diamond.receiveShadow = true;
    diamond.renderOrder = 0;
    g.add(diamond);

    outlineDiamond(g, s, room.active);

    if (room.key && !room.key.startsWith('slot')) {
      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(s * 0.78, s * 0.78, 0.12, 4),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hit.rotation.y = Math.PI / 4;
      hit.position.y = 1.25;
      pickable(hit, room.key, 'room');
      g.add(hit);
    }

    if (room.plus) {
      const plusY = FLOOR_SURFACE_Y + 0.02;
      const plusGeomH = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.16, plusY, 0),
        new THREE.Vector3(0.16, plusY, 0),
      ]);
      const plusGeomV = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, plusY, -0.16),
        new THREE.Vector3(0, plusY, 0.16),
      ]);
      g.add(new THREE.Line(plusGeomH, dashMat));
      g.add(new THREE.Line(plusGeomV, dashMat));
    }

    return g;
  }

  buildAlignedFloorGrid();
  roomDefs.forEach((room) => makeTile(room));
  roomConnections.forEach((l) => dashedConnector(l[0], l[1], l[2], l[3]));

  function applyAgentFocus(agentKey) {
    focusedAgentKey = agentKey || null;
    const focusTile = agentKey ? agentWrappers.get(agentKey)?.userData?.tileKey : null;

    tileGroups.forEach((group, key) => {
      group.visible = !agentKey || key === focusTile;
    });

    agentWrappers.forEach((wrapper, key) => {
      wrapper.visible = !agentKey || key === agentKey;
    });

    layers.links.visible = !agentKey;
    layers.grid.visible = !agentKey;
    layers.floor.visible = true;
    layers.tiles.visible = true;

    layers.props.children.forEach((p) => {
      p.visible = !agentKey || p.userData?.tileKey === focusTile;
    });
  }

  isoRoot.userData.setAgentFocus = applyAgentFocus;
  isoRoot.userData.getAgentFocus = () => focusedAgentKey;

  const placed = new Set();

  roomDefs.forEach((room) => {
    if (!room.active || room.locked) return;
    const tx = room.position.x;
    const tz = room.position.z;

    if (room.occupant?.type === 'furniture') {
      assetLoader.placeFurniture(layers.props, room.occupant.assetId, {
        x: tx,
        z: tz,
        y: FURNITURE_Y,
        rot: room.occupant.rot || 0,
        scale: (room.occupant.scale ?? ROOM_FURNITURE_SCALE_DEFAULT) * ROOM_OCCUPANT_SCALE_MUL,
        tileKey: room.key,
      });
      return;
    }

    if (room.occupant?.type === 'agent') {
      const agent = getAgentById(room.occupant.agentId);
      if (!agent || placed.has(agent.key)) return;
      placed.add(agent.key);

      assetLoader
        .placeRoomAgent(layers.characters, agent.assetId, tx, tz, {
          floorY: AGENT_STAND_Y,
          rot: agent.rot ?? 0.3,
          scale: (agent.scale ?? ROOM_AGENT_SCALE_DEFAULT) * ROOM_OCCUPANT_SCALE_MUL,
          pickable,
          agentMeta: { ...agent, tileKey: room.key },
          fadeIn: true,
          animate: true,
        })
        .then((wrapper) => {
          if (!wrapper) return;
          wrapper.userData.tileKey = room.key;
          agents.push(wrapper);
          agentWrappers.set(agent.key, wrapper);
          labelData.push({
            key: agent.key,
            type: 'agent',
            name: agent.name,
            icon: 'ti-user-hexagon',
            pos: new THREE.Vector3(tx, AGENT_STAND_Y + 1.5, tz),
            health: 100,
            roomOnly: true,
            role: agent.role,
          });
        });
    }
  });

  labelData.push(
    {
      key: 'hq-room',
      type: 'room',
      name: 'Command Room',
      icon: 'ti-door-enter',
      pos: new THREE.Vector3(0, AGENT_STAND_Y + 1.6, 0),
      roomOnly: true,
      health: 97,
    },
    {
      key: 'research-room',
      type: 'room',
      name: 'Research Bay',
      icon: 'ti-microscope',
      pos: new THREE.Vector3(-TILE_STEP * 1.5, AGENT_STAND_Y + 1.5, 0),
      roomOnly: true,
      health: 98,
    },
    {
      key: 'design-room',
      type: 'room',
      name: 'Design Studio',
      icon: 'ti-palette',
      pos: new THREE.Vector3(TILE_STEP * 1.5, AGENT_STAND_Y + 1.5, 0),
      roomOnly: true,
      health: 96,
    }
  );

  isoRoot.userData.isRoomNetwork = true;
  isoRoot.userData.tileGroups = tileGroups;
  isoRoot.userData.agentWrappers = agentWrappers;
  isoRoot.userData.applyRoomTheme = applyRoomTheme;

  const doc = typeof document !== 'undefined' ? document.documentElement : null;
  applyRoomTheme(doc?.getAttribute('data-theme') === 'dark');

  return isoRoot;
}
