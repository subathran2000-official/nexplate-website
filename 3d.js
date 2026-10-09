/* NEXPLATE 3D — shared scene kit.
   Home (body.x3d): fixed full-screen canvas, camera travels through the order journey on scroll.
   Other pages (<canvas class="hero3d" data-scene="...">): a self-contained 3D hero. */
(() => {
  const WORD = new Image(); WORD.src = "nexplate-logo.png"; const texList = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })();
  if (!window.THREE || !hasGL) { document.documentElement.classList.add('no3d'); return; }

  const C = { ink: 0x17242d, orange: 0xf66b13, paper: 0xf9f8f4, white: 0xffffff, line: 0xdcded8, green: 0x24714b };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- canvas textures ---------- */
  function tex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; t.userData = { cv, ctx, draw };
    t.redraw = (...a) => { t.userData.last = a; draw(ctx, w, h, ...a); t.needsUpdate = true; }; texList.push(t);
    t.redraw(0); return t;
  }
  WORD.onload = () => texList.forEach(t => t.redraw(...(t.userData.last || [0])));
  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  const F = (s, w = 600) => `${w} ${s}px "DM Sans", Arial, sans-serif`;
  const MENU = [['House burger', 18], ['Garden salad', 14], ['Margherita pizza', 19], ['French fries', 7], ['Iced coffee', 5], ['Fresh lemonade', 5]];

  // POS screen: n = number of items added (0–4)
  function drawPOS(ctx, w, h, n = 0) {
    ctx.fillStyle = '#f3f3ef'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, 64); if (WORD.complete && WORD.naturalWidth) ctx.drawImage(WORD, 28, 16, 30 * 7.06, 30); else { ctx.fillStyle = '#17242d'; ctx.font = F(26, 800); ctx.fillText('NEXPLATE', 28, 42); }
    ctx.fillStyle = '#62776a'; ctx.font = F(18); ctx.fillText('● Table 08 · 2 guests', w - 250, 40);
    ctx.fillStyle = '#17242d'; ctx.font = F(30, 700); ctx.fillText('Let’s take an order.', 28, 118);
    const gw = (w - 360 - 28 * 2 - 16 * 2) / 3;
    MENU.forEach((m, i) => {
      const x = 28 + (i % 3) * (gw + 16), y = 145 + Math.floor(i / 3) * 150;
      const hit = i < n; rr(ctx, x, y, gw, 134, 12, '#fff', hit ? '#f66b13' : '#e1e2dc');
      ctx.fillStyle = hit ? '#f66b13' : '#ffe2cf'; ctx.beginPath(); ctx.arc(x + 34, y + 40, 20, 0, 7); ctx.fill();
      ctx.fillStyle = '#17242d'; ctx.font = F(19, 700); ctx.fillText(m[0], x + 16, y + 92);
      ctx.fillStyle = '#758078'; ctx.font = F(16); ctx.fillText(`$${m[1].toFixed(2)} · Add +`, x + 16, y + 118);
    });
    const tx = w - 340; ctx.fillStyle = '#fff'; ctx.fillRect(tx, 64, 340, h - 64);
    ctx.fillStyle = '#17242d'; ctx.font = F(28, 700); ctx.fillText('Table 08', tx + 26, 118);
    let tot = 0;
    for (let i = 0; i < n; i++) { const m = MENU[i]; tot += m[1]; ctx.font = F(18); ctx.fillStyle = '#17242d'; ctx.fillText(`1 × ${m[0]}`, tx + 26, 168 + i * 38); ctx.textAlign = 'right'; ctx.fillText(`$${m[1].toFixed(2)}`, w - 24, 168 + i * 38); ctx.textAlign = 'left'; }
    if (!n) { ctx.fillStyle = '#858d8c'; ctx.font = F(17); ctx.fillText('Choose an item to start.', tx + 26, 168); }
    ctx.strokeStyle = '#bbb'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(tx + 26, h - 130); ctx.lineTo(w - 24, h - 130); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#17242d'; ctx.font = F(22, 700); ctx.fillText('Subtotal', tx + 26, h - 92); ctx.textAlign = 'right'; ctx.fillText(`$${tot.toFixed(2)}`, w - 24, h - 92); ctx.textAlign = 'left';
    rr(ctx, tx + 26, h - 70, 290, 48, 8, n ? '#c2410c' : '#e9a37a'); ctx.fillStyle = '#fff'; ctx.font = F(19, 700); ctx.fillText('Send to kitchen →', tx + 70, h - 39);
  }
  // Kitchen display: s = 0 waiting, 1 new ticket arrived, 2 preparing
  function drawKDS(ctx, w, h, s = 0) {
    ctx.fillStyle = '#17242d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffa263'; ctx.font = F(24, 800); ctx.fillText('KITCHEN', 28, 46); ctx.fillStyle = '#9fb0b7'; ctx.font = F(18); ctx.fillText('3 open tickets', w - 170, 46);
    const cards = [['TABLE 12', 'PREPARING', ['1 × Garden salad', 'Dressing on the side']], ['TABLE 03', 'READY', ['2 × Fries', '1 × Lemonade']]];
    if (s > 0) cards.unshift(['TABLE 08', s > 1 ? 'PREPARING' : 'NEW', ['1 × House burger', '1 × Garden salad', '1 × Margherita pizza', '1 × French fries']]);
    cards.slice(0, 3).forEach((c, i) => {
      const x = 28 + i * ((w - 56) / 3), cw = (w - 56) / 3 - 16; rr(ctx, x, 76, cw, h - 104, 12, '#22333d');
      ctx.fillStyle = c[1] === 'NEW' ? '#f66b13' : c[1] === 'READY' ? '#3fae72' : '#ffa263'; ctx.fillRect(x, 76, cw, 8);
      ctx.font = F(16, 700); ctx.fillText(c[1], x + 20, 120); ctx.fillStyle = '#fff'; ctx.font = F(26, 800); ctx.fillText(c[0], x + 20, 158);
      ctx.font = F(19); ctx.fillStyle = '#d6dee1'; c[2].forEach((l, j) => ctx.fillText(l, x + 20, 205 + j * 34));
    });
  }
  // Payment terminal screen: s 0 amount due, 1 paid
  function drawPay(ctx, w, h, s = 0) {
    ctx.fillStyle = s ? '#e8f5ee' : '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = '#748088'; ctx.font = F(26, 700); ctx.fillText(s ? 'TABLE 08' : 'AMOUNT DUE', w / 2, 80);
    ctx.fillStyle = s ? '#24714b' : '#17242d'; ctx.font = F(s ? 54 : 76, 800); ctx.fillText(s ? '✓ Paid in full' : '$58.00', w / 2, 190);
    ctx.fillStyle = '#748088'; ctx.font = F(24); ctx.fillText(s ? 'Receipt printing…' : 'Tap, insert or swipe', w / 2, 260); ctx.textAlign = 'left';
  }
  function drawReceipt(ctx, w, h) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.textAlign = 'center';
    if (WORD.complete && WORD.naturalWidth) ctx.drawImage(WORD, w / 2 - 150, 38, 300, 42.5); else { ctx.fillStyle = '#f66b13'; ctx.font = F(40, 800); ctx.fillText('NEXPLATE', w / 2, 70); }
    ctx.fillStyle = '#17242d'; ctx.font = F(18, 700); ctx.fillText('A LITTLE LESS CHAOS', w / 2, 108);
    ctx.font = F(38, 700); ctx.fillText('A lot more', w / 2, 170); ctx.fillText('hospitality.', w / 2, 214);
    ctx.textAlign = 'left'; ctx.font = F(22);
    [['Great service', 280], ['Clear orders', 324], ['Happy tables', 368]].forEach(([t, y]) => { ctx.fillStyle = '#17242d'; ctx.fillText(t, 40, y); ctx.fillStyle = '#f66b13'; ctx.fillText('✓', w - 64, y); });
    ctx.strokeStyle = '#ccc'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(30, 240); ctx.lineTo(w - 30, 240); ctx.moveTo(30, 400); ctx.lineTo(w - 30, 400); ctx.stroke(); ctx.setLineDash([]);
    for (let x = 60; x < w - 60; x += 6 + (x * 7 % 5)) { ctx.fillStyle = '#17242d'; ctx.fillRect(x, 430, (x % 3) + 1.5, 50); }
  }
  function drawTicket(ctx, w, h) {
    rr(ctx, 0, 0, w, h, 16, '#22333d'); ctx.fillStyle = '#f66b13'; ctx.fillRect(0, 0, w, 12);
    ctx.font = F(26, 700); ctx.fillText('NEW', 26, 60); ctx.fillStyle = '#fff'; ctx.font = F(40, 800); ctx.fillText('TABLE 08', 26, 112);
    ctx.font = F(26); ctx.fillStyle = '#d6dee1'; ['1 × House burger', '1 × Garden salad', '1 × Pizza'].forEach((l, i) => ctx.fillText(l, 26, 170 + i * 42));
  }

  /* ---------- geometry ---------- */
  function rbox(w, h, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 10 });
    g.translate(0, 0, -d / 2); return g;
  }
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .45, metalness: .05 }, o));
  function device(w, h, texture, bodyColor = C.ink) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(w, h, .14, .18), mat(bodyColor, { roughness: .3, metalness: .2 })); body.castShadow = true; g.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - .22, h - .22), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    screen.position.z = .125; g.add(screen); g.userData.screen = screen; return g;
  }
  function stand(group, y) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.2, 16), mat(0x9aa5aa, { metalness: .6, roughness: .3 })); s.position.set(0, y - .5, -.25); s.rotation.x = .15;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.6, .7, .08, 40), mat(0x9aa5aa, { metalness: .6, roughness: .3 })); b.position.set(0, y - 1.1, -.35);
    group.add(s, b);
  }
  function plate(r = .7) {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .78, .08, 48), mat(C.white, { roughness: .25 })); g.add(p);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .025, 12, 48), mat(C.line)); rim.rotation.x = Math.PI / 2; rim.position.y = .045; g.add(rim);
    return g;
  }
  function table(color = C.white) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .1, 48), mat(color)); top.position.y = 1; g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1, 16), mat(C.ink)); leg.position.y = .5; g.add(leg);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.5, .55, .06, 32), mat(C.ink)); g.add(base);
    for (let i = 0; i < 2; i++) { const pl = plate(.32); pl.position.set(i ? .5 : -.5, 1.07, i ? .2 : -.2); g.add(pl); }
    return g;
  }
  function chip(color, r = .22) { return new THREE.Mesh(new THREE.TorusGeometry(r, r * .38, 20, 48), mat(color, { roughness: .35 })); }

  function baseScene(renderer) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e2d6, .85));
    const key = new THREE.DirectionalLight(0xffffff, .8); key.position.set(4, 8, 6); scene.add(key);
    const warm = new THREE.PointLight(0xffa263, .7, 30); warm.position.set(-6, 2, 4); scene.add(warm);
    renderer.outputEncoding = THREE.sRGBEncoding;
    return scene;
  }
  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2)); r.setClearColor(0, 0); return r;
  }
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const float = (o, t, amp = .08, sp = 1, ph = 0) => { o.position.y = o.userData.y0 + Math.sin(t * sp + ph) * amp; };
  const keepY = o => (o.userData.y0 = o.position.y, o);

  /* ================= HOME: scroll journey ================= */
  function home() {
    const canvas = document.getElementById('scene'); if (!canvas) return;
    const renderer = makeRenderer(canvas), scene = baseScene(renderer);
    const cam = new THREE.PerspectiveCamera(40, 1, .1, 100);
    const mobile = () => innerWidth < 700;

    const posTex = tex(1280, 800, drawPOS), kdsTex = tex(1280, 640, drawKDS), payTex = tex(512, 320, drawPay);
    const pos = device(4.2, 2.65, posTex); stand(pos, -1.1); pos.position.set(0, 0, 0); scene.add(pos);
    const kds = device(4.6, 2.35, kdsTex, 0x0e171d); kds.position.set(8, .6, -3); kds.rotation.y = -.35; scene.add(kds);
    const term = new THREE.Group(); term.position.set(-9, -.6, 1.5); term.rotation.y = .45; scene.add(term);
    const tb = new THREE.Mesh(rbox(1.25, 2.1, .3, .16), mat(C.ink, { roughness: .3, metalness: .2 })); term.add(tb);
    const ts = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .66), new THREE.MeshBasicMaterial({ map: payTex, toneMapped: false })); ts.position.set(0, .5, .19); term.add(ts);
    for (let i = 0; i < 9; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(.24, .14, .05), mat(i === 8 ? C.green : 0x2e3f49)); k.position.set(-.3 + (i % 3) * .3, -.1 - Math.floor(i / 3) * .22, .19); term.add(k); }
    const recTex = tex(512, 520, drawReceipt);
    const receipt = new THREE.Mesh(new THREE.PlaneGeometry(.95, 1), new THREE.MeshStandardMaterial({ map: recTex, side: THREE.DoubleSide, roughness: .9 }));
    receipt.geometry.translate(0, .5, 0); receipt.position.set(0, 1.05, .05); receipt.scale.y = .001; term.add(receipt);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 64, 64), mat(C.orange, { roughness: .55 })); orb.position.set(2.6, .8, -4); scene.add(orb);
    const heroReceipt = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.52), new THREE.MeshStandardMaterial({ map: tex(512, 520, drawReceipt), side: THREE.DoubleSide, roughness: .9 }));
    heroReceipt.position.set(3.5, 1.2, 1); heroReceipt.rotation.z = .16; scene.add(keepY(heroReceipt));

    const ticket = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .95), new THREE.MeshBasicMaterial({ map: tex(400, 340, drawTicket), transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    ticket.visible = false; scene.add(ticket);

    const deco = [];
    [[C.orange, 4.6, -1.8, -1], [C.ink, 3.3, -1.7, 1.6], [C.orange, 5.6, 2.6, -5], [C.white, 4.4, 3.2, -3], [C.ink, -11.5, 1.4, -1], [C.orange, 10, -1.2, -1.5], [C.white, 1.6, 2.3, 1.4]]
      .forEach(([c, x, y, z], i) => { const m = chip(c, .16 + (i % 3) * .06); m.position.set(x, y, z); m.rotation.set(i, i * 2, 0); scene.add(keepY(m)); deco.push(m); });
    const ring = []; // one-connected-system tables
    for (let i = 0; i < 5; i++) { const t = table(i % 2 ? 0xf2e5d8 : C.white); const a = i / 5 * Math.PI * 2; t.position.set(Math.cos(a) * 11 + 1, -3.4, Math.sin(a) * 11 - 3); t.scale.setScalar(1.2); scene.add(t); ring.push(t); }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0xefe9de, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(1, -3.42, -3); scene.add(floor);

    // camera keyframes [position, look-at] per stage; mobile variants pull back
    const K = [
      [[1.6, .4, 9.5], [-1.2, .3, 0]],
      [[-1.1, .1, 5.2], [.3, 0, 0]],
      [[3.5, 1, 4.6], [7.4, .5, -2.6]],
      [[-5.8, .3, 5.6], [-8.9, -.1, 1.4]],
      [[1, 7.5, 15], [1, -1, -3]],
      [[1, 2.2, 12], [1, .2, -1]],
    ];
    const KM = [[[0, 1.2, 12.5], [0, 1.4, 0]], [[0, .9, 6.8], [0, .9, 0]], [[7.2, 1.3, 4.2], [8, 1.3, -3]], [[-8.5, .7, 5], [-9, .7, 1.5]], [[1, 9, 19], [1, -.5, -3]], [[1, 3, 15], [1, 1.6, -1]]];
    const V = (a) => new THREE.Vector3(...a);
    const stages = [...document.querySelectorAll('.stage')];
    const bar = document.querySelector('.progress span');
    let prog = 0, sprog = 0, lastN = -1, lastK = -1, lastP = -1;

    function readScroll() {
      const y = scrollY + innerHeight * .5; let p = 0;
      stages.forEach((s, i) => { const top = s.offsetTop, h = s.offsetHeight; if (y >= top) p = i + clamp((y - top) / h); });
      prog = clamp(p - .5, 0, stages.length - 1);
      const max = document.documentElement.scrollHeight - innerHeight; if (bar) bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    }
    addEventListener('scroll', readScroll, { passive: true });

    function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 700 ? 52 : 40; cam.updateProjectionMatrix(); }
    addEventListener('resize', () => { resize(); readScroll(); }); resize(); readScroll();

    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .25 });
    document.querySelectorAll('.panel').forEach(p => io.observe(p));

    const clock = new THREE.Clock(); const camPos = new THREE.Vector3(), look = new THREE.Vector3(), curLook = new THREE.Vector3(0, 0, 0); let first = true;
    function frame() {
      const t = clock.getElapsedTime();
      sprog += (prog - sprog) * (reduce ? 1 : .07);
      const i = Math.min(Math.floor(sprog), K.length - 2), f = ease(clamp(sprog - i)), keys = mobile() ? KM : K;
      camPos.lerpVectors(V(keys[i][0]), V(keys[i + 1][0]), f); look.lerpVectors(V(keys[i][1]), V(keys[i + 1][1]), f);
      pointer.sx += (pointer.x - pointer.sx) * .05; pointer.sy += (pointer.y - pointer.sy) * .05;
      if (!reduce) { camPos.x += pointer.sx * .45; camPos.y -= pointer.sy * .3; }
      cam.position.copy(camPos); if (first) { curLook.copy(look); first = false; } curLook.lerp(look, .2); cam.lookAt(curLook);

      // stage 1: items added to the order
      const n = Math.round(clamp((sprog - .55) / .4) * 4); if (n !== lastN) { posTex.redraw(n); lastN = n; }
      // stage 2: ticket flies to the kitchen
      const kt = clamp((sprog - 1.35) / .55);
      ticket.visible = kt > 0 && kt < 1;
      if (ticket.visible) { const e = ease(kt); ticket.position.set(lerp(1.2, 7.6, e), lerp(.2, .9, e) + Math.sin(e * Math.PI) * 1.6, lerp(.5, -2.4, e)); ticket.rotation.set(0, lerp(0, -.35, e), Math.sin(e * Math.PI) * .4); ticket.scale.setScalar(lerp(.7, 1, e)); }
      const ks = kt >= 1 ? (sprog > 2.3 ? 2 : 1) : 0; if (ks !== lastK) { kdsTex.redraw(ks); lastK = ks; }
      // stage 3: payment approved, receipt prints
      const pt = clamp((sprog - 2.45) / .45); const ps = pt > .35 ? 1 : 0; if (ps !== lastP) { payTex.redraw(ps); lastP = ps; }
      receipt.scale.y = Math.max(.001, ease(clamp((pt - .35) / .65)) * 1.15);

      if (!reduce) {
        float(heroReceipt, t, .12, .9); heroReceipt.rotation.y = Math.sin(t * .5) * .25;
        orb.scale.setScalar(1 + Math.sin(t * .8) * .03);
        deco.forEach((d, j) => { float(d, t, .18, .7 + j * .1, j); d.rotation.x += .004; d.rotation.y += .006; });
        pos.rotation.y = Math.sin(t * .4) * .04 + pointer.sx * .06; pos.position.y = Math.sin(t * .9) * .05;
        ring.forEach((r, j) => r.rotation.y = t * .1 + j);
      }
      renderer.render(scene, cam); requestAnimationFrame(frame);
    }
    frame(); requestAnimationFrame(() => canvas.classList.add('ready'));
  }

  /* ================= SUB-PAGES: 3D hero per page ================= */
  const BUILD = {
    platform(scene) { // POS tablet + kitchen display + terminal side by side
      const posT = tex(1280, 800, drawPOS), g = device(4.2, 2.65, posT); g.position.set(-.6, .2, 0); g.rotation.y = .25; scene.add(g);
      const k = device(3.2, 1.65, tex(1280, 640, drawKDS), 0x0e171d); k.userData.screen.material.map.redraw(2); k.position.set(2.6, 1.3, -1.8); k.rotation.y = -.35; scene.add(k);
      const o = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 48), mat(C.orange)); o.position.set(2.4, -1.2, -2.5); scene.add(o);
      let n = 0, last = 0;
      return { cam: [0, .4, 8.5], look: [.4, .3, 0], objs: [g, k], tick(t) { if (t - last > 1.1) { last = t; n = (n + 1) % 5; posT.redraw(n); } g.rotation.y = .25 + Math.sin(t * .4) * .06; k.position.y = 1.3 + Math.sin(t) * .08; o.scale.setScalar(1 + Math.sin(t * .8) * .04); } };
    },
    workflow(scene) { // ring of 8 stations, a ticket chip orbits through them
      const g = new THREE.Group(); scene.add(g); const R = 3.2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const m = new THREE.Mesh(rbox(.8, .8, .3, .14), mat(i % 2 ? C.ink : C.white)); m.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); m.lookAt(0, 0, 0); g.add(m);
        const n = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), new THREE.MeshBasicMaterial({ map: tex(128, 128, (c, w, h) => { c.fillStyle = i % 2 ? '#17242d' : '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#f66b13'; c.font = F(64, 800); c.textAlign = 'center'; c.fillText('0' + (i + 1), w / 2, 86); }), toneMapped: false })); n.material.side = THREE.DoubleSide; n.position.copy(m.position).multiplyScalar(.94); n.lookAt(0, 0, 0); g.add(n); const n2 = n.clone(); n2.position.copy(m.position).multiplyScalar(1.06); n2.lookAt(0, 0, 0); n2.rotateY(Math.PI); g.add(n2); }
      const track = new THREE.Mesh(new THREE.TorusGeometry(R, .03, 8, 120), mat(C.orange)); track.rotation.x = Math.PI / 2; g.add(track);
      const runner = new THREE.Mesh(new THREE.SphereGeometry(.22, 32, 32), mat(C.orange, { emissive: C.orange, emissiveIntensity: .4 })); g.add(runner);
      const center = plate(1.1); center.position.y = -.2; g.add(center);
      return { cam: [0, 4.2, 8.2], look: [0, -.3, 0], objs: [g], tick(t) { const a = t * .55; runner.position.set(Math.cos(a) * R, .55 + Math.abs(Math.sin(a * 4)) * .25, Math.sin(a) * R); g.rotation.y = Math.sin(t * .15) * .3; } };
    },
    restaurants(scene) { // small restaurant diorama: tables + chairs, bar + stools, pendant lamps
      const g = new THREE.Group(); scene.add(g);
      const base = new THREE.Mesh(rbox(9.2, 6.4, .5, .45), mat(0xd8c5a8, { roughness: 1 })); base.rotation.x = -Math.PI / 2; base.position.y = -.28; g.add(base);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), mat(0xf6efe3, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, .5); g.add(rug);
      const lamps = [];
      function chair(x, z, face) { const c = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(.36, .06, .36), mat(C.ink)); seat.position.y = .34; const back = new THREE.Mesh(new THREE.BoxGeometry(.36, .36, .05), mat(C.orange)); back.position.set(0, .56, -.17); const legs = new THREE.Mesh(new THREE.BoxGeometry(.28, .32, .28), mat(0x2e3f49)); legs.position.y = .16; c.add(seat, back, legs); c.position.set(x, 0, z); c.rotation.y = face; g.add(c); }
      [[-2.6, .5], [0, 1.4], [2.6, .5]].forEach(([x, z], i) => {
        const t = table(i === 1 ? 0xf2e5d8 : C.white); t.scale.setScalar(.62); t.position.set(x, 0, z); g.add(t);
        [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2 + .4; chair(x + Math.sin(a) * .98, z + Math.cos(a) * .98, a + Math.PI); });
        const lamp = new THREE.Group(); lamp.position.set(x, 3, z);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.4, 6), mat(C.ink)); cord.position.y = .7;
        const shade = new THREE.Mesh(new THREE.ConeGeometry(.42, .34, 32, 1, true), new THREE.MeshStandardMaterial({ color: C.orange, side: THREE.DoubleSide, roughness: .5 })); shade.position.y = -.05;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe3b0 })); bulb.position.y = -.08;
        lamp.add(cord, shade, bulb); g.add(lamp); lamps.push(lamp);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, .95, .7), mat(C.ink)); bar.position.set(0, .475, -2.4); g.add(bar);
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, .08, .85), mat(C.white)); top.position.set(0, .99, -2.4); g.add(top);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(4.3, .06, .04), new THREE.MeshBasicMaterial({ color: C.orange })); glow.position.set(0, .3, -2.03); g.add(glow);
      for (let i = 0; i < 4; i++) { const s = new THREE.Group(); const seat = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .07, 24), mat(C.orange)); seat.position.y = .66; const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .64, 8), mat(0x9aa5aa, { metalness: .6 })); pole.position.y = .32; s.add(seat, pole); s.position.set(-1.35 + i * .9, 0, -1.65); g.add(s); }
      return { cam: [5.2, 5.4, 8.6], look: [0, 1, -.2], objs: [g], tick(t) { g.rotation.y = Math.sin(t * .25) * .45 - .15; lamps.forEach((l, i) => { l.rotation.z = Math.sin(t * .8 + i) * .04; }); } };
    },
    pricing(scene) { // terminal + floating receipt + coins
      const payT = tex(512, 320, drawPay); const term = new THREE.Group(); scene.add(term);
      term.add(new THREE.Mesh(rbox(1.6, 2.7, .35, .2), mat(C.ink, { roughness: .3, metalness: .2 })));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.36, .85), new THREE.MeshBasicMaterial({ map: payT, toneMapped: false })); s.position.set(0, .65, .21); term.add(s);
      term.position.set(-1.2, 0, 0); term.rotation.y = .35;
      const rec = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.93), new THREE.MeshStandardMaterial({ map: tex(512, 520, drawReceipt), side: THREE.DoubleSide, roughness: .9 })); rec.position.set(1.6, .3, .3); rec.rotation.z = -.12; scene.add(keepY(rec));
      const coins = []; for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .07, 40), mat(i % 2 ? C.orange : 0xffa263, { metalness: .4, roughness: .3 })); c.position.set(-3 + i * 1.2, -1.9 + (i % 2) * .4, -1 - i % 3); c.rotation.x = 1.2; scene.add(keepY(c)); coins.push(c); }
      let last = 0, st = 0;
      return { cam: [0, .3, 7.5], look: [0, 0, 0], objs: [term], tick(t) { if (t - last > 1.8) { last = t; st ^= 1; payT.redraw(st); } float(rec, t, .12, .8); rec.rotation.y = Math.sin(t * .5) * .3; term.rotation.y = .35 + Math.sin(t * .4) * .08; coins.forEach((c, i) => { float(c, t, .2, 1 + i * .1, i); c.rotation.z = t * (.5 + i * .1); }); } };
    },
    demo(scene) { // tablet with order building + orbiting chips
      const posT = tex(1280, 800, drawPOS), g = device(3.8, 2.4, posT); g.rotation.y = -.3; g.rotation.x = -.08; scene.add(g);
      const chips = []; [C.orange, C.ink, C.orange, C.white, C.ink].forEach((c, i) => { const m = chip(c, .2 + (i % 2) * .08); scene.add(m); chips.push(m); });
      let n = 0, last = 0;
      return { cam: [0, .2, 6.8], look: [0, 0, 0], objs: [g], tick(t) { if (t - last > 1) { last = t; n = (n + 1) % 5; posT.redraw(n); } g.position.y = Math.sin(t * .9) * .08; chips.forEach((m, i) => { const a = t * .4 + i / chips.length * Math.PI * 2; m.position.set(Math.cos(a) * 2.9, Math.sin(a * 2) * .6, Math.sin(a) * 1.6 - .5); m.rotation.x += .01; m.rotation.y += .013; }); } };
    },
  };

  function hero(canvas) {
    const kind = canvas.dataset.scene; if (!BUILD[kind]) return;
    const renderer = makeRenderer(canvas), scene = baseScene(renderer);
    const cam = new THREE.PerspectiveCamera(40, 1, .1, 100); const s = BUILD[kind](scene);
    const look = new THREE.Vector3(...s.look);
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 600 ? 50 : 40; cam.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(canvas); resize();
    let visible = true; new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
    const clock = new THREE.Clock();
    (function frame() {
      requestAnimationFrame(frame); if (!visible) return;
      const t = reduce ? 0 : clock.getElapsedTime();
      pointer.sx += (pointer.x - pointer.sx) * .05; pointer.sy += (pointer.y - pointer.sy) * .05;
      cam.position.set(s.cam[0] + (reduce ? 0 : pointer.sx * .6), s.cam[1] - (reduce ? 0 : pointer.sy * .35), s.cam[2]); cam.lookAt(look);
      s.tick(t); renderer.render(scene, cam);
    })();
    requestAnimationFrame(() => canvas.classList.add('ready'));
  }

  home();
  document.querySelectorAll('canvas.hero3d').forEach(hero);
})();
