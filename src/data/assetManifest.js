/** Central registry for GLB assets — add entries here to extend the simulation. */
export const assetManifest = [
  {
    id: 'adultMale',
    type: 'agent',
    role: 'Command / Operations Agent',
    src: '/assets/glb/adult_male.glb',
    fallback: 'proceduralAgent',
    targetHeight: 1.72,
  },
  {
    id: 'doctor',
    type: 'agent',
    role: 'Healthcare / Research Agent',
    src: '/assets/glb/doctor_with_clipboard_model.glb',
    fallback: 'proceduralDoctor',
    targetHeight: 1.72,
  },
  {
    id: 'doctorClipboard',
    type: 'agent',
    role: 'Healthcare / Research Agent',
    src: '/assets/glb/doctor_clipboard.glb',
    fallback: 'proceduralDoctor',
    targetHeight: 1.72,
  },
  {
    id: 'painter',
    type: 'agent',
    role: 'Creative Design Agent',
    src: '/assets/glb/painter.glb',
    fallback: 'proceduralCreative',
    targetHeight: 1.72,
  },
  {
    id: 'painterAlt',
    type: 'agent',
    role: 'Creative Design Agent',
    src: '/assets/glb/painter_3d_model.glb',
    fallback: 'proceduralCreative',
    targetHeight: 1.72,
  },
  {
    id: 'executiveDesk',
    type: 'furniture',
    category: 'desk',
    src: '/assets/glb/executive_desk.glb',
    fallback: 'proceduralDesk',
    targetHeight: 0.85,
  },
  {
    id: 'woodenExecutiveDesk',
    type: 'furniture',
    category: 'desk',
    src: '/assets/glb/wooden_executive_desk_3d_model.glb',
    fallback: 'proceduralDesk',
    targetHeight: 0.85,
  },
  {
    id: 'futuristicChair',
    type: 'furniture',
    category: 'chair',
    src: '/assets/glb/futuristic_chair.glb',
    fallback: 'proceduralChair',
    targetHeight: 0.95,
  },
  {
    id: 'futuristicChairAlt',
    type: 'furniture',
    category: 'chair',
    src: '/assets/glb/futuristic_chair_3d_model.glb',
    fallback: 'proceduralChair',
    targetHeight: 0.95,
  },
  {
    id: 'officeCubicle',
    type: 'furniture',
    category: 'workspace',
    src: '/assets/glb/office_cubicle.glb',
    fallback: 'proceduralCubicle',
    targetHeight: 1.4,
  },
  {
    id: 'officeCubicleAlt',
    type: 'furniture',
    category: 'workspace',
    src: '/assets/glb/office_cubicle_3d_model.glb',
    fallback: 'proceduralCubicle',
    targetHeight: 1.4,
  },
];

export function getAssetById(id) {
  return assetManifest.find((a) => a.id === id) || null;
}

export function getAssetsByType(type) {
  return assetManifest.filter((a) => a.type === type);
}
