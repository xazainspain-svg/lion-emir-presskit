(function () {
  var P = window.PHOTOS || {};
  var scrolly = document.getElementById('scrolly');
  var pin = document.getElementById('pin');
  var canvas = document.getElementById('gl');
  var chaps = Array.prototype.slice.call(document.querySelectorAll('.chap'));
  var lionSet = ['lion_estudio', 'lion_exterior', 'lion_espejo'];
  var emirSet = ['emir_estudio', 'emir_gorra'];
  var li = 0, ei = 0;

  var captions = { duo: 'Lion y Emir', lion_estudio: 'Lion · estudio', lion_exterior: 'Lion · exterior', lion_espejo: 'Lion · streetwear', emir_estudio: 'Emir · estudio', emir_gorra: 'Emir · gorra' };
  var gal = document.getElementById('gallery');
  if (gal) Object.keys(captions).forEach(function (k) {
    if (!P[k]) return;
    var f = document.createElement('figure');
    f.innerHTML = '<img alt="' + captions[k] + '" src="' + P[k] + '"><figcaption>' + captions[k] + '</figcaption>';
    gal.appendChild(f);
  });

  function fallback() {
    scrolly.classList.add('nogl'); canvas.style.display = 'none';
    chaps.forEach(function (c) { c.classList.add('on'); });
    var fb = document.getElementById('fallback');
    ['lion_estudio', 'duo', 'emir_estudio'].forEach(function (k) {
      if (P[k]) { var i = document.createElement('img'); i.src = P[k]; i.alt = captions[k]; fb.appendChild(i); }
    });
  }
  if (!window.THREE) return fallback();
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
  catch (e) { return fallback(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070b, 0.035);
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  var world = new THREE.Group(); scene.add(world);

  // --- tarjetas de fotos
  var loader = new THREE.TextureLoader(), cache = {};
  function tex(key, cb) {
    if (cache[key]) return cb(cache[key]);
    loader.load(P[key], function (t) { t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; cache[key] = t; cb(t); });
  }
  function setPhoto(g, key) {
    if (!P[key]) return;
    tex(key, function (t) { var m = g.userData.photo.material; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; });
  }
  function card(color, key) {
    var w = 1.5, h = 2.0, g = new THREE.Group();
    var frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.05), new THREE.MeshBasicMaterial({ color: color }));
    var photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    photo.position.z = 0.03;
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, h + 0.6), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.12, depthWrite: false }));
    glow.position.z = -0.06;
    g.add(glow, frame, photo); g.userData.photo = photo;
    setPhoto(g, key); return g;
  }
  var lion = card(0xc4cad4, lionSet[0]);
  var emir = card(0xe0b252, emirSet[0]);
  var duo = card(0xffffff, 'duo');
  world.add(lion, emir, duo);

  // --- estructura de la canción en bloques (compases reales)
  var SECTIONS = [
    ['Intro', 4, 0x6b6b7a], ['Inicio', 4, 0x6b6b7a], ['Precoro', 4, 0x8a4040], ['Coro', 8, 0xe0b252],
    ['Verso Lion', 8, 0xc4cad4], ['Precoro', 4, 0x8a4040], ['Coro', 8, 0xe0b252], ['Verso Emir', 8, 0xb88a2e],
    ['Precoro', 4, 0x8a4040], ['Coro final', 8, 0xe0b252]
  ];
  var UNIT = 0.14, GAP = 0.05, BASE_Y = -7;
  var total = SECTIONS.reduce(function (a, s) { return a + s[1] * UNIT + GAP; }, -GAP);
  var bars = new THREE.Group(); bars.position.y = BASE_Y; scene.add(bars);
  var barMeshes = [];
  function label(text, color) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 64;
    var x = c.getContext('2d'); x.font = '700 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#' + color.toString(16).padStart(6, '0'); x.fillText(text, 128, 32);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(1.0, 0.25, 1); return s;
  }
  var cursor = -total / 2;
  SECTIONS.forEach(function (s, i) {
    var w = s[1] * UNIT;
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, 0.4), new THREE.MeshBasicMaterial({ color: s[2] }));
    m.position.x = cursor + w / 2; m.scale.y = 0.001; m.position.y = 0;
    bars.add(m); barMeshes.push(m);
    var lb = label(s[0] + ' · ' + s[1], s[2] === 0x6b6b7a ? 0xaaaabc : (s[2] === 0x8a4040 ? 0xd08080 : s[2]));
    lb.position.set(m.position.x, 1.35 + (i % 2) * 0.32, 0.3); lb.userData.base = lb.position.y; lb.material.opacity = 0;
    bars.add(lb); m.userData.label = lb;
    cursor += w + GAP;
  });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.52; bars.add(floor);

  // --- partículas
  var N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c1 = new THREE.Color(0xc4cad4), c2 = new THREE.Color(0xe0b252);
  for (var i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = Math.random() * -11 + 3; pos[i * 3 + 2] = (Math.random() - .5) * 8 - 1;
    var c = Math.random() < .5 ? c1 : c2; col.set([c.r, c.g, c.b], i * 3);
  }
  var pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  var dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(dust);

  // --- cámara por capítulos
  var keys = [], duoScale = 1.3, cardScale = 1;

  // --- túnel de anillos plata y oro + polvo a lo largo del recorrido
  var rings = new THREE.Group(); scene.add(rings);
  for (var k = 0; k < 18; k++) {
    var rad = 2.4 + Math.random() * 1.2;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xe0b252 : 0xc4cad4 }));
    ring.position.set((Math.random() - .5) * 0.8, (Math.random() - .5) * 0.8, -6 - k * 4.5);
    ring.userData.rx = (Math.random() - .5) * 0.9; ring.userData.spin = (k % 2 ? 1 : -1) * (0.002 + Math.random() * 0.004);
    rings.add(ring);
    if (k % 3 === 0) {
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 + Math.random() * 0.2), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xe0b252 : 0xc4cad4, wireframe: true }));
      gem.position.set((Math.random() < .5 ? -1 : 1) * (1.2 + Math.random() * 1.2), (Math.random() - .5) * 2.4, -6 - k * 4.5 + 2);
      gem.userData.gem = true; rings.add(gem);
    }
  }
  var TN = 900, tpos = new Float32Array(TN * 3), tcol = new Float32Array(TN * 3);
  for (var q = 0; q < TN; q++) {
    tpos[q * 3] = (Math.random() - .5) * 12; tpos[q * 3 + 1] = (Math.random() - .5) * 8; tpos[q * 3 + 2] = Math.random() * -88 + 4;
    var cc = Math.random() < .5 ? c1 : c2; tcol.set([cc.r, cc.g, cc.b], q * 3);
  }
  var tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  scene.add(new THREE.Points(tg, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })));
  function layout() {
    var w = window.innerWidth, h = window.innerHeight, a = w / h;
    renderer.setSize(w, h, false); camera.aspect = a; camera.updateProjectionMatrix();
    var narrow = a < 0.8, S = narrow ? 1.5 : 2.2, s = narrow ? 0.8 : 1;
    cardScale = s; duoScale = 1.3 * s;
    lion.position.set(-S, 0, 0); emir.position.set(S, 0, 0); duo.position.set(0, 0, 0.5);
    var z0 = Math.max(5, (S + 1.3) / (0.414 * a));
    var zb = Math.max(6, (total / 2 + 0.6) / (0.414 * a));
    var zc = narrow ? 4.2 : 3.6;
    var ly = narrow ? -0.7 : -0.35;
    keys = [
      { p: new THREE.Vector3(0, 0, z0), l: new THREE.Vector3(0, 0, 0) },
      { p: new THREE.Vector3(-S + 0.5, 0.1, zc), l: new THREE.Vector3(-S, ly, 0) },
      { p: new THREE.Vector3(S - 0.5, 0.1, zc), l: new THREE.Vector3(S, ly, 0) },
      { p: new THREE.Vector3(0, BASE_Y + 0.4, zb), l: new THREE.Vector3(0, BASE_Y - 0.5, 0) },
      { p: new THREE.Vector3(0, 0.3, z0 * 1.2), l: new THREE.Vector3(0, 0, 0) }
    ];
  }
  layout(); window.addEventListener('resize', layout);

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var target = 0, cur = 0, tx = 0, ty = 0, cx = 0, cy = 0, active = -1;
  var cp = 0, cpS = 0;
  function readScroll() {
    var r = scrolly.getBoundingClientRect(), span = r.height - window.innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var heroEnd = y + r.bottom - window.innerHeight;
    var maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    cp = Math.min(1, Math.max(0, (y - heroEnd) / Math.max(1, maxY - heroEnd)));
  }
  window.addEventListener('scroll', readScroll, { passive: true }); window.addEventListener('resize', readScroll); readScroll();
  window.addEventListener('pointermove', function (e) { tx = (e.clientX / window.innerWidth - .5) * 2; ty = (e.clientY / window.innerHeight - .5) * 2; });

  // paneles que entran y salen en perspectiva
  var revealSel = '.phase, .card, .tablewrap, .bars, .gallery figure, .note, .swatches, .themes, section.panel > h1, section.panel > h2, section.panel > p, section.panel > dl';
  var reveals = Array.prototype.slice.call(document.querySelectorAll(revealSel));
  reveals.forEach(function (el) { el.classList.add('r'); });
  function applyReveals() {
    if (still) return;
    var vh = window.innerHeight, vw = window.innerWidth, rects = reveals.map(function (el) { return el.getBoundingClientRect(); });
    reveals.forEach(function (el, n) {
      var r = rects[n];
      if (r.bottom < -80 || r.top > vh + 80) { el.style.opacity = r.top > vh ? '0' : '0'; return; }
      var inP = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.4)));
      var outP = Math.min(1, Math.max(0, (r.bottom - 40) / (vh * 0.25)));
      var e = ease(inP), o = ease(outP), sx = ((r.left + r.width / 2) / vw - .5);
      el.style.opacity = String(Math.min(e, o));
      el.style.transform = 'perspective(1000px) translate3d(0,' + ((1 - e) * 70 - (1 - o) * 30).toFixed(1) + 'px,' + (-(1 - e) * 220 - (1 - o) * 120).toFixed(1) + 'px) rotateX(' + ((1 - e) * 32 - (1 - o) * 18).toFixed(2) + 'deg) rotateY(' + (sx * -8 * (1 - e * o * 0.6)).toFixed(2) + 'deg)';
    });
  }

  function nextLion() { li = (li + 1) % lionSet.length; setPhoto(lion, lionSet[li]); }
  function nextEmir() { ei = (ei + 1) % emirSet.length; setPhoto(emir, emirSet[ei]); }
  document.getElementById('nextLion').addEventListener('click', nextLion);
  document.getElementById('nextEmir').addEventListener('click', nextEmir);

  function ease(t) { return t * t * (3 - 2 * t); }
  var tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3(), t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    cur += (target - cur) * (still ? 1 : 0.08);
    var s = cur * 4, i = Math.min(3, Math.floor(s)), f = ease(s - i);
    tmpP.copy(keys[i].p).lerp(keys[i + 1].p, f); tmpL.copy(keys[i].l).lerp(keys[i + 1].l, f);
    cpS += (cp - cpS) * (still ? 1 : 0.1);
    var tunnel = cpS > 0.0005;
    if (tunnel) {
      var z = keys[4].p.z + (-78 - keys[4].p.z) * cpS;
      tmpP.set(Math.sin(cpS * 14) * 0.7, 0.3 + Math.sin(cpS * 9) * 0.5, z);
      tmpL.set(Math.sin(cpS * 14 + 0.6) * 0.3, 0.2, z - 8);
    }
    if (!still) { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; tmpP.x += cx * 0.25; tmpP.y -= cy * 0.12; }
    camera.position.copy(tmpP); camera.lookAt(tmpL);
    if (tunnel && !still) camera.rotation.z += Math.sin(cpS * 10) * 0.06;
    var fc = 1 - ease(Math.min(1, cpS / 0.04));
    lion.scale.setScalar(Math.max(0.001, cardScale * fc)); emir.scale.setScalar(Math.max(0.001, cardScale * fc));
    bars.visible = !tunnel;
    rings.children.forEach(function (m, n) {
      if (m.userData.gem) { m.rotation.y += 0.01; m.rotation.x += 0.006; return; }
      if (!still) { m.rotation.z += m.userData.spin; m.rotation.x = m.userData.rx + Math.sin(t * .4 + n) * 0.12; m.scale.setScalar(1 + Math.sin(t * 1.2 + n) * 0.03); }
    });
    applyReveals();
    lion.rotation.y = 0.35 + (still ? 0 : Math.sin(t * .6) * 0.05);
    emir.rotation.y = -0.35 + (still ? 0 : Math.sin(t * .6 + 1) * 0.05);
    if (!still) { lion.position.y = Math.sin(t * .9) * 0.08; emir.position.y = Math.sin(t * .9 + 1.5) * 0.08; duo.position.y = Math.sin(t * .7 + 3) * 0.06; dust.rotation.y = t * 0.02; }
    var u = cur * 4, h = ease(Math.min(1, Math.max(0, Math.min(u - 0.4, 2.6 - u) / 0.5)));
    duo.scale.setScalar(Math.max(0.001, duoScale * (1 - h) * (1 - ease(Math.min(1, cpS / 0.04)))));
    var grow =Math.min(1, Math.max(0, (cur - 0.55) / 0.2));
    barMeshes.forEach(function (m, k) {
      var g = ease(Math.min(1, Math.max(0, grow * 1.6 - k * 0.06)));
      m.scale.y = Math.max(0.001, g * (0.5 + SECTIONS[k][1] / 8 * 0.9)); m.position.y = m.scale.y / 2 - 0.5;
      var lb = m.userData.label; lb.material.opacity = g; lb.position.y = m.scale.y - 0.5 + 0.3 + (k % 2) * 0.32;
    });
    var ch = Math.round(cur * 4);
    if (ch !== active) { active = ch; chaps.forEach(function (c, n) { c.classList.toggle('on', n === ch); }); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
