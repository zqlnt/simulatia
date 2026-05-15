import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetManifest, getAssetById } from '../data/assetManifest.js';

export function createAssetLoader(THREE) {
  const loader = new GLTFLoader();
  const cache = new Map();
  const pending = new Map();

  function normalizeLoadedModel(root, targetHeight = 1.72, { alignFeet = false } = {}) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        if (m.map && 'encoding' in m.map && THREE.sRGBEncoding) {
          m.map.encoding = THREE.sRGBEncoding;
        }
        if ('roughness' in m) m.roughness = Math.max(0.42, m.roughness || 0.55);
        if ('metalness' in m) m.metalness = Math.min(0.22, m.metalness || 0);
        m.depthWrite = true;
        m.needsUpdate = true;
      });
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = size.y ? targetHeight / size.y : 1;
    root.scale.setScalar(scale);
    const footY = alignFeet && size.y ? box.min.y + size.y * 0.1 : box.min.y;
    root.position.set(-center.x * scale, -footY * scale, -center.z * scale);
    return root;
  }

  function applyFadeIn(model, duration = 1.1) {
    const mats = [];
    model.traverse((c) => {
      if (!c.isMesh || !c.material) return;
      const list = Array.isArray(c.material) ? c.material : [c.material];
      list.forEach((m) => {
        m.transparent = true;
        m.opacity = 0;
        m.emissive = m.emissive || new THREE.Color(0xffffff);
        m.emissiveIntensity = 0.35;
        mats.push(m);
      });
    });
    model.userData.fade = { mats, start: performance.now(), duration };
  }

  function createProceduralFallback(kind) {
    const g = new THREE.Group();
    g.userData.proceduralFallback = kind;

    if (kind === 'proceduralAgent' || kind === 'proceduralDoctor' || kind === 'proceduralCreative') {
      const skin = new THREE.MeshPhongMaterial({ color: 0xd9a37f, shininess: 24 });
      const cloth = new THREE.MeshPhongMaterial({
        color: kind === 'proceduralDoctor' ? 0xffffff : kind === 'proceduralCreative' ? 0x8d7b68 : 0x3b6cff,
        shininess: 34,
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 12), cloth);
      body.position.y = 0.55;
      body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin);
      head.position.y = 1.15;
      head.castShadow = true;
      g.add(body, head);
      normalizeLoadedModel(g, 1.72);
      return g;
    }

    if (kind === 'proceduralDesk') {
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.08, 0.42),
        new THREE.MeshPhongMaterial({ color: 0xb58a62, shininess: 24 })
      );
      top.position.y = 0.42;
      top.castShadow = true;
      g.add(top);
      normalizeLoadedModel(g, 0.85);
      return g;
    }

    if (kind === 'proceduralChair') {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.08, 0.3),
        new THREE.MeshPhongMaterial({ color: 0x2b3038, shininess: 42 })
      );
      seat.position.y = 0.45;
      g.add(seat);
      normalizeLoadedModel(g, 0.95);
      return g;
    }

    if (kind === 'proceduralCubicle') {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.05),
        new THREE.MeshPhongMaterial({ color: 0x9aa3b0, shininess: 28 })
      );
      panel.position.y = 0.5;
      g.add(panel);
      normalizeLoadedModel(g, 1.4);
      return g;
    }

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshPhongMaterial({ color: 0xcccccc })
    );
    box.position.y = 0.15;
    g.add(box);
    return g;
  }

  function loadById(assetId) {
    const entry = getAssetById(assetId);
    if (!entry) return Promise.resolve(createProceduralFallback('proceduralDesk'));
    return loadEntry(entry);
  }

  function loadEntry(entry) {
    if (!entry?.src) return Promise.resolve(createProceduralFallback('proceduralDesk'));
    const key = entry.src;
    if (cache.has(key)) return Promise.resolve(cloneAsset(cache.get(key)));
    if (pending.has(key)) return pending.get(key).then(cloneAsset);

    const promise = new Promise((resolve) => {
      loader.load(
        key,
        (gltf) => {
          const scene = gltf.scene || gltf.scenes?.[0];
          if (!scene) {
            resolve(createProceduralFallback(entry.fallback));
            return;
          }
          normalizeLoadedModel(scene, entry.targetHeight || 1.72, {
            alignFeet: entry.type === 'agent',
          });
          scene.userData.assetId = entry.id;
          cache.set(key, scene);
          resolve(cloneAsset(scene));
        },
        undefined,
        () => {
          const fallback = createProceduralFallback(entry.fallback);
          cache.set(key, fallback);
          resolve(cloneAsset(fallback));
        }
      );
    });

    pending.set(key, promise);
    promise.finally(() => pending.delete(key));
    return promise;
  }

  function cloneAsset(source) {
    if (!source) return createProceduralFallback('proceduralDesk');
    const clone = source.clone(true);
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone();
      }
    });
    return clone;
  }

  function attachToGroup(group, assetId, options = {}) {
    const { variantIndex = 0, hideProceduralParts = true } = options;
    return loadById(assetId).then((model) => {
      if (!group) return null;
      model.rotation.y = variantIndex % 2 ? Math.PI : 0;
      if (hideProceduralParts && group.userData.bodyParts) {
        group.userData.bodyParts.forEach((part) => {
          part.visible = false;
        });
      }
      group.add(model);
      group.userData.modelLoaded = true;
      return model;
    });
  }

  function placeFurniture(parent, assetId, { x = 0, z = 0, rot = 0, y = 0.004, scale = 1, tileKey } = {}) {
    const entry = getAssetById(assetId);
    if (!entry) return Promise.resolve(null);
    return loadEntry({ ...entry, targetHeight: (entry.targetHeight || 0.85) * scale }).then((model) => {
      model.position.set(x, y, z);
      model.rotation.y = rot;
      model.userData.furniture = true;
      model.userData.tileKey = tileKey;
      model.renderOrder = 2;
      model.traverse((c) => {
        if (c.isMesh) {
          c.renderOrder = 2;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      parent.add(model);
      return model;
    });
  }

  function placeRoomAgent(parent, assetId, x, z, options = {}) {
    const {
      floorY = 0.78,
      rot = 0,
      scale = 0.52,
      pickable: pickFn,
      agentMeta = {},
      fadeIn = true,
      animate = true,
    } = options;
    const entry = getAssetById(assetId);
    const targetHeight = (entry?.targetHeight || 1.72) * scale;

    const wrapper = new THREE.Group();
    wrapper.position.set(x, floorY, z);
    wrapper.rotation.y = rot;
    wrapper.userData.roomAgent = true;
    wrapper.userData.animate = animate;
    wrapper.userData.name = agentMeta.name;
    wrapper.userData.role = agentMeta.role;
    wrapper.userData.key = agentMeta.key;
    wrapper.userData.tileKey = agentMeta.tileKey;
    wrapper.userData.phase = Math.random() * Math.PI * 2;
    wrapper.userData.spawnTime = performance.now();
    parent.add(wrapper);

    return (entry ? loadEntry({ ...entry, targetHeight }) : loadById(assetId)).then((model) => {
      model.position.set(0, 0, 0);
      model.traverse((c) => {
        if (c.isMesh) {
          c.renderOrder = 10;
          c.castShadow = true;
          c.receiveShadow = false;
        }
      });
      wrapper.add(model);
      wrapper.userData.model = model;
      if (fadeIn) applyFadeIn(model);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.38, 1.8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hit.position.y = 1.25;
      if (pickFn) {
        pickFn(hit, agentMeta.key || 'agent', 'agent', {
          agentName: agentMeta.name,
          agentRole: agentMeta.role,
          agentKey: agentMeta.key,
          agentRoom: true,
        });
      }
      hit.userData.agentGroup = wrapper;
      wrapper.add(hit);
      wrapper.userData.hit = hit;
      return wrapper;
    });
  }

  function tickRoomAnimations(modelRoot, t) {
    if (!modelRoot) return;
    modelRoot.traverse((obj) => {
      if (!obj.userData?.roomAgent) return;
      const model = obj.userData.model;
      if (model?.userData?.fade) {
        const f = model.userData.fade;
        const p = Math.min(1, (performance.now() - f.start) / f.duration);
        const ease = 1 - (1 - p) ** 3;
        f.mats.forEach((m) => {
          m.opacity = ease;
          m.emissiveIntensity = 0.35 * (1 - ease);
        });
        if (p >= 1) delete model.userData.fade;
      }
      if (obj.userData.animate && model) {
        const ph = obj.userData.phase;
        model.rotation.y = Math.sin(t * 0.45 + ph) * 0.12;
        model.position.y = Math.sin(t * 1.05 + ph) * 0.012;
      }
    });
  }

  /** Preload catalog — bounded concurrency to avoid network/UI stalls. */
  function preloadCatalog(onProgress) {
    const entries = [...assetManifest];
    if (!entries.length) return Promise.resolve();

    const total = entries.length;
    let completed = 0;
    const concurrency = Math.min(3, total);

    const report = (entry) => {
      completed += 1;
      onProgress?.(completed / total, entry?.id);
    };

    return new Promise((resolve) => {
      let index = 0;

      function pump() {
        while (index < total && running < concurrency) {
          const entry = entries[index];
          index += 1;
          running += 1;
          loadEntry(entry)
            .then(() => report(entry))
            .catch(() => report(entry))
            .finally(() => {
              running -= 1;
              if (completed >= total) resolve();
              else pump();
            });
        }
      }

      let running = 0;
      pump();
    });
  }

  return {
    loadById,
    loadEntry,
    attachToGroup,
    placeFurniture,
    placeRoomAgent,
    tickRoomAnimations,
    preloadCatalog,
    cloneAsset,
    normalizeLoadedModel,
    createProceduralFallback,
    getManifest: () => assetManifest,
  };
}
