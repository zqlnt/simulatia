import * as THREE from 'three';
import { buildRoomLayer } from './roomLayer.js';

export function initSimulation(deps = {}) {
  const { store, assetLoader: depsAssetLoader, THREE: depsTHREE, skipAutoIntro } = deps;
  if (typeof window === 'undefined' || !depsAssetLoader) return null;
/* v11 publish-polish bootstrap: keep the SPA shell but avoid the old hidden renderer. */
  var doc=document.documentElement;
  var onFirstFrame=deps.onFirstFrame;
  var bootFallback=document.getElementById('sceneFallback');
var mqMobile=window.matchMedia?window.matchMedia('(max-width: 760px), (pointer: coarse)'):{matches:false,addEventListener:function(){}};
  var mqReduce=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  var mobileMode=!!mqMobile.matches, reduceMotion=!!mqReduce.matches;
  var wrap=document.getElementById('scene-wrap'), old=document.getElementById('cityCanvas');
  if(!wrap || !old || document.getElementById('v4Canvas')) return null;
  old.__simulatiaUpgraded=true; old.style.opacity='0'; old.style.pointerEvents='none';
  var oldLabels=document.getElementById('labels'); if(oldLabels) oldLabels.style.display='none';
  var canvas=document.createElement('canvas'); canvas.id='v4Canvas'; wrap.prepend(canvas);
  ['top','bottom'].forEach(function(edge){
    var band=document.createElement('div');
    band.className='scene-tilt-band scene-tilt-band--'+edge;
    band.setAttribute('aria-hidden','true');
    wrap.appendChild(band);
  });
  var labels=document.createElement('div'); labels.id='v4Labels'; wrap.appendChild(labels);
  var cinema=document.createElement('div'); cinema.className='v6-cinema'; wrap.appendChild(cinema);
  var realismBadge=document.createElement('div'); realismBadge.className='v6-realism-badge'; realismBadge.hidden=true; wrap.appendChild(realismBadge);
  var simStats=document.createElement('div'); simStats.className='v7-sim-stats'; simStats.innerHTML='<div class="mini-title"><span class="live-dot"></span>World Simulation</div><div class="mini-line"><span>Local time</span><strong id="v7Time">08:00</strong></div><div class="mini-line"><span>Population flow</span><strong id="v7Flow" class="trend">+12%</strong></div><div class="mini-line"><span>Weather</span><strong id="v7Weather">Clear</strong></div><div class="mini-line"><span>Vehicles</span><strong id="v7Vehicles">0</strong></div>';
  var simStatsMount=document.getElementById('inspector-sim-stats-mount');
  if(simStatsMount){simStatsMount.appendChild(simStats);}else{wrap.appendChild(simStats);}
  var depth=document.createElement('div'); depth.className='v4-depth'; depth.innerHTML='<button data-v4="worlds">Worlds</button><button data-v4="city">City</button><button data-v4="building">Building</button><button data-v4="room">Room</button><button data-v4="agent">Agent</button>'; wrap.appendChild(depth);
  var hint=document.createElement('div'); hint.className='v4-hint'; hint.textContent='Click agents · City or Worlds to exit'; wrap.appendChild(hint);
  var comm=document.createElement('div'); comm.className='v4-agent-comm liquid-soft'; comm.innerHTML='<div style="display:flex;align-items:center;gap:10px"><div class="icon-lens" style="width:42px;height:42px;border-radius:22%"><i class="ti ti-user-hexagon"></i></div><div><h3 id="v4AgentName">Agent</h3><p id="v4AgentRole">Ready</p></div><button class="small-action" id="v4Close" style="margin-left:auto;width:32px;height:32px"><i class="ti ti-x"></i></button></div><div class="v4-msg" id="v4AgentMsg">Select an agent to communicate.</div><div class="v4-quick"><button>Ask status</button><button>Assign task</button><button>Open memory</button></div>'; wrap.appendChild(comm);
  document.getElementById('v4Close').onclick=function(){comm.classList.remove('show')};
  var agentFocusHint=document.createElement('div'); agentFocusHint.className='v10-agent-focus'; agentFocusHint.textContent='Agent view · click/drag to inspect · choose Room or City to exit'; wrap.appendChild(agentFocusHint);

  // v11 hierarchy chrome: reversible navigation without changing the existing panels.
  var navControls=document.createElement('div'); navControls.className='v11-nav-controls liquid-soft';
  navControls.innerHTML='<button id="v11Back" title="Back"><i class="ti ti-arrow-left"></i><span>Back</span></button><button id="v11Up" title="Up one layer"><i class="ti ti-arrow-up"></i><span>Up</span></button><strong id="v11Layer">City</strong>';
  wrap.appendChild(navControls);
  var mapCoach=document.createElement('div'); mapCoach.className='v11-map-coach'; mapCoach.innerHTML='<i class="ti ti-map-2"></i><span>Map Mode: pan, zoom and tap places · switch to 3D for full detail</span>'; wrap.appendChild(mapCoach);
  var tunnel=document.createElement('div'); tunnel.className='v11-tunnel'; wrap.appendChild(tunnel);
  var guidedIntro=document.createElement('div'); guidedIntro.className='v13-guided-intro liquid-soft hide'; guidedIntro.innerHTML='<div class="v13-guided-top"><div class="v13-guided-orb"><i class="ti ti-route-alt-left"></i></div><div class="v13-guided-copy"><b>Entry route</b><span id="v13IntroText">Preparing world route…</span></div><button class="v13-guided-skip" id="v13IntroSkip">Skip</button></div><div class="v13-intro-progress"><span id="v13IntroBar"></span></div>'; wrap.appendChild(guidedIntro);
  var introText=guidedIntro.querySelector('#v13IntroText'), introBar=guidedIntro.querySelector('#v13IntroBar'), introSkip=guidedIntro.querySelector('#v13IntroSkip');

  var nodeTitle=document.getElementById('node-title'), nodeSub=document.getElementById('node-subtitle'), nodeDesc=document.getElementById('node-description'), nodeBadge=document.getElementById('node-badge');
  var crumb=document.getElementById('crumb-name'), crumbWrap=crumb?crumb.closest('.crumbs'):null, focusName=document.getElementById('focus-name'), zoomState=document.getElementById('zoom-state'), topHealth=document.getElementById('top-health');
  var orbitState=document.getElementById('orbit-state');
  var simTimeEl=document.getElementById('v7Time'), simFlowEl=document.getElementById('v7Flow'), simWeatherEl=document.getElementById('v7Weather'), simVehicleEl=document.getElementById('v7Vehicles');

  // Background mirror: same Three.js world behind panels.
  // Pointer events stay on the original scene window so all interactions remain scoped there.
  var bgCanvas=document.getElementById('v8BackgroundCanvas');
  if(!bgCanvas){bgCanvas=document.createElement('canvas');bgCanvas.id='v8BackgroundCanvas';document.body.insertBefore(bgCanvas,document.body.firstChild);}

  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:mobileMode?'low-power':'high-performance'});
  function pixelCap(){return mobileMode?1.1:(renderScope==='room'?1.35:1.65)}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,pixelCap()));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if('outputEncoding' in renderer) renderer.outputEncoding=THREE.sRGBEncoding;
  if('toneMapping' in renderer && THREE.ACESFilmicToneMapping) renderer.toneMapping=THREE.ACESFilmicToneMapping;
  if('toneMappingExposure' in renderer) renderer.toneMappingExposure=1.03;
  if('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights=true;
  var SCENE_WHITE=0xffffff;
  renderer.setClearColor(SCENE_WHITE,1);

  var bgRenderer=new THREE.WebGLRenderer({canvas:bgCanvas,antialias:true,alpha:false,powerPreference:'low-power'});
  bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobileMode?1.0:1.5));
  bgRenderer.setClearColor(SCENE_WHITE,1);
  if('outputEncoding' in bgRenderer) bgRenderer.outputEncoding=THREE.sRGBEncoding;
  if('toneMapping' in bgRenderer && THREE.ACESFilmicToneMapping) bgRenderer.toneMapping=THREE.ACESFilmicToneMapping;
  if('toneMappingExposure' in bgRenderer) bgRenderer.toneMappingExposure=.96;

  var scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(42,1,.1,900), bgCamera=new THREE.PerspectiveCamera(50,1,.1,900);
  scene.fog=new THREE.FogExp2(SCENE_WHITE,.0065);
  var root=new THREE.Group(), universe=new THREE.Group(), city=new THREE.Group(), interior=new THREE.Group();
  root.add(universe,city,interior); scene.add(root);

  var ambient=new THREE.AmbientLight(0xffffff,.84);
  var sun=new THREE.DirectionalLight(0xfff2e4,1.2); sun.position.set(80,90,55); sun.castShadow=true; sun.shadow.mapSize.set(mobileMode?1024:2048,mobileMode?1024:2048); sun.shadow.camera.left=-160; sun.shadow.camera.right=160; sun.shadow.camera.top=160; sun.shadow.camera.bottom=-160; sun.shadow.camera.far=360;
  var fill=new THREE.DirectionalLight(0xfff6f0,.28); fill.position.set(-55,35,-50);
  var rim=new THREE.PointLight(0xffffff,.72,240,2); rim.position.set(0,34,0);
  scene.add(ambient,sun,fill,rim);

  var M={
    island:new THREE.MeshPhongMaterial({color:0xdce7f4,shininess:62,specular:0xd8ecff}),
    side:new THREE.MeshPhongMaterial({color:0xb8c8dc,shininess:25,specular:0xcfe4ff}),
    grass:new THREE.MeshPhongMaterial({color:0x8ac77f,shininess:16}),
    road:new THREE.MeshPhongMaterial({color:0x69778a,shininess:12,specular:0x93a6bd}),
    water:new THREE.MeshPhongMaterial({color:0x78c3f8,shininess:100,specular:0xe4f7ff,transparent:true,opacity:.86}),
    b1:new THREE.MeshPhongMaterial({color:0xf1f7ff,shininess:90,specular:0xe6f5ff}),
    b2:new THREE.MeshPhongMaterial({color:0xd5e1ef,shininess:72,specular:0xd9ecff}),
    glass:new THREE.MeshPhongMaterial({color:0xb7eeff,emissive:0x174fd3,emissiveIntensity:.2,shininess:120,specular:0xffffff,transparent:true,opacity:.56}),
    darkGlass:new THREE.MeshPhongMaterial({color:0x86b7db,emissive:0x0d3a7d,emissiveIntensity:.11,shininess:95,specular:0xffffff,transparent:true,opacity:.58}),
    blue:new THREE.MeshBasicMaterial({color:0x5ca6ff,transparent:true,opacity:.3}),
    cyan:new THREE.MeshBasicMaterial({color:0x6ae9ff,transparent:true,opacity:.3}),
    purple:new THREE.MeshBasicMaterial({color:0xa477ff,transparent:true,opacity:.26}),
    orange:new THREE.MeshBasicMaterial({color:0xffbd73,transparent:true,opacity:.3}),
    transit:new THREE.MeshBasicMaterial({color:0xffd56c,transparent:true,opacity:.95}),
    skin:new THREE.MeshPhongMaterial({color:0xd9a37f,shininess:18}),
    cloth:new THREE.MeshPhongMaterial({color:0x3b6cff,shininess:34}),
    dark:new THREE.MeshPhongMaterial({color:0x1d2635,shininess:30}),
    wood:new THREE.MeshPhongMaterial({color:0xb58a62,shininess:24}),
    floor:new THREE.MeshPhongMaterial({color:0xe7edf6,shininess:50,specular:0xffffff}),
    wall:new THREE.MeshPhongMaterial({color:0xeef4fc,transparent:true,opacity:.55,shininess:85,specular:0xffffff}),
    screen:new THREE.MeshBasicMaterial({color:0x75dfff,transparent:true,opacity:.9}),
    sidewalk:new THREE.MeshPhongMaterial({color:0xcbd6e4,shininess:28,specular:0xffffff}),
    curb:new THREE.MeshPhongMaterial({color:0xf5f7fb,shininess:42,specular:0xffffff}),
    crosswalk:new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.52}),
    lamp:new THREE.MeshBasicMaterial({color:0xfff2ba,transparent:true,opacity:.76}),
    carGlass:new THREE.MeshPhongMaterial({color:0xaeeaff,emissive:0x174fd3,emissiveIntensity:.18,transparent:true,opacity:.52,shininess:110,specular:0xffffff})
  };
  var selectable=[], labelData=[], labelEls={}, focusObjects={}, pulses=[], routeDots=[], packets=[], agents=[], vehicles=[], drones=[], streetLamps=[], focus={}, mode='city', renderScope='city', selected='overview', dark=false;
  var hovered=null, hoverRing=null, selectedHalo=null, navStack=[], viewMode='3d', mapMode=false, suppressHistory=false, simState={time:8.15,flow:12,weather:'Clear'};
  var focusedCityAgentGroup=null;
  
  var assetLoader = depsAssetLoader;

  // v11 selection focus: quiet spatial feedback instead of noisy outlines.
  selectedHalo=new THREE.Group();
  var selectedRing=new THREE.Mesh(new THREE.TorusGeometry(1.65,.035,8,96),new THREE.MeshBasicMaterial({color:0x3b6cff,transparent:true,opacity:.48,depthWrite:false}));
  selectedRing.rotation.x=Math.PI/2; selectedHalo.add(selectedRing);
  var selectedDisc=new THREE.Mesh(new THREE.CircleGeometry(1.42,72),new THREE.MeshBasicMaterial({color:0x3b6cff,transparent:true,opacity:.055,depthWrite:false}));
  selectedDisc.rotation.x=-Math.PI/2; selectedDisc.position.y=.012; selectedHalo.add(selectedDisc);
  selectedHalo.visible=false; scene.add(selectedHalo);

  function v(x,y,z){return new THREE.Vector3(x,y,z)} function c(mat){return mat.clone()} function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
  function pickable(mesh,key,type,extra){mesh.userData.focusKey=key;mesh.userData.pickType=type||'node'; if(extra) Object.assign(mesh.userData,extra); selectable.push(mesh); if(key&&!focusObjects[key]) focusObjects[key]=mesh; return mesh}
  function deg(n){return n*Math.PI/180}
  function announce(t){var el=document.getElementById('toast'); if(!el)return; el.textContent=t; el.classList.add('show'); clearTimeout(announce.timer); announce.timer=setTimeout(function(){el.classList.remove('show')},1300)}

  function tuneMaterial(mat, opts){
    if(!mat) return; opts=opts||{};
    if(mat.color&&opts.color!=null) mat.color.setHex(opts.color);
    if('shininess' in mat && opts.shininess!=null) mat.shininess=opts.shininess;
    if('specular' in mat && opts.specular!=null) mat.specular=new THREE.Color(opts.specular);
    if('bumpScale' in mat && opts.bumpScale!=null) mat.bumpScale=opts.bumpScale;
    mat.needsUpdate=true;
  }
  tuneMaterial(M.b1,{color:0xd8e0ea,shininess:36,specular:0xb8d7ee,bumpScale:.022});
  tuneMaterial(M.b2,{color:0xbfcad8,shininess:32,specular:0xaec6de,bumpScale:.020});
  tuneMaterial(M.road,{color:0x596574,shininess:8,specular:0x758394,bumpScale:.024});
  tuneMaterial(M.grass,{color:0x5f9f57,shininess:10,bumpScale:.055});
  tuneMaterial(M.water,{color:0x2f98d4,shininess:120,specular:0xdff6ff,bumpScale:.018});
  tuneMaterial(M.skin,{color:0xd7a17d,shininess:24,specular:0xf2c19a});
  tuneMaterial(M.floor,{color:0xdce5ef,shininess:32,specular:0xbfd4e5,bumpScale:.035});

  function normalizeLoadedModel(root,targetHeight){
    targetHeight=targetHeight||1.72;
    root.traverse(function(o){
      if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        if(o.material){
          var mats=Array.isArray(o.material)?o.material:[o.material];
          mats.forEach(function(m){
            if(m.map&&'encoding' in m.map && THREE.sRGBEncoding) m.map.encoding=THREE.sRGBEncoding;
            if('roughness' in m) m.roughness=Math.max(.42,m.roughness||.55);
            if('metalness' in m) m.metalness=Math.min(.22,m.metalness||0);
            if('shininess' in m) m.shininess=Math.min(44,m.shininess||30);
            m.needsUpdate=true;
          });
        }
      }
    });
    root.updateMatrixWorld(true);
    var box=new THREE.Box3().setFromObject(root), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
    var scale=size.y?targetHeight/size.y:1;
    root.scale.setScalar(scale);
    root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    return root;
  }
  function attachAvatarModel(group, assetId, variantIndex) {
    if (!assetLoader || !assetId) return;
    assetLoader.attachToGroup(group, assetId, { variantIndex: variantIndex || 0 });
  }

  function texCanvas(kind, size, tint){
    size=size||256;
    var cv=document.createElement('canvas'), ctx=cv.getContext('2d');
    cv.width=cv.height=size;
    var base=new THREE.Color(tint||0xffffff);
    function fract(n){return n-Math.floor(n)}
    function smoothstep(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
    function noise(x,y,scale){return fract(Math.sin(x*12.9898/scale + y*78.233/scale)*43758.5453)}

    if(kind==='cloud'){
      ctx.clearRect(0,0,size,size);
      for(var c=0;c<22;c++){
        var cx=size*(.12+Math.random()*.76), cy=size*(.14+Math.random()*.72);
        var rx=size*(.08+Math.random()*.16), ry=rx*(.45+Math.random()*.35);
        var grad=ctx.createRadialGradient(cx,cy,rx*.12,cx,cy,rx);
        var a=.05+Math.random()*.11;
        grad.addColorStop(0,'rgba(255,255,255,'+(a*1.15)+')');
        grad.addColorStop(.45,'rgba(255,255,255,'+a+')');
        grad.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=grad;
        ctx.beginPath();
        ctx.ellipse(cx,cy,rx,ry,Math.random()*.4-Math.random()*.4,0,Math.PI*2);
        ctx.fill();
      }
      var img=ctx.getImageData(0,0,size,size), data=img.data;
      for(var y=0;y<size;y++) for(var x=0;x<size;x++){
        var i=(y*size+x)*4;
        var nx=noise(x+40,y-15,6)*.5 + noise(x-60,y+10,13)*.35 + noise(x+20,y+70,27)*.15;
        var edge=Math.min(Math.min(x/size,1-x/size),Math.min(y/size,1-y/size))*2;
        var fade=smoothstep(.0,.9,edge);
        var alpha=(data[i+3]/255)*(.72+nx*.36)*fade;
        var shade=.92+nx*.08;
        data[i]=255*shade; data[i+1]=255*shade; data[i+2]=255*shade; data[i+3]=Math.max(0,Math.min(255,alpha*255));
      }
      ctx.putImageData(img,0,0);
      var cloudTex=new THREE.CanvasTexture(cv); cloudTex.wrapS=cloudTex.wrapT=THREE.RepeatWrapping; cloudTex.anisotropy=8; cloudTex.needsUpdate=true; return cloudTex;
    }

    var img=ctx.createImageData(size,size), data=img.data;
    for(var y=0;y<size;y++) for(var x=0;x<size;x++){
      var i=(y*size+x)*4, n=(noise(x,y,1)+noise(x,y,3)*.45+noise(x,y,9)*.25); n=fract(n);
      var gx=x/size, gy=y/size, shade=.86+n*.28;
      if(kind==='grass') shade=.66+n*.46+(Math.sin((gx+gy)*70)*.03)+noise(x+40,y-20,18)*.06;
      if(kind==='road') shade=.54+n*.18+(Math.sin(y*.34)*.018)+noise(x-30,y+40,14)*.03;
      if(kind==='floor') shade=.82+n*.18;
      if(kind==='wood') shade=.70+n*.20+Math.sin((x+n*8)*.18)*.08;
      if(kind==='planet') shade=.70+n*.44+Math.sin(x*.035+y*.018)*.08;
      if(kind==='facade') shade=.82+n*.12 + (x%32<2?.08:0) + (y%22<1?.04:0);
      data[i]=Math.max(0,Math.min(255,base.r*255*shade));
      data[i+1]=Math.max(0,Math.min(255,base.g*255*shade));
      data[i+2]=Math.max(0,Math.min(255,base.b*255*shade));
      data[i+3]=255;
    }
    ctx.putImageData(img,0,0);
    if(kind==='floor'){
      ctx.strokeStyle='rgba(50,70,95,.16)'; ctx.lineWidth=1;
      for(var g=0;g<size;g+=32){ctx.beginPath();ctx.moveTo(g,0);ctx.lineTo(g,size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,g);ctx.lineTo(size,g);ctx.stroke();}
    }
    if(kind==='road'){
      ctx.strokeStyle='rgba(255,255,255,.20)'; ctx.lineWidth=2; ctx.setLineDash([12,14]);
      ctx.beginPath(); ctx.moveTo(0,size*.5); ctx.lineTo(size,size*.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle='rgba(0,0,0,.08)'; ctx.lineWidth=1;
      for(var cr=18;cr<size;cr+=46){ctx.beginPath();ctx.moveTo(cr,0);ctx.lineTo(cr+10,size);ctx.stroke()}
    }
    if(kind==='facade'){
      ctx.fillStyle='rgba(255,255,255,.08)';
      for(var gy=10;gy<size;gy+=22) for(var gx=6;gx<size;gx+=32) ctx.fillRect(gx,gy,18,10);
    }
    var tex=new THREE.CanvasTexture(cv); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.anisotropy=8; tex.needsUpdate=true; return tex;
  }
  var TEX={
    grass:texCanvas('grass',256,0x7fbd73), road:texCanvas('road',256,0x687789), floor:texCanvas('floor',256,0xe8eef7),
    side:texCanvas('floor',256,0xb8c8dc), wood:texCanvas('wood',256,0xb58a62), facade:texCanvas('facade',256,0xf2f6fc), cloud:texCanvas('cloud',512,0xffffff)
  };
  function applyTexture(mat, tex, repeat, bump){
    if(!mat||!tex)return; mat.map=tex; mat.bumpMap=tex; mat.bumpScale=bump||.025; if(repeat)tex.repeat.set(repeat,repeat); mat.needsUpdate=true;
  }
  applyTexture(M.grass,TEX.grass,8,.045); applyTexture(M.road,TEX.road,5,.018); applyTexture(M.floor,TEX.floor,6,.028); applyTexture(M.side,TEX.side,3,.025); applyTexture(M.wood,TEX.wood,3,.035); applyTexture(M.b1,TEX.facade,1.8,.012); applyTexture(M.b2,TEX.facade,1.6,.010);
  function planetTexture(color){var tex=texCanvas('planet',512,color); tex.repeat.set(1,1); return tex;}
  function cloudTexture(){return TEX.cloud.clone ? TEX.cloud.clone() : TEX.cloud;}
  function addGrassTuft(parent,x,z,s){
    var mat=new THREE.MeshPhongMaterial({color:0x4f9a4f,shininess:10,specular:0x1f4422});
    var tuft=new THREE.Group();
    for(var i=0;i<3;i++){var blade=new THREE.Mesh(new THREE.ConeGeometry(.018*s,.28*s,5),mat); blade.position.set((i-1)*.035*s,.14*s,0); blade.rotation.z=(i-1)*.22+(Math.random()-.5)*.16; blade.rotation.x=(Math.random()-.5)*.25; blade.castShadow=true; tuft.add(blade)}
    tuft.position.set(x,.10,z); tuft.rotation.y=Math.random()*Math.PI*2; parent.add(tuft); return tuft;
  }
  function addPebble(parent,x,z,s){var peb=new THREE.Mesh(new THREE.DodecahedronGeometry(.045*s,0),new THREE.MeshPhongMaterial({color:0xb8c0c8,shininess:18,specular:0xffffff})); peb.position.set(x,.11,z); peb.scale.y=.35; peb.rotation.set(Math.random(),Math.random(),Math.random()); peb.castShadow=peb.receiveShadow=true; parent.add(peb)}


  function makeSky(){
    // Sky sphere — white void fading to soft zenith grey (tilt-shift atmosphere).
    var skyGeo=new THREE.SphereGeometry(430,48,22);
    var skyCnt=skyGeo.attributes.position.count;
    var skyColors=new Float32Array(skyCnt*3);
    for(var si=0;si<skyCnt;si++){
      var sy=skyGeo.attributes.position.getY(si);
      var t2=Math.max(0,Math.min(1,(sy+20)/460));
      var haze=Math.pow(1-t2,1.65);
      var r=1-.05*t2+haze*.04, gr=1-.04*t2+haze*.03, bl=1-.03*t2+haze*.02;
      skyColors[si*3]=r; skyColors[si*3+1]=gr; skyColors[si*3+2]=bl;
    }
    skyGeo.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
    var sky=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false}));
    sky.userData.sky=true; scene.add(sky);

    var sunDisc=new THREE.Mesh(new THREE.CircleGeometry(18,48),new THREE.MeshBasicMaterial({color:0xfffaea,transparent:true,opacity:.88,depthWrite:false}));
    sunDisc.position.set(220,140,-80); sunDisc.lookAt(0,0,0); scene.add(sunDisc);
    var sunHalo=new THREE.Mesh(new THREE.CircleGeometry(54,48),new THREE.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:.12,depthWrite:false}));
    sunHalo.position.copy(sunDisc.position); sunHalo.lookAt(0,0,0); scene.add(sunHalo);
    var horizon=new THREE.Mesh(new THREE.RingGeometry(145,210,160),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.06,depthWrite:false,side:THREE.DoubleSide}));
    horizon.rotation.x=-Math.PI/2; horizon.position.y=-2.2; scene.add(horizon);

    var geo=new THREE.BufferGeometry(), starPos=[], starCol=[];
    for(var si2=0;si2<1100;si2++){
      var rr=220+Math.random()*190, th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
      starPos.push(rr*Math.sin(ph)*Math.cos(th),Math.abs(rr*Math.cos(ph))+28,rr*Math.sin(ph)*Math.sin(th));
      var k=.70+Math.random()*.30, warm=Math.random()>.68;
      starCol.push(warm?k:k*.88,warm?k*.9:k,warm?k*.78:k);
    }
    geo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(starCol,3));
    var stars=new THREE.Points(geo,new THREE.PointsMaterial({size:1.18,vertexColors:true,transparent:true,opacity:.46,depthWrite:false,sizeAttenuation:true}));
    stars.userData.stars=true; scene.add(stars); pulses.push(stars);

    // Sparse high-altitude clouds: lighter, farther out, and less blocking.
    for(var n=0;n<12;n++){
      var cg=new THREE.Group();
      var puffCount=4+Math.floor(Math.random()*4), baseOp=.055+Math.random()*.05;
      var cMat=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:baseOp,depthWrite:false,shininess:2});
      for(var j=0;j<puffCount;j++){
        var puff=new THREE.Mesh(new THREE.SphereGeometry(2.4+Math.random()*3.2,12,8),cMat.clone());
        puff.scale.y=.14+Math.random()*.09; puff.scale.x=1.35+Math.random()*.85;
        puff.position.set((Math.random()-.5)*10,(Math.random()-.5)*.45,(Math.random()-.5)*4.6);
        cg.add(puff);
      }
      var hazeMat=new THREE.MeshBasicMaterial({map:TEX.cloud,transparent:true,opacity:.018+Math.random()*.022,depthWrite:false,side:THREE.DoubleSide});
      var haze=new THREE.Mesh(new THREE.PlaneGeometry(13+Math.random()*8,4.5+Math.random()*3.5),hazeMat); haze.rotation.x=-Math.PI/2; haze.position.y=-.18; cg.add(haze);
      var ang=Math.random()*Math.PI*2, dist=95+Math.random()*85;
      cg.position.set(Math.cos(ang)*dist,58+Math.random()*22,Math.sin(ang)*dist);
      cg.userData.cloudBaseX=cg.position.x; cg.userData.cloudBaseZ=cg.position.z; cg.userData.cloudPhase=Math.random()*Math.PI*2; cg.userData.cloudDrift=4+Math.random()*8; cg.userData.cloudSpeed=.06+Math.random()*.08; cg.userData.isCloud=true; scene.add(cg); pulses.push(cg);
    }
  }
  makeSky();
  hoverRing=new THREE.Mesh(new THREE.TorusGeometry(1.18,.035,8,96),c(M.cyan)); hoverRing.rotation.x=Math.PI/2; hoverRing.position.y=.16; hoverRing.visible=false; hoverRing.material.opacity=.58; city.add(hoverRing);

  function island(parent,x,z,r,name){
    var g=new THREE.Group(), side=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.05,2.1,128),M.side), top=new THREE.Mesh(new THREE.CircleGeometry(r*.985,128),M.island);
    side.position.y=-1.05; top.rotation.x=-Math.PI/2; top.position.y=.025; side.receiveShadow=top.receiveShadow=true;
    var ring=new THREE.Mesh(new THREE.TorusGeometry(r*1.01,.16,12,160),c(M.blue)); ring.rotation.x=Math.PI/2; ring.position.y=.07; ring.material.opacity=.18;
    var halo=new THREE.Mesh(new THREE.CircleGeometry(r*1.32,128),c(M.blue)); halo.rotation.x=-Math.PI/2; halo.position.y=-2.16; halo.material.opacity=.055;
    g.add(side,top,ring,halo); g.position.set(x,0,z); parent.add(g); pulses.push(ring); return g;
  }
  function road(parent,x,z,w,d,ry){
    ry=ry||0;
    function placeBox(lx,lz,bw,bd,mat,yy){
      var bx=x+Math.cos(ry)*lx+Math.sin(ry)*lz, bz=z-Math.sin(ry)*lx+Math.cos(ry)*lz;
      var mesh=new THREE.Mesh(new THREE.BoxGeometry(bw,yy||.065,bd),mat); mesh.position.set(bx,.07,bz); mesh.rotation.y=ry; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    }
    var r=placeBox(0,0,w,d,M.road,.065);
    var longX=w>=d, side=Math.max(w,d), sideOffset=(longX?d:w)*.5+.18;
    if(longX){placeBox(0,sideOffset,w*.96,.19,M.sidewalk,.045);placeBox(0,-sideOffset,w*.96,.19,M.sidewalk,.045);placeBox(0,d*.5+.055,w,.045,M.curb,.035);placeBox(0,-d*.5-.055,w,.045,M.curb,.035)}
    else {placeBox(sideOffset,0,.19,d*.96,M.sidewalk,.045);placeBox(-sideOffset,0,.19,d*.96,M.sidewalk,.045);placeBox(w*.5+.055,0,.045,d,M.curb,.035);placeBox(-w*.5-.055,0,.045,d,M.curb,.035)}
    var lane=placeBox(0,0,w*.84,.10,c(M.blue),.026); lane.position.y=.116; lane.material.opacity=.34;
    if(side>5.5){
      for(var e=-1;e<=1;e+=2){
        for(var st=-2;st<=2;st++){
          if(longX){var stripe=placeBox(e*w*.36+st*.15,0,.07,d*.72,M.crosswalk,.018); stripe.position.y=.132;}
          else {var stripe2=placeBox(0,e*d*.36+st*.15,w*.72,.07,M.crosswalk,.018); stripe2.position.y=.132;}
        }
      }
    }
    return r;
  }
  function ringRoad(parent,r,w){
    var mesh=new THREE.Mesh(new THREE.RingGeometry(r-w/2,r+w/2,160),M.road); mesh.rotation.x=-Math.PI/2; mesh.position.y=.075; mesh.receiveShadow=true; parent.add(mesh);
    var outer=new THREE.Mesh(new THREE.RingGeometry(r+w/2+.06,r+w/2+.34,160),M.sidewalk); outer.rotation.x=-Math.PI/2; outer.position.y=.082; outer.receiveShadow=true; parent.add(outer);
    var inner=new THREE.Mesh(new THREE.RingGeometry(Math.max(.1,r-w/2-.34),Math.max(.2,r-w/2-.06),160),M.sidewalk); inner.rotation.x=-Math.PI/2; inner.position.y=.083; inner.receiveShadow=true; parent.add(inner);
    var glow=new THREE.Mesh(new THREE.RingGeometry(r-.055,r+.055,160),c(M.blue)); glow.rotation.x=-Math.PI/2; glow.position.y=.12; parent.add(glow); return mesh;
  }
  function park(parent,x,z,w,d,ry){
    var p=new THREE.Mesh(new THREE.PlaneGeometry(w,d,8,8),M.grass); p.rotation.x=-Math.PI/2; p.rotation.z=ry||0; p.position.set(x,.092,z); p.receiveShadow=true; parent.add(p);
    for(var i=0;i<18;i++){
      var lx=(Math.random()-.5)*w*.86, lz=(Math.random()-.5)*d*.86, ca=Math.cos(ry||0), sa=Math.sin(ry||0);
      addGrassTuft(parent,x+lx*ca-lz*sa,z+lx*sa+lz*ca,.65+Math.random()*.75);
    }
  }
  function water(parent,x,z,w,d,ry){var p=new THREE.Mesh(new THREE.PlaneGeometry(w,d),M.water); p.rotation.x=-Math.PI/2; p.rotation.z=ry||0; p.position.set(x,.105,z); parent.add(p)}
  function tree(parent,x,z,s){
    s=s||1;
    var g=new THREE.Group();
    var trunkH=.62*s, trunkMat=new THREE.MeshPhongMaterial({color:0x6b4a28,shininess:8,specular:0x4a3020});
    var tr=new THREE.Mesh(new THREE.CylinderGeometry(.06*s,.12*s,trunkH,7),trunkMat);
    tr.position.y=trunkH*.5; tr.castShadow=true; g.add(tr);
    // Three layered crowns for depth
    var crownColors=[0x4a9e42,0x5ab84e,0x65c458];
    for(var ci=0;ci<3;ci++){
      var h=(.72+ci*.18)*s, r=(.42-ci*.08)*s;
      var cr=new THREE.Mesh(new THREE.SphereGeometry(r,9,7),new THREE.MeshPhongMaterial({color:crownColors[ci],shininess:12,specular:0x204a20}));
      cr.position.y=trunkH+h*.35; cr.scale.y=.82; cr.castShadow=true; g.add(cr);
    }
    // Occasional variant - conical tree
    if(Math.random()>.72){
      var cone=new THREE.Mesh(new THREE.ConeGeometry(.28*s,.72*s,7),new THREE.MeshPhongMaterial({color:0x2d7a40,shininess:10}));
      cone.position.y=trunkH+.36*s; cone.castShadow=true;
      // replace crowns
      while(g.children.length>1) g.remove(g.children[g.children.length-1]);
      g.add(cone);
    }
    g.position.set(x,0,z);
    // Slight random rotation for variety
    g.rotation.y=Math.random()*Math.PI*2;
    parent.add(g);
  }

  function streetLight(parent,x,z,s){
    s=s||1;
    var g=new THREE.Group();
    var pole=new THREE.Mesh(new THREE.CylinderGeometry(.035*s,.045*s,1.7*s,8),new THREE.MeshPhongMaterial({color:0x6f7d8f,shininess:80,specular:0xffffff})); pole.position.y=.85*s; pole.castShadow=true;
    var arm=new THREE.Mesh(new THREE.BoxGeometry(.48*s,.045*s,.045*s),pole.material); arm.position.set(.22*s,1.62*s,0); arm.castShadow=true;
    var bulb=new THREE.Mesh(new THREE.SphereGeometry(.105*s,12,8),M.lamp.clone()); bulb.position.set(.50*s,1.58*s,0);
    var halo=new THREE.Mesh(new THREE.SphereGeometry(.28*s,12,8),M.lamp.clone()); halo.position.copy(bulb.position); halo.material.opacity=.10; halo.material.depthWrite=false;
    g.add(pole,arm,bulb,halo); g.position.set(x,.09,z); g.rotation.y=Math.random()*Math.PI*2; parent.add(g); streetLamps.push({group:g,bulb:bulb,halo:halo}); return g;
  }
  function vehicleRoute(points,n,palette){
    var curve=new THREE.CatmullRomCurve3(points);
    palette=palette||[0x3b6cff,0xffffff,0x1d2635,0xff9f0a];
    for(var i=0;i<n;i++){
      var g=new THREE.Group(), bodyMat=new THREE.MeshPhongMaterial({color:palette[i%palette.length],shininess:72,specular:0xffffff});
      var body=new THREE.Mesh(new THREE.BoxGeometry(.78,.26,.42),bodyMat); body.position.y=.25; body.castShadow=true; g.add(body);
      var cab=new THREE.Mesh(new THREE.BoxGeometry(.34,.20,.36),M.carGlass); cab.position.set(.08,.48,0); cab.castShadow=true; g.add(cab);
      var head=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.32),new THREE.MeshBasicMaterial({color:0xfff6bd,transparent:true,opacity:.82})); head.position.set(.41,.28,0); g.add(head);
      var tail=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.30),new THREE.MeshBasicMaterial({color:0xff453a,transparent:true,opacity:.65})); tail.position.set(-.41,.27,0); g.add(tail);
      for(var w=0;w<4;w++){var wheel=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.08,12),new THREE.MeshPhongMaterial({color:0x11131a,shininess:45})); wheel.rotation.z=Math.PI/2; wheel.position.set(w<2?-.24:.24,.12,w%2?-.24:.24); g.add(wheel)}
      g.userData.curve=curve; g.userData.t=i/n; g.userData.speed=.025+Math.random()*.016; g.userData.head=head; g.userData.tail=tail; city.add(g); vehicles.push(g);
    }
  }
  function drone(center,spread,i){
    var g=new THREE.Group();
    var body=new THREE.Mesh(new THREE.SphereGeometry(.18,16,10),new THREE.MeshPhongMaterial({color:0xf7fbff,shininess:105,specular:0xffffff})); body.castShadow=true; g.add(body);
    for(var a=0;a<Math.PI*2;a+=Math.PI/2){var arm=new THREE.Mesh(new THREE.BoxGeometry(.5,.025,.025),new THREE.MeshPhongMaterial({color:0x8090a6,shininess:70})); arm.rotation.y=a; g.add(arm); var rotor=new THREE.Mesh(new THREE.TorusGeometry(.12,.008,6,20),M.cyan.clone()); rotor.position.set(Math.cos(a)*.28,0,Math.sin(a)*.28); rotor.rotation.x=Math.PI/2; rotor.material.opacity=.38; g.add(rotor)}
    g.userData.center=center.clone(); g.userData.spread=spread; g.userData.phase=i*.9+Math.random()*2; g.userData.speed=.18+Math.random()*.08; city.add(g); drones.push(g); return g;
  }

  function facade(group,o){
    var mat=new THREE.MeshPhongMaterial({color:o.windowColor||0xbff0ff,emissive:o.emissive||0x2d68e9,emissiveIntensity:.32,transparent:true,opacity:o.windowOpacity||.36,shininess:105,specular:0xffffff});
    function wmat(){var m=mat.clone(); var k=.55+Math.random()*.95; m.opacity=(o.windowOpacity||.36)*k; m.emissiveIntensity=.12+Math.random()*.42; return m}
    var rows=Math.max(3,Math.floor(o.h/.75)), cols=Math.max(2,Math.floor(o.w/.55)), sc=Math.max(2,Math.floor(o.d/.55));
    for(var r=0;r<rows;r++) for(var q=0;q<cols;q++){if((r+q)%7===0&&Math.random()>.6)continue; var y=.45+r*((o.h-1)/(rows-1||1)), x=-o.w*.39+q*(o.w*.78/(cols-1||1)); var a=new THREE.Mesh(new THREE.BoxGeometry(o.w/(cols+1)*.62,.12,.026),wmat()); a.position.set(x,y,o.d/2+.026); var b=a.clone(); b.position.z=-o.d/2-.026; group.add(a,b)}
    for(var r2=0;r2<rows;r2++) for(var q2=0;q2<sc;q2++){if((r2+q2)%8===0&&Math.random()>.6)continue; var y2=.45+r2*((o.h-1)/(rows-1||1)), z=-o.d*.39+q2*(o.d*.78/(sc-1||1)); var c1=new THREE.Mesh(new THREE.BoxGeometry(.026,.12,o.d/(sc+1)*.62),wmat()); c1.position.set(o.w/2+.026,y2,z); var c2=c1.clone(); c2.position.x=-o.w/2-.026; group.add(c1,c2)}
  }
  function roof(group,o){var mat=new THREE.MeshPhongMaterial({color:0xcfd8e5,shininess:46,specular:0xffffff}); for(var i=0;i<3;i++){var b=new THREE.Mesh(new THREE.BoxGeometry(.35+Math.random()*.4,.22+Math.random()*.22,.35+Math.random()*.4),mat); b.position.set((Math.random()-.5)*o.w*.55,o.h+.33,(Math.random()-.5)*o.d*.55); b.castShadow=true; group.add(b)} if(o.spire){var m=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,1.4,8),new THREE.MeshBasicMaterial({color:0x7fdfff,transparent:true,opacity:.9})); m.position.y=o.h+.9; group.add(m)} if(o.pad){var p=new THREE.Mesh(new THREE.RingGeometry(.55,.78,32),c(M.cyan)); p.rotation.x=-Math.PI/2; p.position.y=o.h+.28; p.material.opacity=.34; group.add(p); pulses.push(p)}}
  function building(parent,o){
    var g=new THREE.Group(), mat=o.mat||M.b1, body=o.round?new THREE.Mesh(new THREE.CylinderGeometry(o.w/2,o.w/2,o.h,56),mat):new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d,2,Math.max(4,Math.floor(o.h)),2),mat);
    body.position.y=o.h/2; body.castShadow=body.receiveShadow=true; pickable(body,o.key,'building'); g.add(body);
    var pod=new THREE.Mesh(new THREE.BoxGeometry(o.w*1.18,.5,o.d*1.18),M.b2); pod.position.y=.25; pod.castShadow=pod.receiveShadow=true; pickable(pod,o.key,'building'); g.add(pod);
    var crown=o.round?new THREE.Mesh(new THREE.CylinderGeometry(o.w*.48,o.w*.49,.22,56),M.b2):new THREE.Mesh(new THREE.BoxGeometry(o.w*.92,.22,o.d*.92),M.b2); crown.position.y=o.h+.12; crown.castShadow=true; g.add(crown);
    facade(g,o); roof(g,o);

    // Architectural realism: corner mullions, floor slabs and recessed lobby glass.
    var trimMat=new THREE.MeshPhongMaterial({color:0xc3cedd,shininess:68,specular:0xffffff});
    var slabMat=new THREE.MeshPhongMaterial({color:0xb8c6d6,shininess:40,specular:0xdce9f5});
    if(!o.round){
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(corner){var tr=new THREE.Mesh(new THREE.BoxGeometry(.055,o.h+.08,.055),trimMat); tr.position.set(corner[0]*o.w*.505,o.h*.5,corner[1]*o.d*.505); tr.castShadow=true; g.add(tr)});
      var floorCount=Math.max(3,Math.floor(o.h/1.25));
      for(var f=1; f<floorCount; f++) if(f%2===0 || o.h<5){var y=f*(o.h/floorCount); var band=new THREE.Mesh(new THREE.BoxGeometry(o.w*1.012,.035,o.d*1.018),slabMat); band.position.y=y; band.castShadow=band.receiveShadow=true; g.add(band)}
      var lobbyMat=new THREE.MeshPhongMaterial({color:0xc9f3ff,emissive:0x2e75ff,emissiveIntensity:.18,transparent:true,opacity:.42,shininess:120,specular:0xffffff});
      var lobby=new THREE.Mesh(new THREE.BoxGeometry(o.w*.74,.7,.04),lobbyMat); lobby.position.set(0,.78,o.d/2+.05); g.add(lobby);
    } else {
      for(var a=0;a<Math.PI*2;a+=Math.PI/6){var fin=new THREE.Mesh(new THREE.BoxGeometry(.038,o.h*.96,.07),trimMat); fin.position.set(Math.cos(a)*o.w*.505,o.h*.51,Math.sin(a)*o.w*.505); fin.rotation.y=-a; g.add(fin)}
    }

    // Rooftop HVAC / solar panels for scale.
    var solarMat=new THREE.MeshPhongMaterial({color:0x203044,emissive:0x0c2a55,emissiveIntensity:.16,shininess:80,specular:0x88aaff});
    for(var s=0;s<2;s++){var sol=new THREE.Mesh(new THREE.BoxGeometry(o.w*.34,.025,o.d*.18),solarMat); sol.position.set((s-.5)*o.w*.33,o.h+.27,(Math.random()-.5)*o.d*.42); sol.rotation.y=(Math.random()-.5)*.22; g.add(sol)}
    if(o.dome){var d=new THREE.Mesh(new THREE.SphereGeometry(o.w*.52,32,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhongMaterial({color:0xf8fbff,transparent:true,opacity:.62,shininess:120,specular:0xffffff})); d.position.y=o.h+.12; g.add(d)}
    if(o.baseGlow){var bg=new THREE.Mesh(new THREE.CylinderGeometry(o.baseGlow,o.baseGlow,.08,96),c(o.glowMat||M.blue)); bg.position.y=.12; bg.material.opacity=.15; g.add(bg)}
    if(o.rings) for(var rr=0;rr<o.rings;rr++){var rg=new THREE.Mesh(new THREE.TorusGeometry(1.9+rr*1.55,.045,10,128),c(o.glowMat||M.blue)); rg.rotation.x=Math.PI/2; rg.position.y=.14; rg.userData.phase=rr*.75+Math.random(); rg.material.opacity=.36-rr*.06; g.add(rg); pulses.push(rg)}
    g.position.set(o.x,0,o.z); parent.add(g);
    if(o.label!==false){var wp=new THREE.Vector3(); g.getWorldPosition(wp); var ly=o.h+(o.dome?o.w*.45:.95)+(o.spire?1.1:0); labelData.push({key:o.key,type:'building',name:o.name,icon:o.icon||'ti-building',health:o.health||96,pos:new THREE.Vector3(wp.x,ly,wp.z),canEnter:!!o.interior}); focus[o.key]={key:o.key,mode:'building',name:o.name,subtitle:o.subtitle||'Building · Health '+(o.health||96)+'%',description:o.description||'Detailed Simulatia building with richer facade depth, procedural materials, interactive agents, live workflows and interior room access.',health:o.health||96,agents:o.agents||18,workflows:o.workflows||8,transit:o.transit||90,active:o.active||6,focus:new THREE.Vector3(wp.x,Math.max(2.5,o.h*.45),wp.z),radius:o.radius||22,canEnter:!!o.interior}}
    return g;
  }

  function district(key,name,x,z,r,kind){
    var d=island(city,x,z,r,name); ringRoad(d,r*.5,1.55); ringRoad(d,r*.78,1.05); for(var i=0;i<6;i++){var a=Math.PI*2/6*i+(kind==='hq'?.22:0); road(d,Math.cos(a)*r*.34,Math.sin(a)*r*.34,r*.92,1.15,-a)}
    for(var sl=0;sl<16;sl++){var la=Math.PI*2*sl/16+(kind==='hq'?.08:0), lr=r*.66; streetLight(d,Math.cos(la)*lr,Math.sin(la)*lr,.72+Math.random()*.22)}
    for(var p=0;p<4;p++) park(d,(Math.random()-.5)*r*1.1,(Math.random()-.5)*r*1.1,3+Math.random()*3,2.5+Math.random()*3,Math.random()*Math.PI);
    if(kind==='hq'){water(d,10,-8,5.2,3.8,deg(10)); park(d,-9,8,5,4,deg(-10));
      building(d,{key:'hq',name:'Simulatia HQ',icon:'ti-building-skyscraper',x:0,z:0,w:3.6,d:3.6,h:14.6,windowColor:0xbdeeff,emissive:0x2464ff,windowOpacity:.56,baseGlow:5.8,rings:3,spire:true,pad:true,health:97,agents:42,workflows:18,active:9,radius:25,interior:true,description:'Central coordination hub with live transit routing, autonomous workflows, detailed interior access and city-level intelligence.'});
      building(d,{key:'central-hub',name:'Central Hub T2',icon:'ti-crane',x:-6.8,z:-4.3,w:3,d:2.35,h:5.2,windowColor:0xaeeaff,emissive:0x2666e6,baseGlow:3.3,rings:1,pad:true,health:95,agents:18,workflows:10,radius:19,interior:true});
      building(d,{key:'agent-tower',name:'Agent Tower',icon:'ti-robot',x:7.2,z:3.7,w:2.7,d:2.25,h:8.4,mat:M.b2,windowColor:0xa7f0ff,emissive:0x16a7e6,baseGlow:3.2,pad:true,health:98,agents:56,workflows:12,radius:19,interior:true});
      building(d,{key:'power-grid',name:'Power Grid',icon:'ti-bolt',x:6.8,z:-5.2,w:3,d:1.95,h:4.3,mat:M.b2,windowColor:0xffe2a7,emissive:0xff8c00,baseGlow:3.2,glowMat:M.orange,health:91,agents:11,workflows:8,transit:82,radius:19,interior:true});
      building(d,{key:'data-vault',name:'Data Vault',icon:'ti-database',x:-3.2,z:7.6,w:3,d:3,h:5.4,round:true,windowColor:0xcfbdff,emissive:0x7b46ff,baseGlow:3.4,glowMat:M.purple,health:96,agents:20,workflows:15,radius:19,interior:true});
      building(d,{key:'comms',name:'Comms Center',x:-8.8,z:4.1,w:2.35,d:1.95,h:3.5,windowColor:0xaaffea,emissive:0x0bbd9f,label:false});
      building(d,{key:'creation',name:'Creation Studio',x:2.4,z:-8.6,w:2.55,d:2.3,h:3.4,windowColor:0xffcda7,emissive:0xff7430,label:false});
    } else if(kind==='harbor'){water(d,-2,-7,r*.9,r*.45,deg(-12)); building(d,{key:'harbor',name:'Harbor City',icon:'ti-building-bridge-2',x:0,z:0,w:3.2,d:2.6,h:9.2,mat:M.b2,windowColor:0xbdeeff,emissive:0x1e8ee9,baseGlow:4.5,rings:2,health:92,agents:33,workflows:12,radius:27}); building(d,{key:'finance',name:'Finance Hub',icon:'ti-building-bank',x:5.6,z:3.6,w:2.45,d:2.15,h:6.8,health:94,radius:19}); building(d,{key:'logistics',name:'Logistics',icon:'ti-truck',x:-6.2,z:2.8,w:3.35,d:2.2,h:3.7,health:89,radius:19}); building(d,{key:'dock',name:'Transit Dock',x:4.2,z:-5,w:3.5,d:1.75,h:2.7,label:false})}
    else {water(d,8,-6,4.4,3.2,deg(8)); building(d,{key:'research',name:'Research Campus',icon:'ti-flask-2',x:0,z:0,w:3.6,d:3.6,h:6.3,round:true,dome:true,windowColor:0xd2baff,emissive:0x7b42ff,baseGlow:4.6,glowMat:M.purple,rings:2,health:98,agents:38,workflows:14,radius:27}); building(d,{key:'simulation-lab',name:'Simulation Lab',icon:'ti-atom',x:-5.6,z:-3.8,w:2.75,d:2.35,h:4.5,windowColor:0xaeeaff,emissive:0x0fa8da,baseGlow:2.9,health:96,radius:19}); building(d,{key:'quantum',name:'Quantum Core',icon:'ti-flask',x:5.4,z:3.8,w:2.35,d:2.35,h:5.8,round:true,windowColor:0xd6c0ff,emissive:0x7844ff,health:98,radius:19})}
    for(var t=0;t<28;t++){var aa=Math.random()*Math.PI*2, rr=r*(.43+Math.random()*.45); tree(d,Math.cos(aa)*rr,Math.sin(aa)*rr,.68+Math.random()*.45)}
    for(var gd=0;gd<80;gd++){var ga=Math.random()*Math.PI*2, gr=r*(.18+Math.random()*.76); if(Math.random()>.18)addGrassTuft(d,Math.cos(ga)*gr,Math.sin(ga)*gr,.45+Math.random()*.55); else addPebble(d,Math.cos(ga)*gr,Math.sin(ga)*gr,.65+Math.random()*.65)}
    focus[key]={key:key,mode:'city',name:name,subtitle:(kind==='hq'?'Primary city':kind==='harbor'?'Transit city':'Research city')+' · Health '+(kind==='harbor'?92:kind==='research'?98:97)+'%',description:kind==='hq'?'The main Simulatia district: command tower, agent tower, power grid, data vault and creation workflows.':kind==='harbor'?'A logistics-heavy city zone with waterways, bridges and finance operations.':'A high-tech campus with research, simulations and experimental agent training.',health:kind==='harbor'?92:kind==='research'?98:97,agents:kind==='harbor'?70:kind==='research'?64:142,workflows:kind==='harbor'?14:kind==='research'?16:18,transit:kind==='harbor'?96:kind==='research'?87:91,active:kind==='harbor'?12:kind==='research'?10:32,focus:new THREE.Vector3(x,5.5,z),radius:kind==='hq'?42:39};
    return d;
  }
  district('hq','Austin · Simulatia HQ',0,0,18,'hq'); district('harbor','Harbor City',50,-8,15,'harbor'); district('research','Quantum Research Campus',-43,23,15,'research');

  function rand(seed){var x=Math.sin(seed*999.123)*43758.5453;return x-Math.floor(x)}
  for(var ix=-4;ix<=4;ix++)for(var iz=-4;iz<=4;iz++){if(Math.abs(ix)<=1&&Math.abs(iz)<=1)continue; var x=ix*18,z=iz*18,s=15.5; road(city,x,z-s/2,s,.5,0); road(city,x,z+s/2,s,.5,0); road(city,x-s/2,z,.5,s,0); road(city,x+s/2,z,.5,s,0); for(var l=0;l<3;l++){var bw=1+rand(ix*31+iz*11+l)*1.4,bd=1+rand(ix*17+iz*23+l)*1.4,bh=1.4+rand(ix*7+iz*19+l)*7.5; var b=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),rand(l+ix)>0.55?M.b1:M.b2); b.position.set(x+(rand(l+ix*3)-.5)*s*.55,bh/2,z+(rand(l+iz*5)-.5)*s*.55); b.castShadow=b.receiveShadow=true; city.add(b)}}

  function route(points,mat,n){var curve=new THREE.CatmullRomCurve3(points), tube=new THREE.Mesh(new THREE.TubeGeometry(curve,140,.075,8,false),c(mat)); tube.material.opacity=.38; city.add(tube); for(var i=0;i<n;i++){var p=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),c(M.transit)); p.userData.curve=curve;p.userData.t=i/n;p.userData.speed=.045+Math.random()*.02;city.add(p);routeDots.push(p)}}
  route([v(5,.35,6),v(18,.55,10),v(35,.45,2),v(50,.35,-8)],M.blue,9); route([v(-3,.35,8),v(-16,.75,18),v(-30,.55,23),v(-43,.35,23)],M.purple,9); route([v(-43,.35,23),v(-18,.9,38),v(15,.8,22),v(50,.35,-8)],M.cyan,7);
  vehicleRoute([v(-12,.28,-5),v(0,.28,-12),v(14,.28,-4),v(8,.28,10),v(-9,.28,8),v(-12,.28,-5)],8,[0x3b6cff,0xffffff,0x1d2635,0xff9f0a]);
  vehicleRoute([v(44,.28,-17),v(57,.28,-12),v(55,.28,2),v(43,.28,.5),v(38,.28,-10),v(44,.28,-17)],6,[0x49c7ff,0xfff4d8,0x32445d]);
  vehicleRoute([v(-52,.28,15),v(-35,.28,14),v(-31,.28,28),v(-46,.28,34),v(-54,.28,24),v(-52,.28,15)],6,[0x8f63ff,0xf7fbff,0x30d158]);
  for(var dr=0;dr<12;dr++) drone([v(0,0,0),v(50,0,-8),v(-43,0,23)][dr%3],13,dr);

  function worldOrb(name,x,z,color,target){
    var g=new THREE.Group();
    var geo=new THREE.SphereGeometry(5.2,96,48);
    var cnt=geo.attributes.position.count;
    var vColors=new Float32Array(cnt*3);
    var baseC=target==='overview'?new THREE.Color(0x1f78d1):(target==='harbor'?new THREE.Color(0xb55231):new THREE.Color(0x6d7390)), landC=target==='overview'?new THREE.Color(0x3f9f55):(target==='harbor'?new THREE.Color(0x7f3d2b):new THREE.Color(0x8e84b9)), iceC=new THREE.Color(0xeef7ff);
    for(var vi=0;vi<cnt;vi++){
      var px=geo.attributes.position.getX(vi),py=geo.attributes.position.getY(vi),pz=geo.attributes.position.getZ(vi);
      var n1=Math.sin(px*1.8+.4)*Math.cos(py*2.1)*Math.sin(pz*1.5);
      var n2=Math.sin(px*3.8+1.2)*Math.cos(pz*2.9+.8)*.45;
      var n3=Math.cos(py*1.2+px*.9+pz*.7)*.2;
      var terrain=n1+n2+n3, polar=Math.pow(Math.abs(py)/5.2,5);
      var col=baseC.clone().lerp(landC,terrain>.18?.55:.18).lerp(iceC,polar*.45);
      var vary=.86+terrain*.16;
      vColors[vi*3]=Math.min(1,col.r*vary); vColors[vi*3+1]=Math.min(1,col.g*vary); vColors[vi*3+2]=Math.min(1,col.b*vary);
      var len=Math.sqrt(px*px+py*py+pz*pz), bump=1+Math.max(0,terrain)*.012;
      geo.attributes.position.setXYZ(vi,px/len*5.2*bump,py/len*5.2*bump,pz/len*5.2*bump);
    }
    geo.computeVertexNormals(); geo.setAttribute('color',new THREE.Float32BufferAttribute(vColors,3));
    var pTex=planetTexture(color); pTex.repeat.set(1,1);
    var planetMat=new THREE.MeshPhongMaterial({vertexColors:true,map:pTex,bumpMap:pTex,bumpScale:.08,shininess:68,specular:new THREE.Color(.40,.52,.68)});
    var planet=new THREE.Mesh(geo,planetMat); pickable(planet,target,'world'); g.add(planet);

    var atmMat=new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:.16,side:THREE.BackSide,depthWrite:false});
    g.add(new THREE.Mesh(new THREE.SphereGeometry(5.78,48,24),atmMat));

    var cloudGeo=new THREE.SphereGeometry(5.34,64,32);
    var cTex=cloudTexture(); cTex.repeat.set(1.6,1.0);
    var clouds=new THREE.Mesh(cloudGeo,new THREE.MeshPhongMaterial({map:cTex,alphaMap:cTex,color:0xffffff,transparent:true,opacity:.10,shininess:6,depthWrite:false}));
    g.userData.clouds=clouds; g.add(clouds);

    var lightPos=[], lightColor=[];
    for(var l=0;l<46;l++){var la=(Math.random()-.5)*Math.PI*.78, lo=Math.random()*Math.PI*2, rr=5.46; lightPos.push(Math.cos(la)*Math.cos(lo)*rr,Math.sin(la)*rr,Math.cos(la)*Math.sin(lo)*rr); lightColor.push(1,.76,.38)}
    var cityLights=new THREE.BufferGeometry(); cityLights.setAttribute('position',new THREE.Float32BufferAttribute(lightPos,3)); cityLights.setAttribute('color',new THREE.Float32BufferAttribute(lightColor,3));
    g.add(new THREE.Points(cityLights,new THREE.PointsMaterial({size:.075,vertexColors:true,transparent:true,opacity:.72,depthWrite:false,sizeAttenuation:true})));

    var ringMat=c(M.blue); ringMat.opacity=.28; var ring=new THREE.Mesh(new THREE.TorusGeometry(7.2,.07,10,160),ringMat); ring.rotation.x=Math.PI/2.6; ring.rotation.z=.28; g.add(ring); pulses.push(ring);
    var ring2Mat=c(M.cyan); ring2Mat.opacity=.12; var ring2=new THREE.Mesh(new THREE.TorusGeometry(8.4,.045,8,128),ring2Mat); ring2.rotation.x=Math.PI/2.2; ring2.rotation.z=-.38; g.add(ring2); pulses.push(ring2);

    var moon=new THREE.Mesh(new THREE.SphereGeometry(.55,24,14),new THREE.MeshPhongMaterial({color:0xd8dce8,shininess:45,specular:0x8899cc,bumpMap:TEX.floor,bumpScale:.05}));
    moon.userData.orbitR=8.6; moon.userData.orbitY=1.8; moon.userData.orbitSpeed=.38+Math.random()*.15; moon.userData.orbitPhase=Math.random()*Math.PI*2; g.add(moon); g.userData.moon=moon;
    var station=new THREE.Mesh(new THREE.TorusGeometry(.8,.025,6,24),new THREE.MeshBasicMaterial({color:0x8eeaff,transparent:true,opacity:.45})); station.userData.moon=true; station.position.set(-7,1.2,2); g.add(station);

    var gloMat=c(M.blue); gloMat.opacity=.065; var gloPlane=new THREE.Mesh(new THREE.CircleGeometry(9,96),gloMat); gloPlane.rotation.x=-Math.PI/2; gloPlane.position.y=-6.5; g.add(gloPlane);
    g.position.set(x,6,z); g.userData.orbitBase=g; universe.add(g); labelData.push({key:target,type:'world',name:name,icon:'ti-planet',pos:new THREE.Vector3(x,13.5,z),health:96}); return g;
  }
  worldOrb('Earth · Austin Network',0,0,0x7fb3ff,'overview');
  worldOrb('Mars Colony Preview',26,-12,0xffa36f,'harbor');
  worldOrb('Orbital Research',-25,13,0xb9a2ff,'research');
  universe.visible=false;

  function person(o){
    o=o||{};
    var g=new THREE.Group();
    var hairColors=[0x2c201b,0x7a4a2a,0x1a1a1a,0xb87c3a,0x4a3828];
    var skinTones=[0xd9a37f,0xc8865e,0xf0c8a0,0xa0724a,0xe8b896];
    var skinMat=new THREE.MeshPhongMaterial({color:skinTones[Math.floor(Math.random()*skinTones.length)],shininess:32,specular:0xffd0a0});
    var hairMat=new THREE.MeshPhongMaterial({color:o.hair||hairColors[Math.floor(Math.random()*hairColors.length)],shininess:58,specular:0x554422});
    var clothMat=o.cloth||new THREE.MeshPhongMaterial({color:o.clothColor||0x3b6cff,shininess:42,specular:0x7aa4ff});
    var pantsMat=new THREE.MeshPhongMaterial({color:o.pants||0x1d2635,shininess:25,specular:0x334466});
    var shoeMat=new THREE.MeshPhongMaterial({color:0x18181e,shininess:75,specular:0x334455});
    var eyeMat=new THREE.MeshBasicMaterial({color:0x10151f});
    var eyes=[];
    var glowMat=new THREE.MeshBasicMaterial({color:0x7de7ff,transparent:true,opacity:.65});

    var headGroup=new THREE.Group(); headGroup.position.y=1.56;
    var head=new THREE.Mesh(new THREE.SphereGeometry(.195,20,14),skinMat); head.scale.y=1.12; head.castShadow=true; headGroup.add(head);
    var hair=new THREE.Mesh(new THREE.SphereGeometry(.205,20,10,0,Math.PI*2,0,Math.PI*.68),hairMat); hair.position.y=.04; hair.scale.y=.78; hair.castShadow=true; headGroup.add(hair);
    [-.07,.07].forEach(function(ex){var eye=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),eyeMat); eye.position.set(ex,.025,.175); eyes.push(eye); headGroup.add(eye)});
    var nose=new THREE.Mesh(new THREE.ConeGeometry(.022,.055,6),skinMat); nose.position.set(0,-.015,.198); nose.rotation.x=Math.PI/2; headGroup.add(nose);
    var mouth=new THREE.Mesh(new THREE.BoxGeometry(.075,.008,.008),new THREE.MeshBasicMaterial({color:0x7a3f3f,transparent:true,opacity:.55})); mouth.position.set(0,-.07,.187); headGroup.add(mouth); [-.2,.2].forEach(function(ex){var ear=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),skinMat); ear.scale.z=.72; ear.position.set(ex,.0,.01); headGroup.add(ear)}); [-.06,.06].forEach(function(ex){var brow=new THREE.Mesh(new THREE.BoxGeometry(.05,.008,.01),new THREE.MeshBasicMaterial({color:hairMat.color})); brow.position.set(ex,.065,.17); headGroup.add(brow)});

    var neck=new THREE.Mesh(new THREE.CylinderGeometry(.068,.075,.155,10),skinMat); neck.position.y=1.35; neck.castShadow=true;
    var torso=new THREE.Mesh(new THREE.BoxGeometry(.38,.52,.22),clothMat); torso.position.y=1.02; torso.castShadow=true; var shoulders=new THREE.Mesh(new THREE.BoxGeometry(.48,.11,.24),clothMat); shoulders.position.y=1.22; shoulders.castShadow=true;
    var badge=new THREE.Mesh(new THREE.BoxGeometry(.10,.075,.012),glowMat); badge.position.set(.095,1.13,.116); g.add(badge);
    var hips=new THREE.Mesh(new THREE.BoxGeometry(.36,.18,.20),pantsMat); hips.position.y=.74; hips.castShadow=true;

    var leftLegGroup=new THREE.Group(); leftLegGroup.position.set(-.09,.745,0);
    var rightLegGroup=new THREE.Group(); rightLegGroup.position.set(.09,.745,0);
    var leftArmGroup=new THREE.Group(); leftArmGroup.position.set(-.22,1.18,0);
    var rightArmGroup=new THREE.Group(); rightArmGroup.position.set(.22,1.18,0);
    var uLegGeo=new THREE.CylinderGeometry(.068,.068,.32,10);
    var leftULeg=new THREE.Mesh(uLegGeo,pantsMat); leftULeg.position.y=-.16; leftULeg.castShadow=true;
    var rightULeg=new THREE.Mesh(uLegGeo,pantsMat); rightULeg.position.y=-.16; rightULeg.castShadow=true;
    var lLegGeo=new THREE.CylinderGeometry(.056,.056,.28,10);
    var leftLLeg=new THREE.Mesh(lLegGeo,pantsMat); leftLLeg.position.set(0,-.5,.02); leftLLeg.castShadow=true;
    var rightLLeg=new THREE.Mesh(lLegGeo,pantsMat); rightLLeg.position.set(0,-.5,.02); rightLLeg.castShadow=true;
    var footGeo=new THREE.BoxGeometry(.10,.065,.18);
    var leftFoot=new THREE.Mesh(footGeo,shoeMat); leftFoot.position.set(0,-.675,.055); leftFoot.castShadow=true;
    var rightFoot=new THREE.Mesh(footGeo,shoeMat); rightFoot.position.set(0,-.675,.055); rightFoot.castShadow=true;
    leftLegGroup.add(leftULeg,leftLLeg,leftFoot); rightLegGroup.add(rightULeg,rightLLeg,rightFoot);

    var uArmGeo=new THREE.CylinderGeometry(.052,.06,.26,10);
    var leftUArm=new THREE.Mesh(uArmGeo,clothMat); leftUArm.position.y=-.13; leftUArm.castShadow=true;
    var rightUArm=new THREE.Mesh(uArmGeo,clothMat); rightUArm.position.y=-.13; rightUArm.castShadow=true;
    var lArmGeo=new THREE.CylinderGeometry(.042,.05,.24,10);
    var leftLArm=new THREE.Mesh(lArmGeo,skinMat); leftLArm.position.y=-.32; leftLArm.castShadow=true;
    var rightLArm=new THREE.Mesh(lArmGeo,skinMat); rightLArm.position.y=-.32; rightLArm.castShadow=true;
    var leftHand=new THREE.Mesh(new THREE.SphereGeometry(.046,8,6),skinMat); leftHand.position.y=-.46; leftHand.castShadow=true;
    var rightHand=new THREE.Mesh(new THREE.SphereGeometry(.046,8,6),skinMat); rightHand.position.y=-.46; rightHand.castShadow=true;
    leftArmGroup.rotation.z=.22; rightArmGroup.rotation.z=-.22; leftArmGroup.add(leftUArm,leftLArm,leftHand); rightArmGroup.add(rightUArm,rightLArm,rightHand);

    var shadow=new THREE.Mesh(new THREE.CircleGeometry(.34,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.13,depthWrite:false})); shadow.rotation.x=-Math.PI/2; shadow.position.y=.012;
    var hit=new THREE.Mesh(new THREE.CylinderGeometry(.38,.34,1.82,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})); hit.position.y=.91; pickable(hit,o.key||'agent','agent',{agentName:o.name||'Agent',agentRole:o.role||'Operations',agentKey:o.key||'agent',agentRoom:!!o.roomAgent});
    var bodyParts=[torso,shoulders,hips,neck,headGroup,leftLegGroup,rightLegGroup,leftArmGroup,rightArmGroup,badge];
    g.add(shadow,torso,shoulders,hips,neck,headGroup,leftLegGroup,rightLegGroup,leftArmGroup,rightArmGroup,hit);
    g.userData=Object.assign({headGroup:headGroup,leftLegGroup:leftLegGroup,rightLegGroup:rightLegGroup,leftArmGroup:leftArmGroup,rightArmGroup:rightArmGroup,eyes:eyes,blinkSeed:Math.random()*10,bodyParts:bodyParts,hit:hit},o);
    hit.userData.agentGroup=g;
    if(o.assetId) attachAvatarModel(g,o.assetId,o.modelIndex||0);
    return g;
  }
  const ctx = { THREE, interior, M, pickable, assetLoader, agents, labelData, createPerson: person };
  function agentSpot(home, spread, minDist){var pos=v(home.x, .16, home.z); for(var tries=0; tries<30; tries++){pos.set(home.x+(Math.random()-.5)*spread,.16,home.z+(Math.random()-.5)*spread); var ok=true; for(var ai=0; ai<agents.length; ai++){ if(agents[ai].position.distanceTo(pos)<minDist){ok=false; break;} } if(ok) break;} return pos;} ['Atlas','Sage','Ava','Ledger','Scout','Pulse','Orion','Comms','Ray','Mira','Bolt','Iris','Kai','Nia','Coda','Echo'].forEach(function(n,i){var home=[v(0,0,0),v(50,0,-8),v(-43,0,23)][i%3], p=person({key:'city-agent-'+i,name:n,role:['Strategy Agent','Research Analyst','Finance Manager','Ops Director'][i%4],cloth:[M.cloth,M.dark,new THREE.MeshPhongMaterial({color:0x8f63ff}),new THREE.MeshPhongMaterial({color:0x278a65})][i%4],assetId:['adultMale','doctor','adultMale','painter'][i%4],modelIndex:i}); p.scale.set(.72,.72,.72); var start=agentSpot(home,13,1.3); p.position.copy(start); p.userData.home=home;p.userData.target=agentSpot(home,16,1.8);p.userData.speed=.035+Math.random()*.03;p.userData.phase=Math.random()*Math.PI*2; city.add(p); agents.push(p)});

  interior.visible = false;
  var roomNetwork=buildRoomLayer(ctx);

  focus.overview={key:'overview',mode:'city',name:'Regional City Overview',subtitle:'Multi-city operational layer · Health 97%',description:'Three connected districts with animated transit, living traffic, drones, procedural materials, expressive walking agents, skyline depth and an infinite city atmosphere.',health:97,agents:142,workflows:18,transit:91,active:32,focus:v(8,4,4),radius:82};
  focus.worlds={key:'worlds',mode:'worlds',name:'World Atlas',subtitle:'Worlds → cities → buildings → rooms',description:'A zoomed-out atlas for selecting connected worlds. Click a world to descend into city view, then enter buildings and rooms.',health:97,agents:142,workflows:18,transit:91,active:3,focus:v(0,7,0),radius:58};
  focus['hq-room']={key:'hq-room',mode:'room',name:'Simulatia HQ · Command Room',subtitle:'Isometric room network · Click agents to focus their pod',description:'Aligned floor grid with diamond pods. Each agent occupies one tile with desk props and GLB characters grounded above the floor.',health:97,agents:8,workflows:6,transit:100,active:1,focus:v(0,.85,0),radius:22,theta:.78,phi:.72,fov:38};
  focus['research-room']={key:'research-room',mode:'room',name:'Research Bay',subtitle:'Research pod',description:'Healthcare research agent with office cubicle asset.',health:98,agents:2,workflows:4,transit:100,active:1,focus:v(-5.18,.85,0),radius:7.5,theta:.78,phi:.72,fov:38,parentKey:'hq'};
  focus['design-room']={key:'design-room',mode:'room',name:'Design Studio',subtitle:'Design pod',description:'Creative agent with desk and chair assets.',health:96,agents:2,workflows:5,transit:100,active:1,focus:v(5.18,.85,-.05),radius:7.5,theta:.78,phi:.72,fov:38,parentKey:'hq'};
  labelData.push({key:'research-room',type:'room',name:'Research Bay',icon:'ti-microscope',pos:new THREE.Vector3(-4.15,1.62,.1),roomOnly:true,health:98});
  labelData.push({key:'design-room',type:'room',name:'Design Studio',icon:'ti-palette',pos:new THREE.Vector3(4.05,1.62,-.1),roomOnly:true,health:96});

  function makeLabel(item){var el=document.createElement('div'); el.className='label'; el.innerHTML='<div class="label-card"><i class="ti '+(item.icon||'ti-building')+'"></i><b>'+item.name+'</b><span>'+(item.canEnter?'Enter':item.type==='agent'?(item.role||'Agent'):(item.health||96)+'%')+'</span></div><div class="stem"></div>'; el.onclick=function(){if(item.type==='agent')openAgent({key:item.key,name:item.name,role:item.role,pos:item.pos,roomOnly:item.roomOnly}); else if(item.canEnter&&selected===item.key) enterRoom(item.key); else focusTo(item.key)}; labels.appendChild(el); labelEls[item.key]=el}
  labelData.forEach(makeLabel);

  // v11 layer model: explicit World → City → Building → Room → Agent relationships.
  var districtKeys=['hq','harbor','research'];
  var buildingParents={hq:'hq','central-hub':'hq','agent-tower':'hq','power-grid':'hq','data-vault':'hq',finance:'harbor',logistics:'harbor',dock:'harbor','simulation-lab':'research',quantum:'research',archive:'research','garden-lab':'research'};
  function layerName(d){return d.mode==='worlds'?'World':d.mode==='room'?'Room':d.mode==='agent'?'Agent':d.mode==='building'?'Building':districtKeys.indexOf(d.key)>-1?'City':'City'}
  function decorateHierarchy(){
    Object.keys(focus).forEach(function(k){var d=focus[k]; if(!d)return; d.layer=layerName(d);});
    if(focus.worlds){focus.worlds.layer='World'; focus.worlds.parentKey=null}
    if(focus.overview){focus.overview.layer='City'; focus.overview.parentKey='worlds'}
    districtKeys.forEach(function(k){if(focus[k]){focus[k].layer='City'; focus[k].parentKey='overview'}});
    Object.keys(buildingParents).forEach(function(k){if(focus[k]&&districtKeys.indexOf(k)===-1){focus[k].layer='Building'; focus[k].parentKey=buildingParents[k]}});
    ['hq-room','research-room','design-room'].forEach(function(rk){if(focus[rk]){focus[rk].layer='Room'; focus[rk].parentKey='hq'; focus[rk].entryFrom='hq'}})
  }
  decorateHierarchy();
  function trailFor(key){
    var out=[], guard=0, k=key;
    while(k&&focus[k]&&guard++<8){out.unshift({key:k,name:focus[k].name,layer:focus[k].layer||layerName(focus[k])}); k=focus[k].parentKey;}
    if(!out.length) out=[{key:'overview',name:'Regional Overview',layer:'City'}];
    return out;
  }
  function updateBreadcrumbs(d){
    var trail=trailFor(d.key);
    if(crumbWrap){
      crumbWrap.innerHTML='<i class="ti ti-world"></i>'+trail.map(function(x,i){var icon=i<trail.length-1?'':'<strong>';var close=i<trail.length-1?'':'</strong>';return '<button class="crumb-action" data-crumb="'+x.key+'">'+icon+x.layer+': '+x.name+close+'</button>'}).join('<span>›</span>');
      crumbWrap.querySelectorAll('[data-crumb]').forEach(function(btn){btn.onclick=function(){focusTo(btn.getAttribute('data-crumb'))}});
    } else if(crumb) crumb.textContent=d.name;
    var layer=document.getElementById('v11Layer'); if(layer) layer.textContent=(viewMode==='map'?'Map · ':'')+(d.layer||layerName(d));
  }
  function updateNavRows(){document.querySelectorAll('[data-focus]').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-focus')===selected)})}
  function setSelectedHalo(d){
    if(!selectedHalo)return;
    var o=focusObjects[selected], pos=null;
    if(o){pos=new THREE.Vector3(); o.getWorldPosition(pos);}
    else if(d&&d.focus) pos=d.focus.clone();
    if(!pos||mode==='worlds'){selectedHalo.visible=false;return}
    selectedHalo.position.set(pos.x,.06,pos.z);
    selectedHalo.scale.setScalar(d&&d.mode==='agent'?.42:(d&&d.mode==='building'?1.45:(d&&d.radius<22?1.1:2.3)));
    selectedHalo.visible=mode!=='room'||(d&&d.mode==='agent');
  }

  // v12: cinematic blur is now strictly transitional, never a persistent room effect.
  function finishViewportTransition(){
    clearTimeout(focusTo._blurTimer);
    canvas.classList.remove('transitioning');
    wrap.classList.remove('is-transitioning');
    if(cinema)cinema.classList.remove('show');
    if(tunnel)tunnel.className='v11-tunnel';
  }
  function beginViewportTransition(kind,duration){
    clearTimeout(focusTo._blurTimer);
    wrap.classList.add('is-transitioning');
    canvas.classList.add('transitioning');
    if(cinema)cinema.classList.add('show');
    if(tunnel)tunnel.className='v11-tunnel show'+(kind==='enter'?' entering':'');
    focusTo._blurTimer=setTimeout(finishViewportTransition,reduceMotion?90:(duration||520));
  }
  function clearAgentPodFocus(){
    if(roomNetwork&&roomNetwork.userData.setAgentFocus) roomNetwork.userData.setAgentFocus(null);
  }
  function clearCityAgentFocus(){
    if(!focusedCityAgentGroup && !wrap.classList.contains('agent-solo-mode')) return;
    focusedCityAgentGroup=null;
    agents.forEach(function(a){a.visible=true});
    if(!mapMode){
      vehicles.forEach(function(v){v.visible=true});
      drones.forEach(function(d){d.visible=true});
      routeDots.forEach(function(p){p.visible=viewMode!=='map'});
    }
    wrap.classList.remove('agent-solo-mode');
  }
  function applyCityAgentFocus(group){
    focusedCityAgentGroup=group||null;
    agents.forEach(function(a){a.visible=a===group});
    vehicles.forEach(function(v){v.visible=false});
    drones.forEach(function(d){d.visible=false});
    routeDots.forEach(function(p){p.visible=false});
    wrap.classList.add('agent-solo-mode');
    S.auto=false;
  }
  function resolveAgentGroup(agentKey,item){
    if(item&&item.group) return item.group;
    if(roomNetwork&&roomNetwork.userData.agentWrappers){
      var w=roomNetwork.userData.agentWrappers.get(agentKey);
      if(w) return w;
    }
    for(var i=0;i<agents.length;i++){
      if(agents[i].userData&&agents[i].userData.key===agentKey) return agents[i];
    }
    return null;
  }
  function leaveAgentFocus(){
    clearAgentPodFocus();
    clearCityAgentFocus();
  }
  function isRoomPodAgent(agentKey,item,group){
    if(item&&item.roomOnly) return true;
    if(group&&group.userData&&group.userData.roomAgent) return true;
    if(roomNetwork&&roomNetwork.userData.agentWrappers&&roomNetwork.userData.agentWrappers.has(agentKey)) return true;
    return false;
  }
  function findRoomPodKey(agentKey,name,role){
    if(roomNetwork&&roomNetwork.userData.agentWrappers){
      if(agentKey&&roomNetwork.userData.agentWrappers.has(agentKey)) return agentKey;
      var found=null;
      roomNetwork.userData.agentWrappers.forEach(function(w,k){
        if(w.userData&&(w.userData.name===name||w.userData.role===role)) found=k;
      });
      if(found) return found;
    }
    return null;
  }
  function syncRoomPodFocus(agentKey){
    if(roomNetwork&&roomNetwork.userData.setAgentFocus) roomNetwork.userData.setAgentFocus(agentKey||null);
  }
  function setMode(renderMode,activeMode){
    renderScope=renderMode||'city';
    mode=activeMode||renderScope;
    universe.visible=renderScope==='worlds';
    city.visible=renderScope==='city'||renderScope==='agent';
    interior.visible=renderScope==='room';
    hint.classList.toggle('show',renderScope==='room'||mode==='agent');
    if(agentFocusHint){
      agentFocusHint.classList.toggle('show',mode==='agent');
      agentFocusHint.textContent=renderScope==='agent'?'Solo agent view · Back or City to exit':'Agent view · click/drag to inspect · choose Room or City to exit';
    }
    depth.querySelectorAll('button').forEach(function(b){
      var k=b.getAttribute('data-v4');
      b.classList.toggle('active',k===mode||(mode==='city'&&k==='city')||(mode==='building'&&k==='building')||(mode==='agent'&&k==='agent'));
    });
    wrap.classList.toggle('room-mode',renderScope==='room');
    wrap.classList.toggle('agent-solo-mode',renderScope==='agent'&&mode==='agent');
    var inRoom=renderScope==='room';
    var agentSolo=renderScope==='agent'&&mode==='agent';
    renderer.shadowMap.enabled=!inRoom&&!agentSolo&&!mapMode&&!mobileMode;
    sun.castShadow=!inRoom&&!agentSolo&&!mapMode&&!mobileMode;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,pixelCap()));
    if(renderScope==='room'){
      var roomBg=dark?0x060606:SCENE_WHITE;
      renderer.setClearColor(roomBg,1);
      bgRenderer.setClearColor(roomBg,1);
      scene.fog=new THREE.FogExp2(roomBg,dark?.0042:.0034);
      if(mode==='agent'&&selected&&focus[selected]&&focus[selected].mode==='agent'&&focus[selected].renderMode==='room'){
        syncRoomPodFocus(focus[selected].key);
      }else if(mode!=='agent'){
        clearAgentPodFocus();
      }
    }else if(renderScope==='agent'&&mode==='agent'){
      var soloBg=dark?0x101010:SCENE_WHITE;
      renderer.setClearColor(soloBg,1);
      bgRenderer.setClearColor(soloBg,1);
      scene.fog=new THREE.FogExp2(soloBg,dark?.018:.004);
      clearAgentPodFocus();
    }else if(!dark){
      renderer.setClearColor(SCENE_WHITE,1);
      bgRenderer.setClearColor(SCENE_WHITE,1);
      scene.fog=new THREE.FogExp2(SCENE_WHITE,.0065);
      leaveAgentFocus();
    }else{
      leaveAgentFocus();
    }
  }
  function updatePanel(d){if(nodeTitle)nodeTitle.textContent=d.name;if(nodeSub)nodeSub.textContent=d.subtitle;if(nodeDesc)nodeDesc.textContent=d.description;if(nodeBadge){nodeBadge.textContent=d.health>=96?'Excellent':d.health>=91?'Good':'Watch';nodeBadge.style.color=d.health>=96?'var(--green)':d.health>=91?'var(--orange)':'var(--red)'} updateBreadcrumbs(d); updateNavRows(); if(topHealth)topHealth.textContent=d.health+'%';if(focusName)focusName.textContent=d.name;if(zoomState)zoomState.textContent=d.mode==='worlds'?'Worlds':d.mode==='room'?'Room':d.mode==='agent'?'Agent':d.radius>=70?'City':d.radius>=34?'District':'Building'; var a=document.getElementById('stat-agents'); if(a)a.textContent=d.agents; var w=document.getElementById('stat-workflows'); if(w)w.textContent=d.workflows; var tr=document.getElementById('stat-transit'); if(tr)tr.textContent=d.transit+'%';}
  function focusTo(key,silent){
    var d=focus[key]||focus.overview, prev=selected, wasMode=mode;
    if(prev!==key){
      var prevDef=focus[prev];
      if(prevDef&&prevDef.mode==='agent') leaveAgentFocus();
    }
    if(prev!==key && !silent && !suppressHistory){navStack.push(prev); if(navStack.length>12)navStack.shift();}
    selected=key;
    if(d.mode==='agent'&&d.renderMode==='agent'&&d.agentGroup) applyCityAgentFocus(d.agentGroup);
    else if(d.mode!=='agent'||d.renderMode!=='agent') clearCityAgentFocus();
    var nextRender=d.renderMode||(d.mode==='agent'?'room':d.mode)||'city';
    if(d.mode==='agent'&&!d.renderMode) nextRender='room';
    setMode(nextRender,d.mode||'city');
    if(d.mode==='agent'&&d.renderMode==='room') syncRoomPodFocus(d.key);
    else if(nextRender!=='room'||d.mode!=='agent') clearAgentPodFocus();
    S.targetFocus.copy(d.focus); S.targetRadius=mapMode?Math.max(d.radius,mode==='room'?17:62):d.radius;
    S.targetFov=d.fov!=null?d.fov:(d.mode==='agent'?38:(d.mode==='room'?48:(d.mode==='worlds'?38:42)));
    S.targetPhi=d.phi!=null?d.phi:(d.mode==='agent'?.92:d.mode==='worlds'?.86:d.mode==='room'?1.08:key==='overview'?.96:.75);
    if(mapMode){S.targetPhi=d.mode==='room'?.45:.24; S.targetFov=34;}
    if(d.theta!=null) S.targetTheta=d.theta; else if(d.mode==='worlds')S.targetTheta=.45; else if(key==='research')S.targetTheta=.92; else if(key==='harbor')S.targetTheta=.38; else if(d.mode==='room')S.targetTheta=0;
    S.last=performance.now(); updatePanel(d); setSelectedHalo(d);
    if((d.mode||'city')!==wasMode && !silent){
      beginViewportTransition(d.mode==='room'?'enter':'shift',d.mode==='room'?480:360);
    } else if(!wrap.classList.contains('is-transitioning')) {
      finishViewportTransition();
    }
    if(!silent)announce((d.mode==='agent'?'Inspecting ':d.mode==='room'?'Entering ':'Transitioning to ')+d.name);
    if(store){
      store.setState({
        currentLayer: d.mode==='worlds'?'world':d.mode==='agent'?'agent':d.mode||'city',
        currentRoom: d.renderMode==='room'?((d.mode==='room'?key:null)||d.parentKey||null):store.getState().currentRoom,
        selectedAgent: d.mode==='agent'?key:null,
      });
    }
  }
  function enterRoom(fromKey){
    var source=focus[fromKey]||focus[selected]||focus.hq;
    if(source&&source.focus){
      S.targetFocus.copy(source.focus); S.targetRadius=Math.max(8,Math.min(source.radius||18,20)); S.targetPhi=.62; S.last=performance.now();
    }
    beginViewportTransition('enter',reduceMotion?120:520);
    setTimeout(function(){focusTo('hq-room');},reduceMotion?35:240);
  }
  function goUp(){
    var d=focus[selected]||focus.overview, parent=d.parentKey;
    if(d.mode==='agent'){
      leaveAgentFocus();
      parent=d.parentKey||(d.renderMode==='room'?'hq-room':'overview');
    }
    if(!parent && selected!=='worlds') parent='worlds';
    focusTo(parent||'overview');
  }
  function goBack(){
    if((focus[selected]||{}).mode==='agent') leaveAgentFocus();
    var k=navStack.pop();
    suppressHistory=true; focusTo(k||((focus[selected]&&focus[selected].parentKey)||'overview')); suppressHistory=false;
  }
  function openAgent(item){
    comm.classList.add('show');
    var name=item.name||'Agent', role=item.role||'Agent';
    document.getElementById('v4AgentName').textContent=name;
    document.getElementById('v4AgentRole').textContent=role;
    document.getElementById('v4AgentMsg').textContent='Hi, I’m '+name+'. I can report status, accept a task, or explain what is happening here.';
    var agentKey=item.key||('agent-focus-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
    var group=resolveAgentGroup(agentKey,item);
    var pos=item.pos?item.pos.clone():new THREE.Vector3(0,1,0);
    if(group) group.getWorldPosition(pos);
    var podKey=findRoomPodKey(agentKey,name,role)||agentKey;
    var roomPod=isRoomPodAgent(podKey,item,group)||!!findRoomPodKey(agentKey,name,role);
    clearCityAgentFocus();
    var tileKey=group&&group.userData?group.userData.tileKey:null;
    var renderMode, parentKey, podRadius, theta, phi, fov;
    if(roomPod){
      agentKey=podKey;
      if(group&&roomNetwork&&roomNetwork.userData.agentWrappers){
        group=roomNetwork.userData.agentWrappers.get(agentKey)||group;
        if(group) group.getWorldPosition(pos);
        tileKey=group.userData.tileKey||tileKey;
      }
      renderMode='room';
      parentKey=tileKey||'hq-room';
      podRadius=5.2;
      theta=.82;
      phi=.76;
      fov=30;
    }else{
      applyCityAgentFocus(group);
      renderMode='agent';
      parentKey=(mode!=='agent'&&selected&&focus[selected])?selected:'overview';
      podRadius=3.1;
      theta=group?Math.atan2(camera.position.x-group.position.x,camera.position.z-group.position.z):S.theta;
      phi=.78;
      fov=28;
    }
    focus[agentKey]={
      key:agentKey,
      mode:'agent',
      renderMode:renderMode,
      name:name,
      subtitle:role+' · Solo view',
      description:roomPod?'Solo pod on white floor — only this agent’s tile is visible. Use Back or Room to exit.':'Solo view on this agent — not the full city. Use Back or City to exit.',
      health:100,
      agents:1,
      workflows:3,
      transit:100,
      active:1,
      focus:new THREE.Vector3(pos.x,pos.y+.95,pos.z),
      radius:podRadius,
      theta:theta,
      phi:phi,
      fov:fov,
      layer:'Agent',
      parentKey:parentKey,
      agentGroup:group||null,
    };
    beginViewportTransition(roomPod?'enter':'shift',reduceMotion?120:420);
    focusTo(agentKey,true);
    if(roomPod) syncRoomPodFocus(agentKey);
    updatePanel(focus[agentKey]);
    setSelectedHalo(focus[agentKey]);
    if(store){
      store.setState({
        selectedAgent:agentKey,
        currentLayer:'agent',
        currentRoom:roomPod?(tileKey||'hq-room'):store.getState().currentRoom,
      });
    }
    announce('Focused on '+name);
  }
  function setViewMode(view,silent){
    viewMode=view||'3d'; mapMode=viewMode==='map'||viewMode==='satellite';
    wrap.classList.toggle('map-mode',mapMode); wrap.classList.toggle('satellite-mode',viewMode==='satellite');
    canvas.dataset.viewMode=viewMode;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mapMode?1.15:pixelCap()));
    bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mapMode?0.9:(mobileMode?1.0:1.5)));
    renderer.shadowMap.enabled=!mapMode&&!mobileMode; sun.castShadow=!mapMode&&!mobileMode;
    routeDots.forEach(function(p){p.visible=viewMode!=='map'}); drones.forEach(function(d){d.visible=!mapMode}); packets.forEach(function(p){p.visible=!mapMode});
    if(mapMode){S.targetPhi=viewMode==='satellite'?.42:.22; S.targetRadius=Math.max(S.targetRadius,mode==='room'?18:68); S.targetFov=34; S.auto=false; if(orbitState)orbitState.textContent='Map';}
    else {S.targetPhi=mode==='room'?1.08:.88; S.targetFov=mode==='room'?48:42; if(orbitState)orbitState.textContent=S.auto?'Auto + Manual':'Manual';}
    document.querySelectorAll('.segmented button').forEach(function(btn){btn.classList.toggle('active',btn.getAttribute('data-view')===viewMode)});
    updatePanel(focus[selected]||focus.overview);
    if(!silent)announce(viewMode==='map'?'Map View enabled':viewMode==='satellite'?'Satellite View enabled':'3D View enabled');
  }
  var introTimers=[], introRunning=false;
  function setIntroStatus(text,pct){
    if(introText)introText.textContent=text;
    if(introBar)introBar.style.width=Math.max(0,Math.min(100,pct||0))+'%';
  }
  function stopGuidedIntro(){
    introRunning=false; introTimers.forEach(clearTimeout); introTimers=[];
    wrap.classList.remove('guided-intro-running');
    if(guidedIntro)guidedIntro.classList.add('hide');
    if(!mapMode)S.auto=true;
  }
  if(introSkip)introSkip.onclick=stopGuidedIntro;
  function later(ms,fn){var id=setTimeout(function(){if(introRunning)fn();},reduceMotion?Math.min(ms,ms*.25+80):ms); introTimers.push(id); return id;}
  function runGuidedIntro(){
    introRunning=true; introTimers.forEach(clearTimeout); introTimers=[]; navStack=[]; S.auto=false; comm.classList.remove('show');
    wrap.classList.add('guided-intro-running'); if(guidedIntro)guidedIntro.classList.remove('hide');
    setIntroStatus('Loading world atlas…',8); focusTo('worlds',true); beginViewportTransition('shift',360);
    later(1250,function(){setIntroStatus('Approaching Austin city layer…',28); focusTo('overview');});
    later(2850,function(){setIntroStatus('Locking onto Simulatia HQ…',48); focusTo('hq');});
    later(4550,function(){setIntroStatus('Entering building interior…',66); enterRoom('hq');});
    later(6100,function(){setIntroStatus('Revealing isometric room network…',82); focusTo('hq-room');});
    later(7600,function(){
      setIntroStatus('Connecting to command agent…',96);
      var agent=agents.filter(function(a){return a.userData&&a.userData.roomAgent&&a.userData.key==='hq-command';})[0]||agents.filter(function(a){return a.userData&&a.userData.roomAgent;})[0];
      if(agent)openAgent({key:agent.userData.key,name:agent.userData.name,role:agent.userData.role,group:agent,roomOnly:true});
    });
    later(9350,function(){setIntroStatus('Simulation ready for interaction.',100); later(850,stopGuidedIntro);});
  }

  depth.querySelectorAll('button').forEach(function(b){b.onclick=function(){var m=b.getAttribute('data-v4'); if(m==='agent'){if(focus[selected]&&focus[selected].mode==='agent')focusTo(selected); else announce('Click an avatar to enter Agent view'); return;} if(m==='room'){enterRoom(selected);return;} if(m==='building'){focusTo((focus[selected]&&focus[selected].mode==='room')?'hq':(selected==='overview'?'central-hub':selected));return;} focusTo(m==='city'?'overview':m)}});
  document.querySelectorAll('[data-focus]').forEach(function(el){el.addEventListener('click',function(){focusTo(el.getAttribute('data-focus'))})});
  var backBtn=document.getElementById('v11Back'), upBtn=document.getElementById('v11Up');
  if(backBtn)backBtn.onclick=goBack; if(upBtn)upBtn.onclick=goUp;
  var reset=document.getElementById('reset-camera'); if(reset) reset.addEventListener('click',function(){var d=focus[selected]; if(d&&d.mode==='agent')focusTo(selected); else if(mode==='room'||renderScope==='room')focusTo('hq-room'); else focusTo('overview');});
  var fly=document.getElementById('fly-city'); if(fly) fly.addEventListener('click',function(){stopGuidedIntro(); runGuidedIntro();});
  var auto=document.getElementById('auto-toggle'); if(auto) auto.addEventListener('click',function(){S.auto=!S.auto; if(orbitState)orbitState.textContent=S.auto?'Auto + Manual':'Manual'; auto.style.color=S.auto?'var(--primary)':'var(--muted)'});
  document.querySelectorAll('.segmented button').forEach(function(btn){btn.addEventListener('click',function(){setViewMode(btn.getAttribute('data-view'))})});
  var search=document.getElementById('search-field'); if(search) search.addEventListener('input',function(){var q=search.value.trim().toLowerCase(); document.querySelectorAll('[data-focus]').forEach(function(el){var match=!q||el.textContent.toLowerCase().indexOf(q)>-1; el.style.display=match?'':'none'}); Object.keys(labelEls).forEach(function(k){var el=labelEls[k], item=(focus[k]||{}); if(!q||((item.name||k).toLowerCase().indexOf(q)>-1)) el.classList.remove('search-dim'); else el.classList.add('search-dim')})});
  var theme=document.getElementById('theme-toggle'), themeIcon=document.getElementById('theme-icon');
  if(theme) theme.onclick=function(){dark=doc.getAttribute('data-theme')!=='dark'; doc.setAttribute('data-theme',dark?'dark':'light'); if(themeIcon)themeIcon.className='ti '+(dark?'ti-sun':'ti-moon'); applyTheme(dark)};

  function applyTheme(d){dark=!!d;if(d){renderer.setClearColor(0x050505,1);bgRenderer.setClearColor(0x050505,1);scene.fog=new THREE.FogExp2(0x050505,.018);ambient.intensity=.55;sun.intensity=1.38;fill.intensity=.48;rim.intensity=1.35;M.island.color.set(0x173251);M.side.color.set(0x0d1f38);M.grass.color.set(0x28523a);M.road.color.set(0x253449);M.water.color.set(0x1d65ad);M.b1.color.set(0x243550);M.b2.color.set(0x19273d);M.floor.color.set(0x1d293a);M.wall.color.set(0x2e3b52);
    // Dark sky
    scene.children.forEach(function(c){if(c.isMesh&&c.material&&c.material.side===THREE.BackSide)c.material.color.set(0x060c18)});
  }else{renderer.setClearColor(SCENE_WHITE,1);bgRenderer.setClearColor(SCENE_WHITE,1);scene.fog=new THREE.FogExp2(SCENE_WHITE,.0065);ambient.intensity=.88;sun.intensity=1.15;fill.intensity=.26;rim.intensity=.68;fill.color.set(0xfff6f0);rim.color.set(0xffffff);M.island.color.set(0xdce7f4);M.side.color.set(0xb8c8dc);M.grass.color.set(0x8ac77f);M.road.color.set(0x69778a);M.water.color.set(0x78c3f8);M.b1.color.set(0xf1f7ff);M.b2.color.set(0xd5e1ef);M.floor.color.set(0xe7edf6);M.wall.color.set(0xeef4fc);
    scene.children.forEach(function(c){if(c.userData&&c.userData.sky&&c.geometry&&c.geometry.attributes.color) c.geometry.attributes.color.needsUpdate=true; else if(c.isMesh&&c.material&&c.material.side===THREE.BackSide&&c.material.vertexColors)c.geometry.attributes.color.needsUpdate=true});
  }
    if(roomNetwork&&roomNetwork.userData.applyRoomTheme) roomNetwork.userData.applyRoomTheme(d);
    if(renderScope==='room'){var roomBg=dark?0x060606:SCENE_WHITE; renderer.setClearColor(roomBg,1); bgRenderer.setClearColor(roomBg,1); scene.fog=new THREE.FogExp2(roomBg,dark?.0042:.0034);}
  }
  applyTheme(doc.getAttribute('data-theme')==='dark');

  var S={theta:.72,phi:.96,radius:82,targetTheta:.72,targetPhi:.96,targetRadius:82,focus:v(8,4,4),targetFocus:v(8,4,4),look:v(8,4,4),targetFov:42,auto:true,drag:false,pid:null,moved:false,sx:0,sy:0,lx:0,ly:0,last:performance.now()};
  function resize(){
    mobileMode=!!mqMobile.matches;
    var w=wrap.clientWidth||800,h=wrap.clientHeight||500;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    var bw=window.innerWidth||w,bh=window.innerHeight||h;
    bgRenderer.setSize(bw,bh,false);bgCamera.aspect=bw/bh;bgCamera.updateProjectionMatrix();
    doc.classList.toggle('sim-mobile',mobileMode);
  } window.addEventListener('resize',resize); resize();
  var activePointers={}, pinchDistance=null;
  function pointerList(){return Object.keys(activePointers).map(function(k){return activePointers[k]})}
  function dist2(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
  canvas.addEventListener('pointerdown',function(e){canvas.setPointerCapture(e.pointerId);activePointers[e.pointerId]={x:e.clientX,y:e.clientY};S.drag=true;S.pid=e.pointerId;S.moved=false;S.sx=S.lx=e.clientX;S.sy=S.ly=e.clientY;S.last=performance.now();canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',function(e){if(activePointers[e.pointerId])activePointers[e.pointerId]={x:e.clientX,y:e.clientY};var pts=pointerList(); if(pts.length>=2){var nd=dist2(pts[0],pts[1]); if(pinchDistance){S.targetRadius=clamp(S.targetRadius-(nd-pinchDistance)*.045,mode==='agent'?2.4:(mode==='room'?7.6:14),132); S.moved=true;} pinchDistance=nd; S.last=performance.now(); return;} if(!S.drag||S.pid!==e.pointerId)return;var dx=e.clientX-S.lx,dy=e.clientY-S.ly;if(Math.abs(e.clientX-S.sx)+Math.abs(e.clientY-S.sy)>4)S.moved=true;S.targetTheta-=dx*(mapMode?.0048:.0075);S.targetPhi=clamp(S.targetPhi+dy*(mapMode?.0038:.0058),.16,1.42);S.lx=e.clientX;S.ly=e.clientY});
  function end(e){delete activePointers[e.pointerId]; if(pointerList().length<2)pinchDistance=null; if(S.pid!==e.pointerId)return;S.drag=false;canvas.classList.remove('dragging');if(!S.moved)pick(e.clientX,e.clientY);S.pid=null} canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',end);
  canvas.addEventListener('wheel',function(e){e.preventDefault();S.targetRadius=clamp(S.targetRadius+e.deltaY*(mapMode?.05:.035),mode==='agent'?2.4:(mode==='room'?7.6:14),mapMode?155:128);S.last=performance.now();if(mode==='agent'&&S.targetRadius>7.8){var ad=focus[selected];leaveAgentFocus();focusTo(ad&&ad.parentKey?ad.parentKey:'overview');return}if(S.targetRadius>118&&mode!=='worlds')focusTo('worlds')},{passive:false});
  var ray=new THREE.Raycaster(), mouse=new THREE.Vector2();
  function pick(x,y){var r=canvas.getBoundingClientRect(); mouse.x=((x-r.left)/r.width)*2-1; mouse.y=-((y-r.top)/r.height)*2+1; ray.setFromCamera(mouse,camera); var hit=ray.intersectObjects(selectable,false)[0]; if(hit){var o=hit.object;if(o.userData.pickType==='agent')openAgent({key:o.userData.agentKey||o.userData.focusKey,name:o.userData.agentName,role:o.userData.agentRole,group:o.userData.agentGroup||null,roomOnly:!!o.userData.agentRoom}); else if(o.userData.focusKey){var k=o.userData.focusKey; if(mode==='building'&&selected===k&&focus[k]&&focus[k].canEnter)enterRoom(k); else focusTo(k)}}}
  function hoverAt(x,y){if(S.drag)return; var r=canvas.getBoundingClientRect(); mouse.x=((x-r.left)/r.width)*2-1; mouse.y=-((y-r.top)/r.height)*2+1; ray.setFromCamera(mouse,camera); var hit=ray.intersectObjects(selectable,false)[0]; hovered=hit?hit.object:null; canvas.style.cursor=hovered?'pointer':'grab'; if(hoverRing){if(hovered&&hovered.userData&&hovered.userData.focusKey){var wp=new THREE.Vector3(); hovered.getWorldPosition(wp); hoverRing.position.set(wp.x,.17,wp.z); var sx=hovered.userData.pickType==='agent'?.65:(hovered.geometry&&hovered.geometry.boundingSphere?hovered.geometry.boundingSphere.radius:1.2); hoverRing.scale.setScalar(Math.max(.55,Math.min(3.5,sx*.68))); hoverRing.visible=mode!=='agent'} else hoverRing.visible=false}}
  canvas.addEventListener('pointermove',function(e){hoverAt(e.clientX,e.clientY)});
  function project(pos){var p=pos.clone().project(camera);return{x:(p.x+1)*.5*wrap.clientWidth,y:(-p.y+1)*.5*wrap.clientHeight,z:p.z}}
  function updateLabels(){var visLabels=[]; labelData.forEach(function(it){var el=labelEls[it.key];if(!el)return;var show;if(renderScope==='agent'){show=it.type==='agent'&&it.key===selected;}else if(it.roomOnly){show=renderScope==='room';}else if(it.type==='world'){show=mode==='worlds';}else{show=renderScope==='city'&&mode!=='worlds'&&mode!=='agent';} if(mapMode&&renderScope==='city'&&it.type!=='agent')show=true;var p=project(it.pos);var vis=show&&p.z<1&&p.x>24&&p.x<wrap.clientWidth-24&&p.y>30&&p.y<wrap.clientHeight-20&&(mode==='room'||S.radius<94||it.type==='world'); if(vis) visLabels.push({it:it,el:el,p:p}); else {el.style.opacity='0'; el.style.pointerEvents='none';}}); visLabels.sort(function(a,b){return a.p.y-b.p.y}); for(var i=0;i<visLabels.length;i++){for(var j=0;j<i;j++){if(Math.abs(visLabels[i].p.x-visLabels[j].p.x)<116 && Math.abs(visLabels[i].p.y-visLabels[j].p.y)<34){visLabels[i].p.y=visLabels[j].p.y+34;}} var row=visLabels[i]; row.el.style.opacity='1'; row.el.style.pointerEvents='auto'; row.el.style.transform='translate(-50%,-100%) translate3d('+row.p.x.toFixed(1)+'px,'+row.p.y.toFixed(1)+'px,0)';}}
  setViewMode('3d',true);
  if(!skipAutoIntro) runGuidedIntro();

  function getRoomAgents(){
    return agents.filter(function(a){return a.userData&&a.userData.roomAgent;});
  }

  function runBootSequence(handlers){
    var onLog=handlers&&handlers.onLog, onReady=handlers&&handlers.onReady, onProgress=handlers&&handlers.onProgress;
    function log(t,dim){if(onLog)onLog(t,!!dim);}
    function prog(pct,label){if(onProgress)onProgress(pct,label);}
    introRunning=true; introTimers.forEach(clearTimeout); introTimers=[]; navStack=[]; S.auto=false; comm.classList.remove('show');
    wrap.classList.add('guided-intro-running'); if(guidedIntro)guidedIntro.classList.add('hide');
    prog(58,'Generating worlds…'); focusTo('worlds',true); beginViewportTransition('shift',360);
    later(700,function(){prog(64,'Building city…'); focusTo('overview');});
    later(1600,function(){prog(72,'Placing headquarters…'); focusTo('hq');});
    later(2600,function(){prog(82,'Loading rooms…'); enterRoom('hq');});
    later(3600,function(){prog(90,'Spawning agents…'); focusTo('hq-room');});
    later(4400,function(){
      prog(96,'Ready — explore freely');
      introRunning=false;
      wrap.classList.remove('guided-intro-running');
      if(onReady) onReady();
    });
  }

  window.__simulatia={focusTo:focusTo,enterRoom:enterRoom,setViewMode:setViewMode,goBack:goBack,goUp:goUp,openAgent:openAgent};
  var clock=new THREE.Clock(), frame=0, firstFrameFired=false;
  var tabVisible=true; document.addEventListener('visibilitychange',function(){tabVisible=!document.hidden});
  function anim(){requestAnimationFrame(anim);frame++;var dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime, inRoom=renderScope==='room'||mode==='room'||mode==='agent', lowPower=mapMode||mobileMode||inRoom;
    if(!tabVisible){return}
    if(!firstFrameFired&&frame>0){firstFrameFired=true; if(onFirstFrame) onFirstFrame();}
    if(!wrap.classList.contains('is-transitioning')&&(canvas.classList.contains('transitioning')||(cinema&&cinema.classList.contains('show')))){finishViewportTransition()}
    if(S.auto&&!S.drag&&!mapMode&&performance.now()-S.last>1700){S.targetTheta+=mode==='room'?.00055:.00155;S.targetPhi+=((mode==='room'?.76:.88)+Math.sin(t*.18)*.035-S.targetPhi)*.010}
    // Frame-rate independent cinematic easing: smoother focus, zoom and look-at drift.
    var motionBoost=reduceMotion?2.8:1;
    var angleEase=1-Math.exp(-dt*(mode==='room'?6.8:5.4)*motionBoost);
    var zoomEase=1-Math.exp(-dt*(mode==='room'?7.6:5.8)*motionBoost);
    var focusEase=1-Math.exp(-dt*(mode==='room'?5.4:4.5)*motionBoost);
    S.theta+=(S.targetTheta-S.theta)*angleEase;
    S.phi+=(S.targetPhi-S.phi)*angleEase;
    S.radius+=(S.targetRadius-S.radius)*zoomEase;
    S.focus.lerp(S.targetFocus,focusEase);
    S.look.lerp(S.focus,1-Math.exp(-dt*4.2));
    camera.fov+=(S.targetFov-camera.fov)*(1-Math.exp(-dt*4.4)); camera.updateProjectionMatrix();
    var sp=Math.sin(S.phi);
    var targetCam=v(S.focus.x+S.radius*Math.sin(S.theta)*sp,S.focus.y+S.radius*Math.cos(S.phi),S.focus.z+S.radius*Math.cos(S.theta)*sp);
    camera.position.lerp(targetCam,1-Math.exp(-dt*12));
    camera.lookAt(S.look);

    if(!inRoom){
    // Pulses, clouds, rings
    pulses.forEach(function(o,i){
      if(o.userData.isCloud){o.position.x=o.userData.cloudBaseX + Math.sin(t*o.userData.cloudSpeed + o.userData.cloudPhase)*o.userData.cloudDrift; o.position.z=o.userData.cloudBaseZ + Math.cos(t*o.userData.cloudSpeed*.82 + o.userData.cloudPhase)*o.userData.cloudDrift*.45; return}
      if(o.userData.stars&&o.material){o.material.opacity=.33+.18*Math.sin(t*.18);return}
      if(o.scale&&!o.userData.moon)o.scale.setScalar(.94+.06*Math.sin(t*(1.1+i*.02)+(o.userData.phase||0)));
      if(o.material&&'opacity'in o.material)o.material.opacity=.10+.14*((Math.sin(t*1.2+i)+1)*.5);
    });

    // Planet moons orbit + cloud rotation
    universe.children.forEach(function(g,i){
      g.rotation.y+=.0016+i*.0003;
      if(g.userData.clouds) g.userData.clouds.rotation.y-=.0006+i*.0001;
      if(g.userData.moon){
        var m=g.userData.moon, phase=t*m.userData.orbitSpeed+(m.userData.orbitPhase||0);
        m.position.set(Math.cos(phase)*m.userData.orbitR,m.userData.orbitY,Math.sin(phase)*m.userData.orbitR);
      }
    });

    if(!lowPower||frame%2===0)routeDots.forEach(function(p,i){p.userData.t=(p.userData.t+p.userData.speed*dt)%1;p.position.copy(p.userData.curve.getPointAt(p.userData.t));p.position.y+=.12+Math.sin(t*3+i)*.04});
    }

    if(!inRoom&&!mapMode)drones.forEach(function(d,i){var u=d.userData, ph=t*u.speed+u.phase, r=u.spread*(.44+.12*Math.sin(t*.2+i)); d.position.set(u.center.x+Math.cos(ph)*r,3.2+Math.sin(ph*1.7)*1.1,u.center.z+Math.sin(ph*.84)*r); d.rotation.y+=dt*1.8; d.rotation.z=Math.sin(t*2+i)*.07});
    if(!inRoom&&!mapMode)vehicles.forEach(function(car,i){var ud=car.userData; ud.t=(ud.t+ud.speed*dt)%1; var pos=ud.curve.getPointAt(ud.t), next=ud.curve.getPointAt((ud.t+.006)%1); car.position.copy(pos); car.position.y=.19+Math.sin(t*2+i)*.006; car.lookAt(next.x,pos.y,next.z); if(ud.head)ud.head.material.opacity=dark?.92:.48; if(ud.tail)ud.tail.material.opacity=dark?.85:.50});
    if(!inRoom)streetLamps.forEach(function(l,i){var night=dark?1:Math.max(0,Math.sin((simState.time-17)/24*Math.PI*2)); var op=.18+night*.62+Math.sin(t*1.4+i)*.025; l.bulb.material.opacity=op; l.halo.material.opacity=.04+night*.12});
    if(hoverRing&&hoverRing.visible){hoverRing.scale.multiplyScalar(1+.0018*Math.sin(t*4)); hoverRing.material.opacity=.42+.20*((Math.sin(t*5)+1)*.5)}

    // Agents with full walking animation
    if(!mapMode||mode==='room'||frame%3===0)agents.forEach(function(a,i){
      if(a.userData.eyes){var blink=Math.sin((t+a.userData.blinkSeed)*3.7)>0.985; a.userData.eyes.forEach(function(e){e.scale.y+=(blink?.12:1-e.scale.y)*.38})}
      if(a.userData.roomAgent){
        if(assetLoader&&assetLoader.tickRoomAnimations) assetLoader.tickRoomAnimations(roomNetwork||interior,t);
        var model=a.userData.model||a.children&&a.children[0];
        if(model&&!a.userData.leftArmGroup&&!model.userData.fade){
          model.rotation.y=Math.sin(t*.5+a.userData.phase)*.03;
          model.position.y=Math.sin(t*1.1+i)*.008;
        }
        if(a.userData.leftArmGroup){
          a.userData.leftArmGroup.rotation.x=Math.sin(t*.8+i)*.04;
          a.userData.rightArmGroup.rotation.x=-Math.sin(t*.8+i)*.04;
        }
        if(a.userData.headGroup){
          var toCam=camera.position.clone().sub(a.position);
          var yaw=clamp(Math.atan2(toCam.x,toCam.z)-a.rotation.y,-.42,.42);
          var pitch=clamp((camera.position.y-a.position.y-1.5)*.05,-.18,.18);
          a.userData.headGroup.rotation.y+=(yaw-a.userData.headGroup.rotation.y)*.055;
          a.userData.headGroup.rotation.x+=(pitch-a.userData.headGroup.rotation.x)*.045;
        }
        return;
      }
      var tar=a.userData.target;
      var dist=tar?a.position.distanceTo(tar):0;
      if(dist<.55){var h=a.userData.home;tar.set(h.x+(Math.random()-.5)*16,.16,h.z+(Math.random()-.5)*16)}
      if(tar&&dist>.55){
        var dir=tar.clone().sub(a.position).normalize();
        a.position.addScaledVector(dir,(a.userData.speed||.04)*dt*60*.016);
        // Smooth rotation toward movement direction
        var targetRot=Math.atan2(dir.x,dir.z);
        var rotDiff=targetRot-a.rotation.y;
        while(rotDiff>Math.PI) rotDiff-=Math.PI*2;
        while(rotDiff<-Math.PI) rotDiff+=Math.PI*2;
        a.rotation.y+=rotDiff*.12;
        // Walking leg/arm swing
        var wk=t*4.2+(a.userData.phase||0);
        if(a.userData.leftLegGroup){
          a.userData.leftLegGroup.rotation.x=Math.sin(wk)*.36;
          a.userData.rightLegGroup.rotation.x=-Math.sin(wk)*.36;
        }
        if(a.userData.leftArmGroup){
          a.userData.leftArmGroup.rotation.x=-Math.sin(wk)*.22;
          a.userData.rightArmGroup.rotation.x=Math.sin(wk)*.22;
        }
        // Bob
        a.position.y=.16+Math.abs(Math.sin(wk*.5))*.022;
        if(a.userData.headGroup){a.userData.headGroup.rotation.y*=.92; a.userData.headGroup.rotation.x=Math.sin(wk*.5)*.025;}
      } else {
        // Idle - return limbs to rest
        if(a.userData.leftLegGroup){
          a.userData.leftLegGroup.rotation.x*=.88;
          a.userData.rightLegGroup.rotation.x*=.88;
          a.userData.leftArmGroup.rotation.x*=.88;
          a.userData.rightArmGroup.rotation.x*=.88;
        }
      }
    });

    simState.time=(simState.time+dt*.055)%24; simState.flow=Math.round(10+Math.sin(t*.33)*6+vehicles.length*.15); simState.weather=dark?'Night haze':(Math.sin(t*.06)>0?'Clear':'Soft haze');
    if(simTimeEl){var hh=Math.floor(simState.time), mm=Math.floor((simState.time-hh)*60); simTimeEl.textContent=(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm; simFlowEl.textContent=(simState.flow>=0?'+':'')+simState.flow+'%'; simWeatherEl.textContent=simState.weather; simVehicleEl.textContent=String(vehicles.length)}
    M.water.opacity=.80+Math.sin(t*1.5)*.04;
    if(selectedHalo&&selectedHalo.visible){selectedHalo.rotation.z+=dt*(mapMode?.18:.42); selectedHalo.children.forEach(function(ch,i){if(ch.material&&'opacity'in ch.material){ch.material.opacity=i?.055:.38+.12*((Math.sin(t*3)+1)*.5)}})}
    var booting=document.body.classList.contains('sim-booting')&&!document.body.classList.contains('sim-ready');
    var useBgMirror=!booting&&!inRoom&&tabVisible&&(frame%2===0||!lowPower);
    if(useBgMirror){
      bgCamera.position.copy(camera.position);
      bgCamera.quaternion.copy(camera.quaternion);
      bgCamera.fov=clamp(camera.fov+9,46,62);
      bgCamera.updateProjectionMatrix();
      bgRenderer.render(scene,bgCamera);
    }
    renderer.render(scene,camera);
    if(frame%2===0||!lowPower)updateLabels();
  }
  wrap.classList.add('scene-has-preview');
  renderer.render(scene,camera);
  if(onFirstFrame&&!firstFrameFired){firstFrameFired=true; onFirstFrame();}
  anim();

  return {
    focusTo,
    enterRoom,
    setViewMode,
    goBack,
    goUp,
    openAgent,
    stopGuidedIntro,
    runGuidedIntro,
    runBootSequence,
    getRoomAgents,
  };
}
