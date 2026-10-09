/* NEXPLATE 3D — shared scene kit.
   Home (body.x3d): fixed full-screen canvas, camera travels through the order journey on scroll.
   Other pages (<canvas class="hero3d" data-scene="...">): a self-contained 3D hero. */
const boot = () => {
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
    rr(ctx, tx + 26, h - 70, 290, 48, 8, n ? '#c2410c' : '#e9a37a'); ctx.fillStyle = '#fff'; ctx.font = F(19, 700); ctx.fillText(n ? 'Send (' + n + ')' : 'Send', tx + 120, h - 39);
  }
  // Kitchen display, matched to the POS kitchen screen: navy "Kitchen Display" bar, Station filter, Live, ticket count;
  // ticket cards headed "Table NN" with age, items, a status chip (New / Preparing) and a Start / Ready action. Ready lines leave the board.
  // s: 0 = one existing ticket, 1 = Table 08 arrives (New), 2 = Table 08 started (Preparing)
  function drawKDS(ctx, w, h, s = 0) {
    ctx.fillStyle = '#f4f1ec'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, w, 64); ctx.fillStyle = '#fff'; ctx.font = F(26, 800); ctx.fillText('Kitchen Display', 28, 42);
    ctx.fillStyle = '#4b5563'; ctx.font = F(20, 800); ctx.fillText('Station', 28, 112); rr(ctx, 112, 88, 200, 40, 8, '#fff', '#cfc7bb'); ctx.fillStyle = '#1f2937'; ctx.font = F(19, 600); ctx.fillText('All stations', 126, 115);
    ctx.fillStyle = '#1f7a46'; ctx.font = F(20, 800); ctx.fillText('● Live', 340, 114);
    const n = s > 0 ? 2 : 1; ctx.fillStyle = '#4b5563'; ctx.font = F(20, 700); ctx.fillText(n + (n === 1 ? ' ticket' : ' tickets'), 440, 114);
    const cards = []; if (s > 0) cards.push({ head: 'Table 08', age: 'Just now', rows: [['1 × House burger'], ['1 × Garden salad'], ['1 × Margherita pizza'], ['1 × French fries']], st: s === 1 ? 'New' : 'Preparing' });
    cards.push({ head: 'Table 12', age: '4 min', rows: [['1 × Garden salad', 'Dressing on the side']], st: 'Preparing' });
    const cw = (w - 28 * 2 - 16) / 2;
    cards.forEach((c, ci) => {
      const x = 28 + ci * (cw + 16), y = 150; const ch = 64 + c.rows.length * 74 + 14;
      rr(ctx, x, y, cw, ch, 14, '#fff', '#e5dfd6'); ctx.fillStyle = '#cfc7bb'; ctx.fillRect(x + 14, y, cw - 28, 6);
      ctx.fillStyle = '#1f2937'; ctx.font = F(28, 800); ctx.fillText(c.head, x + 20, y + 46); ctx.textAlign = 'right'; ctx.fillStyle = '#4b5563'; ctx.font = F(19, 700); ctx.fillText(c.age, x + cw - 20, y + 44); ctx.textAlign = 'left';
      c.rows.forEach((r, i) => {
        const ry = y + 64 + i * 74; ctx.strokeStyle = '#e5dfd6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + cw, ry); ctx.stroke();
        ctx.fillStyle = '#1f2937'; ctx.font = F(21, 700); ctx.fillText(r[0], x + 20, ry + 34);
        if (r[1]) { ctx.fillStyle = '#4b5563'; ctx.font = F(16, 600); ctx.fillText('NOTE', x + 20, ry + 60); ctx.fillStyle = '#1f2937'; ctx.font = F(16, 500); ctx.fillText(r[1], x + 66, ry + 60); }
        const label = c.st.toUpperCase(), bw = ctx.measureText(label).width; ctx.font = F(13, 800); const cwid = ctx.measureText(label).width + 20;
        rr(ctx, x + cw - 20 - 104 - 12 - cwid, ry + 12, cwid, 28, 14, '#e5eef9'); ctx.fillStyle = '#1d4f91'; ctx.fillText(label, x + cw - 20 - 104 - 12 - cwid + 10, ry + 32);
        const act = c.st === 'New' ? 'Start' : 'Ready'; rr(ctx, x + cw - 20 - 104, ry + 8, 104, 52, 12, act === 'Ready' ? '#1f7a46' : '#c9452b'); ctx.fillStyle = '#fff'; ctx.font = F(19, 800); ctx.textAlign = 'center'; ctx.fillText(act, x + cw - 20 - 52, ry + 41); ctx.textAlign = 'left';
      });
    });
  }
  // Bill-closing screen (simplified example). Labels follow the POS pay screen: Remaining, Cash received, Confirm cash payment,
  // Check closed, Paid in full, "The check is paid in full and closed.", Change due, Back to floor.
  // Amounts are a simplified example: the POS pay screen shows no tax line, so tax and tips are not shown.
  // s: 0 = remaining balance, 1 = cash received, 2 = check closed
  function drawBill(ctx, w, h, s = 0) {
    ctx.fillStyle = '#f3f3ef'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, 64);
    if (WORD.complete && WORD.naturalWidth) ctx.drawImage(WORD, 28, 16, 30 * 7.06, 30); else { ctx.fillStyle = '#17242d'; ctx.font = F(26, 800); ctx.fillText('NEXPLATE', 28, 42); }
    ctx.fillStyle = '#62776a'; ctx.font = F(18); ctx.fillText('● Table 08 · 2 guests', w - 250, 40);
    ctx.fillStyle = '#17242d'; ctx.font = F(30, 700); ctx.fillText(s === 2 ? 'Check closed' : 'Payment', 28, 118);
    const cw = w - 340 - 28 * 2; rr(ctx, 28, 140, cw, 400, 12, '#fff', '#e1e2dc');
    [['House burger', 18], ['Garden salad', 14], ['Margherita pizza', 19], ['French fries', 7]].forEach(([nm, p], i) => {
      ctx.fillStyle = '#17242d'; ctx.font = F(22); ctx.fillText('1 × ' + nm, 56, 196 + i * 58); ctx.textAlign = 'right'; ctx.fillText('$' + p.toFixed(2), 28 + cw - 28, 196 + i * 58); ctx.textAlign = 'left';
    });
    ctx.strokeStyle = '#bbb'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(56, 440); ctx.lineTo(28 + cw - 28, 440); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#17242d'; ctx.font = F(26, 700); ctx.fillText('Total', 56, 486); ctx.textAlign = 'right'; ctx.fillText('$58.00', 28 + cw - 28, 486); ctx.textAlign = 'left';
    ctx.fillStyle = '#56636a'; ctx.font = F(17, 500); ctx.fillText('Simplified example: tax and tips not shown.', 56, 522);
    const tx = w - 340; ctx.fillStyle = '#fff'; ctx.fillRect(tx, 64, 340, h - 64);
    const lab = (t, y) => { ctx.font = F(20); ctx.fillStyle = '#56636a'; ctx.fillText(t, tx + 26, y); }, big = (t, y, c = '#17242d') => { ctx.fillStyle = c; ctx.font = F(40, 800); ctx.fillText(t, tx + 26, y); };
    if (s === 0) { lab('Remaining', 128); big('$58.00', 176); ['Cash', 'Gift card'].forEach((t, i) => { rr(ctx, tx + 26, 218 + i * 74, 290, 58, 10, '#fff', '#cfc7bb'); ctx.fillStyle = '#17242d'; ctx.font = F(22, 700); ctx.fillText(t, tx + 46, 255 + i * 74); }); }
    if (s === 1) { lab('Cash received', 128); big('$60.00', 176); lab('Remaining', 236); ctx.fillStyle = '#17242d'; ctx.font = F(30, 700); ctx.fillText('$58.00', tx + 26, 276); rr(ctx, tx + 26, h - 96, 290, 58, 10, '#c2410c'); ctx.fillStyle = '#fff'; ctx.font = F(20, 700); ctx.fillText('Confirm cash payment', tx + 48, h - 59); }
    if (s === 2) { rr(ctx, tx + 26, 100, 290, 60, 10, '#e8f5ee'); ctx.fillStyle = '#24714b'; ctx.font = F(25, 800); ctx.fillText('✓ Paid in full', tx + 52, 139); ctx.fillStyle = '#56636a'; ctx.font = F(18); ctx.fillText('The check is paid in full', tx + 26, 200); ctx.fillText('and closed.', tx + 26, 226); lab('Change due', 290); big('$2.00', 338); rr(ctx, tx + 26, h - 96, 290, 58, 10, '#c2410c'); ctx.fillStyle = '#fff'; ctx.font = F(20, 700); ctx.fillText('Back to floor', tx + 92, h - 59); }
  }
  function drawTicket(ctx, w, h) {
    rr(ctx, 0, 0, w, h, 16, '#fff', '#cfc7bb'); ctx.fillStyle = '#cfc7bb'; ctx.fillRect(16, 0, w - 32, 10);
    ctx.fillStyle = '#1f2937'; ctx.font = F(38, 800); ctx.fillText('Table 08', 26, 78); ctx.fillStyle = '#4b5563'; ctx.font = F(20, 700); ctx.fillText('Just now', 26, 110);
    ctx.font = F(25, 700); ctx.fillStyle = '#1f2937'; ['1 × House burger', '1 × Garden salad', '1 × Margherita pizza'].forEach((l, i) => ctx.fillText(l, 26, 170 + i * 46));
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
  function device(w, h, texture, bodyColor = 0x151c21) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(w, h, .09, .24), mat(bodyColor, { roughness: .28, metalness: .35 })); body.castShadow = true; g.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - .18, h - .18), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    screen.position.z = .096; g.add(screen); g.userData.screen = screen;
    const cam = new THREE.Mesh(new THREE.CircleGeometry(.025, 16), new THREE.MeshBasicMaterial({ color: 0x3a4a54 })); cam.position.set(0, h / 2 - .045, .097); g.add(cam);
    return g;
  }
  // countertop tablet stand: flat base + angled rear support (h = tablet height)
  function stand(group, h) {
    const m = mat(0xb9c1c5, { metalness: .7, roughness: .25 });
    const bottom = -h / 2, baseY = bottom - .72;
    const base = new THREE.Mesh(rbox(1.9, .9, .07, .22), m); base.rotation.x = -Math.PI / 2; base.position.set(0, baseY, -.55); group.add(base);
    const dz = .8, dy = (bottom + .35) - baseY, len = Math.hypot(dz, dy);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.9, len, .07), m); arm.position.set(0, baseY + dy / 2, -.1 - dz / 2); arm.rotation.x = Math.atan(dz / dy); group.add(arm);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.6, .07, .22), m); lip.position.set(0, bottom - .05, .06); group.add(lip);
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
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setClearColor(0, 0); return r;
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
    const mobile = () => innerWidth < 1200; // stacked layout (3D strip above the text) for phones and tablets

    const posTex = tex(1280, 800, drawPOS), kdsTex = tex(1280, 640, drawKDS), billTex = tex(1280, 800, drawBill);
    const pos = device(3.9, 2.5, posTex); stand(pos, 2.5); pos.position.set(0, 0, 0); scene.add(pos);
    const kds = device(4.6, 2.35, kdsTex, 0x0e171d); kds.position.set(8, .6, -3); kds.rotation.y = -.2; scene.add(kds);
    const bill = device(3.9, 2.5, billTex); stand(bill, 2.5); bill.position.set(-9, 0, 1.5); bill.rotation.y = .25; scene.add(bill);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 64, 64), mat(C.orange, { roughness: .55 })); orb.position.set(2.6, .8, -4); scene.add(orb);
    const ticket = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .95), new THREE.MeshBasicMaterial({ map: tex(400, 340, drawTicket), transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    ticket.visible = false; scene.add(ticket);

    const deco = [];
    [[C.orange, 3.7, -1.6, -.4], [C.ink, .6, 2.9, .4], [C.orange, 5.4, 1.9, -2.5], [C.white, 2.2, -2.2, 1.4], [C.ink, -11.5, 1.4, -1], [C.orange, 10, -1.2, -1.5], [C.white, 4.6, 3.1, -1.5]]
      .forEach(([c, x, y, z], i) => { const m = chip(c, .16 + (i % 3) * .06); m.position.set(x, y, z); m.rotation.set(i, i * 2, 0); scene.add(keepY(m)); deco.push(m); });
    // restaurant floor + tables only appear for the zoomed-out "whole restaurant" stage
    const ring = [];
    for (let i = 0; i < 5; i++) { const t = table(i % 2 ? 0xf2e5d8 : C.white); const a = i / 5 * Math.PI * 2; t.position.set(Math.cos(a) * 11 + 1, -3.4, Math.sin(a) * 11 - 3); t.userData.s = 1.2; t.scale.setScalar(.001); t.visible = false; scene.add(t); ring.push(t); }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0xefe9de, roughness: 1, transparent: true, opacity: 0 })); floor.rotation.x = -Math.PI / 2; floor.position.set(1, -3.42, -3); floor.visible = false; scene.add(floor);

    // camera keyframes [position, look-at] per stage. Desktop: the device always sits opposite its text panel and sides alternate (hero + order: device right, kitchen: device left, bill: device right), so the camera never has to carry a device across the text.
    const K = [
      [[-2.1, .5, 8.6], [-2.1, .3, 0]],
      [[-1.54, .1, 6.3], [-1.54, 0, 0]],
      [[8.1, .8, 4.2], [9.64, .6, -3]],
      [[-8.85, .1, 8.3], [-10.6, 0, 1.5]],
      [[1, 7.5, 15], [1, -1, -3]],
      [[1, 2.2, 12], [1, .2, -1]],
    ];
    // Mobile: the canvas is a short strip above the text, so the device is simply centred.
    const KM = [
      [[0, .3, 6.6], [0, .1, 0]],
      [[0, .2, 5.8], [0, 0, 0]],
      [[7.0, .6, 3.4], [8, 1.2, -3]],
      [[-7.1, .1, 7.3], [-9, -.5, 1.5]],
      [[1, 8, 17], [1, -.5, -3]],
      [[1, 3, 14], [1, 1.2, -1]],
    ];
    const V = (a) => new THREE.Vector3(...a);
    const stages = [...document.querySelectorAll('.stage')];
    const bar = document.querySelector('.progress span');
    let prog = 0, sprog = 0, lastN = -1, lastK = -1, lastP = -1;

    function readScroll() {
      const y = scrollY + innerHeight * .5; let p = 0;
      stages.forEach((s, i) => { const top = s.getBoundingClientRect().top + scrollY, h = s.offsetHeight; if (y >= top) p = i + clamp((y - top) / h); }); // true document position (offsetTop is relative to <main>, which starts below the header)
      prog = clamp(p - .5, 0, stages.length - 1);
      const max = document.documentElement.scrollHeight - innerHeight; if (bar) bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    }
    addEventListener('scroll', readScroll, { passive: true });

    function resize() { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = 40; cam.updateProjectionMatrix(); }
    addEventListener('resize', () => { resize(); readScroll(); }); resize(); readScroll();

    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .25 });
    document.querySelectorAll('.panel').forEach(p => io.observe(p));

    const clock = new THREE.Clock(); const camPos = new THREE.Vector3(), look = new THREE.Vector3(), curLook = new THREE.Vector3(0, 0, 0); let first = true;
    function frame() {
      const t = clock.getElapsedTime();
      sprog += (prog - sprog) * (reduce ? 1 : .07);
      const i = Math.min(Math.floor(sprog), K.length - 2), raw = clamp(sprog - i), f = ease(raw), keys = mobile() ? KM : K;
      camPos.lerpVectors(V(keys[i][0]), V(keys[i + 1][0]), f); look.lerpVectors(V(keys[i][1]), V(keys[i + 1][1]), f);
      pointer.sx += (pointer.x - pointer.sx) * .05; pointer.sy += (pointer.y - pointer.sy) * .05;
      if (!reduce) { camPos.x += pointer.sx * .3; camPos.y -= pointer.sy * .2; }
      cam.position.copy(camPos); if (first || reduce) { curLook.copy(look); first = false; } curLook.lerp(look, .2); cam.lookAt(curLook);

      // stage 1: items added to the order
      const n = Math.round(clamp((sprog - .55) / .4) * 4); if (n !== lastN) { posTex.redraw(n); lastN = n; }
      // stage 2: ticket flies to the kitchen display
      const kt = clamp((sprog - 1.35) / .55);
      ticket.visible = kt > 0 && kt < 1;
      if (ticket.visible) { const e = ease(kt); ticket.position.set(lerp(1.2, 7.6, e), lerp(.2, .9, e) + Math.sin(e * Math.PI) * 1.6, lerp(.5, -2.4, e)); ticket.rotation.set(0, lerp(0, -.35, e), Math.sin(e * Math.PI) * .4); ticket.scale.setScalar(lerp(.7, 1, e)); }
      const ks = kt >= 1 ? (sprog > 2.3 ? 2 : 1) : 0; if (ks !== lastK) { kdsTex.redraw(ks); lastK = ks; }
      // stage 3: close the check (amount due -> cash received -> paid in full)
      const bs = sprog < 2.55 ? 0 : sprog < 2.85 ? 1 : 2; if (bs !== lastP) { billTex.redraw(bs); lastP = bs; }
      // stage 4: the floor and tables fade/scale in only when the camera pulls back
      const show = ease(clamp((sprog - 3.1) / .8)); floor.visible = show > .01; floor.material.opacity = show;
      ring.forEach(r => { r.visible = show > .01; r.scale.setScalar(Math.max(.001, r.userData.s * show)); });

      if (!reduce) {
        orb.scale.setScalar(1 + Math.sin(t * .8) * .03);
        deco.forEach((d, j) => { float(d, t, .14, .7 + j * .1, j); d.rotation.x += .004; d.rotation.y += .006; });
        pos.rotation.y = Math.sin(t * .4) * .04 + pointer.sx * .05; pos.position.y = Math.sin(t * .9) * .05;
        ring.forEach((r, j) => r.rotation.y = t * .1 + j);
      }
      renderer.render(scene, cam); requestAnimationFrame(frame);
    }
    frame(); requestAnimationFrame(() => { canvas.classList.add('ready'); document.documentElement.classList.add('scene-ready'); });
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
    pricing(scene) { // bill-closing tablet + floating rings (no card terminal, no receipt printing)
      const billT = tex(1280, 800, drawBill), g = device(3.8, 2.4, billT); g.rotation.y = -.25; g.rotation.x = -.06; scene.add(g);
      const o = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 48), mat(C.orange)); o.position.set(2.7, -1.1, -2.6); scene.add(o);
      const rings = [[C.orange, -2.9, 1.5, .2], [C.ink, 3.1, 1.6, -.6], [C.white, -2.6, -1.5, .8]].map(([c, x, y, z], i) => { const m = chip(c, .22 + i * .04); m.position.set(x, y, z); scene.add(keepY(m)); return m; });
      let last = 0, st = 0;
      return { cam: [0, .2, 7.2], look: [0, 0, 0], objs: [g], tick(t) { if (t - last > 1.6) { last = t; st = (st + 1) % 3; billT.redraw(st); } g.position.y = Math.sin(t * .9) * .08; g.rotation.y = -.25 + Math.sin(t * .4) * .07; o.scale.setScalar(1 + Math.sin(t * .8) * .04); rings.forEach((m, i) => { float(m, t, .16, .9 + i * .15, i); m.rotation.x += .01; m.rotation.y += .013; }); } };
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
};

/* Load three.js on demand: skipped for Save-Data / very slow connections; page content never depends on it. */
(() => {
  const c = navigator.connection || {};
  if (c.saveData || /(^|-)2g$/.test(c.effectiveType || "")) { document.documentElement.classList.add("no3d"); return; }
  const go = () => {
    if (window.THREE) { try { boot(); } catch (e) { document.documentElement.classList.add("no3d"); } return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"; s.integrity = "sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu"; s.crossOrigin = "anonymous";
    s.onload = () => { try { boot(); } catch (e) { document.documentElement.classList.add("no3d"); } }; s.onerror = () => document.documentElement.classList.add("no3d");
    document.head.appendChild(s);
  };
  "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200);
})();
