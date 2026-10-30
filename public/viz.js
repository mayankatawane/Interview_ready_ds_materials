/* ================= shared helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, props = {}, html) {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === "class") e.className = props[k];
    else if (k === "style") e.style.cssText = props[k];
    else e.setAttribute(k, props[k]);
  }
  if (html != null) e.innerHTML = html;
  return e;
}
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
let ACTIVE = [];
function onDraw(f) { ACTIVE.push(f); f(); }
function mkRng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
function gauss(r) { let u = r(); while (u < 1e-12) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function head(box, title, desc) { box.appendChild(el("div", { class: "vt" }, title)); if (desc) box.appendChild(el("p", { class: "vd" }, desc)); }
function addCanvas(parent, h, label) { const c = el("canvas", { role: "img", "aria-label": label || "chart" }); c.style.height = h + "px"; parent.appendChild(c); return c; }
function prep(c) {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth || 300, h = c.clientHeight || 200;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  x.font = '11px "IBM Plex Mono", ui-monospace, monospace'; x.textBaseline = "alphabetic";
  return { x, w, h };
}
function lin(d0, d1, r0, r1) { return v => r0 + (v - d0) / (d1 - d0) * (r1 - r0); }
function ctrlRow(box) { const c = el("div", { class: "ctrl" }); box.appendChild(c); return c; }
function slider(parent, id, label, min, max, step, val, fmt = v => v) {
  const lab = el("label", { for: id });
  lab.appendChild(document.createTextNode(label + " "));
  const inp = el("input", { type: "range", id, min, max, step, value: val });
  const out = el("span", { class: "v" });
  lab.appendChild(inp); lab.appendChild(out); parent.appendChild(lab);
  const upd = () => { out.textContent = fmt(+inp.value); };
  inp.addEventListener("input", upd); upd();
  return inp;
}
function selectBox(parent, id, label, options, val) {
  const lab = el("label", { for: id }); lab.appendChild(document.createTextNode(label + " "));
  const s = el("select", { id });
  options.forEach(([v, t]) => { const o = el("option", { value: v }, t); if (String(v) === String(val)) o.selected = true; s.appendChild(o); });
  lab.appendChild(s); parent.appendChild(lab); return s;
}
function checkbox(parent, id, label, checked) {
  const lab = el("label", { for: id }); const c = el("input", { type: "checkbox", id }); c.checked = !!checked;
  lab.appendChild(c); lab.appendChild(document.createTextNode(" " + label)); parent.appendChild(lab); return c;
}
function button(parent, label, cls = "btn") { const b = el("button", { class: cls, type: "button" }, label); parent.appendChild(b); return b; }
function statsRow(box) { const s = el("div", { class: "stats" }); box.appendChild(s); return s; }
function setStats(row, items) { row.innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join(""); }
function legend(box, items) { const l = el("div", { class: "legend" }, items.map(([c, t]) => `<span><i style="background:var(${c})"></i>${t}</span>`).join("")); box.appendChild(l); return l; }
function note(box, html) { const n = el("p", { class: "note" }, html); box.appendChild(n); return n; }
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function frame(x, w, h, pad) { x.strokeStyle = css("--line"); x.lineWidth = 1; x.beginPath(); x.moveTo(pad.l, pad.t); x.lineTo(pad.l, h - pad.b); x.lineTo(w - pad.r, h - pad.b); x.stroke(); }
function dot(x, px, py, r, fill, stroke) { x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1.5; x.stroke(); } }
function text(x, s, px, py, color, align = "left") { x.fillStyle = color || css("--muted"); x.textAlign = align; x.fillText(s, px, py); x.textAlign = "left"; }
function solve(A, b) { // Gaussian elimination with partial pivoting
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (M[r][r] || 1e-12); }
  return x;
}
function moons(n, noise, seed) {
  const r = mkRng(seed), X = [], y = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2, t = Math.PI * r();
    let a, b;
    if (c === 0) { a = Math.cos(t); b = Math.sin(t); } else { a = 1 - Math.cos(t); b = 0.5 - Math.sin(t); }
    X.push([a + noise * gauss(r), b + noise * gauss(r)]); y.push(c);
  }
  return { X, y };
}
const MOON_TR = moons(200, 0.22, 21), MOON_TE = moons(300, 0.22, 77);
const MOON_DOM = { x0: -1.6, x1: 2.6, y0: -1.15, y1: 1.6 };

/* classification tree (Gini) */
function buildTree(X, y, idx, depth, opt, rnd) {
  const n = idx.length; let c1 = 0; for (const i of idx) c1 += y[i];
  const p = c1 / n, node = { p, n };
  if (depth >= opt.maxDepth || n < 2 * opt.minLeaf || c1 === 0 || c1 === n) return node;
  const d = X[0].length; let feats = [...Array(d).keys()];
  if (opt.maxFeatures && opt.maxFeatures < d) feats = shuffle(feats, rnd).slice(0, opt.maxFeatures);
  const pg = 1 - p * p - (1 - p) * (1 - p);
  let best = null;
  for (const f of feats) {
    const s = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
    let l1 = 0, ln = 0;
    for (let k = 0; k < n - 1; k++) {
      l1 += y[s[k]]; ln++;
      const v = X[s[k]][f], v2 = X[s[k + 1]][f];
      if (v === v2 || ln < opt.minLeaf || n - ln < opt.minLeaf) continue;
      const pl = l1 / ln, pr = (c1 - l1) / (n - ln);
      const g = (ln / n) * (1 - pl * pl - (1 - pl) * (1 - pl)) + ((n - ln) / n) * (1 - pr * pr - (1 - pr) * (1 - pr));
      const gain = pg - g;
      if (!best || gain > best.gain + 1e-12) best = { gain, f, t: (v + v2) / 2 };
    }
  }
  if (!best || best.gain <= 1e-12) return node;
  const L = [], Rr = [];
  for (const i of idx) (X[i][best.f] <= best.t ? L : Rr).push(i);
  node.f = best.f; node.t = best.t;
  node.l = buildTree(X, y, L, depth + 1, opt, rnd); node.r = buildTree(X, y, Rr, depth + 1, opt, rnd);
  return node;
}
function predTree(node, x) { while (node.f !== undefined) node = x[node.f] <= node.t ? node.l : node.r; return node.p; }
function countLeaves(node) { return node.f === undefined ? 1 : countLeaves(node.l) + countLeaves(node.r); }
function accOf(fn, D) { let c = 0; D.X.forEach((x, i) => { if ((fn(x) >= 0.5 ? 1 : 0) === D.y[i]) c++; }); return c / D.X.length; }
function paintField(x, w, h, dom, fn, cell = 6) {
  const c0 = css("--c2"), c1 = css("--c1");
  const sx = lin(0, w, dom.x0, dom.x1), sy = lin(0, h, dom.y1, dom.y0);
  for (let px = 0; px < w; px += cell) for (let py = 0; py < h; py += cell) {
    const p = fn([sx(px + cell / 2), sy(py + cell / 2)]);
    x.globalAlpha = 0.06 + Math.abs(p - 0.5) * 0.36; x.fillStyle = p >= 0.5 ? c1 : c0; x.fillRect(px, py, cell, cell);
  }
  x.globalAlpha = 1;
}
function drawPoints(x, w, h, dom, D, opts = {}) {
  const c0 = css("--c2"), c1 = css("--c1"), sf = css("--surface");
  const sx = lin(dom.x0, dom.x1, 0, w), sy = lin(dom.y0, dom.y1, h, 0);
  D.X.forEach((p, i) => {
    const col = D.y[i] ? c1 : c0;
    if (opts.hollow) dot(x, sx(p[0]), sy(p[1]), 3.2, sf, col); else dot(x, sx(p[0]), sy(p[1]), 3.2, col, sf);
  });
}

const VIZ = {};

/* ================= bias-variance: polynomial ================= */
VIZ["bv-poly"] = box => {
  head(box, "Underfit vs overfit", "15 noisy training points (orange) from a sine curve (dashed). Raise the degree: training error keeps falling, test error falls and then shoots up.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const cA = addCanvas(cols, 240, "Polynomial fit"), cB = addCanvas(cols, 240, "Train and test error by degree");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "bv-deg", "Polynomial degree", 1, 12, 1, 3);
  const st = statsRow(box);
  legend(box, [["--c2", "Training points"], ["--c1", "Model fit"], ["--muted", "True curve / test error"]]);
  const r = mkRng(11), f = x => Math.sin(Math.PI * x);
  const tr = [], te = [];
  for (let i = 0; i < 15; i++) { const x = -1 + 2 * (i + 0.5) / 15 + (r() - 0.5) * 0.08; tr.push([x, f(x) + 0.3 * gauss(r)]); }
  for (let i = 0; i < 200; i++) { const x = -1 + 2 * r(); te.push([x, f(x) + 0.3 * gauss(r)]); }
  const fits = [], err = [];
  for (let d = 1; d <= 12; d++) {
    const A = [], b = [];
    for (let i = 0; i <= d; i++) { A.push(new Array(d + 1).fill(0)); b.push(0); }
    tr.forEach(([x, y]) => { for (let i = 0; i <= d; i++) { b[i] += y * x ** i; for (let j = 0; j <= d; j++) A[i][j] += x ** (i + j); } });
    for (let i = 0; i <= d; i++) A[i][i] += 1e-9;
    const w = solve(A, b); const pf = x => w.reduce((s, c, i) => s + c * x ** i, 0);
    fits[d] = pf;
    const mse = D => D.reduce((s, [x, y]) => s + (pf(x) - y) ** 2, 0) / D.length;
    err[d] = [mse(tr), mse(te)];
  }
  let best = 1; for (let d = 2; d <= 12; d++) if (err[d][1] < err[best][1]) best = d;
  const draw = () => {
    const d = +s.value;
    let { x, w, h } = prep(cA);
    const pad = { l: 8, r: 8, t: 8, b: 8 };
    const sx = lin(-1.05, 1.05, pad.l, w - pad.r), sy = lin(-2.2, 2.2, h - pad.b, pad.t);
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(pad.l, sy(0)); x.lineTo(w - pad.r, sy(0)); x.stroke();
    x.setLineDash([4, 4]); x.strokeStyle = css("--muted"); x.beginPath();
    for (let i = 0; i <= 200; i++) { const xv = -1.05 + 2.1 * i / 200; i ? x.lineTo(sx(xv), sy(f(xv))) : x.moveTo(sx(xv), sy(f(xv))); }
    x.stroke(); x.setLineDash([]);
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    x.strokeStyle = css("--c1"); x.lineWidth = 2.2; x.beginPath();
    for (let i = 0; i <= 300; i++) { const xv = -1.05 + 2.1 * i / 300; const yv = Math.max(-3, Math.min(3, fits[d](xv))); i ? x.lineTo(sx(xv), sy(yv)) : x.moveTo(sx(xv), sy(yv)); }
    x.stroke(); x.restore(); x.lineWidth = 1;
    tr.forEach(([a, b]) => dot(x, sx(a), sy(b), 4, css("--c2"), css("--surface")));
    text(x, "degree " + d, w - 70, 18, css("--ink"));
    ({ x, w, h } = prep(cB));
    const p2 = { l: 38, r: 10, t: 12, b: 26 };
    const ex = lin(1, 12, p2.l, w - p2.r), ey = v => lin(Math.log10(0.02), Math.log10(5), h - p2.b, p2.t)(Math.log10(Math.min(5, Math.max(0.02, v))));
    frame(x, w, h, p2);
    [0.05, 0.1, 0.5, 1, 5].forEach(v => { text(x, String(v), 4, ey(v) + 4); x.strokeStyle = css("--line"); x.globalAlpha = .5; x.beginPath(); x.moveTo(p2.l, ey(v)); x.lineTo(w - p2.r, ey(v)); x.stroke(); x.globalAlpha = 1; });
    for (let k = 1; k <= 12; k += (k < 2 ? 1 : 2)) text(x, String(k), ex(k) - 3, h - 8);
    text(x, "degree →", w - 64, h - 8);
    [[0, "--c1"], [1, "--muted"]].forEach(([j, c]) => {
      x.strokeStyle = css(c); x.lineWidth = 2; x.beginPath();
      for (let k = 1; k <= 12; k++) k === 1 ? x.moveTo(ex(k), ey(err[k][j])) : x.lineTo(ex(k), ey(err[k][j]));
      x.stroke();
    });
    x.lineWidth = 1; x.strokeStyle = css("--bad"); x.beginPath(); x.moveTo(ex(d), p2.t); x.lineTo(ex(d), h - p2.b); x.stroke();
    text(x, "train", ex(12) - 34, ey(err[12][0]) - 6, css("--c1")); text(x, "test", ex(9) - 10, ey(err[9][1]) - 8, css("--muted"));
    text(x, "MSE (log scale)", p2.l + 4, p2.t + 10);
    const verdict = d < best - 1 ? "Underfitting (high bias)" : (err[d][1] > err[best][1] * 1.6 && d > best ? "Overfitting (high variance)" : (d > best + 1 ? "Starting to overfit" : "Good fit"));
    setStats(st, [["Train MSE", err[d][0].toFixed(3)], ["Test MSE", err[d][1].toFixed(3)], ["Best test degree", best], ["Verdict", verdict]]);
  };
  s.addEventListener("input", draw); onDraw(draw);
};

/* ================= regularisation: geometry + paths ================= */
VIZ["reg-path"] = box => {
  head(box, "L1 vs L2: why Lasso zeroes weights", "Left: loss contours (ellipses) first touch the L1 diamond at a corner, where w₁ = 0. They touch the L2 circle at a point where both weights are non-zero. Right: fitted weights for 6 features as λ grows. True weights: 2.5, 0, −1.8, 0, 1.0, 0.4.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const cG = addCanvas(cols, 250, "L1 and L2 constraint geometry"), cP = addCanvas(cols, 250, "Ridge and Lasso coefficients");
  const ctrl = ctrlRow(box);
  const lam = v => Math.pow(10, -3 + 3.5 * v / 100);
  const s = slider(ctrl, "reg-lam", "Regularisation strength λ", 0, 100, 1, 45, v => lam(v).toFixed(3));
  const st = statsRow(box);
  legend(box, [["--c1", "Ridge (L2)"], ["--c2", "Lasso (L1)"], ["--muted", "True weight"]]);
  const r = mkRng(5), n = 80, p = 6, trueW = [2.5, 0, -1.8, 0, 1.0, 0.4];
  const X = [], y = [];
  for (let i = 0; i < n; i++) {
    const z = Array.from({ length: p }, () => gauss(r)); z[1] = 0.8 * z[0] + 0.6 * z[1]; z[3] = 0.7 * z[2] + 0.7 * z[3];
    X.push(z); y.push(z.reduce((s, v, j) => s + v * trueW[j], 0) + gauss(r));
  }
  for (let j = 0; j < p; j++) { let m = 0; X.forEach(r => m += r[j]); m /= n; let sd = 0; X.forEach(r => sd += (r[j] - m) ** 2); sd = Math.sqrt(sd / n); X.forEach(r => r[j] = (r[j] - m) / sd); }
  const ym = y.reduce((a, b) => a + b, 0) / n; for (let i = 0; i < n; i++) y[i] -= ym;
  const XtX = [], Xty = [];
  for (let a = 0; a < p; a++) { XtX.push([]); let s2 = 0; for (let i = 0; i < n; i++) s2 += X[i][a] * y[i]; Xty.push(s2 / n); for (let b = 0; b < p; b++) { let s1 = 0; for (let i = 0; i < n; i++) s1 += X[i][a] * X[i][b]; XtX[a].push(s1 / n); } }
  const ridge = L => solve(XtX.map((row, a) => row.map((v, b) => v + (a === b ? L : 0))), Xty);
  const lasso = L => {
    const w = new Array(p).fill(0);
    for (let it = 0; it < 300; it++) for (let j = 0; j < p; j++) {
      let rho = Xty[j]; for (let k = 0; k < p; k++) if (k !== j) rho -= XtX[j][k] * w[k];
      w[j] = Math.sign(rho) * Math.max(0, Math.abs(rho) - L) / XtX[j][j];
    }
    return w;
  };
  // geometry
  const cx = 1.1, cy = 1.7, fq = (a, b) => (a - cx) ** 2 / 4 + (b - cy) ** 2;
  let l1 = null, l2 = null;
  for (let i = 0; i < 4000; i++) {
    const t = 2 * Math.PI * i / 4000, a = Math.cos(t), b = Math.sin(t);
    const k = 1 / (Math.abs(a) + Math.abs(b)), d1 = [a * k, b * k];
    if (!l1 || fq(...d1) < fq(...l1)) l1 = d1;
    if (!l2 || fq(a, b) < fq(...l2)) l2 = [a, b];
  }
  const drawGeo = () => {
    const { x, w, h } = prep(cG);
    const half = w / 2;
    [[0, "L1 (Lasso)", l1, "diamond"], [half, "L2 (Ridge)", l2, "circle"]].forEach(([ox, label, pt, shape]) => {
      const sx = lin(-1.5, 3.0, ox + 6, ox + half - 6), sy = lin(-1.5, 3.2, h - 18, 14);
      x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(sx(-1.5), sy(0)); x.lineTo(sx(3), sy(0)); x.moveTo(sx(0), sy(-1.5)); x.lineTo(sx(0), sy(3.2)); x.stroke();
      x.fillStyle = css("--accent-soft"); x.strokeStyle = css("--c1"); x.lineWidth = 2; x.beginPath();
      if (shape === "diamond") { x.moveTo(sx(1), sy(0)); x.lineTo(sx(0), sy(1)); x.lineTo(sx(-1), sy(0)); x.lineTo(sx(0), sy(-1)); x.closePath(); }
      else { for (let i = 0; i <= 80; i++) { const t = 2 * Math.PI * i / 80; i ? x.lineTo(sx(Math.cos(t)), sy(Math.sin(t))) : x.moveTo(sx(1), sy(0)); } }
      x.fill(); x.stroke(); x.lineWidth = 1;
      const lev = Math.sqrt(fq(...pt));
      x.save(); x.beginPath(); x.rect(ox, 0, half, h); x.clip();
      [lev, lev * 1.35, lev * 1.7].forEach((L, k) => {
        x.strokeStyle = css("--c2"); x.globalAlpha = k ? 0.45 : 1; x.lineWidth = k ? 1 : 1.8; x.beginPath();
        for (let i = 0; i <= 100; i++) { const t = 2 * Math.PI * i / 100; const a = cx + 2 * L * Math.cos(t), b = cy + L * Math.sin(t); i ? x.lineTo(sx(a), sy(b)) : x.moveTo(sx(a), sy(b)); }
        x.stroke();
      });
      x.restore(); x.globalAlpha = 1; x.lineWidth = 1;
      dot(x, sx(cx), sy(cy), 3, css("--c2"));
      dot(x, sx(pt[0]), sy(pt[1]), 5, css("--bad"), css("--surface"));
      text(x, label, ox + 8, 12, css("--ink"));
      text(x, "w₁=" + pt[0].toFixed(2) + "  w₂=" + pt[1].toFixed(2), ox + 8, h - 4, css("--bad"));
      text(x, "OLS", sx(cx) + 6, sy(cy) - 4, css("--c2"));
    });
  };
  const drawPath = () => {
    const L = lam(+s.value), wr = ridge(L), wl = lasso(L);
    const { x, w, h } = prep(cP);
    const pad = { l: 26, r: 10, t: 10, b: 22 };
    const sx = lin(-3, 3, pad.l, w - pad.r), rowH = (h - pad.t - pad.b) / p;
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(sx(0), pad.t); x.lineTo(sx(0), h - pad.b); x.stroke();
    [-2, -1, 1, 2].forEach(v => text(x, String(v), sx(v) - 4, h - 6));
    for (let j = 0; j < p; j++) {
      const y0 = pad.t + j * rowH;
      text(x, "x" + (j + 1), 2, y0 + rowH / 2 + 4, css("--ink"));
      x.fillStyle = css("--c1"); x.fillRect(Math.min(sx(0), sx(wr[j])), y0 + rowH * 0.15, Math.abs(sx(wr[j]) - sx(0)), rowH * 0.3);
      x.fillStyle = css("--c2"); x.fillRect(Math.min(sx(0), sx(wl[j])), y0 + rowH * 0.52, Math.max(Math.abs(sx(wl[j]) - sx(0)), wl[j] === 0 ? 0 : 1), rowH * 0.3);
      if (wl[j] === 0) text(x, "0", sx(0) + 4, y0 + rowH * 0.8, css("--c2"));
      x.strokeStyle = css("--muted"); x.lineWidth = 2; x.beginPath(); x.moveTo(sx(trueW[j]), y0 + 2); x.lineTo(sx(trueW[j]), y0 + rowH - 2); x.stroke(); x.lineWidth = 1;
    }
    const zr = wr.filter(v => Math.abs(v) < 1e-6).length, zl = wl.filter(v => v === 0).length;
    setStats(st, [["λ", L.toFixed(3)], ["Ridge zero weights", zr + " / 6"], ["Lasso zero weights", zl + " / 6"], ["x1, x2 correlated", "r ≈ 0.8"]]);
  };
  s.addEventListener("input", drawPath);
  onDraw(drawGeo); onDraw(drawPath);
};

/* ================= linear: outlier ================= */
VIZ["lin-outlier"] = box => {
  head(box, "Least squares vs one outlier", "Squared error lets one bad point drag the whole line. The dashed line minimises absolute error (median regression) and barely moves.");
  const c = addCanvas(box, 260, "Regression lines with and without an outlier");
  const ctrl = ctrlRow(box);
  const out = checkbox(ctrl, "lin-out", "Add an outlier", false);
  const res = checkbox(ctrl, "lin-res", "Show residuals", true);
  const st = statsRow(box);
  legend(box, [["--c1", "OLS (squared error)"], ["--c2", "Absolute-error fit"], ["--bad", "Outlier"]]);
  const r = mkRng(3), base = [];
  for (let i = 0; i < 18; i++) { const x = 0.3 + 9.4 * i / 17; base.push([x, 2 + 0.6 * x + 0.7 * gauss(r)]); }
  const fitOLS = D => { const n = D.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; D.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; }); const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return [(sy - b * sx) / n, b]; };
  const fitLAD = D => { let [a, b] = fitOLS(D); for (let it = 0; it < 80; it++) { const W = D.map(([x, y]) => 1 / Math.max(Math.abs(y - a - b * x), 1e-3)); let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0; D.forEach(([x, y], i) => { const w = W[i]; sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y; }); b = (sw * sxy - sx * sy) / (sw * sxx - sx * sx); a = (sy - b * sx) / sw; } return [a, b]; };
  const draw = () => {
    const D = out.checked ? [...base, [9.3, -3]] : base;
    const [a1, b1] = fitOLS(D), [a2, b2] = fitLAD(D);
    const { x, w, h } = prep(c);
    const pad = { l: 30, r: 10, t: 10, b: 22 };
    const sx = lin(0, 10, pad.l, w - pad.r), sy = lin(-4, 10, h - pad.b, pad.t);
    frame(x, w, h, pad);
    [0, 5, 10].forEach(v => text(x, String(v), 6, sy(v) + 4)); [0, 5, 10].forEach(v => text(x, String(v), sx(v) - 3, h - 6));
    if (res.checked) { x.strokeStyle = css("--muted"); x.globalAlpha = .6; D.forEach(([px, py]) => { x.beginPath(); x.moveTo(sx(px), sy(py)); x.lineTo(sx(px), sy(a1 + b1 * px)); x.stroke(); }); x.globalAlpha = 1; }
    x.lineWidth = 2.2; x.strokeStyle = css("--c1"); x.beginPath(); x.moveTo(sx(0), sy(a1)); x.lineTo(sx(10), sy(a1 + b1 * 10)); x.stroke();
    x.setLineDash([6, 4]); x.strokeStyle = css("--c2"); x.beginPath(); x.moveTo(sx(0), sy(a2)); x.lineTo(sx(10), sy(a2 + b2 * 10)); x.stroke(); x.setLineDash([]); x.lineWidth = 1;
    D.forEach(([px, py], i) => dot(x, sx(px), sy(py), 4, i === 18 ? css("--bad") : css("--ink"), css("--surface")));
    const mse = D.reduce((s, [px, py]) => s + (py - a1 - b1 * px) ** 2, 0) / D.length;
    setStats(st, [["OLS slope", b1.toFixed(2)], ["Absolute-error slope", b2.toFixed(2)], ["True slope", "0.60"], ["OLS MSE", mse.toFixed(2)]]);
  };
  out.addEventListener("change", draw); res.addEventListener("change", draw); onDraw(draw);
};

/* ================= logistic: sigmoid ================= */
VIZ["log-sigmoid"] = box => {
  head(box, "Sigmoid, threshold and log loss", "Each dot is a customer: bottom row = class 0, top row = class 1. Move w (steepness) and b (shift) by hand, then press Fit to let maximum likelihood find the best values. Red rings are misclassified.");
  const c = addCanvas(box, 250, "Sigmoid curve over 1D data");
  const ctrl = ctrlRow(box);
  const sw = slider(ctrl, "lg-w", "w", 0, 6, 0.1, 0.6, v => v.toFixed(1));
  const sb = slider(ctrl, "lg-b", "b", -4, 4, 0.1, 1.5, v => v.toFixed(1));
  const st_ = slider(ctrl, "lg-t", "threshold", 0.05, 0.95, 0.01, 0.5, v => v.toFixed(2));
  const fit = button(ctrl, "Fit by gradient descent", "btn solid");
  const st = statsRow(box);
  const r = mkRng(8), D = [];
  for (let i = 0; i < 44; i++) { const cl = i % 2; D.push([cl ? 1.1 + 1.0 * gauss(r) : -1.0 + 1.0 * gauss(r), cl, (r() - 0.5) * 0.06]); }
  const sig = z => 1 / (1 + Math.exp(-z));
  const loss = (w, b) => -D.reduce((s, [x, y]) => { const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(w * x + b))); return s + (y ? Math.log(p) : Math.log(1 - p)); }, 0) / D.length;
  let opt = [0, 0]; { let w = 0, b = 0; for (let i = 0; i < 5000; i++) { let gw = 0, gb = 0; D.forEach(([x, y]) => { const e = sig(w * x + b) - y; gw += e * x; gb += e; }); w -= 0.5 * gw / D.length; b -= 0.5 * gb / D.length; } opt = [w, b]; }
  const draw = () => {
    const w = +sw.value, b = +sb.value, t = +st_.value;
    const { x, w: W, h } = prep(c);
    const pad = { l: 30, r: 10, t: 14, b: 22 };
    const sx = lin(-4, 4, pad.l, W - pad.r), sy = lin(-0.08, 1.08, h - pad.b, pad.t);
    frame(x, W, h, pad);
    [0, 0.5, 1].forEach(v => text(x, String(v), 4, sy(v) + 4)); [-4, -2, 0, 2, 4].forEach(v => text(x, String(v), sx(v) - 4, h - 6));
    x.setLineDash([4, 4]); x.strokeStyle = css("--muted"); x.beginPath(); x.moveTo(pad.l, sy(t)); x.lineTo(W - pad.r, sy(t)); x.stroke(); x.setLineDash([]);
    const logit = Math.log(t / (1 - t)), bx = w > 0.001 ? (logit - b) / w : null;
    if (bx !== null && bx > -4 && bx < 4) { x.strokeStyle = css("--bad"); x.beginPath(); x.moveTo(sx(bx), pad.t); x.lineTo(sx(bx), h - pad.b); x.stroke(); text(x, "boundary", sx(bx) + 4, pad.t + 10, css("--bad")); }
    x.strokeStyle = css("--c1"); x.lineWidth = 2.4; x.beginPath();
    for (let i = 0; i <= 200; i++) { const xv = -4 + 8 * i / 200; i ? x.lineTo(sx(xv), sy(sig(w * xv + b))) : x.moveTo(sx(xv), sy(sig(w * xv + b))); }
    x.stroke(); x.lineWidth = 1;
    let correct = 0;
    D.forEach(([xv, y, j]) => {
      const pred = sig(w * xv + b) >= t ? 1 : 0, ok = pred === y; if (ok) correct++;
      dot(x, sx(xv), sy(y + j), 4, y ? css("--c1") : css("--c2"), ok ? css("--surface") : css("--bad"));
      if (!ok) dot(x, sx(xv), sy(y + j), 7, null, css("--bad"));
    });
    setStats(st, [["Log loss", loss(w, b).toFixed(3)], ["Best possible", loss(...opt).toFixed(3)], ["Accuracy", (correct / D.length).toFixed(2)], ["Odds × per unit x", Math.exp(w).toFixed(2)]]);
  };
  [sw, sb, st_].forEach(s => s.addEventListener("input", draw));
  fit.addEventListener("click", () => {
    const w0 = +sw.value, b0 = +sb.value, N = reduceMotion() ? 1 : 40; let k = 0;
    const step = () => { k++; const f = k / N; sw.value = (w0 + (opt[0] - w0) * f).toFixed(2); sb.value = (b0 + (opt[1] - b0) * f).toFixed(2); sw.dispatchEvent(new Event("input")); sb.dispatchEvent(new Event("input")); if (k < N) requestAnimationFrame(step); };
    step();
  });
  onDraw(draw);
};

/* ================= decision tree 2D ================= */
VIZ["tree-2d"] = box => {
  head(box, "A tree carving up the space", "Two interleaving classes. Each split is a straight horizontal or vertical cut. Increase max depth: training accuracy climbs to 100% while test accuracy peaks and then drops.");
  const c = addCanvas(box, 280, "Decision tree regions");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "tr-depth", "max_depth", 1, 12, 1, 3);
  const showTest = checkbox(ctrl, "tr-test", "Show test points instead", false);
  const st = statsRow(box);
  legend(box, [["--c1", "Class 1"], ["--c2", "Class 0"], ["--ink", "Split lines"]]);
  const idx = MOON_TR.X.map((_, i) => i), trees = [];
  for (let d = 1; d <= 12; d++) trees[d] = buildTree(MOON_TR.X, MOON_TR.y, idx, 0, { maxDepth: d, minLeaf: 1 }, mkRng(1));
  const draw = () => {
    const d = +s.value, T = trees[d];
    const { x, w, h } = prep(c);
    paintField(x, w, h, MOON_DOM, p => predTree(T, p), 5);
    const sx = lin(MOON_DOM.x0, MOON_DOM.x1, 0, w), sy = lin(MOON_DOM.y0, MOON_DOM.y1, h, 0);
    x.strokeStyle = css("--ink"); x.globalAlpha = 0.55;
    (function rec(n, x0, x1, y0, y1) {
      if (n.f === undefined) return;
      x.beginPath();
      if (n.f === 0) { x.moveTo(sx(n.t), sy(y0)); x.lineTo(sx(n.t), sy(y1)); x.stroke(); rec(n.l, x0, n.t, y0, y1); rec(n.r, n.t, x1, y0, y1); }
      else { x.moveTo(sx(x0), sy(n.t)); x.lineTo(sx(x1), sy(n.t)); x.stroke(); rec(n.l, x0, x1, y0, n.t); rec(n.r, x0, x1, n.t, y1); }
    })(T, MOON_DOM.x0, MOON_DOM.x1, MOON_DOM.y0, MOON_DOM.y1);
    x.globalAlpha = 1;
    drawPoints(x, w, h, MOON_DOM, showTest.checked ? MOON_TE : MOON_TR, { hollow: showTest.checked });
    setStats(st, [["Depth", d], ["Leaves", countLeaves(T)], ["Train accuracy", accOf(p => predTree(T, p), MOON_TR).toFixed(3)], ["Test accuracy", accOf(p => predTree(T, p), MOON_TE).toFixed(3)]]);
  };
  s.addEventListener("input", draw); showTest.addEventListener("change", draw); onDraw(draw);
};

/* ================= random forest: OOB ================= */
VIZ["rf-oob"] = box => {
  head(box, "Bootstrap sampling and out-of-bag rows", "10 training rows. Each tree draws 10 rows with replacement. Rows drawn ×0 are out-of-bag (dashed) for that tree, and that tree can be used to score them. Grow many trees and the OOB share settles near (1 − 1/10)¹⁰ = 34.9%; for large n it tends to 36.8%.");
  const chips = el("div", { class: "rowchips" }); box.appendChild(chips);
  const ctrl = ctrlRow(box);
  const one = button(ctrl, "Grow 1 tree", "btn solid"), many = button(ctrl, "Grow 100 trees"), reset = button(ctrl, "Reset");
  const st = statsRow(box);
  const log = el("div", { class: "treelog", "aria-live": "polite" }); box.appendChild(log);
  const r = mkRng(42); let trees = 0, oobTotal = 0, last = null; const oobCount = new Array(10).fill(0); const lines = [];
  const grow = () => {
    const cnt = new Array(10).fill(0); for (let i = 0; i < 10; i++) cnt[Math.floor(r() * 10)]++;
    trees++; const oob = cnt.map((c, i) => c === 0 ? i + 1 : null).filter(Boolean);
    oob.forEach(i => oobCount[i - 1]++); oobTotal += oob.length; last = cnt;
    const bag = []; cnt.forEach((c, i) => { for (let k = 0; k < c; k++) bag.push(i + 1); });
    lines.unshift(`Tree ${trees}: sample {${bag.join(",")}} → OOB {${oob.join(", ") || "none"}}`); if (lines.length > 40) lines.pop();
  };
  const render = () => {
    chips.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      const c = last ? last[i] : null;
      const d = el("div", { class: "rc" + (c === null ? "" : c === 0 ? " oob" : " in") }, `Row ${i + 1}<small>${c === null ? "–" : c === 0 ? "OOB" : "×" + c}</small><small>OOB in ${oobCount[i]} trees</small>`);
      chips.appendChild(d);
    }
    log.textContent = lines.slice(0, 12).join("\n") || "Press Grow 1 tree.";
    log.style.whiteSpace = "pre-wrap";
    setStats(st, [["Trees grown", trees], ["Avg OOB share", trees ? (100 * oobTotal / (trees * 10)).toFixed(1) + "%" : "–"], ["Theory n=10", "34.9%"], ["Theory n→∞", "36.8%"]]);
  };
  one.addEventListener("click", () => { grow(); render(); });
  many.addEventListener("click", () => { for (let i = 0; i < 100; i++) grow(); render(); });
  reset.addEventListener("click", () => { trees = 0; oobTotal = 0; last = null; oobCount.fill(0); lines.length = 0; render(); });
  render();
};

/* ================= random forest: forest vs tree ================= */
VIZ["rf-forest"] = box => {
  head(box, "One tree vs a forest", "Same data as the decision tree page. Each tree is fully grown on a bootstrap sample with 1 random feature per split. One tree has jagged, overfit regions; averaging many smooths them. OOB accuracy tracks test accuracy without using the test set.");
  const c = addCanvas(box, 280, "Random forest probability regions");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "rf-n", "Number of trees", 1, 60, 1, 1);
  const st = statsRow(box);
  const X = MOON_TR.X, y = MOON_TR.y, n = X.length, rnd = mkRng(99), trees = [], inbag = [];
  for (let t = 0; t < 60; t++) {
    const bag = [], mark = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const j = Math.floor(rnd() * n); bag.push(j); mark[j] = 1; }
    trees.push(buildTree(X, y, bag, 0, { maxDepth: 40, minLeaf: 1, maxFeatures: 1 }, rnd)); inbag.push(mark);
  }
  const testPreds = trees.map(T => MOON_TE.X.map(p => predTree(T, p)));
  const trainPreds = trees.map(T => X.map(p => predTree(T, p)));
  let cache = null, cacheKey = "";
  const draw = () => {
    const k = +s.value;
    const { x, w, h } = prep(c);
    const cell = 5, key = w + "x" + h;
    if (cacheKey !== key) { cache = []; cacheKey = key; }
    const sx = lin(0, w, MOON_DOM.x0, MOON_DOM.x1), sy = lin(0, h, MOON_DOM.y1, MOON_DOM.y0);
    const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
    for (let t = 0; t < k; t++) if (!cache[t]) { const a = new Float32Array(nx * ny); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) a[i * ny + j] = predTree(trees[t], [sx(i * cell + cell / 2), sy(j * cell + cell / 2)]); cache[t] = a; }
    const c0 = css("--c2"), c1 = css("--c1");
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { let p = 0; for (let t = 0; t < k; t++) p += cache[t][i * ny + j]; p /= k; x.globalAlpha = 0.06 + Math.abs(p - 0.5) * 0.36; x.fillStyle = p >= 0.5 ? c1 : c0; x.fillRect(i * cell, j * cell, cell, cell); }
    x.globalAlpha = 1;
    drawPoints(x, w, h, MOON_DOM, MOON_TR);
    let tc = 0; MOON_TE.y.forEach((yy, i) => { let p = 0; for (let t = 0; t < k; t++) p += testPreds[t][i]; if (((p / k) >= 0.5 ? 1 : 0) === yy) tc++; });
    let oc = 0, on = 0; y.forEach((yy, i) => { let p = 0, m = 0; for (let t = 0; t < k; t++) if (!inbag[t][i]) { p += trainPreds[t][i]; m++; } if (m) { on++; if (((p / m) >= 0.5 ? 1 : 0) === yy) oc++; } });
    let one = 0; MOON_TE.y.forEach((yy, i) => { if ((testPreds[0][i] >= 0.5 ? 1 : 0) === yy) one++; });
    setStats(st, [["Trees", k], ["Single tree test acc", (one / MOON_TE.y.length).toFixed(3)], ["Forest test acc", (tc / MOON_TE.y.length).toFixed(3)], ["OOB acc", on ? (oc / on).toFixed(3) : "–"], ["Rows with OOB vote", (100 * on / n).toFixed(0) + "%"]]);
  };
  s.addEventListener("input", draw); onDraw(draw);
};

/* ================= gradient boosting 1D ================= */
VIZ["gb-1d"] = box => {
  head(box, "Boosting round by round", "Each round fits a small tree (depth 2) to the current residuals and adds it times the learning rate. Watch the fit improve, the residuals shrink, and with a high learning rate the test error start rising again.");
  const cA = addCanvas(box, 220, "Boosted fit");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const cR = addCanvas(cols, 150, "Residuals"), cE = addCanvas(cols, 150, "Error by round");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "gb-m", "Rounds", 0, 200, 1, 5);
  const lr = selectBox(ctrl, "gb-lr", "learning rate", [[0.05, "0.05"], [0.1, "0.1"], [0.3, "0.3"], [1, "1.0"]], 0.3);
  const st = statsRow(box);
  legend(box, [["--c2", "Training points"], ["--c1", "Current prediction F(x)"], ["--muted", "True function / test error"]]);
  const r = mkRng(17), f = x => Math.sin(x) + 0.3 * x, n = 50, xs = [], ys = [];
  for (let i = 0; i < n; i++) { const x = 10 * (i + r()) / n; xs.push(x); ys.push(f(x) + 0.4 * gauss(r)); }
  const tx = [], ty = []; for (let i = 0; i < 300; i++) { const x = 10 * r(); tx.push(x); ty.push(f(x) + 0.4 * gauss(r)); }
  const grid = Array.from({ length: 201 }, (_, i) => i * 10 / 200);
  const fitTree = (res, depth) => {
    const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    const rec = (ids, d) => {
      const m = ids.reduce((s, i) => s + res[i], 0) / ids.length;
      if (d === 0 || ids.length < 4) return { v: m };
      let best = null, tot = ids.reduce((s, i) => s + res[i], 0), ls = 0;
      for (let k = 0; k < ids.length - 1; k++) {
        ls += res[ids[k]]; const nl = k + 1, nr = ids.length - nl;
        if (nl < 2 || nr < 2) continue;
        const score = ls * ls / nl + (tot - ls) * (tot - ls) / nr;
        if (!best || score > best.s) best = { s: score, k, t: (xs[ids[k]] + xs[ids[k + 1]]) / 2 };
      }
      if (!best) return { v: m };
      return { t: best.t, l: rec(ids.slice(0, best.k + 1), d - 1), r: rec(ids.slice(best.k + 1), d - 1) };
    };
    return rec(order, depth);
  };
  const pt = (T, x) => { while (T.v === undefined) T = x <= T.t ? T.l : T.r; return T.v; };
  let hist = null, curLr = null;
  const compute = () => {
    const eta = +lr.value; if (curLr === eta) return; curLr = eta;
    const base = ys.reduce((a, b) => a + b, 0) / n;
    let F = new Array(n).fill(base), G = grid.map(() => base), TF = tx.map(() => base);
    hist = [{ F: F.slice(), G: G.slice(), tr: 0, te: 0 }];
    const mse = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length;
    hist[0].tr = mse(F, ys); hist[0].te = mse(TF, ty);
    for (let m = 1; m <= 200; m++) {
      const res = ys.map((v, i) => v - F[i]); const T = fitTree(res, 2);
      F = F.map((v, i) => v + eta * pt(T, xs[i])); G = G.map((v, i) => v + eta * pt(T, grid[i])); TF = TF.map((v, i) => v + eta * pt(T, tx[i]));
      hist.push({ F: F.slice(), G: G.slice(), tr: mse(F, ys), te: mse(TF, ty) });
    }
  };
  const draw = () => {
    compute(); const m = +s.value, H = hist[m];
    let { x, w, h } = prep(cA);
    let pad = { l: 28, r: 10, t: 10, b: 20 };
    let sx = lin(0, 10, pad.l, w - pad.r), sy = lin(-1.8, 4.6, h - pad.b, pad.t);
    frame(x, w, h, pad);
    [0, 2, 4].forEach(v => text(x, String(v), 6, sy(v) + 4));
    x.setLineDash([4, 4]); x.strokeStyle = css("--muted"); x.beginPath(); grid.forEach((g, i) => i ? x.lineTo(sx(g), sy(f(g))) : x.moveTo(sx(g), sy(f(g)))); x.stroke(); x.setLineDash([]);
    xs.forEach((v, i) => dot(x, sx(v), sy(ys[i]), 3.5, css("--c2"), css("--surface")));
    x.strokeStyle = css("--c1"); x.lineWidth = 2.2; x.beginPath(); grid.forEach((g, i) => i ? x.lineTo(sx(g), sy(H.G[i])) : x.moveTo(sx(g), sy(H.G[i]))); x.stroke(); x.lineWidth = 1;
    text(x, "round " + m, w - 70, 18, css("--ink"));
    ({ x, w, h } = prep(cR));
    pad = { l: 28, r: 8, t: 16, b: 10 }; sx = lin(0, 10, pad.l, w - pad.r); sy = lin(-2.5, 2.5, h - pad.b, pad.t);
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(pad.l, sy(0)); x.lineTo(w - pad.r, sy(0)); x.stroke();
    x.fillStyle = css("--c2"); xs.forEach((v, i) => { const rr = Math.max(-2.5, Math.min(2.5, ys[i] - H.F[i])); x.fillRect(sx(v) - 1.5, Math.min(sy(0), sy(rr)), 3, Math.abs(sy(rr) - sy(0))); });
    text(x, "residuals y − F(x)", pad.l, 11, css("--ink"));
    ({ x, w, h } = prep(cE));
    pad = { l: 34, r: 8, t: 16, b: 18 }; sx = lin(0, 200, pad.l, w - pad.r);
    const maxE = hist[0].tr * 1.05; sy = lin(0, maxE, h - pad.b, pad.t);
    frame(x, w, h, pad);
    [["tr", "--c1"], ["te", "--muted"]].forEach(([k, col]) => { x.strokeStyle = css(col); x.lineWidth = 1.8; x.beginPath(); hist.forEach((e, i) => { const v = Math.min(maxE, e[k]); i ? x.lineTo(sx(i), sy(v)) : x.moveTo(sx(i), sy(v)); }); x.stroke(); });
    x.lineWidth = 1; x.strokeStyle = css("--bad"); x.beginPath(); x.moveTo(sx(m), pad.t); x.lineTo(sx(m), h - pad.b); x.stroke();
    text(x, "MSE: train vs test", pad.l, 11, css("--ink")); text(x, "200", w - 30, h - 4); text(x, "0", pad.l - 2, h - 4);
    let bestM = 0; hist.forEach((e, i) => { if (e.te < hist[bestM].te) bestM = i; });
    setStats(st, [["Train MSE", H.tr.toFixed(3)], ["Test MSE", H.te.toFixed(3)], ["Best round (test)", bestM], ["Noise floor", "≈ 0.16"]]);
  };
  s.addEventListener("input", draw); lr.addEventListener("change", draw); onDraw(draw);
};

/* ================= xgboost gain calculator ================= */
VIZ["xgb-gain"] = box => {
  head(box, "XGBoost split calculator", "Six rows, one feature (dosage). Every candidate split is scored with the XGBoost gain formula. Change λ, γ and min_child_weight and see which splits survive. Click a bar to see its numbers.");
  const ctrl = ctrlRow(box);
  const mode = selectBox(ctrl, "xg-mode", "Loss", [["reg", "Squared error (regression)"], ["cls", "Log loss (classification)"]], "reg");
  const sl = slider(ctrl, "xg-l", "λ", 0, 10, 0.5, 1, v => v.toFixed(1));
  const sg = slider(ctrl, "xg-g", "γ", 0, 100, 1, 0, v => v.toFixed(0));
  const sm = slider(ctrl, "xg-m", "min_child_weight", 0, 4, 0.25, 1, v => v.toFixed(2));
  const tblWrap = el("div", { class: "tbl" }); box.appendChild(tblWrap);
  const c = addCanvas(box, 170, "Gain for each candidate split");
  const detail = el("div", { class: "worked" }); box.appendChild(detail);
  const dose = [5, 10, 15, 20, 25, 30], resid = [-10, -7, 8, 9, 6, -11], lab = [0, 0, 1, 1, 1, 0];
  let sel = null, bars = [];
  const data = () => mode.value === "reg" ? { g: resid.map(v => -v), h: resid.map(() => 1) } : { g: lab.map(y => 0.5 - y), h: lab.map(() => 0.25) };
  mode.addEventListener("change", () => { const cls = mode.value === "cls"; sg.max = cls ? 1.5 : 100; sg.step = cls ? 0.05 : 1; sg.value = 0; sm.max = cls ? 1.5 : 4; sm.step = cls ? 0.05 : 0.25; sm.value = cls ? 0.25 : 1; sg.dispatchEvent(new Event("input")); sm.dispatchEvent(new Event("input")); sel = null; draw(); });
  const draw = () => {
    const { g, h } = data(), L = +sl.value, gm = +sg.value, mcw = +sm.value, cls = mode.value === "cls";
    tblWrap.innerHTML = `<table><tr><th>Dosage</th>${dose.map(d => `<td class="num">${d}</td>`).join("")}</tr><tr><th>${cls ? "Label y (base p = 0.5)" : "Residual y − ŷ"}</th>${(cls ? lab : resid).map(v => `<td class="num">${v}</td>`).join("")}</tr><tr><th>g (gradient)</th>${g.map(v => `<td class="num">${v}</td>`).join("")}</tr><tr><th>h (hessian)</th>${h.map(v => `<td class="num">${v}</td>`).join("")}</tr></table>`;
    const G = g.reduce((a, b) => a + b, 0), H = h.reduce((a, b) => a + b, 0), simRoot = G * G / (H + L);
    const cand = [];
    for (let k = 1; k < 6; k++) {
      const GL = g.slice(0, k).reduce((a, b) => a + b, 0), HL = h.slice(0, k).reduce((a, b) => a + b, 0), GR = G - GL, HR = H - HL;
      const sL = GL * GL / (HL + L), sR = GR * GR / (HR + L), gain = 0.5 * (sL + sR - simRoot) - gm;
      cand.push({ t: (dose[k - 1] + dose[k]) / 2, GL, HL, GR, HR, sL, sR, gain, ok: HL >= mcw && HR >= mcw });
    }
    let best = -1; cand.forEach((cd, i) => { if (cd.ok && cd.gain > 0 && (best < 0 || cd.gain > cand[best].gain)) best = i; });
    if (sel === null || sel >= cand.length) sel = best >= 0 ? best : 0;
    const { x, w, h: ch } = prep(c);
    const pad = { l: 10, r: 10, t: 14, b: 26 };
    const mx = Math.max(...cand.map(v => Math.abs(v.gain)), 1e-6), bw = (w - pad.l - pad.r) / cand.length;
    const sy = lin(-mx, mx, ch - pad.b, pad.t);
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(pad.l, sy(0)); x.lineTo(w - pad.r, sy(0)); x.stroke();
    bars = [];
    cand.forEach((cd, i) => {
      const x0 = pad.l + i * bw + bw * 0.2, bwid = bw * 0.6;
      x.fillStyle = !cd.ok ? css("--line") : cd.gain <= 0 ? css("--muted") : (i === best ? css("--c1") : css("--c2"));
      x.globalAlpha = i === best ? 1 : 0.75;
      x.fillRect(x0, Math.min(sy(0), sy(cd.gain)), bwid, Math.max(1, Math.abs(sy(cd.gain) - sy(0))));
      x.globalAlpha = 1;
      if (i === sel) { x.strokeStyle = css("--ink"); x.lineWidth = 2; x.strokeRect(x0 - 3, pad.t - 4, bwid + 6, ch - pad.b - pad.t + 8); x.lineWidth = 1; }
      text(x, "< " + cd.t, x0 + bwid / 2, ch - 8, css("--ink"), "center");
      text(x, (cls ? cd.gain.toFixed(3) : cd.gain.toFixed(1)), x0 + bwid / 2, Math.min(sy(cd.gain), sy(0)) - 4, css("--muted"), "center");
      bars.push([x0 - bw * 0.2, x0 + bw * 0.8]);
    });
    const cd = cand[sel], f = v => cls ? v.toFixed(3) : v.toFixed(2);
    const wL = -cd.GL / (cd.HL + L), wR = -cd.GR / (cd.HR + L);
    detail.innerHTML = `<b>Split dosage &lt; ${cd.t}${sel === best ? " · best split" : ""}</b>
      <p>Left: G = ${f(cd.GL)}, H = ${f(cd.HL)} → similarity G²/(H+λ) = ${f(cd.sL)}. Right: G = ${f(cd.GR)}, H = ${f(cd.HR)} → ${f(cd.sR)}. Root: ${f(simRoot)}.</p>
      <p>Gain = ½(${f(cd.sL)} + ${f(cd.sR)} − ${f(simRoot)}) − γ = <strong>${f(cd.gain)}</strong> ${!cd.ok ? '<span class="zero">· blocked: a child has H below min_child_weight</span>' : cd.gain <= 0 ? '<span class="zero">· pruned: gain ≤ 0</span>' : "· kept"}</p>
      <p>Leaf values w = −G/(H+λ): left = ${f(wL)}, right = ${f(wR)}${cls ? " (added to log-odds)" : ""}. Without λ they would be ${f(-cd.GL / (cd.HL || 1e-9))} and ${f(-cd.GR / (cd.HR || 1e-9))}.</p>`;
  };
  c.addEventListener("click", e => { const rect = c.getBoundingClientRect(), px = e.clientX - rect.left; bars.forEach((b, i) => { if (px >= b[0] && px <= b[1]) sel = i; }); draw(); });
  [sl, sg, sm].forEach(s => s.addEventListener("input", draw)); onDraw(draw);
};

/* ================= lightgbm growth ================= */
VIZ["lgbm-growth"] = box => {
  head(box, "Level-wise vs leaf-wise growth", "Press Next split. Level-wise (XGBoost) fills each depth before going deeper. Leaf-wise (LightGBM) always splits whichever leaf reduces the loss most, so with the same number of splits it goes deeper on one side.");
  const wrap = el("div", { class: "svgwrap" }); box.appendChild(wrap);
  const ctrl = ctrlRow(box);
  const nxt = button(ctrl, "Next split", "btn solid"), rst = button(ctrl, "Reset");
  const st = statsRow(box);
  const level = ["", "L", "R", "LL", "LR", "RL"], leaf = ["", "R", "RL", "RLR", "L", "RLRR"];
  let k = 1;
  const panel = (order, ox, title) => {
    const done = order.slice(0, k), W = 340, top = 46, gap = 52;
    const pos = p => { const d = p.length; let idx = 0; for (const ch of p) idx = idx * 2 + (ch === "R" ? 1 : 0); return [ox + 10 + (idx + 0.5) / 2 ** d * (W - 20), top + d * gap]; };
    let s = `<text x="${ox + 10}" y="20" class="t1">${title}</text>`;
    const nodes = new Set([""]); done.forEach(p => { nodes.add(p + "L"); nodes.add(p + "R"); });
    done.forEach(p => { const [x1, y1] = pos(p); ["L", "R"].forEach(c => { const [x2, y2] = pos(p + c); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="e"/>`; }); });
    nodes.forEach(p => { const [x1, y1] = pos(p); const i = done.indexOf(p); if (i >= 0) s += `<circle cx="${x1}" cy="${y1}" r="11" class="n"/><text x="${x1}" y="${y1 + 4}" text-anchor="middle" class="nt">${i + 1}</text>`; else s += `<rect x="${x1 - 7}" y="${y1 - 7}" width="14" height="14" rx="3" class="lf"/>`; });
    const depth = Math.max(...[...nodes].map(p => p.length));
    return [s, depth, nodes.size - done.length];
  };
  const draw = () => {
    const a = panel(level, 0, "Level-wise (XGBoost default)"), b = panel(leaf, 360, "Leaf-wise (LightGBM)");
    wrap.innerHTML = `<svg viewBox="0 0 700 280" role="img" aria-label="Two trees growing"><style>.t1{fill:var(--ink);font:600 13px var(--f-body)}.e{stroke:var(--muted);stroke-width:1.5}.n{fill:var(--c1);stroke:var(--surface);stroke-width:2}.nt{fill:var(--surface);font:600 11px var(--f-mono)}.lf{fill:var(--surface);stroke:var(--c2);stroke-width:2}</style><line x1="350" y1="10" x2="350" y2="270" stroke="var(--line)"/>${a[0]}${b[0]}</svg>`;
    setStats(st, [["Splits", k], ["Level-wise depth", a[1]], ["Leaf-wise depth", b[1]], ["Leaves (each)", a[2]]]);
    nxt.disabled = k >= 6;
  };
  nxt.addEventListener("click", () => { if (k < 6) k++; draw(); });
  rst.addEventListener("click", () => { k = 1; draw(); });
  draw();
};
/* ================= SVM linear 2D ================= */
VIZ["svm-2d"] = box => {
  head(box, "Margin and support vectors", "Linear SVM on two overlapping groups. Ringed points are support vectors (on or inside the margin). Small C = wide, tolerant margin with many support vectors. Large C = narrow margin that tries hard to classify every point.");
  const c = addCanvas(box, 290, "SVM decision boundary and margins");
  const ctrl = ctrlRow(box);
  const Cv = v => Math.pow(10, -2 + 4 * v / 100);
  const s = slider(ctrl, "svm-c", "C", 0, 100, 1, 50, v => Cv(v) < 1 ? Cv(v).toFixed(2) : Cv(v).toFixed(1));
  const out = checkbox(ctrl, "svm-out", "Add an outlier", false);
  const st = statsRow(box);
  legend(box, [["--c1", "Class +1"], ["--c2", "Class −1"], ["--ink", "Boundary"], ["--muted", "Margins"]]);
  const r = mkRng(31), base = [];
  for (let i = 0; i < 60; i++) { const yy = i % 2 ? 1 : -1; base.push([yy * 0.9 + 0.8 * gauss(r), yy * 0.8 + 0.8 * gauss(r), yy]); }
  const train = (D, C) => { // dual coordinate descent, bias via augmented feature
    const n = D.length, a = new Float64Array(n); let w = [0, 0, 0];
    const xs = D.map(([p, q]) => [p, q, 1]);
    for (let ep = 0; ep < 400; ep++) for (let i = 0; i < n; i++) {
      const yi = D[i][2], xi = xs[i], Q = xi[0] ** 2 + xi[1] ** 2 + 1;
      const G = yi * (w[0] * xi[0] + w[1] * xi[1] + w[2]) - 1;
      const na = Math.min(Math.max(a[i] - G / Q, 0), C), d = na - a[i];
      if (d !== 0) { a[i] = na; w = [w[0] + d * yi * xi[0], w[1] + d * yi * xi[1], w[2] + d * yi]; }
    }
    return { w, a };
  };
  const draw = () => {
    const D = out.checked ? [...base, [-1.9, -1.4, 1]] : base, C = Cv(+s.value), { w, a } = train(D, C);
    const { x, w: W, h } = prep(c);
    const dom = { x0: -3.4, x1: 3.4, y0: -3, y1: 3 };
    const sx = lin(dom.x0, dom.x1, 0, W), sy = lin(dom.y0, dom.y1, h, 0), ix = lin(0, W, dom.x0, dom.x1), iy = lin(0, h, dom.y1, dom.y0);
    const fv = (p, q) => w[0] * p + w[1] * q + w[2];
    for (let px = 0; px < W; px += 6) for (let py = 0; py < h; py += 6) { const v = fv(ix(px + 3), iy(py + 3)); x.globalAlpha = 0.08; x.fillStyle = v >= 0 ? css("--c1") : css("--c2"); x.fillRect(px, py, 6, 6); }
    x.globalAlpha = 1;
    const line = (off, col, dash) => {
      x.strokeStyle = css(col); x.setLineDash(dash); x.lineWidth = dash.length ? 1.2 : 2.2; x.beginPath();
      if (Math.abs(w[1]) > 1e-6) { const yv = p => (off - w[2] - w[0] * p) / w[1]; x.moveTo(sx(dom.x0), sy(yv(dom.x0))); x.lineTo(sx(dom.x1), sy(yv(dom.x1))); }
      else { const xv = (off - w[2]) / w[0]; x.moveTo(sx(xv), 0); x.lineTo(sx(xv), h); }
      x.stroke(); x.setLineDash([]); x.lineWidth = 1;
    };
    line(0, "--ink", []); line(1, "--muted", [5, 4]); line(-1, "--muted", [5, 4]);
    let nsv = 0, errs = 0;
    D.forEach(([p, q, yy], i) => {
      const col = yy > 0 ? css("--c1") : css("--c2");
      dot(x, sx(p), sy(q), 4, col, css("--surface"));
      if (a[i] > 1e-6) { nsv++; dot(x, sx(p), sy(q), 7.5, null, css("--ink")); }
      if (yy * fv(p, q) < 0) errs++;
    });
    const nw = Math.hypot(w[0], w[1]);
    setStats(st, [["C", C < 1 ? C.toFixed(2) : C.toFixed(1)], ["Margin width 2/‖w‖", (2 / nw).toFixed(2)], ["Support vectors", nsv + " / " + D.length], ["Training errors", errs]]);
  };
  s.addEventListener("input", draw); out.addEventListener("change", draw); onDraw(draw);
};

/* ================= SVM kernel lift ================= */
VIZ["svm-kernel"] = box => {
  head(box, "The kernel idea in one picture", "In 1D the orange points sit on both sides of the teal ones, so no single threshold separates them. Map each point to (x, x²) and a straight line separates them. A kernel computes these similarities without building the new features.");
  const c = addCanvas(box, 220, "1D points lifted to 2D");
  const ctrl = ctrlRow(box);
  const b = button(ctrl, "Lift to (x, x²)", "btn solid");
  const r = mkRng(4), P = [];
  for (let i = 0; i < 8; i++) P.push([-1 + 2 * (i + r() * 0.6) / 8, 1]);
  for (let i = 0; i < 10; i++) { const s2 = i % 2 ? 1 : -1; P.push([s2 * (1.7 + 1.2 * r()), 0]); }
  let t = 0, target = 0, anim = null;
  const draw = () => {
    const { x, w, h } = prep(c);
    const sx = lin(-3.2, 3.2, 20, w - 20), sy = lin(-0.5, 9.5, h - 18, 10);
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(sx(-3.2), sy(0)); x.lineTo(sx(3.2), sy(0)); x.stroke();
    if (t > 0.99) { x.strokeStyle = css("--ink"); x.lineWidth = 2; x.beginPath(); x.moveTo(sx(-3.2), sy(1.9)); x.lineTo(sx(3.2), sy(1.9)); x.stroke(); x.lineWidth = 1; text(x, "x² = 1.9 separates them", sx(-3.1), sy(1.9) - 6, css("--ink")); text(x, "back in 1D this is two thresholds: |x| = 1.38", sx(-3.1), sy(9), css("--muted")); }
    P.forEach(([px, cl]) => dot(x, sx(px), sy(t * px * px), 5, cl ? css("--c1") : css("--c2"), css("--surface")));
    text(x, t > 0.5 ? "y = x²" : "1D: x only", w - 90, 18, css("--ink"));
  };
  b.addEventListener("click", () => {
    target = target ? 0 : 1; b.textContent = target ? "Back to 1D" : "Lift to (x, x²)";
    cancelAnimationFrame(anim);
    if (reduceMotion()) { t = target; draw(); return; }
    const step = () => { t += (target - t) * 0.12; if (Math.abs(target - t) < 0.01) t = target; draw(); if (t !== target) anim = requestAnimationFrame(step); };
    step();
  });
  onDraw(draw);
};

/* ================= KNN ================= */
VIZ["knn-2d"] = box => {
  head(box, "How k changes the boundary", "Same two-moons data. k = 1 wraps around every point (100% training accuracy, overfit). Very large k blurs everything toward the majority (underfit).");
  const c = addCanvas(box, 280, "KNN decision regions");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "knn-k", "k", 1, 99, 2, 1);
  const wt = checkbox(ctrl, "knn-w", "Weight votes by 1/distance", false);
  const st = statsRow(box);
  const X = MOON_TR.X, y = MOON_TR.y;
  const predict = (p, k, weighted, skipSelf) => {
    const d = X.map((q, i) => [(q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2, i]);
    d.sort((a, b) => a[0] - b[0]);
    let num = 0, den = 0;
    for (let j = 0; j < k; j++) { const [dd, i] = d[j]; const ww = weighted ? 1 / (Math.sqrt(dd) + 1e-6) : 1; num += ww * y[i]; den += ww; }
    return num / den;
  };
  const draw = () => {
    const k = +s.value, wg = wt.checked;
    const { x, w, h } = prep(c);
    paintField(x, w, h, MOON_DOM, p => predict(p, k, wg), 7);
    drawPoints(x, w, h, MOON_DOM, MOON_TR);
    setStats(st, [["k", k], ["Train accuracy", accOf(p => predict(p, k, wg), MOON_TR).toFixed(3)], ["Test accuracy", accOf(p => predict(p, k, wg), MOON_TE).toFixed(3)]]);
  };
  s.addEventListener("input", draw); wt.addEventListener("change", draw); onDraw(draw);
};

/* ================= Naive Bayes calculator ================= */
VIZ["nb-calc"] = box => {
  head(box, "Spam filter calculator (Bernoulli Naive Bayes)", "Training set: 40 spam and 60 normal emails. Tick the words in a new email. Every word contributes P(present) or P(absent) for each class. Turn smoothing off and tick “lottery” to see the zero-frequency problem.");
  const ctrl = ctrlRow(box);
  const sm = checkbox(ctrl, "nb-s", "Laplace smoothing (α = 1)", true);
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap);
  const res = el("div", { class: "stats" }); box.appendChild(res);
  const W = [["free", 24, 3], ["win", 16, 2], ["lottery", 6, 0], ["meeting", 2, 30], ["report", 4, 24]];
  const on = { free: true, meeting: true };
  const draw = () => {
    const a = sm.checked ? 1 : 0, NS = 40, NH = 60;
    let ls = Math.log(0.4), lh = Math.log(0.6), zs = false, zh = false;
    const rows = W.map(([wd, cs, ch]) => {
      const ps = (cs + a) / (NS + 2 * a), ph = (ch + a) / (NH + 2 * a), pres = !!on[wd];
      const fs = pres ? ps : 1 - ps, fh = pres ? ph : 1 - ph;
      if (fs === 0) zs = true; else ls += Math.log(fs);
      if (fh === 0) zh = true; else lh += Math.log(fh);
      const z = v => v === 0 ? '<span class="zero">0</span>' : v.toFixed(3);
      return `<tr class="${pres ? "on" : ""}"><td><label><input type="checkbox" data-w="${wd}" id="nb-${wd}" ${pres ? "checked" : ""}> ${wd}</label></td><td class="num">${cs}/40</td><td class="num">${ch}/60</td><td class="num">${pres ? "present" : "absent"}</td><td class="num">${z(fs)}</td><td class="num">${z(fh)}</td></tr>`;
    }).join("");
    wrap.innerHTML = `<table class="nbt"><tr><th>Word</th><th class="num">In spam</th><th class="num">In normal</th><th class="num">This email</th><th class="num">× spam</th><th class="num">× normal</th></tr><tr><td>Prior</td><td></td><td></td><td></td><td class="num">0.400</td><td class="num">0.600</td></tr>${rows}</table>`;
    $$("input[data-w]", wrap).forEach(cb => cb.addEventListener("change", () => { on[cb.dataset.w] = cb.checked; draw(); }));
    let pS;
    if (zs && zh) pS = NaN; else if (zh) pS = 1; else if (zs) pS = 0; else { const m = Math.max(ls, lh); pS = Math.exp(ls - m) / (Math.exp(ls - m) + Math.exp(lh - m)); }
    setStats(res, [["P(spam | email)", isNaN(pS) ? "undefined" : pS.toFixed(3)], ["Decision", isNaN(pS) ? "–" : pS >= 0.5 ? "Spam" : "Normal"], ["Zero factor?", (zs || zh) ? "Yes: one word wiped out a class" : "No"]]);
  };
  sm.addEventListener("change", draw); draw();
};

/* ================= K-means ================= */
VIZ["kmeans"] = box => {
  head(box, "K-means step by step", "Press Step: points join the nearest centre (assign), then each centre moves to the mean of its points (update). Try random initialisation a few times to see bad local optima; k-means++ starts with centres spread out.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const c = addCanvas(cols, 270, "K-means clusters"), cE = addCanvas(cols, 270, "Elbow chart");
  const ctrl = ctrlRow(box);
  const sk = slider(ctrl, "km-k", "K", 1, 6, 1, 4);
  const init = selectBox(ctrl, "km-init", "init", [["pp", "k-means++"], ["rand", "random"]], "rand");
  const bStep = button(ctrl, "Step", "btn solid"), bRun = button(ctrl, "Run to convergence"), bNew = button(ctrl, "New start");
  const st = statsRow(box);
  const r = mkRng(13), P = [], centers = [[-2, 1.6], [1.8, 2], [0, -1.8], [2.4, -1.2]];
  centers.forEach(([a, b]) => { for (let i = 0; i < 45; i++) P.push([a + 0.6 * gauss(r), b + 0.6 * gauss(r)]); });
  const cols6 = ["--c1", "--c2", "--k3", "--k4", "--k5", "--k6"];
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const initC = (k, mode, rr) => {
    if (mode === "rand") return shuffle(P.slice(), rr).slice(0, k).map(p => p.slice());
    const C = [P[Math.floor(rr() * P.length)].slice()];
    while (C.length < k) { const D = P.map(p => Math.min(...C.map(c2 => d2(p, c2)))); const tot = D.reduce((a, b) => a + b, 0); let u = rr() * tot, i = 0; while (u > D[i] && i < P.length - 1) { u -= D[i]; i++; } C.push(P[i].slice()); }
    return C;
  };
  const assign = C => P.map(p => { let b = 0; C.forEach((c2, j) => { if (d2(p, c2) < d2(p, C[b])) b = j; }); return b; });
  const inertia = (C, A) => P.reduce((s, p, i) => s + d2(p, C[A[i]]), 0);
  const runFull = (k, rr) => { let C = initC(k, "pp", rr), A = assign(C); for (let it = 0; it < 100; it++) { const nc = C.map((c2, j) => { const m = P.filter((_, i) => A[i] === j); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c2; }); const na = assign(nc); C = nc; if (na.every((v, i) => v === A[i])) { A = na; break; } A = na; } return inertia(C, A); };
  const elbow = []; { const rr = mkRng(3); for (let k = 1; k <= 8; k++) { let b = Infinity; for (let t = 0; t < 5; t++) b = Math.min(b, runFull(k, rr)); elbow.push(b); } }
  let rr = mkRng(7), C, A, iter, trail, converged;
  const start = () => { C = initC(+sk.value, init.value, rr); A = assign(C); iter = 0; trail = C.map(c2 => [c2.slice()]); converged = false; };
  const step = () => {
    if (converged) return;
    const nc = C.map((c2, j) => { const m = P.filter((_, i) => A[i] === j); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c2; });
    const na = assign(nc); converged = na.every((v, i) => v === A[i]) && nc.every((c2, j) => d2(c2, C[j]) < 1e-12);
    C = nc; A = na; iter++; C.forEach((c2, j) => trail[j].push(c2.slice()));
  };
  const draw = () => {
    let { x, w, h } = prep(c);
    const sx = lin(-4, 4.4, 0, w), sy = lin(-4, 4, h, 0);
    P.forEach((p, i) => dot(x, sx(p[0]), sy(p[1]), 3.4, css(cols6[A[i]]), null));
    C.forEach((c2, j) => {
      x.strokeStyle = css("--ink"); x.globalAlpha = 0.5; x.setLineDash([3, 3]); x.beginPath(); trail[j].forEach((q, i) => i ? x.lineTo(sx(q[0]), sy(q[1])) : x.moveTo(sx(q[0]), sy(q[1]))); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
      const px = sx(c2[0]), py = sy(c2[1]);
      x.lineWidth = 5; x.strokeStyle = css("--surface"); x.beginPath(); x.moveTo(px - 8, py - 8); x.lineTo(px + 8, py + 8); x.moveTo(px + 8, py - 8); x.lineTo(px - 8, py + 8); x.stroke();
      x.lineWidth = 2.5; x.strokeStyle = css(cols6[j]); x.stroke(); x.lineWidth = 1;
    });
    ({ x, w, h } = prep(cE));
    const pad = { l: 40, r: 10, t: 18, b: 22 };
    const ex = lin(1, 8, pad.l, w - pad.r), ey = lin(0, elbow[0] * 1.05, h - pad.b, pad.t);
    frame(x, w, h, pad); text(x, "Elbow: best inertia vs K", pad.l, 12, css("--ink"));
    for (let k = 1; k <= 8; k++) text(x, String(k), ex(k) - 3, h - 6);
    x.strokeStyle = css("--c1"); x.lineWidth = 2; x.beginPath(); elbow.forEach((v, i) => i ? x.lineTo(ex(i + 1), ey(v)) : x.moveTo(ex(1), ey(v))); x.stroke(); x.lineWidth = 1;
    elbow.forEach((v, i) => dot(x, ex(i + 1), ey(v), i + 1 === +sk.value ? 6 : 3, i + 1 === +sk.value ? css("--bad") : css("--c1")));
    text(x, "elbow at K = 4", ex(4) + 6, ey(elbow[3]) - 8, css("--muted"));
    setStats(st, [["Iteration", iter], ["Inertia", inertia(C, A).toFixed(1)], ["Best found for this K", elbow[+sk.value - 1].toFixed(1)], ["Status", converged ? "Converged" : "Running"]]);
  };
  start();
  sk.addEventListener("input", () => { start(); draw(); });
  init.addEventListener("change", () => { start(); draw(); });
  bNew.addEventListener("click", () => { start(); draw(); });
  bStep.addEventListener("click", () => { step(); draw(); });
  bRun.addEventListener("click", () => { for (let i = 0; i < 100 && !converged; i++) step(); draw(); });
  onDraw(draw);
};

/* ================= PCA ================= */
VIZ["pca-2d"] = box => {
  head(box, "Principal components", "Two standardised features. PC1 points along the direction of greatest spread. Increase the correlation and PC1 explains more of the variance; project onto PC1 to see what 1D compression keeps.");
  const c = addCanvas(box, 280, "PCA arrows on a scatter");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "pca-r", "Correlation", 0, 0.95, 0.05, 0.7, v => v.toFixed(2));
  const pj = checkbox(ctrl, "pca-p", "Project onto PC1", false);
  const st = statsRow(box);
  const r = mkRng(19), Z = Array.from({ length: 160 }, () => [gauss(r), gauss(r)]);
  const draw = () => {
    const rho = +s.value, P = Z.map(([a, b]) => [a, rho * a + Math.sqrt(1 - rho * rho) * b]);
    const n = P.length, mx = P.reduce((s2, p) => s2 + p[0], 0) / n, my = P.reduce((s2, p) => s2 + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0; P.forEach(([a, b]) => { sxx += (a - mx) ** 2; syy += (b - my) ** 2; sxy += (a - mx) * (b - my); }); sxx /= n - 1; syy /= n - 1; sxy /= n - 1;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
    let v1 = Math.abs(sxy) > 1e-9 ? [l1 - syy, sxy] : (sxx >= syy ? [1, 0] : [0, 1]); const nv = Math.hypot(...v1); v1 = [v1[0] / nv, v1[1] / nv]; const v2 = [-v1[1], v1[0]];
    const { x, w, h } = prep(c);
    const sc = Math.min(w, h) / 9, ox = w / 2, oy = h / 2, X = a => ox + a * sc, Y = b => oy - b * sc;
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(0, oy); x.lineTo(w, oy); x.moveTo(ox, 0); x.lineTo(ox, h); x.stroke();
    if (pj.checked) {
      x.strokeStyle = css("--c1"); x.globalAlpha = .35; x.beginPath(); x.moveTo(X(mx - v1[0] * 5), Y(my - v1[1] * 5)); x.lineTo(X(mx + v1[0] * 5), Y(my + v1[1] * 5)); x.stroke(); x.globalAlpha = 1;
      P.forEach(([a, b]) => { const t = (a - mx) * v1[0] + (b - my) * v1[1], qa = mx + t * v1[0], qb = my + t * v1[1]; x.strokeStyle = css("--muted"); x.globalAlpha = .3; x.beginPath(); x.moveTo(X(a), Y(b)); x.lineTo(X(qa), Y(qb)); x.stroke(); x.globalAlpha = 1; dot(x, X(qa), Y(qb), 2.6, css("--c1")); });
    }
    P.forEach(([a, b]) => dot(x, X(a), Y(b), 3, pj.checked ? css("--line") : css("--c2")));
    const arrow = (v, len, col, label) => { const ex = X(mx + v[0] * len), ey = Y(my + v[1] * len); x.strokeStyle = css(col); x.lineWidth = 3; x.beginPath(); x.moveTo(X(mx), Y(my)); x.lineTo(ex, ey); x.stroke(); x.lineWidth = 1; dot(x, ex, ey, 4, css(col)); text(x, label, ex + 6, ey - 4, css(col)); };
    arrow(v1, 2 * Math.sqrt(l1), "--ink", "PC1"); arrow(v2, 2 * Math.sqrt(Math.max(l2, 0)), "--bad", "PC2");
    setStats(st, [["PC1 variance explained", (100 * l1 / tr).toFixed(1) + "%"], ["PC2 variance explained", (100 * l2 / tr).toFixed(1) + "%"], ["Eigenvalues", l1.toFixed(2) + ", " + l2.toFixed(2)]]);
  };
  s.addEventListener("input", draw); pj.addEventListener("change", draw); onDraw(draw);
};

/* ================= target encoding ================= */
VIZ["fe-te"] = box => {
  head(box, "Smoothed target encoding", "Default rate by city. City F has one customer who defaulted, so its raw mean is 100%. Smoothing pulls small categories toward the overall rate; large categories barely move.");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "te-m", "Smoothing m", 0, 200, 1, 20);
  const wrap = el("div"); box.appendChild(wrap);
  legend(box, [["--muted", "Raw category mean"], ["--accent", "Smoothed encoding"]]);
  const cats = [["A", 1200, 0.22], ["B", 800, 0.18], ["C", 300, 0.30], ["D", 40, 0.45], ["E", 5, 0.80], ["F", 1, 1.0]];
  const N = cats.reduce((a, c2) => a + c2[1], 0), gm = cats.reduce((a, c2) => a + c2[1] * c2[2], 0) / N;
  const draw = () => {
    const m = +s.value;
    wrap.innerHTML = `<p class="note">Overall default rate ȳ = ${(gm * 100).toFixed(1)}%. Formula: (n·ȳ_c + m·ȳ) / (n + m)</p>` + cats.map(([c2, n, rt]) => {
      const te = (n * rt + m * gm) / (n + m);
      return `<div class="tebar"><strong>City ${c2}</strong><span>n = ${n}</span><div class="trk"><i class="raw" style="width:${rt * 100}%"></i><i class="sm" style="width:${te * 100}%"></i></div><span>${(rt * 100).toFixed(0)}% → <strong>${(te * 100).toFixed(1)}%</strong></span></div>`;
    }).join("");
  };
  s.addEventListener("input", draw); draw();
};

/* ================= SMOTE ================= */
VIZ["imb-smote"] = box => {
  head(box, "SMOTE: synthetic minority points", "Grey = majority (150), teal = real minority (15). Each synthetic point (hollow) is placed on the line between a minority point and one of its 5 nearest minority neighbours. Note the stray minority point in the majority area: SMOTE happily creates points there too.");
  const c = addCanvas(box, 280, "SMOTE synthetic points");
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "sm-n", "Synthetic points", 0, 135, 1, 30);
  const st = statsRow(box);
  const r = mkRng(23), maj = [], mino = [];
  for (let i = 0; i < 150; i++) maj.push([-0.6 + 1.1 * gauss(r), -0.4 + 0.9 * gauss(r)]);
  for (let i = 0; i < 14; i++) mino.push([1.7 + 0.45 * gauss(r), 1.3 + 0.4 * gauss(r)]);
  mino.push([-0.4, -0.6]);
  const nn = mino.map((p, i) => mino.map((q, j) => [(p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2, j]).filter(v => v[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 5).map(v => v[1]));
  const syn = [];
  for (let k = 0; k < 135; k++) { const i = Math.floor(r() * mino.length), j = nn[i][Math.floor(r() * 5)], l = r(); syn.push({ p: [mino[i][0] + l * (mino[j][0] - mino[i][0]), mino[i][1] + l * (mino[j][1] - mino[i][1])], a: i, b: j }); }
  const draw = () => {
    const k = +s.value;
    const { x, w, h } = prep(c);
    const sx = lin(-4, 3.8, 0, w), sy = lin(-3.2, 3, h, 0);
    maj.forEach(p => dot(x, sx(p[0]), sy(p[1]), 3, css("--muted")));
    syn.slice(Math.max(0, k - 6), k).forEach(({ a, b }) => { x.strokeStyle = css("--c2"); x.setLineDash([3, 3]); x.beginPath(); x.moveTo(sx(mino[a][0]), sy(mino[a][1])); x.lineTo(sx(mino[b][0]), sy(mino[b][1])); x.stroke(); x.setLineDash([]); });
    syn.slice(0, k).forEach(({ p }) => dot(x, sx(p[0]), sy(p[1]), 3.4, css("--surface"), css("--c1")));
    mino.forEach(p => dot(x, sx(p[0]), sy(p[1]), 4.5, css("--c1"), css("--surface")));
    setStats(st, [["Majority", 150], ["Real minority", 15], ["Synthetic", k], ["Minority share", (100 * (15 + k) / (165 + k)).toFixed(1) + "%"]]);
  };
  s.addEventListener("input", draw); onDraw(draw);
};

/* ================= threshold lab ================= */
VIZ["imb-threshold"] = box => {
  head(box, "Threshold lab", "400 cases, 15% positive. Drag the threshold to trade precision against recall. Set how much worse a missed positive (FN) is than a false alarm (FP), and the green line shows the cheapest threshold.");
  const c = addCanvas(box, 170, "Score distributions with threshold");
  legend(box, [["--accent", "Positives"], ["--muted", "Negatives"], ["--bad", "Your threshold"], ["--good", "Cost-optimal threshold"]]);
  const ctrl = ctrlRow(box);
  const s = slider(ctrl, "th-t", "Threshold", 0.02, 0.98, 0.01, 0.5, v => v.toFixed(2));
  const cr = slider(ctrl, "th-c", "Cost of FN ÷ cost of FP", 1, 30, 1, 5, v => v + "×");
  const row = el("div", { class: "cols" }); box.appendChild(row);
  const cm = el("div", { class: "cm" }); row.appendChild(cm);
  const st = el("div", { class: "stats" }); row.appendChild(st);
  const r = mkRng(7), clip = v => Math.min(0.995, Math.max(0.005, v)), D = [];
  for (let i = 0; i < 400; i++) { const pos = i < 60; D.push([pos ? 1 : 0, clip(pos ? 0.64 + 0.16 * gauss(r) : 0.34 + 0.15 * gauss(r))]); }
  const conf = t => { let tp = 0, fp = 0, fn = 0, tn = 0; D.forEach(([y, sc]) => { const p = sc >= t; if (y && p) tp++; else if (y) fn++; else if (p) fp++; else tn++; }); return { tp, fp, fn, tn }; };
  const draw = () => {
    const t = +s.value, ratio = +cr.value;
    let bestT = 0.5, bestC = Infinity; for (let u = 0.02; u <= 0.98; u += 0.01) { const q = conf(u), cost = q.fp + ratio * q.fn; if (cost < bestC) { bestC = cost; bestT = u; } }
    const { x, w, h } = prep(c), bins = 40, pb = new Array(bins).fill(0), nb = new Array(bins).fill(0);
    D.forEach(([y, sc]) => { const k = Math.min(bins - 1, Math.floor(sc * bins)); (y ? pb : nb)[k]++; });
    const mx = Math.max(...pb, ...nb), bw = w / bins, base = h - 16;
    x.fillStyle = css("--line"); x.fillRect(0, base, w, 1);
    x.globalAlpha = .55; x.fillStyle = css("--muted"); nb.forEach((v, i) => x.fillRect(i * bw + 1, base - v / mx * (base - 6), bw - 2, v / mx * (base - 6)));
    x.globalAlpha = .9; x.fillStyle = css("--accent"); pb.forEach((v, i) => x.fillRect(i * bw + bw * .25, base - v / mx * (base - 6), bw * .5, v / mx * (base - 6)));
    x.globalAlpha = 1; x.fillStyle = css("--good"); x.fillRect(bestT * w - 1, 0, 2, base); x.fillStyle = css("--bad"); x.fillRect(t * w - 1, 0, 2, base);
    text(x, "0", 2, h - 3); text(x, "score →", w / 2 - 24, h - 3); text(x, "1", w - 8, h - 3);
    const q = conf(t), pr = q.tp + q.fp ? q.tp / (q.tp + q.fp) : 0, re = q.tp / (q.tp + q.fn), f1 = pr + re ? 2 * pr * re / (pr + re) : 0;
    cm.innerHTML = `<div class="h"></div><div class="h">Pred +</div><div class="h">Pred −</div><div class="h">Actual +</div><div>TP ${q.tp}</div><div>FN ${q.fn}</div><div class="h">Actual −</div><div>FP ${q.fp}</div><div>TN ${q.tn}</div>`;
    setStats(st, [["Precision", pr.toFixed(2)], ["Recall", re.toFixed(2)], ["F1", f1.toFixed(2)], ["Accuracy", ((q.tp + q.tn) / 400).toFixed(2)], ["Cost (FP=1)", q.fp + ratio * q.fn], ["Best threshold", bestT.toFixed(2)]]);
  };
  s.addEventListener("input", draw); cr.addEventListener("input", draw); onDraw(draw);
};

/* ================= ROC vs PR ================= */
function invNorm(p) { // Acklam
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857], c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878], d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
VIZ["met-rocpr"] = box => {
  head(box, "Same model, rarer positives", "The score distributions stay identical; only the share of positives changes. ROC-AUC does not move. Precision collapses because every false-positive rate now means many more false alarms, so PR-AUC falls.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const cR = addCanvas(cols, 240, "ROC curve"), cP = addCanvas(cols, 240, "Precision-recall curve");
  const ctrl = ctrlRow(box);
  const prevs = [0.5, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01];
  const s = slider(ctrl, "rp-p", "Positive rate", 0, 6, 1, 3, v => (prevs[v] * 100) + "%");
  const st = statsRow(box);
  const NP = 300, pos = Array.from({ length: NP }, (_, i) => 0.62 + 0.14 * invNorm((i + 0.5) / NP));
  const draw = () => {
    const pi = prevs[+s.value], NN = Math.round(NP * (1 - pi) / pi);
    const all = pos.map(v => [v, 1]);
    for (let i = 0; i < NN; i++) all.push([0.40 + 0.14 * invNorm((i + 0.5) / NN), 0]);
    all.sort((a, b) => b[0] - a[0]);
    let tp = 0, fp = 0, auc = 0, ap = 0, prevR = 0, prevF = 0, prevT = 0; const roc = [[0, 0]], pr = [];
    all.forEach(([, y]) => { if (y) tp++; else fp++; const tpr = tp / NP, fpr = fp / NN; auc += (fpr - prevF) * (tpr + prevT) / 2; if (y) { const prec = tp / (tp + fp); ap += (tpr - prevR) * prec; prevR = tpr; } prevF = fpr; prevT = tpr; roc.push([fpr, tpr]); pr.push([tpr, tp / (tp + fp)]); });
    const plot = (cv, pts, xl, yl, base, title) => {
      const { x, w, h } = prep(cv), pad = { l: 30, r: 10, t: 18, b: 24 };
      const sx = lin(0, 1, pad.l, w - pad.r), sy = lin(0, 1, h - pad.b, pad.t);
      frame(x, w, h, pad); text(x, title, pad.l, 12, css("--ink"));
      [0, 0.5, 1].forEach(v => { text(x, String(v), 4, sy(v) + 4); text(x, String(v), sx(v) - 6, h - 8); });
      text(x, xl, w - pad.r - 60, h - 8 - 10);
      x.setLineDash([4, 4]); x.strokeStyle = css("--muted"); x.beginPath(); if (base === "diag") { x.moveTo(sx(0), sy(0)); x.lineTo(sx(1), sy(1)); } else { x.moveTo(sx(0), sy(base)); x.lineTo(sx(1), sy(base)); } x.stroke(); x.setLineDash([]);
      x.strokeStyle = css("--c1"); x.lineWidth = 2.2; x.beginPath(); const step = Math.max(1, Math.floor(pts.length / 600)); pts.forEach((p, i) => { if (i % step && i !== pts.length - 1) return; i ? x.lineTo(sx(p[0]), sy(p[1])) : x.moveTo(sx(p[0]), sy(p[1])); }); x.stroke(); x.lineWidth = 1;
      text(x, yl, pad.l + 4, pad.t + 12);
    };
    plot(cR, roc, "FPR →", "TPR", "diag", "ROC curve");
    plot(cP, pr, "recall →", "precision", pi, "Precision-recall (dashed = random)");
    setStats(st, [["Positive rate", (pi * 100) + "%"], ["Negatives", NN.toLocaleString("en-IN")], ["ROC-AUC", auc.toFixed(3)], ["PR-AUC (AP)", ap.toFixed(3)], ["Random PR-AUC", pi.toFixed(2)]]);
  };
  s.addEventListener("input", draw); onDraw(draw);
};

/* ================= regression error calculator ================= */
VIZ["reg-err"] = box => {
  head(box, "How one bad prediction moves each metric", "Eight predictions of monthly sales. Toggle one big miss, or one product with a tiny actual value, and compare how MAE, RMSE, MAPE and WAPE react.");
  const ctrl = ctrlRow(box);
  const big = checkbox(ctrl, "re-big", "One big miss", false), tiny = checkbox(ctrl, "re-tiny", "One near-zero actual", false);
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap);
  const st = statsRow(box);
  const draw = () => {
    const y = [120, 95, 150, 80, 200, 60, 110, 130], p = [112, 100, 140, 85, 190, 66, 104, 138];
    if (big.checked) p[4] = 120; if (tiny.checked) { y[5] = 2; p[5] = 8; }
    const n = y.length, e = y.map((v, i) => v - p[i]), ab = e.map(Math.abs);
    const mae = ab.reduce((a, b) => a + b, 0) / n, rmse = Math.sqrt(e.reduce((a, b) => a + b * b, 0) / n);
    const mape = 100 * ab.reduce((s, v, i) => s + v / Math.abs(y[i]), 0) / n, wape = 100 * ab.reduce((a, b) => a + b, 0) / y.reduce((a, b) => a + Math.abs(b), 0);
    const ym = y.reduce((a, b) => a + b, 0) / n, r2 = 1 - e.reduce((a, b) => a + b * b, 0) / y.reduce((s, v) => s + (v - ym) ** 2, 0);
    const mx = Math.max(...ab);
    wrap.innerHTML = `<table><tr><th>Product</th><th class="num">Actual</th><th class="num">Predicted</th><th class="num">|Error|</th><th class="num">|Error| / actual</th><th style="width:30%">Size of error</th></tr>${y.map((v, i) => `<tr><td>P${i + 1}</td><td class="num">${v}</td><td class="num">${p[i]}</td><td class="num">${ab[i]}</td><td class="num">${(100 * ab[i] / v).toFixed(0)}%</td><td><div style="height:10px;border-radius:2px;background:var(${ab[i] === mx ? "--bad" : "--c1"});width:${100 * ab[i] / mx}%"></div></td></tr>`).join("")}</table>`;
    setStats(st, [["MAE", mae.toFixed(1)], ["RMSE", rmse.toFixed(1)], ["MAPE", mape.toFixed(1) + "%"], ["WAPE", wape.toFixed(1) + "%"], ["R²", r2.toFixed(3)]]);
  };
  big.addEventListener("change", draw); tiny.addEventListener("change", draw); draw();
};

/* ================= ranking metrics calculator ================= */
VIZ["rank-calc"] = box => {
  head(box, "Precision@k, recall@k, AP, MRR, NDCG calculator", "A ranked list of 10 results for one query (or 10 doctors ranked for one rep). Click an item to cycle its relevance: not relevant → relevant (1) → highly relevant (2). Set k and how many relevant items the list missed entirely.");
  const ctrl = ctrlRow(box);
  const sk = slider(ctrl, "rk-k", "k", 1, 10, 1, 5);
  const sm = slider(ctrl, "rk-m", "Relevant items not in the list", 0, 10, 1, 2);
  const list = el("div", { class: "rank-list" }); box.appendChild(list);
  const st = statsRow(box);
  const formula = el("div", { class: "worked" }); box.appendChild(formula);
  const names = ["Doc A", "Doc B", "Doc C", "Doc D", "Doc E", "Doc F", "Doc G", "Doc H", "Doc I", "Doc J"];
  const rel = [2, 0, 1, 0, 1, 0, 0, 2, 0, 0];
  const draw = () => {
    const k = +sk.value, miss = +sm.value;
    list.innerHTML = "";
    rel.forEach((v, i) => {
      const b = el("button", { class: "rank-item" + (i >= k ? " out" : ""), type: "button", "aria-label": `${names[i]}, relevance ${v}` }, `<span class="r">#${i + 1}</span><span>${names[i]}</span><span class="rel r${v}">${v === 0 ? "not relevant" : v === 1 ? "relevant" : "highly relevant"}</span>`);
      b.addEventListener("click", () => { rel[i] = (rel[i] + 1) % 3; draw(); });
      list.appendChild(b);
    });
    const R = rel.filter(v => v > 0).length + miss, top = rel.slice(0, k), hits = top.filter(v => v > 0).length;
    const P = hits / k, Rc = R ? hits / R : 0, F = P + Rc ? 2 * P * Rc / (P + Rc) : 0;
    let first = rel.findIndex(v => v > 0); const rr = first >= 0 ? 1 / (first + 1) : 0;
    let apSum = 0, h2 = 0; top.forEach((v, i) => { if (v > 0) { h2++; apSum += h2 / (i + 1); } });
    const ap = R ? apSum / Math.min(k, R) : 0;
    const dcg = top.reduce((s, v, i) => s + (2 ** v - 1) / Math.log2(i + 2), 0);
    const ideal = [...rel.filter(v => v > 0), ...new Array(miss).fill(1)].sort((a, b) => b - a).slice(0, k);
    const idcg = ideal.reduce((s, v, i) => s + (2 ** v - 1) / Math.log2(i + 2), 0), ndcg = idcg ? dcg / idcg : 0;
    setStats(st, [["Precision@" + k, P.toFixed(2)], ["Recall@" + k, Rc.toFixed(2)], ["F1@" + k, F.toFixed(2)], ["Hit@" + k, hits ? 1 : 0], ["RR (MRR, 1 query)", rr.toFixed(2)], ["AP@" + k, ap.toFixed(2)], ["NDCG@" + k, ndcg.toFixed(2)]]);
    formula.innerHTML = `<b>The arithmetic</b><p>Relevant in top ${k} = ${hits}. Total relevant = ${R - miss} in list + ${miss} missed = ${R}.</p><p>Precision@${k} = ${hits}/${k} = ${P.toFixed(2)} · Recall@${k} = ${hits}/${R || 0} = ${Rc.toFixed(2)} · First relevant at rank ${first >= 0 ? first + 1 : "–"} → RR = ${rr.toFixed(2)}</p><p>NDCG uses grades (gain 2^rel − 1) and assumes missed items have grade 1. AP divides by min(k, R) = ${Math.min(k, R)}.</p>`;
  };
  sk.addEventListener("input", draw); sm.addEventListener("input", draw); draw();
};

/* ================= validation splits ================= */
VIZ["val-split"] = box => {
  head(box, "What each split scheme looks like", "20 rows in time order (left = oldest). Each line is one training run. Outlined blocks are the rare positive class; letters are customer IDs.");
  const ctrl = ctrlRow(box);
  const sch = selectBox(ctrl, "vs-s", "Scheme", [["hold", "Holdout (train / val / test)"], ["kf", "K-fold (shuffled)"], ["skf", "Stratified K-fold"], ["gkf", "Group K-fold"], ["ts", "Time-series split"], ["oot", "Out-of-time + CV"]], "kf");
  const wrap = el("div", { class: "folds" }); box.appendChild(wrap);
  legend(box, [["--c1", "Train"], ["--c2", "Validation"], ["--bad", "Test (touched once)"], ["--line", "Unused"]]);
  const nt = note(box, "");
  const POS = new Set([1, 6, 9, 14, 18]), GRP = "ABCDE".split(""), grp = i => GRP[i % 5];
  const r0 = mkRng(9), perm = shuffle([...Array(20).keys()], r0), kfFold = new Array(20); perm.forEach((v, i) => kfFold[v] = i % 5);
  const posList = [...POS], negList = [...Array(20).keys()].filter(i => !POS.has(i)); const skf = new Array(20);
  shuffle(posList, mkRng(2)).forEach((v, i) => skf[v] = i % 5); shuffle(negList, mkRng(3)).forEach((v, i) => skf[v] = i % 5);
  const draw = () => {
    const s = sch.value, rows = [];
    const mk = f => Array.from({ length: 20 }, (_, i) => f(i));
    if (s === "hold") { const p = shuffle([...Array(20).keys()], mkRng(5)), role = new Array(20); p.forEach((v, i) => role[v] = i < 12 ? "tr" : i < 16 ? "va" : "te"); rows.push(["Run 1", role]); nt.textContent = "Random 60/20/20 split. Tune on validation, report test once. Fine for large data; with rare positives the split can be unlucky."; }
    if (s === "kf") { for (let f = 0; f < 5; f++) rows.push([`Fold ${f + 1}`, mk(i => kfFold[i] === f ? "va" : "tr")]); const cnt = [0, 1, 2, 3, 4].map(f => [...POS].filter(i => kfFold[i] === f).length); nt.textContent = `Positives in each validation fold: ${cnt.join(", ")}. A fold with 0 positives can't compute recall or AUC.`; }
    if (s === "skf") { for (let f = 0; f < 5; f++) rows.push([`Fold ${f + 1}`, mk(i => skf[i] === f ? "va" : "tr")]); nt.textContent = "Each validation fold gets exactly one positive: the class ratio is preserved."; }
    if (s === "gkf") { GRP.forEach((g, f) => rows.push([`Fold ${f + 1}`, mk(i => grp(i) === g ? "va" : "tr")])); nt.textContent = "Every row of one customer stays together, so the model is always scored on customers it has never seen."; }
    if (s === "ts") { for (let f = 0; f < 5; f++) { const end = 5 + 3 * f; rows.push([`Split ${f + 1}`, mk(i => i < end ? "tr" : i < end + 3 ? "va" : "no")]); } nt.textContent = "Expanding window: always train on the past and validate on the next period. No shuffling."; }
    if (s === "oot") { for (let f = 0; f < 4; f++) rows.push([`Fold ${f + 1}`, mk(i => i >= 16 ? "te" : Math.floor(i / 4) === f ? "va" : "tr")]); nt.textContent = "Latest 4 rows (months) held out completely as an out-of-time test. CV runs only on the older data."; }
    wrap.innerHTML = rows.map(([lab, role]) => `<div class="fold"><span>${lab}</span>${role.map((rl, i) => `<i class="${rl}${POS.has(i) ? " p1" : ""}" title="row ${i + 1}" style="${s === "gkf" ? "font:600 9px/18px var(--f-mono);text-align:center;color:var(--surface);font-style:normal" : ""}">${s === "gkf" ? grp(i) : ""}</i>`).join("")}</div>`).join("");
  };
  sch.addEventListener("change", draw); draw();
};

/* ================= grid vs random search ================= */
VIZ["tune-search"] = box => {
  head(box, "Grid search vs random search, 9 trials each", "The score (shading) depends mostly on parameter 1 and hardly at all on parameter 2. The grid only ever tries 3 values of the parameter that matters; random search tries 9.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const cG = addCanvas(cols, 230, "Grid search"), cR = addCanvas(cols, 230, "Random search");
  const ctrl = ctrlRow(box);
  const b = button(ctrl, "New random draw");
  const st = statsRow(box);
  const score = (u, v) => Math.exp(-(((u - 0.63) / 0.11) ** 2)) * (0.92 + 0.08 * v);
  const grid = []; [0.2, 0.5, 0.8].forEach(u => [0.2, 0.5, 0.8].forEach(v => grid.push([u, v])));
  let seed = 3, rand = [];
  const newRand = () => { const r = mkRng(seed++); rand = Array.from({ length: 9 }, () => [r(), r()]); };
  newRand();
  const plot = (cv, pts, title) => {
    const { x, w, h } = prep(cv), pad = { l: 8, r: 8, t: 20, b: 30 };
    const sx = lin(0, 1, pad.l, w - pad.r), sy = lin(0, 1, h - pad.b, pad.t), cell = 6;
    for (let px = pad.l; px < w - pad.r; px += cell) for (let py = pad.t; py < h - pad.b; py += cell) { const u = (px - pad.l) / (w - pad.l - pad.r), v = 1 - (py - pad.t) / (h - pad.t - pad.b); x.globalAlpha = 0.05 + 0.5 * score(u, v); x.fillStyle = css("--c1"); x.fillRect(px, py, cell, cell); }
    x.globalAlpha = 1;
    let best = 0; pts.forEach(([u, v]) => { best = Math.max(best, score(u, v)); dot(x, sx(u), sy(v), 5, css("--c2"), css("--surface")); });
    x.strokeStyle = css("--ink"); pts.forEach(([u]) => { x.beginPath(); x.moveTo(sx(u), h - pad.b + 4); x.lineTo(sx(u), h - pad.b + 12); x.stroke(); });
    text(x, title, pad.l, 13, css("--ink")); text(x, "parameter 1 (important) → values tried", pad.l, h - 4);
    return best;
  };
  const draw = () => {
    const bg = plot(cG, grid, "Grid 3 × 3"), br = plot(cR, rand, "Random 9");
    setStats(st, [["Best score, grid", bg.toFixed(3)], ["Best score, random", br.toFixed(3)], ["Distinct values of param 1", "3 vs 9"], ["Max possible", "1.000"]]);
  };
  b.addEventListener("click", () => { newRand(); draw(); });
  onDraw(draw);
};

/* ================= SHAP waterfall ================= */
VIZ["shap-wf"] = box => {
  head(box, "SHAP waterfall for one loan applicant", "The average predicted default probability is 12%. Each feature pushes this applicant's prediction up (red) or down (green). The pushes add up exactly to the final 25%.");
  const wf = el("div", { class: "wf" }); box.appendChild(wf);
  const rows = [["Credit utilisation = 92%", 0.11], ["Missed payments = 3", 0.07], ["Age = 29", 0.01], ["Income = ₹18 L", -0.04], ["Tenure = 6 years", -0.02]];
  const base = 0.12, mx = 0.32, pct = v => (100 * v / mx) + "%";
  let cur = base, html = `<div class="row"><span>Baseline E[f(x)]</span><div class="track"><div class="bar" style="left:0;width:${pct(base)};background:var(--muted)"></div></div><span class="num">0.12</span></div>`;
  rows.forEach(([lab, v]) => { const a = Math.min(cur, cur + v), wdt = Math.abs(v); html += `<div class="row"><span>${lab}</span><div class="track"><div class="bar" style="left:${pct(a)};width:${pct(wdt)};background:var(${v > 0 ? "--bad" : "--good"})"></div></div><span class="num">${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}</span></div>`; cur += v; });
  html += `<div class="row"><strong>Prediction f(x)</strong><div class="track"><div class="bar" style="left:0;width:${pct(cur)};background:var(--ink)"></div></div><strong class="num">${cur.toFixed(2)}</strong></div>`;
  wf.innerHTML = html;
  note(box, "0.12 + 0.11 + 0.07 + 0.01 − 0.04 − 0.02 = 0.25. Reason codes for this applicant would be the top positive contributors: high utilisation and missed payments.");
};

/* ================= model picker ================= */
VIZ["picker"] = box => {
  head(box, "Model picker", "Answer six questions to get a defensible shortlist, the metric to quote, and a sentence you can say.");
  const form = el("form", { class: "picker" }); box.appendChild(form);
  const Qs = [
    ["task", "What are you predicting?", [["cls", "A class (yes/no or categories)"], ["reg", "A number"], ["clu", "Groups, no labels"], ["rank", "A ranked list"]], "cls"],
    ["data", "What does the data look like?", [["tab", "Table of features"], ["text", "Text"], ["img", "Images / audio"]], "tab"],
    ["rows", "How many rows?", [["s", "Under 10k"], ["m", "10k – 1M"], ["l", "Over 1M"]], "m"],
    ["interp", "Explainability needed?", [["must", "Every decision (regulated)"], ["nice", "Nice to have"], ["no", "Not important"]], "nice"],
    ["cat", "Many high-cardinality categories?", [["y", "Yes"], ["n", "No"]], "n"],
    ["rare", "Is the positive class rare (< 10%)?", [["y", "Yes"], ["n", "No / not relevant"]], "y"]
  ];
  Qs.forEach(([k, q, opts, def]) => { const fs = el("fieldset"); fs.appendChild(el("legend", {}, q)); opts.forEach(([v, t]) => { const id = `pk-${k}-${v}`; const lab = el("label", { for: id }); const inp = el("input", { type: "radio", name: k, value: v, id }); if (v === def) inp.checked = true; lab.appendChild(inp); lab.appendChild(document.createTextNode(t)); fs.appendChild(lab); }); form.appendChild(fs); });
  const out = el("div", { class: "reco", "aria-live": "polite" }); box.appendChild(out);
  const get = () => Object.fromEntries(new FormData(form).entries());
  const draw = () => {
    const a = get(); let rec = [], metric = "", say = "";
    if (a.task === "clu") {
      rec = a.data === "tab" ? [["K-means (scaled features)", "Fast, interpretable centroids; works if clusters are roughly round."], ["DBSCAN / HDBSCAN", "Arbitrary shapes and flags outliers; no K needed."], ["Gaussian Mixture", "Soft membership and elliptical clusters; pick K with BIC."]] : [["Embeddings + K-means / HDBSCAN", "Turn text or images into vectors with a pretrained model, then cluster."], ["Topic models (LDA / BERTopic)", "For text: interpretable topics."], ["Hierarchical on embeddings", "See structure at every level, small data."]];
      metric = "Silhouette, Davies-Bouldin, cluster stability, and whether the business can act on each segment.";
    } else if (a.task === "rank") {
      rec = [["LightGBM / XGBoost ranker (LambdaMART)", "Learns to order items per query or user from features."], ["Two-tower embeddings + ANN retrieval", "Scales to millions of items; retrieve candidates fast."], ["Matrix factorisation / ALS", "Classic collaborative filtering from interactions."]];
      metric = "Precision@k, recall@k, NDCG@k, MAP; then an online A/B test on CTR or conversion.";
    } else if (a.data === "text") {
      rec = a.rows === "s" ? [["TF-IDF + Logistic regression", "Strong, fast, explainable baseline on sparse text."], ["TF-IDF + Linear SVM", "Often best linear model for high-dimensional text."], ["Sentence embeddings + LR", "Captures meaning with little data."]] : [["Fine-tuned transformer (BERT family)", "Best accuracy with enough labelled data."], ["Embeddings + LR / LightGBM", "Cheaper, fast to iterate."], ["TF-IDF + LR baseline", "Always keep a simple benchmark."]];
      metric = a.task === "reg" ? "MAE / RMSE." : "Macro F1 (and PR-AUC if one class is rare).";
    } else if (a.data === "img") {
      rec = [["Pretrained CNN / ViT, fine-tuned", "Transfer learning: essential with limited images."], ["Frozen backbone + LR head", "Quick strong baseline."], ["Augmentation", "Flips, crops, colour jitter to stretch small data."]];
      metric = a.task === "reg" ? "MAE / RMSE." : "Accuracy or macro F1; recall for medical findings.";
    } else {
      if (a.interp === "must") rec = [[a.task === "cls" ? "Logistic regression scorecard (WOE bins)" : "Linear / Ridge regression", "Transparent coefficients and reason codes regulators accept."], ["XGBoost / LightGBM with monotonic constraints + SHAP", "Challenger model; often +2–5 Gini points with controlled behaviour."], ["Shallow decision tree", "Readable rules for policy or triage."]];
      else if (a.cat === "y") rec = [["CatBoost", "Ordered target statistics handle high-cardinality categories without leakage; good defaults."], ["LightGBM (native categoricals)", "Fast on large data."], ["XGBoost + out-of-fold target encoding", "Strong when categories are encoded carefully."]];
      else if (a.rows === "l") rec = [["LightGBM", "Fastest on millions of rows: histograms, GOSS, EFB."], ["XGBoost (hist / GPU)", "Comparable accuracy, mature tooling."], [a.task === "cls" ? "Logistic regression (SGD)" : "Linear regression (SGD)", "Baseline that scales to anything."]];
      else if (a.rows === "s") rec = [["Regularised logistic / linear regression", "Low variance, generalises well with few rows."], ["Random Forest", "Robust with little tuning; OOB estimate for free."], ["XGBoost with strong regularisation + CV", "Can win but needs careful tuning on small data."]];
      else rec = [["XGBoost / LightGBM", "Best accuracy on tabular data, handles missing values and interactions."], ["Random Forest", "Quick robust baseline, less tuning."], [a.task === "cls" ? "Logistic regression" : "Ridge regression", "Interpretable benchmark and sanity check."]];
      metric = a.task === "cls" ? (a.rare === "y" ? "PR-AUC, recall at a fixed precision, precision@k for capacity, plus calibration if probabilities are used." : "ROC-AUC, F1 at the chosen threshold, log loss.") : "MAE and RMSE; WAPE for forecasts; R² as context.";
    }
    say = `"Given ${a.task === "clu" ? "unlabelled" : a.task === "rank" ? "a ranking task on" : "a " + (a.task === "cls" ? "classification" : "regression") + " task on"} ${a.data === "tab" ? "tabular" : a.data === "text" ? "text" : "image"} data with ${a.rows === "s" ? "under 10k" : a.rows === "m" ? "10k to 1M" : "over a million"} rows, I'd start with ${rec[0][0]} because ${rec[0][1].charAt(0).toLowerCase() + rec[0][1].slice(1)} I'd compare it against ${rec[rec.length - 1][0]} as a benchmark and judge them on ${metric.split(",")[0].replace(/\.$/, "")}."`;
    out.innerHTML = rec.map(([m, why], i) => `<div><span class="rk">${i + 1}</span><strong>${m}</strong><br>${why}</div>`).join("") + `<div><span class="rk">METRIC</span>${metric}</div><div class="say" style="margin:0"><b>Say it</b><div class="txt">${say}</div></div>`;
  };
  form.addEventListener("change", draw); form.addEventListener("submit", e => e.preventDefault()); draw();
};
/* ================= DEEP LEARNING VISUALS ================= */
VIZ["nn-playground"] = box => {
  head(box, "Train a tiny neural network", "A network with one hidden layer learns the two-moons data live (full-batch Adam, cross-entropy). Try a linear activation: no matter how many units, the boundary stays a straight line. Switch to tanh or ReLU and it bends.");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const c = addCanvas(cols, 260, "Neural network decision regions"), cL = addCanvas(cols, 260, "Training loss");
  const ctrl = ctrlRow(box);
  const sh = slider(ctrl, "nn-h", "Hidden units", 1, 16, 1, 6);
  const act = selectBox(ctrl, "nn-act", "Activation", [["tanh", "tanh"], ["relu", "ReLU"], ["lin", "linear (none)"]], "tanh");
  const lr = selectBox(ctrl, "nn-lr", "Learning rate", [[0.003, "0.003"], [0.03, "0.03"], [0.3, "0.3"]], 0.03);
  const bt = button(ctrl, "Train", "btn solid"), br = button(ctrl, "Reset");
  const st = statsRow(box);
  const X = MOON_TR.X.map(([a, b]) => [a - 0.5, b - 0.25]), Y = MOON_TR.y, n = X.length;
  let net, opt, losses, epoch, running = false, raf = null;
  const f = { tanh: z => Math.tanh(z), relu: z => Math.max(0, z), lin: z => z };
  const df = { tanh: a => 1 - a * a, relu: a => a > 0 ? 1 : 0, lin: () => 1 };
  const reset = () => {
    const H = +sh.value, r = mkRng(5 + H);
    net = { H, W1: Array.from({ length: H }, () => [gauss(r) * 1.0, gauss(r) * 1.0]), b1: new Array(H).fill(0).map(() => 0.1 * gauss(r)), W2: Array.from({ length: H }, () => gauss(r) * Math.sqrt(1 / H)), b2: 0 };
    const z = () => ({ W1: net.W1.map(() => [0, 0]), b1: new Array(H).fill(0), W2: new Array(H).fill(0), b2: 0 });
    opt = { m: z(), v: z(), t: 0 }; losses = []; epoch = 0;
  };
  const fwd = x => { const A = act.value; const a1 = net.W1.map((w, j) => f[A](w[0] * x[0] + w[1] * x[1] + net.b1[j])); const z2 = a1.reduce((s, a, j) => s + a * net.W2[j], net.b2); return { a1, p: 1 / (1 + Math.exp(-z2)) }; };
  const step = () => {
    const A = act.value, H = net.H, g = { W1: net.W1.map(() => [0, 0]), b1: new Array(H).fill(0), W2: new Array(H).fill(0), b2: 0 };
    let L = 0;
    for (let i = 0; i < n; i++) {
      const { a1, p } = fwd(X[i]); const y = Y[i];
      L += -(y ? Math.log(Math.max(p, 1e-9)) : Math.log(Math.max(1 - p, 1e-9)));
      const dz2 = p - y; g.b2 += dz2;
      for (let j = 0; j < H; j++) { g.W2[j] += dz2 * a1[j]; const dz1 = dz2 * net.W2[j] * df[A](a1[j]); g.b1[j] += dz1; g.W1[j][0] += dz1 * X[i][0]; g.W1[j][1] += dz1 * X[i][1]; }
    }
    const eta = +lr.value, b1 = 0.9, b2 = 0.999; opt.t++;
    const upd = (path, gv, getW, setW) => { const m = b1 * path.m + (1 - b1) * gv, v = b2 * path.v + (1 - b2) * gv * gv; path.m = m; path.v = v; const mh = m / (1 - b1 ** opt.t), vh = v / (1 - b2 ** opt.t); setW(getW() - eta * mh / (Math.sqrt(vh) + 1e-8)); };
    for (let j = 0; j < H; j++) {
      for (let k = 0; k < 2; k++) { const s = { m: opt.m.W1[j][k], v: opt.v.W1[j][k] }; upd(s, g.W1[j][k] / n, () => net.W1[j][k], v => net.W1[j][k] = v); opt.m.W1[j][k] = s.m; opt.v.W1[j][k] = s.v; }
      let s = { m: opt.m.b1[j], v: opt.v.b1[j] }; upd(s, g.b1[j] / n, () => net.b1[j], v => net.b1[j] = v); opt.m.b1[j] = s.m; opt.v.b1[j] = s.v;
      s = { m: opt.m.W2[j], v: opt.v.W2[j] }; upd(s, g.W2[j] / n, () => net.W2[j], v => net.W2[j] = v); opt.m.W2[j] = s.m; opt.v.W2[j] = s.v;
    }
    const s = { m: opt.m.b2, v: opt.v.b2 }; upd(s, g.b2 / n, () => net.b2, v => net.b2 = v); opt.m.b2 = s.m; opt.v.b2 = s.v;
    epoch++; losses.push(L / n);
  };
  const draw = () => {
    let { x, w, h } = prep(c);
    paintField(x, w, h, MOON_DOM, p => fwd([p[0] - 0.5, p[1] - 0.25]).p, 7);
    drawPoints(x, w, h, MOON_DOM, MOON_TR);
    ({ x, w, h } = prep(cL));
    const pad = { l: 34, r: 8, t: 16, b: 20 }; frame(x, w, h, pad);
    text(x, "loss (cross-entropy)", pad.l, 11, css("--ink")); text(x, "epochs →", w - 60, h - 5);
    const mx = Math.max(0.8, ...losses.slice(0, 1)), N = Math.max(200, losses.length);
    const sx = lin(0, N, pad.l, w - pad.r), sy = lin(0, mx, h - pad.b, pad.t);
    [0, 0.4, 0.8].forEach(v => text(x, v.toFixed(1), 4, sy(v) + 4));
    x.strokeStyle = css("--c1"); x.lineWidth = 2; x.beginPath(); losses.forEach((v, i) => i ? x.lineTo(sx(i), sy(Math.min(v, mx))) : x.moveTo(sx(0), sy(Math.min(v, mx)))); x.stroke(); x.lineWidth = 1;
    const acc = accOf(p => fwd([p[0] - 0.5, p[1] - 0.25]).p, MOON_TR), tacc = accOf(p => fwd([p[0] - 0.5, p[1] - 0.25]).p, MOON_TE);
    setStats(st, [["Epoch", epoch], ["Loss", losses.length ? losses[losses.length - 1].toFixed(3) : "–"], ["Train accuracy", acc.toFixed(3)], ["Test accuracy", tacc.toFixed(3)], ["Parameters", net.H * 4 + 1]]);
  };
  const loop = () => { for (let i = 0; i < 4; i++) step(); draw(); if (running && epoch < 3000) raf = requestAnimationFrame(loop); else { running = false; bt.textContent = "Train"; } };
  bt.addEventListener("click", () => { running = !running; bt.textContent = running ? "Pause" : "Train"; if (running) loop(); else cancelAnimationFrame(raf); });
  const hardReset = () => { running = false; cancelAnimationFrame(raf); bt.textContent = "Train"; reset(); draw(); };
  br.addEventListener("click", hardReset); sh.addEventListener("change", hardReset); act.addEventListener("change", hardReset); lr.addEventListener("change", () => { });
  reset(); onDraw(draw);
};

VIZ["backprop-calc"] = box => {
  head(box, "Backprop calculator: one neuron", "Change the input, weight, bias and label. The forward pass, every chain-rule factor and the update are recomputed. Press Apply update repeatedly and watch the loss fall.");
  const ctrl = ctrlRow(box);
  const sx_ = slider(ctrl, "bp-x", "x", -3, 3, 0.1, 2, v => v.toFixed(1));
  const sw = slider(ctrl, "bp-w", "w", -2, 2, 0.01, 0.5, v => v.toFixed(2));
  const sb = slider(ctrl, "bp-b", "b", -2, 2, 0.01, 0, v => v.toFixed(2));
  const sy_ = selectBox(ctrl, "bp-y", "label y", [[1, "1"], [0, "0"]], 1);
  const sl = selectBox(ctrl, "bp-lr", "learning rate η", [[0.1, "0.1"], [0.5, "0.5"], [1, "1.0"]], 0.1);
  const ap = button(ctrl, "Apply update", "btn solid");
  const out = el("div", { class: "worked" }); box.appendChild(out);
  const sig = z => 1 / (1 + Math.exp(-z));
  const calc = () => { const x = +sx_.value, w = +sw.value, b = +sb.value, y = +sy_.value, eta = +sl.value; const z = w * x + b, p = sig(z), L = -(y ? Math.log(p) : Math.log(1 - p)); const dLdp = y ? -1 / p : 1 / (1 - p), dpdz = p * (1 - p), dz = p - y, dw = dz * x, db = dz; const w2 = w - eta * dw, b2 = b - eta * db, p2 = sig(w2 * x + b2), L2 = -(y ? Math.log(p2) : Math.log(1 - p2)); return { x, w, b, y, eta, z, p, L, dLdp, dpdz, dz, dw, db, w2, b2, p2, L2 }; };
  const draw = () => {
    const q = calc(), f = v => v.toFixed(3);
    out.innerHTML = `<b>Forward</b><p>z = w·x + b = ${f(q.w)}·${q.x.toFixed(1)} + ${f(q.b)} = <strong>${f(q.z)}</strong> → p = σ(z) = <strong>${f(q.p)}</strong> → loss = −${q.y ? "ln p" : "ln(1 − p)"} = <strong>${f(q.L)}</strong></p>
    <b>Backward (chain rule)</b><p>∂L/∂p = ${f(q.dLdp)} · ∂p/∂z = p(1−p) = ${f(q.dpdz)} → ∂L/∂z = ${f(q.dLdp * q.dpdz)} (= p − y = ${f(q.dz)})</p><p>∂L/∂w = ∂L/∂z · x = <strong>${f(q.dw)}</strong> · ∂L/∂b = <strong>${f(q.db)}</strong></p>
    <b>Update</b><p>w ← ${f(q.w)} − ${q.eta}·(${f(q.dw)}) = <strong>${f(q.w2)}</strong> · b ← <strong>${f(q.b2)}</strong> · new p = ${f(q.p2)}, new loss = <strong>${f(q.L2)}</strong> (${q.L2 < q.L ? "down" : "up: learning rate too high?"})</p>`;
  };
  [sx_, sw, sb].forEach(s => s.addEventListener("input", draw)); [sy_, sl].forEach(s => s.addEventListener("change", draw));
  ap.addEventListener("click", () => { const q = calc(); sw.value = Math.max(-2, Math.min(2, q.w2)); sb.value = Math.max(-2, Math.min(2, q.b2)); sw.dispatchEvent(new Event("input")); sb.dispatchEvent(new Event("input")); });
  draw();
};

VIZ["act-plot"] = box => {
  head(box, "Activation functions and their derivatives", "Solid line = the function, dashed = its derivative. The derivative is what multiplies the gradient at every layer during backprop.");
  const c = addCanvas(box, 240, "Activation function plot");
  const ctrl = ctrlRow(box);
  const s = selectBox(ctrl, "act-s", "Function", [["sigmoid", "Sigmoid"], ["tanh", "Tanh"], ["relu", "ReLU"], ["leaky", "Leaky ReLU (0.1)"], ["gelu", "GELU"], ["silu", "SiLU / Swish"]], "sigmoid");
  const st = statsRow(box);
  const sg = z => 1 / (1 + Math.exp(-z)), erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const F = { sigmoid: sg, tanh: Math.tanh, relu: z => Math.max(0, z), leaky: z => z > 0 ? z : 0.1 * z, gelu: z => 0.5 * z * (1 + erf(z / Math.SQRT2)), silu: z => z * sg(z) };
  const D = k => z => (F[k](z + 1e-4) - F[k](z - 1e-4)) / 2e-4;
  const note_ = { sigmoid: "Max derivative 0.25 at z = 0, near 0 beyond |z| > 5: vanishing gradients.", tanh: "Zero-centred, max derivative 1 at 0, still saturates for large |z|.", relu: "Derivative exactly 1 for z > 0 and 0 for z < 0: no saturation on the positive side, but dead neurons possible.", leaky: "Small slope for negatives keeps a gradient alive.", gelu: "Smooth ReLU-like curve used in BERT and GPT.", silu: "z·σ(z); smooth, slightly non-monotonic; used in SwiGLU." };
  const draw = () => {
    const k = s.value, { x, w, h } = prep(c), pad = { l: 26, r: 10, t: 10, b: 20 };
    const sx = lin(-5, 5, pad.l, w - pad.r), sy = lin(-1.5, 3, h - pad.b, pad.t);
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(pad.l, sy(0)); x.lineTo(w - pad.r, sy(0)); x.moveTo(sx(0), pad.t); x.lineTo(sx(0), h - pad.b); x.stroke();
    [-1, 1, 2, 3].forEach(v => text(x, String(v), sx(0) - 18, sy(v) + 4)); [-4, -2, 2, 4].forEach(v => text(x, String(v), sx(v) - 4, h - 5));
    [[F[k], [], "--c1"], [D(k), [5, 4], "--c2"]].forEach(([fn, dash, col]) => { x.strokeStyle = css(col); x.lineWidth = 2.4; x.setLineDash(dash); x.beginPath(); for (let i = 0; i <= 300; i++) { const z = -5 + 10 * i / 300, v = Math.max(-1.5, Math.min(3, fn(z))); i ? x.lineTo(sx(z), sy(v)) : x.moveTo(sx(z), sy(v)); } x.stroke(); x.setLineDash([]); });
    x.lineWidth = 1; text(x, "f(z)", w - 50, 20, css("--c1")); text(x, "f′(z)", w - 50, 34, css("--c2"));
    let md = 0; for (let z = -5; z <= 5; z += 0.01) md = Math.max(md, D(k)(z));
    setStats(st, [["f′ at z = 0", D(k)(0).toFixed(3)], ["f′ at z = 4", D(k)(4).toFixed(3)], ["Max f′", md.toFixed(2)], ["10 layers × max f′", (md ** 10).toExponential(1)]]);
    note.textContent = note_[k];
  };
  const note = el("p", { class: "note" }); box.appendChild(note);
  s.addEventListener("change", draw); onDraw(draw);
};

VIZ["init-sim"] = box => {
  head(box, "Activation size through 15 layers", "A random batch is pushed through 15 dense layers of 100 units. The bars show the standard deviation of the activations at each layer (log scale). Good initialisation keeps them roughly flat.");
  const c = addCanvas(box, 220, "Activation standard deviation per layer");
  const ctrl = ctrlRow(box);
  const init = selectBox(ctrl, "in-i", "Initialisation", [["small", "Too small: N(0, 0.01²)"], ["xavier", "Xavier: Var = 1/n"], ["he", "He: Var = 2/n"], ["big", "Too large: N(0, 1)"]], "he");
  const act = selectBox(ctrl, "in-a", "Activation", [["relu", "ReLU"], ["tanh", "tanh"]], "relu");
  const st = statsRow(box);
  const draw = () => {
    const r = mkRng(3), n = 100, B = 50, Ls = 15;
    let A = Array.from({ length: B }, () => Array.from({ length: n }, () => gauss(r)));
    const sdv = { small: 0.01, xavier: Math.sqrt(1 / n), he: Math.sqrt(2 / n), big: 1 }[init.value], stds = [];
    for (let l = 0; l < Ls; l++) {
      const W = Array.from({ length: n }, () => Array.from({ length: n }, () => gauss(r) * sdv));
      A = A.map(row => W.map(wr => { let z = 0; for (let j = 0; j < n; j++) z += wr[j] * row[j]; return act.value === "relu" ? Math.max(0, z) : Math.tanh(z); }));
      let s = 0, m = 0, cnt = B * n; A.forEach(row => row.forEach(v => { m += v; })); m /= cnt; A.forEach(row => row.forEach(v => { s += (v - m) ** 2; })); stds.push(Math.sqrt(s / cnt));
    }
    const { x, w, h } = prep(c), pad = { l: 44, r: 8, t: 12, b: 22 };
    const lo = -12, hi = 3, sy = v => lin(lo, hi, h - pad.b, pad.t)(Math.max(lo, Math.min(hi, Math.log10(Math.max(v, 1e-12)))));
    frame(x, w, h, pad);
    [-12, -8, -4, 0].forEach(v => { text(x, "1e" + v, 2, sy(10 ** v) + 4); x.strokeStyle = css("--line"); x.globalAlpha = .5; x.beginPath(); x.moveTo(pad.l, sy(10 ** v)); x.lineTo(w - pad.r, sy(10 ** v)); x.stroke(); x.globalAlpha = 1; });
    const bw = (w - pad.l - pad.r) / Ls;
    stds.forEach((v, i) => { x.fillStyle = v < 1e-3 || v > 1e2 ? css("--bad") : css("--c1"); x.fillRect(pad.l + i * bw + 3, sy(v), bw - 6, h - pad.b - sy(v)); text(x, String(i + 1), pad.l + i * bw + bw / 2 - 4, h - 6); });
    setStats(st, [["Layer 1 std", stds[0].toExponential(1)], ["Layer 15 std", stds[Ls - 1].toExponential(1)], ["Verdict", stds[Ls - 1] < 1e-3 ? "Vanishing" : stds[Ls - 1] > 1e2 ? "Exploding" : "Stable"]]);
  };
  init.addEventListener("change", draw); act.addEventListener("change", draw); onDraw(draw);
};

VIZ["opt-race"] = box => {
  head(box, "Optimisers in a narrow valley", "Loss f(x, y) = x²/20 + y²: gentle along x, steep along y. All start at the same point. Drag Steps to replay. Raise the SGD learning rate above 1.0 and SGD diverges along the steep direction.");
  const c = addCanvas(box, 280, "Optimiser paths on a loss surface");
  const ctrl = ctrlRow(box);
  const sl = slider(ctrl, "op-lr", "SGD / momentum learning rate", 0.05, 1.1, 0.05, 0.9, v => v.toFixed(2));
  const ss = slider(ctrl, "op-s", "Steps", 1, 80, 1, 40);
  const st = statsRow(box);
  legend(box, [["--muted", "SGD"], ["--c2", "Momentum (β 0.9, lr × 0.1)"], ["--k3", "RMSProp (lr 0.1)"], ["--c1", "Adam (lr 0.3)"]]);
  const F = (x, y) => x * x / 20 + y * y, G = (x, y) => [x / 10, 2 * y], start = [-9, 2.2];
  const run = (kind, lr, N) => {
    let [x, y] = start, vx = 0, vy = 0, sx2 = 0, sy2 = 0, mx = 0, my = 0, t = 0; const P = [[x, y]];
    for (let i = 0; i < N; i++) {
      const [gx, gy] = G(x, y); t++;
      if (kind === "sgd") { x -= lr * gx; y -= lr * gy; }
      if (kind === "mom") { vx = 0.9 * vx + gx; vy = 0.9 * vy + gy; x -= lr * 0.1 * vx; y -= lr * 0.1 * vy; }
      if (kind === "rms") { sx2 = 0.9 * sx2 + 0.1 * gx * gx; sy2 = 0.9 * sy2 + 0.1 * gy * gy; x -= 0.1 * gx / (Math.sqrt(sx2) + 1e-8); y -= 0.1 * gy / (Math.sqrt(sy2) + 1e-8); }
      if (kind === "adam") { mx = 0.9 * mx + 0.1 * gx; my = 0.9 * my + 0.1 * gy; sx2 = 0.999 * sx2 + 0.001 * gx * gx; sy2 = 0.999 * sy2 + 0.001 * gy * gy; const mhx = mx / (1 - 0.9 ** t), mhy = my / (1 - 0.9 ** t), vhx = sx2 / (1 - 0.999 ** t), vhy = sy2 / (1 - 0.999 ** t); x -= 0.3 * mhx / (Math.sqrt(vhx) + 1e-8); y -= 0.3 * mhy / (Math.sqrt(vhy) + 1e-8); }
      if (!isFinite(x) || !isFinite(y) || Math.abs(y) > 1e6) { P.push([x, y]); break; }
      P.push([x, y]);
    }
    return P;
  };
  const draw = () => {
    const lr = +sl.value, N = +ss.value, { x, w, h } = prep(c);
    const sx = lin(-10.5, 3, 10, w - 10), sy = lin(-3, 3, h - 10, 10);
    [0.2, 0.8, 1.8, 3.2, 5].forEach(L => { x.strokeStyle = css("--line"); x.beginPath(); for (let i = 0; i <= 100; i++) { const t = 2 * Math.PI * i / 100, a = Math.sqrt(20 * L) * Math.cos(t), b = Math.sqrt(L) * Math.sin(t); i ? x.lineTo(sx(a), sy(b)) : x.moveTo(sx(a), sy(b)); } x.stroke(); });
    dot(x, sx(0), sy(0), 4, css("--ink")); text(x, "minimum", sx(0) + 6, sy(0) - 6, css("--ink"));
    const res = [];
    [["sgd", "--muted"], ["mom", "--c2"], ["rms", "--k3"], ["adam", "--c1"]].forEach(([k, col]) => {
      const P = run(k, lr, N); x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip();
      x.strokeStyle = css(col); x.lineWidth = 2; x.beginPath(); P.forEach(([a, b], i) => { const cb = Math.max(-50, Math.min(50, b)); i ? x.lineTo(sx(a), sy(cb)) : x.moveTo(sx(a), sy(cb)); }); x.stroke(); x.restore(); x.lineWidth = 1;
      const [a, b] = P[P.length - 1]; dot(x, sx(Math.max(-10.5, Math.min(3, a))), sy(Math.max(-3, Math.min(3, b))), 4, css(col), css("--surface"));
      const L = F(a, b); res.push(isFinite(L) && L < 1e6 ? L.toFixed(4) : "diverged");
    });
    dot(x, sx(start[0]), sy(start[1]), 5, null, css("--ink"));
    setStats(st, [["SGD loss", res[0]], ["Momentum loss", res[1]], ["RMSProp loss", res[2]], ["Adam loss", res[3]]]);
  };
  sl.addEventListener("input", draw); ss.addEventListener("input", draw); onDraw(draw);
};

VIZ["norm-axes"] = box => {
  head(box, "Which numbers get normalised together?", "Rows are examples in a batch, columns are features. BatchNorm takes the mean and variance down a column (one feature, across the batch). LayerNorm takes them across a row (one example, across its features).");
  const ctrl = ctrlRow(box);
  const s = selectBox(ctrl, "na-s", "Show", [["bn", "BatchNorm"], ["ln", "LayerNorm"]], "bn");
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap);
  const nt = note(box, "");
  const M = [[2, 10, -1, 4, 0.5], [3, 14, 0, 6, 0.4], [1, 9, -2, 5, 0.6], [4, 11, 1, 3, 0.5]];
  const draw = () => {
    const bn = s.value === "bn", hi = bn ? { c: 1 } : { r: 1 };
    const sel = bn ? M.map(r => r[1]) : M[1], mu = sel.reduce((a, b) => a + b, 0) / sel.length, sd = Math.sqrt(sel.reduce((a, b) => a + (b - mu) ** 2, 0) / sel.length);
    wrap.innerHTML = `<table><tr><th></th>${M[0].map((_, j) => `<th class="num">feature ${j + 1}</th>`).join("")}</tr>${M.map((r, i) => `<tr><th>example ${i + 1}</th>${r.map((v, j) => { const on = bn ? j === hi.c : i === hi.r; return `<td class="num" style="${on ? "background:var(--accent-soft);font-weight:600;color:var(--accent)" : ""}">${on ? `${v} → ${((v - mu) / sd).toFixed(2)}` : v}</td>`; }).join("")}</tr>`).join("")}</table>`;
    nt.textContent = bn ? `BatchNorm, feature 2: mean ${mu.toFixed(2)}, std ${sd.toFixed(2)} across the 4 examples. With batch size 1 this is undefined, which is why BatchNorm needs reasonable batches and uses running averages at inference.` : `LayerNorm, example 2: mean ${mu.toFixed(2)}, std ${sd.toFixed(2)} across its 5 features. Each example (token) is normalised on its own, so batch size doesn't matter.`;
  };
  s.addEventListener("change", draw); draw();
};

VIZ["conv-demo"] = box => {
  head(box, "A 3 × 3 filter sliding over an image", "8 × 8 input (an L-shaped bright stroke). Pick a filter and click any cell of the 6 × 6 output to see the exact multiply-and-sum at that position. Teal = positive response, orange = negative.");
  const ctrl = ctrlRow(box);
  const ks = selectBox(ctrl, "cv-k", "Filter", [["v", "Vertical edge"], ["h", "Horizontal edge"], ["blur", "Blur (average)"], ["sharp", "Sharpen"]], "v");
  const cols = el("div", { class: "cols" }); box.appendChild(cols);
  const inBox = el("div"), outBox = el("div"); cols.appendChild(inBox); cols.appendChild(outBox);
  const calc = el("div", { class: "worked" }); box.appendChild(calc);
  const I = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (c >= 2 && c <= 3 && r >= 1 && r <= 6) || (r >= 5 && r <= 6 && c >= 2 && c <= 6) ? 1 : 0));
  const K = { v: [[1, 0, -1], [1, 0, -1], [1, 0, -1]], h: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]], blur: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]], sharp: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] };
  let pos = [1, 1];
  const grid = (data, cell, colorFn, onClick, hl) => {
    const g = el("div", { style: `display:grid;grid-template-columns:repeat(${data[0].length},${cell}px);gap:2px;margin:6px 0` });
    data.forEach((row, r) => row.forEach((v, c) => { const d = el(onClick ? "button" : "div", { style: `width:${cell}px;height:${cell}px;border-radius:3px;border:${hl && hl(r, c) ? "2px solid var(--ink)" : "1px solid var(--line)"};${colorFn(v)};font:500 9px/1 var(--f-mono);display:flex;align-items:center;justify-content:center;padding:0;color:var(--ink);cursor:${onClick ? "pointer" : "default"}`, ...(onClick ? { type: "button", "aria-label": `output ${r + 1},${c + 1}` } : {}) }, onClick ? (Math.abs(v) < 0.005 ? "0" : v.toFixed(1)) : ""); if (onClick) d.addEventListener("click", () => onClick(r, c)); g.appendChild(d); }));
    return g;
  };
  const draw = () => {
    const k = K[ks.value], O = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => { let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += I[r + i][c + j] * k[i][j]; return s; }));
    const mx = Math.max(...O.flat().map(Math.abs), 1e-6);
    inBox.innerHTML = '<div class="eyebrow">Input 8 × 8</div>'; outBox.innerHTML = '<div class="eyebrow">Output 6 × 6 (click a cell)</div>';
    inBox.appendChild(grid(I, 22, v => `background:${v ? "var(--ink)" : "var(--bg)"}`, null, (r, c) => r >= pos[0] && r < pos[0] + 3 && c >= pos[1] && c < pos[1] + 3));
    outBox.appendChild(grid(O, 30, v => `background:color-mix(in srgb, var(${v >= 0 ? "--c1" : "--c2"}) ${Math.round(70 * Math.abs(v) / mx)}%, var(--bg))`, (r, c) => { pos = [r, c]; draw(); }, (r, c) => r === pos[0] && c === pos[1]));
    const terms = []; let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const a = I[pos[0] + i][pos[1] + j], b = k[i][j]; s += a * b; if (a && b) terms.push(`${a}×${Number.isInteger(b) ? b : b.toFixed(2)}`); }
    calc.innerHTML = `<b>Output (${pos[0] + 1}, ${pos[1] + 1})</b><p>Kernel: ${k.map(r => "[" + r.map(v => Number.isInteger(v) ? v : v.toFixed(2)).join(", ") + "]").join(" ")}</p><p>Sum of input × kernel over the 3 × 3 window (non-zero terms): ${terms.join(" + ") || "all zero"} = <strong>${s.toFixed(2)}</strong></p><p>Output size = (8 − 3)/1 + 1 = 6. This one filter has 9 weights + 1 bias, reused at all 36 positions.</p>`;
  };
  ks.addEventListener("change", draw); draw();
};

VIZ["rnn-decay"] = box => {
  head(box, "How much gradient survives t steps back?", "Vanilla RNN: the gradient is multiplied by roughly the same factor every step. LSTM: along the cell state it's multiplied by the forget gate, which the network can learn to keep near 1.");
  const c = addCanvas(box, 220, "Gradient magnitude over time steps");
  const ctrl = ctrlRow(box);
  const sr = slider(ctrl, "rn-r", "RNN factor per step", 0.5, 1.2, 0.01, 0.9, v => v.toFixed(2));
  const sf = slider(ctrl, "rn-f", "LSTM forget gate", 0.8, 1, 0.005, 0.98, v => v.toFixed(3));
  const st = statsRow(box);
  legend(box, [["--c2", "Vanilla RNN"], ["--c1", "LSTM cell path"]]);
  const draw = () => {
    const a = +sr.value, f = +sf.value, T = 60, { x, w, h } = prep(c), pad = { l: 44, r: 10, t: 12, b: 22 };
    const sx = lin(0, T, pad.l, w - pad.r), sy = v => lin(-8, 3, h - pad.b, pad.t)(Math.max(-8, Math.min(3, Math.log10(v))));
    frame(x, w, h, pad); [-8, -6, -4, -2, 0, 2].forEach(v => text(x, "1e" + v, 4, sy(10 ** v) + 4)); [0, 20, 40, 60].forEach(t => text(x, String(t), sx(t) - 6, h - 6)); text(x, "steps back →", w - 90, h - 6);
    [[a, "--c2"], [f, "--c1"]].forEach(([k, col]) => { x.strokeStyle = css(col); x.lineWidth = 2.2; x.beginPath(); for (let t = 0; t <= T; t++) t ? x.lineTo(sx(t), sy(k ** t)) : x.moveTo(sx(0), sy(1)); x.stroke(); });
    x.lineWidth = 1;
    setStats(st, [["RNN after 50 steps", (a ** 50).toExponential(1)], ["LSTM after 50 steps", (f ** 50).toExponential(1)], ["RNN verdict", a ** 50 < 1e-3 ? "Vanishing" : a ** 50 > 100 ? "Exploding" : "OK"]]);
  };
  sr.addEventListener("input", draw); sf.addEventListener("input", draw); onDraw(draw);
};

/* ================= GENAI VISUALS ================= */
VIZ["bpe-demo"] = box => {
  head(box, "Byte-Pair Encoding, merge by merge", "Toy corpus: low ×5, lower ×2, newest ×6, widest ×3 (_ marks the end of a word). Each step merges the most frequent adjacent pair into a new token.");
  const ctrl = ctrlRow(box);
  const nx = button(ctrl, "Next merge", "btn solid"), rs = button(ctrl, "Reset");
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap);
  const st = statsRow(box);
  const corpus = [["low", 5], ["lower", 2], ["newest", 6], ["widest", 3]];
  let words, merges;
  const reset = () => { words = corpus.map(([w, c]) => [[...w, "_"], c]); merges = []; };
  const pairs = () => { const m = new Map(); words.forEach(([s, c]) => { for (let i = 0; i < s.length - 1; i++) { const k = s[i] + "\u0001" + s[i + 1]; m.set(k, (m.get(k) || 0) + c); } }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const merge = () => { const p = pairs(); if (!p.length) return; const [k, cnt] = p[0]; const [a, b] = k.split("\u0001"); merges.push(`${a} + ${b} → ${a + b} (${cnt})`); words = words.map(([s, c]) => { const o = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { o.push(a + b); i++; } else o.push(s[i]); } return [o, c]; }); };
  const draw = () => {
    const p = pairs().slice(0, 4), vocab = new Set(); words.forEach(([s]) => s.forEach(t => vocab.add(t)));
    wrap.innerHTML = `<table><tr><th>Word</th><th class="num">Count</th><th>Current tokens</th></tr>${words.map(([s, c], i) => `<tr><td>${corpus[i][0]}</td><td class="num">${c}</td><td>${s.map(t => `<code>${t}</code>`).join(" ")}</td></tr>`).join("")}</table>`;
    setStats(st, [["Merges done", merges.length], ["Last merge", merges[merges.length - 1] || "–"], ["Next most frequent pairs", p.map(([k, c]) => k.replace("\u0001", "") + " " + c).join(", ") || "none"], ["Tokens in use", vocab.size]]);
    nx.disabled = !p.length;
  };
  nx.addEventListener("click", () => { merge(); draw(); }); rs.addEventListener("click", () => { reset(); draw(); });
  reset(); draw();
};

VIZ["attn-heatmap"] = box => {
  head(box, "Attention weights for a sentence", "Each row is a query token, each column a key token; darker = more attention. Click a row to see its weights. Turn the causal mask on to see a decoder's triangle; turn √d_k scaling off to see softmax collapse onto one token. (Illustrative scores, not from a real model.)");
  const c = addCanvas(box, 300, "Attention heatmap");
  const ctrl = ctrlRow(box);
  const cm = checkbox(ctrl, "at-m", "Causal mask", false), sc = checkbox(ctrl, "at-s", "Divide by √d_k (d_k = 64)", true);
  const st = statsRow(box);
  const T = ["The", "cat", "sat", "because", "it", "was", "tired"], n = T.length, r = mkRng(12);
  const S = T.map((_, i) => T.map((_, j) => (i === j ? 1.0 : 0.15 + 0.6 * r())));
  S[4][1] = 2.4; S[4][4] = 1.0; S[6][1] = 1.5; S[6][4] = 1.7; S[6][5] = 1.2; S[2][1] = 1.6; S[5][4] = 1.4; S[3][2] = 1.2;
  let sel = 4, cells = null;
  const weights = () => S.map((row, i) => { const z = row.map((v, j) => cm.checked && j > i ? -Infinity : v * (sc.checked ? 1 : 8)); const m = Math.max(...z.filter(isFinite)); const e = z.map(v => isFinite(v) ? Math.exp(v - m) : 0); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); });
  const draw = () => {
    const A = weights(), { x, w, h } = prep(c);
    const lab = 62, top = 52, cs = Math.min((w - lab - 10) / n, (h - top - 6) / n);
    cells = { lab, top, cs };
    T.forEach((t, j) => { x.save(); x.translate(lab + j * cs + cs / 2 + 3, top - 6); x.rotate(-Math.PI / 4); text(x, t, 0, 0, css("--ink")); x.restore(); });
    T.forEach((t, i) => text(x, t, 2, top + i * cs + cs / 2 + 4, i === sel ? css("--accent") : css("--ink")));
    A.forEach((row, i) => row.forEach((v, j) => { x.fillStyle = css("--bg"); x.fillRect(lab + j * cs + 1, top + i * cs + 1, cs - 2, cs - 2); x.globalAlpha = Math.min(1, v * 1.6); x.fillStyle = css("--c1"); x.fillRect(lab + j * cs + 1, top + i * cs + 1, cs - 2, cs - 2); x.globalAlpha = 1; if (cs > 34) text(x, v.toFixed(2), lab + j * cs + cs / 2, top + i * cs + cs / 2 + 4, v > 0.45 ? css("--surface") : css("--muted"), "center"); }));
    x.strokeStyle = css("--accent"); x.lineWidth = 2; x.strokeRect(lab, top + sel * cs, n * cs, cs); x.lineWidth = 1;
    const row = A[sel], best = row.indexOf(Math.max(...row));
    setStats(st, [["Query", `“${T[sel]}”`], ["Most attended", `“${T[best]}” (${row[best].toFixed(2)})`], ["Row sums to", row.reduce((a, b) => a + b, 0).toFixed(2)], ["Max weight in row", Math.max(...row).toFixed(2)]]);
  };
  c.addEventListener("click", e => { if (!cells) return; const rect = c.getBoundingClientRect(), y = e.clientY - rect.top; const i = Math.floor((y - cells.top) / cells.cs); if (i >= 0 && i < n) { sel = i; draw(); } });
  cm.addEventListener("change", draw); sc.addEventListener("change", draw); onDraw(draw);
};

VIZ["decode-demo"] = box => {
  head(box, "Next-token sampling controls", "Prompt: “The patient was prescribed a new …”. Grey bars = the model's original probabilities (illustrative). Teal bars = what's left after temperature, top-k and top-p, renormalised. Sample to see what comes out.");
  const c = addCanvas(box, 260, "Next token probabilities");
  const ctrl = ctrlRow(box);
  const sT = slider(ctrl, "dc-t", "Temperature", 0.1, 2, 0.05, 1, v => v.toFixed(2));
  const sK = slider(ctrl, "dc-k", "Top-k", 1, 10, 1, 10);
  const sP = slider(ctrl, "dc-p", "Top-p", 0.1, 1, 0.01, 1, v => v.toFixed(2));
  const b1 = button(ctrl, "Sample 1", "btn solid"), b20 = button(ctrl, "Sample 20");
  const st = statsRow(box); const out = note(box, "");
  const toks = ["drug", "treatment", "medication", "therapy", "dose", "regimen", "inhaler", "bicycle", "banana", "keyboard"], logits = [3.0, 2.6, 2.4, 2.1, 1.5, 1.2, 0.6, -1.0, -2.0, -2.5];
  const sm = (z, T) => { const m = Math.max(...z); const e = z.map(v => Math.exp((v - m) / T)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
  const dist = () => {
    const p = sm(logits, +sT.value), order = p.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]), keep = new Set();
    let cum = 0; for (let r = 0; r < order.length; r++) { if (r >= +sK.value) break; keep.add(order[r][1]); cum += order[r][0]; if (cum >= +sP.value) break; }
    const z = p.map((v, i) => keep.has(i) ? v : 0), s = z.reduce((a, b) => a + b, 0); return { base: sm(logits, 1), p, final: z.map(v => v / s), keep };
  };
  const draw = () => {
    const D = dist(), { x, w, h } = prep(c), pad = { l: 84, r: 50, t: 6, b: 6 }, rh = (h - pad.t - pad.b) / toks.length;
    const sx = lin(0, 1, pad.l, w - pad.r);
    toks.forEach((t, i) => {
      const y0 = pad.t + i * rh; text(x, t, 4, y0 + rh / 2 + 4, D.keep.has(i) ? css("--ink") : css("--muted"));
      x.fillStyle = css("--line"); x.fillRect(sx(0), y0 + 3, sx(D.base[i]) - sx(0), rh * 0.36);
      x.fillStyle = D.keep.has(i) ? css("--c1") : css("--line"); x.fillRect(sx(0), y0 + rh * 0.48, Math.max(D.keep.has(i) ? 2 : 0, sx(D.final[i]) - sx(0)), rh * 0.36);
      text(x, (100 * D.final[i]).toFixed(1) + "%", sx(D.final[i]) + 4, y0 + rh * 0.8, D.keep.has(i) ? css("--ink") : css("--muted"));
    });
    const H = -D.final.reduce((s, v) => s + (v > 0 ? v * Math.log2(v) : 0), 0);
    setStats(st, [["Tokens kept", D.keep.size + " / 10"], ["Top token prob", (100 * Math.max(...D.final)).toFixed(1) + "%"], ["Entropy (bits)", H.toFixed(2)]]);
  };
  const sample = k => { const D = dist(), res = []; for (let j = 0; j < k; j++) { let u = Math.random(), i = 0; while (i < 9 && u > D.final[i]) { u -= D.final[i]; i++; } res.push(toks[i]); } const cnt = {}; res.forEach(t => cnt[t] = (cnt[t] || 0) + 1); out.textContent = k === 1 ? `Sampled: “…a new ${res[0]}”` : "20 samples: " + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([t, v]) => `${t} ×${v}`).join(", "); };
  [sT, sK, sP].forEach(s => s.addEventListener("input", draw)); b1.addEventListener("click", () => sample(1)); b20.addEventListener("click", () => sample(20)); onDraw(draw);
};

VIZ["lora-calc"] = box => {
  head(box, "LoRA and memory calculator", "Trainable parameters when LoRA adapts the attention projections of a LLaMA-2-7B-like model (32 layers, d = 4096), and rough GPU memory for loading and fine-tuning models of different sizes.");
  const ctrl = ctrlRow(box);
  const sr = selectBox(ctrl, "lo-r", "Rank r", [1, 2, 4, 8, 16, 32, 64, 128].map(v => [v, String(v)]), 8);
  const sm = selectBox(ctrl, "lo-m", "Adapted matrices per layer", [[2, "q, v"], [4, "q, k, v, o"]], 2);
  const sz = selectBox(ctrl, "lo-s", "Model size", [[7, "7B"], [13, "13B"], [70, "70B"]], 7);
  const st = statsRow(box); const st2 = statsRow(box);
  const draw = () => {
    const r = +sr.value, m = +sm.value, d = 4096, L = 32, full = d * d * m * L, lora = r * (d + d) * m * L, P = +sz.value * 1e9;
    setStats(st, [["Full params of those matrices", (full / 1e6).toFixed(0) + "M"], ["LoRA trainable", (lora / 1e6).toFixed(2) + "M"], ["Share of whole 7B model", (100 * lora / 6.74e9).toFixed(3) + "%"], ["Adapter file (FP16)", (lora * 2 / 1e6).toFixed(1) + " MB"]]);
    setStats(st2, [["Load in FP16", (P * 2 / 1e9).toFixed(0) + " GB"], ["Load in 4-bit", (P * 0.5 / 1e9).toFixed(1) + " GB"], ["Full fine-tune (Adam, ~16 B/param)", (P * 16 / 1e9).toFixed(0) + " GB"], ["QLoRA (4-bit base + adapters)", "≈ " + (P * 0.5 / 1e9 * 1.3 + 2).toFixed(0) + " GB"]]);
  };
  [sr, sm, sz].forEach(s => s.addEventListener("change", draw)); draw();
  note(box, "Memory figures exclude activations and KV cache and are rough planning numbers. QLoRA estimate adds ~30% overhead for quantisation constants, adapters and optimiser state.");
};

VIZ["rag-flow"] = box => {
  head(box, "Click a stage", "The two RAG pipelines. Click any stage for what can go wrong there and how to check it.");
  const make = (title, items) => { const w = el("div", { style: "margin:8px 0" }); w.appendChild(el("div", { class: "eyebrow" }, title)); const r = el("div", { style: "display:flex;flex-wrap:wrap;gap:6px;align-items:center" }); items.forEach(([k, t], i) => { const b = el("button", { type: "button", class: "btn", "data-k": k }, t); r.appendChild(b); if (i < items.length - 1) r.appendChild(el("span", { style: "color:var(--muted)" }, "→")); }); w.appendChild(r); box.appendChild(w); };
  make("Indexing (offline)", [["load", "Load"], ["parse", "Parse"], ["chunk", "Chunk"], ["meta", "Metadata"], ["embed", "Embed"], ["store", "Store"]]);
  make("Answering (online)", [["rewrite", "Rewrite query"], ["retrieve", "Retrieve (hybrid)"], ["rerank", "Rerank"], ["context", "Build context"], ["generate", "Generate + cite"], ["check", "Check + log"]]);
  const d = el("div", { class: "worked", "aria-live": "polite" }); box.appendChild(d);
  const info = { load: ["Connectors for PDFs, SharePoint, Confluence, databases.", "Missing or stale sources; no versioning."], parse: ["Extract text, headings, tables; OCR scans.", "Tables flattened into nonsense, headers/footers repeated, columns merged. Inspect parsed output for 20 random pages."], chunk: ["Split into retrievable units (structure-aware, ~300–800 tokens).", "Chunks cut mid-thought or mix topics. Tune by retrieval recall@k."], meta: ["Source, page, section, date, version, product, access group.", "Without it: no filters, no citations, no access control."], embed: ["Same embedding model for documents and queries.", "Model weak for your domain/language; text truncated beyond its max length."], store: ["Vector index (HNSW) + BM25 index.", "Index not refreshed when documents change; deletes not propagated."], rewrite: ["Make follow-ups standalone, extract filters, expand acronyms.", "Vague or chatty questions retrieve nothing useful."], retrieve: ["Dense + BM25 with RRF, metadata filters, top 20–50.", "Gold chunk not in candidates → check recall@k first."], rerank: ["Cross-encoder reorders candidates, keep top 3–8.", "Without it, the best chunk sits at rank 15 and is cut."], context: ["Order by relevance, de-duplicate, add source labels, fit token budget.", "Too many chunks dilute the answer; 'lost in the middle'."], generate: ["Answer only from context, cite sources, say 'I don't know'.", "Model fills gaps from memory → faithfulness check."], check: ["Groundedness, guardrails, PII; trace everything (LangSmith).", "No traces = no way to debug."] };
  box.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b) return; $$("[data-k]", box).forEach(x => x.classList.toggle("solid", x === b)); const [what, fail] = info[b.dataset.k]; d.innerHTML = `<b>${b.textContent}</b><p>${what}</p><p><strong>What goes wrong:</strong> ${fail}</p>`; });
  $("[data-k=retrieve]", box).click();
};

VIZ["chunker"] = box => {
  head(box, "Chunk a document", "A short policy document (about 330 words). Change the strategy, size and overlap and see where the boundaries fall. Highlighted words at the start of a chunk are the overlap repeated from the previous chunk.");
  const ctrl = ctrlRow(box);
  const ss = selectBox(ctrl, "ch-s", "Strategy", [["fixed", "Fixed size (words)"], ["rec", "Recursive (paragraphs → sentences)"], ["struct", "By heading"]], "fixed");
  const sz = slider(ctrl, "ch-z", "Size (words)", 20, 160, 10, 60);
  const ov = slider(ctrl, "ch-o", "Overlap (words)", 0, 40, 5, 10);
  const st = statsRow(box);
  const list = el("div", { style: "display:grid;gap:8px;margin-top:8px" }); box.appendChild(list);
  const DOC = `## Travel policy\nEmployees may book economy class for flights under six hours. Business class is allowed for flights longer than six hours with manager approval. All bookings must be made through the corporate travel portal at least 14 days in advance.\n\nHotel stays are reimbursed up to ₹8,000 per night in metro cities and ₹5,000 per night elsewhere. Receipts are mandatory for every claim.\n\n## Conference attendance\nEach employee can attend up to two external conferences per year. Registration fees above ₹50,000 need director approval. Travel for conferences follows the travel policy above.\n\nAfter the conference, attendees share a one-page summary with their team within two weeks.\n\n## Meals and incidentals\nA daily allowance of ₹1,500 covers meals during business travel. Alcohol is not reimbursed. Client entertainment must be pre-approved and recorded with the names of all attendees.\n\n## Claims\nSubmit expense claims within 30 days of returning. Late claims are paid only with finance approval. Claims are reviewed monthly, and incorrect claims are returned to the employee with comments.`;
  const words = s => s.split(/\s+/).filter(Boolean);
  const draw = () => {
    const mode = ss.value, size = +sz.value, o = Math.min(+ov.value, size - 10); let chunks = [];
    ov.parentElement.style.display = mode === "fixed" ? "" : "none"; sz.parentElement.style.display = mode === "struct" ? "none" : "";
    if (mode === "fixed") { const W = words(DOC.replace(/## /g, "")); for (let i = 0; i < W.length; i += size - o) { chunks.push({ text: W.slice(i, i + size), ov: i ? o : 0 }); if (i + size >= W.length) break; } }
    if (mode === "rec") { const paras = DOC.replace(/## /g, "").split(/\n\n|\n/).filter(Boolean); let cur = []; const flush = () => { if (cur.length) chunks.push({ text: cur, ov: 0 }); cur = []; }; paras.forEach(p => { const pw = words(p); if (cur.length + pw.length <= size) { cur = cur.concat(pw); return; } flush(); if (pw.length <= size) { cur = pw; return; } p.split(/(?<=\.)\s+/).forEach(s => { const sw = words(s); if (cur.length + sw.length > size) flush(); cur = cur.concat(sw); }); }); flush(); }
    if (mode === "struct") { DOC.split(/\n(?=## )/).forEach(sec => chunks.push({ text: words(sec.replace("## ", "§ ")), ov: 0 })); }
    const cols = ["--c1", "--c2", "--k3", "--k4", "--k5", "--k6"];
    list.innerHTML = chunks.map((c, i) => `<div style="border:1px solid var(--line);border-left:4px solid var(${cols[i % 6]});border-radius:6px;padding:8px 10px;background:var(--surface);font-size:.86rem"><div class="eyebrow" style="color:var(${cols[i % 6]})">Chunk ${i + 1} · ${c.text.length} words · ≈ ${Math.round(c.text.length * 1.33)} tokens</div>${c.ov ? `<mark style="background:var(--warn-soft);color:var(--ink)">${c.text.slice(0, c.ov).join(" ")}</mark> ` : ""}${c.text.slice(c.ov).join(" ")}</div>`).join("");
    const avg = chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length;
    setStats(st, [["Chunks", chunks.length], ["Average size", avg.toFixed(0) + " words"], ["Mid-sentence cuts", chunks.slice(0, -1).filter(c => !/[.:]$/.test(c.text[c.text.length - 1])).length]]);
  };
  [sz, ov].forEach(s => s.addEventListener("input", draw)); ss.addEventListener("change", draw); draw();
};

VIZ["vec-search"] = box => {
  head(box, "Nearest-neighbour search in a toy embedding space", "Each dot is a document chunk embedded in 2D (real embeddings have hundreds of dimensions). Chunks on the same topic point in similar directions. Pick a query or click anywhere to place one. With un-normalised vectors, dot product favours long vectors and L2 favours nearby ones; cosine only cares about direction.");
  const c = addCanvas(box, 300, "Embedding space with query");
  const ctrl = ctrlRow(box);
  const qs = selectBox(ctrl, "vs-q", "Query", [["hotel", "“hotel limit in Mumbai?”"], ["ae", "“adverse events for drug X?”"], ["sales", "“Q3 sales by region?”"]], "hotel");
  const sk = slider(ctrl, "vs-k", "k", 1, 5, 1, 3);
  const mt = selectBox(ctrl, "vs-m", "Similarity", [["cos", "Cosine"], ["dot", "Dot product"], ["l2", "Euclidean (L2)"]], "cos");
  const st = statsRow(box); const lst = el("div", { class: "note" }); box.appendChild(lst);
  const docs = [["Hotel reimbursement caps", 18, 1.3], ["Flight class rules", 30, 1.0], ["Per-diem meal allowance", 8, 0.7], ["Conference travel", 40, 1.5], ["Visa letters", 52, 0.6],
  ["Adverse event reporting", 110, 1.2], ["Drug interaction table", 95, 0.8], ["Pharmacovigilance SOP", 125, 1.6], ["Dosage in renal impairment", 82, 0.9],
  ["Q3 regional sales", 210, 1.1], ["Market share dashboard", 195, 1.5], ["Territory targets", 228, 0.7], ["Forecast vs actuals", 245, 1.3]].map(([t, a, l]) => ({ t, v: [l * Math.cos(a * Math.PI / 180), l * Math.sin(a * Math.PI / 180)] }));
  const Qp = { hotel: [0.9, 0.35], ae: [-0.25, 1.0], sales: [-0.95, -0.45] };
  let q = Qp.hotel.slice();
  const sim = (a, b) => { const d = a[0] * b[0] + a[1] * b[1]; if (mt.value === "dot") return d; if (mt.value === "l2") return -Math.hypot(a[0] - b[0], a[1] - b[1]); return d / (Math.hypot(...a) * Math.hypot(...b)); };
  let scale = null;
  const draw = () => {
    const { x, w, h } = prep(c), S = Math.min(w, h) / 4.2, ox = w / 2, oy = h / 2; scale = { S, ox, oy };
    x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(0, oy); x.lineTo(w, oy); x.moveTo(ox, 0); x.lineTo(ox, h); x.stroke();
    const ranked = docs.map(d => ({ ...d, s: sim(q, d.v) })).sort((a, b) => b.s - a.s), top = new Set(ranked.slice(0, +sk.value).map(d => d.t));
    docs.forEach(d => { const px = ox + d.v[0] * S, py = oy - d.v[1] * S; x.strokeStyle = css("--line"); x.beginPath(); x.moveTo(ox, oy); x.lineTo(px, py); x.stroke(); dot(x, px, py, top.has(d.t) ? 6 : 4, top.has(d.t) ? css("--c1") : css("--muted"), css("--surface")); if (w > 420 || top.has(d.t)) text(x, d.t, px + 7, py + 4, top.has(d.t) ? css("--ink") : css("--muted")); });
    const qx = ox + q[0] * S, qy = oy - q[1] * S; x.strokeStyle = css("--c2"); x.lineWidth = 2; x.beginPath(); x.moveTo(ox, oy); x.lineTo(qx, qy); x.stroke(); x.lineWidth = 1; dot(x, qx, qy, 6, css("--c2"), css("--surface")); text(x, "query", qx + 8, qy - 6, css("--c2"));
    lst.innerHTML = "Top " + sk.value + ": " + ranked.slice(0, +sk.value).map((d, i) => `${i + 1}. ${d.t} (${d.s.toFixed(2)})`).join(" · ");
    setStats(st, [["Metric", mt.options[mt.selectedIndex].text], ["Query length", Math.hypot(...q).toFixed(2)]]);
  };
  qs.addEventListener("change", () => { q = Qp[qs.value].slice(); draw(); }); sk.addEventListener("input", draw); mt.addEventListener("change", draw);
  c.addEventListener("click", e => { const r = c.getBoundingClientRect(); q = [(e.clientX - r.left - scale.ox) / scale.S, -(e.clientY - r.top - scale.oy) / scale.S]; draw(); });
  onDraw(draw);
};

VIZ["rrf-calc"] = box => {
  head(box, "Reciprocal Rank Fusion calculator", "Two retrievers return different top-5 lists for the same query. RRF adds 1/(k + rank) from each list. Documents found by both rise to the top even if neither ranked them first.");
  const ctrl = ctrlRow(box);
  const sk = slider(ctrl, "rr-k", "k", 1, 100, 1, 60);
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap);
  const nt = note(box, "");
  const bm = ["D3", "D1", "D7", "D2", "D5"], dn = ["D1", "D4", "D3", "D6", "D2"];
  const draw = () => {
    const k = +sk.value, all = [...new Set([...bm, ...dn])];
    const rows = all.map(d => { const a = bm.indexOf(d) + 1, b = dn.indexOf(d) + 1, ca = a ? 1 / (k + a) : 0, cb = b ? 1 / (k + b) : 0; return { d, a, b, ca, cb, s: ca + cb }; }).sort((x, y) => y.s - x.s);
    wrap.innerHTML = `<table><tr><th>Doc</th><th class="num">BM25 rank</th><th class="num">Dense rank</th><th class="num">RRF score</th><th class="num">Fused</th></tr>${rows.map((r, i) => `<tr><td><strong>${r.d}</strong></td><td class="num">${r.a || "–"}</td><td class="num">${r.b || "–"}</td><td class="num" title="${r.ca.toFixed(4)} + ${r.cb.toFixed(4)}"><strong>${r.s.toFixed(4)}</strong><div style="font-size:.72rem;color:var(--muted)">${r.ca ? r.ca.toFixed(4) : "0"} + ${r.cb ? r.cb.toFixed(4) : "0"}</div></td><td class="num">#${i + 1}</td></tr>`).join("")}</table>`;
    nt.textContent = k < 10 ? "Small k makes the top ranks dominate: being #1 in one list matters much more than appearing in both." : "With k = 60 (the usual default), appearing in both lists matters more than being first in one.";
  };
  sk.addEventListener("input", draw); draw();
};

VIZ["react-trace"] = box => {
  head(box, "A ReAct agent, step by step", "Question: “Which of our top 3 oncology brands grew fastest last quarter, and what do recent field notes say about it?” Tools: sql_query, search_notes. Illustrative trace.");
  const ctrl = ctrlRow(box);
  const bp = button(ctrl, "← Back"), bn = button(ctrl, "Next step", "btn solid");
  const wrap = el("div", { style: "display:grid;gap:6px;margin-top:8px", "aria-live": "polite" }); box.appendChild(wrap);
  const S = [["Thought", "I need sales growth by brand for last quarter. That's structured data, so use SQL."], ["Action", 'sql_query("SELECT brand, qoq_growth FROM brand_sales WHERE quarter = \'2026-Q3\' ORDER BY revenue DESC LIMIT 3")'], ["Observation", "Brand A +3.1%, Brand B +7.4%, Brand C −0.8%"], ["Thought", "Brand B grew fastest. Now I need qualitative context from field notes about Brand B."], ["Action", 'search_notes(query="Brand B feedback", filters={"quarter": "2026-Q3"}, k=5)'], ["Observation", "5 notes: new reimbursement approval in two states; HCPs cite improved dosing schedule; supply delays in one region."], ["Thought", "I have both the number and the context. Answer with sources."], ["Answer", "Brand B grew fastest (+7.4% QoQ). Field notes link this to new reimbursement approvals in two states and positive feedback on the dosing schedule, with a supply-delay risk in one region. [sql: brand_sales 2026-Q3] [notes 1–5]"]];
  const col = { Thought: "--k3", Action: "--c2", Observation: "--c1", Answer: "--good" };
  let k = 1;
  const draw = () => { wrap.innerHTML = S.slice(0, k).map(([t, v]) => `<div style="border-left:3px solid var(${col[t]});background:var(--surface);border-radius:0 6px 6px 0;padding:6px 10px;font-size:.88rem"><span class="eyebrow" style="color:var(${col[t]})">${t}</span><div style="${t === "Action" ? "font-family:var(--f-mono);font-size:.8rem;overflow-wrap:anywhere" : ""}">${v.replace(/</g, "&lt;")}</div></div>`).join(""); bn.disabled = k >= S.length; bp.disabled = k <= 1; };
  bn.addEventListener("click", () => { k = Math.min(S.length, k + 1); draw(); }); bp.addEventListener("click", () => { k = Math.max(1, k - 1); draw(); }); draw();
};

VIZ["cost-calc"] = box => {
  head(box, "Monthly LLM cost estimator", "Prices are example values in US$ per million tokens; replace them with your provider's current prices. A cache hit is assumed to skip the LLM call entirely.");
  const ctrl = ctrlRow(box);
  const num = (id, label, val, step) => { const lab = el("label", { for: id }); lab.appendChild(document.createTextNode(label + " ")); const i = el("input", { type: "number", id, value: val, step, min: 0, style: "width:7em;font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)" }); lab.appendChild(i); ctrl.appendChild(lab); return i; };
  const rq = num("cc-r", "Requests/day", 5000, 100), ti = num("cc-i", "Input tokens/request", 4000, 100), to = num("cc-o", "Output tokens/request", 400, 50), pi = num("cc-pi", "Input $/1M", 3, 0.1), po = num("cc-po", "Output $/1M", 15, 0.5);
  const ctrl2 = ctrlRow(box); const ch = slider(ctrl2, "cc-c", "Cache hit rate", 0, 0.9, 0.05, 0, v => Math.round(v * 100) + "%");
  const st = statsRow(box);
  const draw = () => {
    const perReq = (+ti.value * +pi.value + +to.value * +po.value) / 1e6, month = perReq * +rq.value * 30 * (1 - +ch.value);
    setStats(st, [["Cost per request", "$" + perReq.toFixed(4)], ["Input share of cost", (100 * (+ti.value * +pi.value / 1e6) / (perReq || 1)).toFixed(0) + "%"], ["Monthly cost", "$" + month.toLocaleString("en-US", { maximumFractionDigits: 0 })], ["Halve the context →", "$" + ((((+ti.value / 2) * +pi.value + +to.value * +po.value) / 1e6) * +rq.value * 30 * (1 - +ch.value)).toLocaleString("en-US", { maximumFractionDigits: 0 })]]);
  };
  [rq, ti, to, pi, po].forEach(i => i.addEventListener("input", draw)); ch.addEventListener("input", draw); draw();
};


/* ================= SQL ================= */
const PCOL = ["--k3", "--c2", "--k6", "--k4", "--k5"];
function htable(cols, rows, opts = {}) {
  // rows: array of {cells:[], cls?, style?}
  return `<div class="tbl"><table><tr>${cols.map((c, i) => `<th${opts.num && opts.num[i] ? ' class="num"' : ""}>${c}</th>`).join("")}</tr>${rows.map(r => `<tr${r.style ? ` style="${r.style}"` : ""}>${r.cells.map((v, i) => `<td${opts.num && opts.num[i] ? ' class="num"' : ""}>${v === null ? '<span class="null">NULL</span>' : v}</td>`).join("")}</tr>`).join("")}</table></div>`;
}
const tint = (v, a = 14) => `background:color-mix(in srgb, var(${v}) ${a}%, transparent)`;

VIZ["sql-order"] = box => {
  head(box, "The SQL assembly line", "You write SELECT first, but the database runs the clauses in a different order. Step through one query and watch the table change at each station.");
  box.appendChild(el("pre", { style: "margin:6px 0 10px;white-space:pre-wrap" }, `SELECT dept, AVG(salary) AS avg_sal
FROM employees
WHERE hire_year >= 2020
GROUP BY dept
HAVING COUNT(*) >= 2
ORDER BY avg_sal DESC
LIMIT 1;`));
  const E = [["Asha", "DS", 150, 2019], ["Rohan", "DS", 120, 2020], ["Meera", "DS", 120, 2021], ["Kabir", "DS", 95, 2022], ["Arjun", "Eng", 130, 2019], ["Priya", "Eng", 130, 2020], ["Vikram", "Eng", 110, 2021], ["Sara", "Eng", 140, 2022], ["Isha", "Sales", 70, 2021]];
  const kept = E.filter(r => r[3] >= 2020);
  const groups = ["DS", "Eng", "Sales"].map(d => { const g = kept.filter(r => r[1] === d); return [d, g.length, g.reduce((s, r) => s + r[2], 0) / g.length]; });
  const S = [
    ["1 FROM / JOIN", "Fetch the table(s) and join them. All 9 rows enter the line.", htable(["name", "dept", "salary (k)", "hire_year"], E.map(r => ({ cells: r })), { num: [0, 0, 1, 1] })],
    ["2 WHERE", "Filter individual rows. Asha and Arjun (hired 2019) are dropped. Aliases like avg_sal don't exist yet, so WHERE can't use them.", htable(["name", "dept", "salary (k)", "hire_year"], E.map(r => ({ cells: r, style: r[3] < 2020 ? "opacity:.35;text-decoration:line-through" : "" })), { num: [0, 0, 1, 1] })],
    ["3 GROUP BY", "Rows are put into one bucket per dept. From here on, each bucket becomes one row.", htable(["dept", "rows in bucket"], groups.map((g, i) => ({ cells: [g[0], kept.filter(r => r[1] === g[0]).map(r => r[0]).join(", ")], style: tint(PCOL[i]) })))],
    ["4 HAVING", "Filter whole groups using aggregates. Sales has only 1 row, so it's dropped.", htable(["dept", "COUNT(*)", "AVG(salary)"], groups.map((g, i) => ({ cells: [g[0], g[1], g[2].toFixed(1)], style: g[1] < 2 ? "opacity:.35;text-decoration:line-through" : tint(PCOL[i]) })), { num: [0, 1, 1] })],
    ["5 SELECT", "Compute the output columns and name them. avg_sal is born here. Window functions also run at this step.", htable(["dept", "avg_sal"], groups.filter(g => g[1] >= 2).map(g => ({ cells: [g[0], g[2].toFixed(1)] })), { num: [0, 1] })],
    ["6 DISTINCT", "Remove duplicate output rows (only if you wrote DISTINCT). Nothing to remove here.", htable(["dept", "avg_sal"], groups.filter(g => g[1] >= 2).map(g => ({ cells: [g[0], g[2].toFixed(1)] })), { num: [0, 1] })],
    ["7 ORDER BY", "Sort. ORDER BY runs after SELECT, so it CAN use the alias avg_sal.", htable(["dept", "avg_sal"], groups.filter(g => g[1] >= 2).sort((a, b) => b[2] - a[2]).map(g => ({ cells: [g[0], g[2].toFixed(1)] })), { num: [0, 1] })],
    ["8 LIMIT", "Keep the first row only. Final answer: Eng.", htable(["dept", "avg_sal"], groups.filter(g => g[1] >= 2).sort((a, b) => b[2] - a[2]).slice(0, 1).map(g => ({ cells: [g[0], g[2].toFixed(1)] })), { num: [0, 1] })]
  ];
  const strip = el("div", { style: "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px" }); box.appendChild(strip);
  const ctrl = ctrlRow(box); const bp = button(ctrl, "← Back"), bn = button(ctrl, "Next station →", "btn solid");
  const cap = el("p", { style: "margin:8px 0 0;font-size:.9rem", "aria-live": "polite" }); box.appendChild(cap);
  const tb = el("div"); box.appendChild(tb);
  note(box, "Memory trick: <b>F</b>at <b>W</b>hales <b>G</b>row <b>H</b>uge, <b>S</b>o <b>D</b>on't <b>O</b>ver<b>L</b>oad them = FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.");
  let k = 0;
  const draw = () => {
    strip.innerHTML = S.map((s, i) => `<span style="font:500 .72rem var(--f-mono);padding:3px 7px;border-radius:999px;border:1px solid ${i === k ? "var(--sub-sql)" : "var(--line)"};${i === k ? "background:var(--sub-sql);color:var(--surface)" : i < k ? "color:var(--sub-sql)" : "color:var(--muted)"}">${s[0]}</span>`).join("");
    cap.innerHTML = `<strong>${S[k][0].slice(2)}:</strong> ${S[k][1]}`; tb.innerHTML = S[k][2]; bp.disabled = k === 0; bn.disabled = k === S.length - 1;
  };
  bn.addEventListener("click", () => { k = Math.min(S.length - 1, k + 1); draw(); }); bp.addEventListener("click", () => { k = Math.max(0, k - 1); draw(); }); draw();
};

VIZ["join-lab"] = box => {
  head(box, "Join lab", "Left table: customers. Right table: orders. Pick a join and see which rows survive. Green = matched, orange = only in left (right side filled with NULL), purple = only in right.");
  const L = [[1, "Aman"], [2, "Bela"], [3, "Chirag"], [4, "Diya"]];
  const R = [[101, 1, 1200], [102, 1, 800], [103, 2, 2500], [104, 9, 300]];
  const two = el("div", { class: "cols" }); box.appendChild(two);
  two.innerHTML = `<div><p class="sqltname">customers (left)</p>${htable(["id", "name"], L.map(r => ({ cells: r })))}</div><div><p class="sqltname">orders (right)</p>${htable(["order_id", "customer_id", "amount"], R.map(r => ({ cells: r, style: r[1] === 9 ? tint("--k3") : "" })), { num: [1, 1, 1] })}</div>`;
  const ctrl = ctrlRow(box);
  const types = [["INNER", "INNER JOIN"], ["LEFT", "LEFT JOIN"], ["RIGHT", "RIGHT JOIN"], ["FULL", "FULL OUTER JOIN"], ["ANTI", "LEFT JOIN … WHERE o.id IS NULL"], ["CROSS", "CROSS JOIN"]];
  const btns = types.map(([k, t]) => { const b = button(ctrl, k === "ANTI" ? "ANTI (left only)" : k); b.dataset.k = k; return b; });
  const sqlp = el("pre", { style: "margin:8px 0;white-space:pre-wrap" }); box.appendChild(sqlp);
  const out = el("div"); box.appendChild(out); const st = statsRow(box); const nt = note(box, "");
  let cur = "INNER";
  const draw = () => {
    btns.forEach(b => b.classList.toggle("solid", b.dataset.k === cur));
    const rows = [];
    if (cur === "CROSS") { L.forEach(l => R.forEach(r => rows.push({ cells: [l[0], l[1], r[0], r[2]], style: "" }))); }
    else {
      L.forEach(l => { const m = R.filter(r => r[1] === l[0]); if (m.length) { if (cur !== "ANTI") m.forEach(r => rows.push({ cells: [l[0], l[1], r[0], r[2]], style: tint("--good", 16) })); } else if (["LEFT", "FULL", "ANTI"].includes(cur)) rows.push({ cells: [l[0], l[1], null, null], style: tint("--c2", 18) }); });
      if (["RIGHT", "FULL"].includes(cur)) R.filter(r => !L.some(l => l[0] === r[1])).forEach(r => rows.push({ cells: [null, null, r[0], r[2]], style: tint("--k3", 18) }));
      if (cur === "RIGHT") rows.sort((a, b) => (a.cells[2] || 0) - (b.cells[2] || 0));
    }
    const t = types.find(x => x[0] === cur)[1];
    sqlp.textContent = cur === "ANTI" ? "SELECT c.id, c.name, o.id, o.amount\nFROM customers c LEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;   -- customers who never ordered" : cur === "CROSS" ? "SELECT c.id, c.name, o.id, o.amount\nFROM customers c CROSS JOIN orders o;   -- every pair, no ON" : `SELECT c.id, c.name, o.id, o.amount\nFROM customers c ${t} orders o ON o.customer_id = c.id;`;
    out.innerHTML = htable(["c.id", "c.name", "o.id", "o.amount"], rows, { num: [1, 0, 1, 1] });
    setStats(st, [["Left rows", L.length], ["Right rows", R.length], ["Result rows", rows.length]]);
    nt.innerHTML = { INNER: "Only matches. Aman appears <b>twice</b> because he has two orders: joins multiply rows, so a SUM after a join can double-count.", LEFT: "Every customer stays. Chirag and Diya have no orders, so their order columns are NULL.", RIGHT: "Every order stays. Order 104 points to customer 9, who doesn't exist (an orphan row).", FULL: "Everything from both sides: matches + left-only + right-only.", ANTI: "The classic “customers who never ordered”. Filter on a right-side column that can't be NULL in a real match (its key).", CROSS: "4 × 4 = 16 rows: every combination. Useful to build a full grid (e.g. every user × every date), dangerous by accident." }[cur];
  };
  btns.forEach(b => b.addEventListener("click", () => { cur = b.dataset.k; draw(); })); draw();
};

VIZ["group-buckets"] = box => {
  head(box, "GROUP BY = sorting rows into buckets", "Each order is a chip. Choose what to group by and what to compute. Every bucket collapses into one output row. HAVING then removes whole buckets.");
  const O = [[101, "Aman", "Pune", 1200, "completed"], [102, "Aman", "Pune", 800, "cancelled"], [103, "Bela", "Mumbai", 2500, "completed"], [104, "Aman", "Pune", 1500, "completed"], [105, "Chirag", "Pune", 300, "completed"], [106, "Bela", "Mumbai", 700, "returned"], [107, "Diya", "Delhi", 4000, "completed"], [108, "Chirag", "Pune", 900, "completed"], [110, "Diya", "Delhi", 1100, "cancelled"]];
  const ctrl = ctrlRow(box);
  const gb = selectBox(ctrl, "gb-k", "GROUP BY", [["2", "city"], ["4", "status"], ["1", "customer"]], "2");
  const ag = selectBox(ctrl, "gb-a", "Compute", [["count", "COUNT(*)"], ["sum", "SUM(amount)"], ["avg", "AVG(amount)"], ["cond", "SUM(CASE WHEN status='completed' …)"]], "sum");
  const ctrl2 = ctrlRow(box); const hv = slider(ctrl2, "gb-h", "HAVING value >", 0, 5000, 100, 0, v => v);
  const wrap = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px" }); box.appendChild(wrap);
  const sqlp = el("pre", { style: "margin:10px 0 0;white-space:pre-wrap" }); box.appendChild(sqlp);
  const draw = () => {
    const k = +gb.value, keys = [...new Set(O.map(r => r[k]))];
    const name = { 1: "customer", 2: "city", 4: "status" }[k];
    const f = { count: g => g.length, sum: g => g.reduce((s, r) => s + r[3], 0), avg: g => Math.round(g.reduce((s, r) => s + r[3], 0) / g.length), cond: g => g.reduce((s, r) => s + (r[4] === "completed" ? r[3] : 0), 0) }[ag.value];
    const expr = { count: "COUNT(*)", sum: "SUM(amount)", avg: "AVG(amount)", cond: "SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END)" }[ag.value];
    wrap.innerHTML = keys.map((key, i) => {
      const g = O.filter(r => r[k] === key), v = f(g), out = v <= +hv.value;
      return `<div style="border:1.5px solid var(${PCOL[i % 5]});border-radius:10px;padding:8px;${out ? "opacity:.35" : ""}"><div style="font:600 .8rem var(--f-mono);color:var(${PCOL[i % 5]})">${key}</div><div style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0">${g.map(r => `<span title="order ${r[0]}" style="font:.68rem var(--f-mono);padding:1px 5px;border-radius:4px;${tint(PCOL[i % 5], 20)};${ag.value === "cond" && r[4] !== "completed" ? "text-decoration:line-through" : ""}">${r[3]}</span>`).join("")}</div><div style="font:600 1rem var(--f-mono)">→ ${v.toLocaleString("en-IN")}</div>${out ? '<div class="sqlmeta">removed by HAVING</div>' : ""}</div>`;
    }).join("");
    sqlp.textContent = `SELECT ${name}, ${expr} AS value\nFROM orders\nGROUP BY ${name}${+hv.value > 0 ? `\nHAVING ${expr} > ${hv.value}` : ""};`;
  };
  [gb, ag].forEach(s => s.addEventListener("change", draw)); hv.addEventListener("input", draw); draw();
};

VIZ["win-partition"] = box => {
  head(box, "GROUP BY squashes rows; a window keeps them", "Same data, two ways. Switch modes, pick a function, and toggle ORDER BY inside the window to see a running calculation appear.");
  const E = [["Asha", "DS", 150], ["Rohan", "DS", 120], ["Meera", "DS", 120], ["Kabir", "DS", 95], ["Neha", "Eng", 160], ["Sara", "Eng", 140], ["Arjun", "Eng", 130], ["Dev", "Sales", 90], ["Isha", "Sales", 70]];
  const ctrl = ctrlRow(box);
  const md = selectBox(ctrl, "wp-m", "Mode", [["win", "Window (OVER)"], ["grp", "GROUP BY"]], "win");
  const fn = selectBox(ctrl, "wp-f", "Function", [["SUM", "SUM(salary)"], ["AVG", "AVG(salary)"], ["COUNT", "COUNT(*)"], ["MAX", "MAX(salary)"], ["ROW_NUMBER", "ROW_NUMBER()"], ["RANK", "RANK()"], ["DENSE_RANK", "DENSE_RANK()"]], "SUM");
  const ob = checkbox(ctrl, "wp-o", "ORDER BY salary DESC inside the window", false);
  const sqlp = el("pre", { style: "margin:8px 0;white-space:pre-wrap" }); box.appendChild(sqlp);
  const out = el("div"); box.appendChild(out); const nt = note(box, "");
  const depts = ["DS", "Eng", "Sales"];
  const draw = () => {
    const f = fn.value, rankish = ["ROW_NUMBER", "RANK", "DENSE_RANK"].includes(f), ordered = ob.checked || rankish;
    ob.disabled = md.value === "grp" || rankish; if (rankish) ob.checked = true;
    const call = f === "COUNT" ? "COUNT(*)" : rankish ? f + "()" : `${f}(salary)`;
    if (md.value === "grp") {
      const agg = rankish ? "SUM(salary)" : call;
      sqlp.textContent = `SELECT dept, ${agg} AS result\nFROM employees\nGROUP BY dept;` + (rankish ? "\n-- ranking functions only exist as window functions" : "");
      out.innerHTML = htable(["dept", "result"], depts.map((d, i) => { const g = E.filter(r => r[1] === d).map(r => r[2]); const ff = rankish ? "SUM" : f; const v = ff === "SUM" ? g.reduce((a, b) => a + b, 0) : ff === "AVG" ? g.reduce((a, b) => a + b, 0) / g.length : ff === "COUNT" ? g.length : Math.max(...g); return { cells: [d, +v.toFixed(1)], style: tint(PCOL[i]) }; }), { num: [0, 1] });
      nt.innerHTML = "9 rows in, <b>3 rows out</b>. You lose the employee names. That's the key difference.";
      return;
    }
    sqlp.textContent = `SELECT name, dept, salary,\n       ${call} OVER (PARTITION BY dept${ordered ? " ORDER BY salary DESC" : ""}) AS result\nFROM employees;`;
    const rows = [];
    depts.forEach((d, i) => {
      const g = E.filter(r => r[1] === d).sort((a, b) => b[2] - a[2]);
      g.forEach((r, j) => {
        let v;
        const frame = ordered ? g.filter(x => x[2] >= r[2]) : g; // RANGE default: peers included
        if (f === "SUM") v = frame.reduce((s, x) => s + x[2], 0);
        if (f === "AVG") v = +(frame.reduce((s, x) => s + x[2], 0) / frame.length).toFixed(1);
        if (f === "COUNT") v = frame.length;
        if (f === "MAX") v = Math.max(...frame.map(x => x[2]));
        if (f === "ROW_NUMBER") v = j + 1;
        if (f === "RANK") v = g.filter(x => x[2] > r[2]).length + 1;
        if (f === "DENSE_RANK") v = new Set(g.filter(x => x[2] > r[2]).map(x => x[2])).size + 1;
        rows.push({ cells: [r[0], d, r[2], `<strong>${v}</strong>`], style: tint(PCOL[i]) });
      });
    });
    out.innerHTML = htable(["name", "dept", "salary (k)", "result"], rows, { num: [0, 0, 1, 1] });
    nt.innerHTML = rankish ? "Numbering restarts in each coloured partition. Look at Rohan and Meera (both 120): ROW_NUMBER splits them, RANK and DENSE_RANK tie them." : ordered ? "With ORDER BY, the frame becomes “from the start of the partition up to this row” → a <b>running</b> " + f + ". Note Rohan and Meera get the same value: the default frame (RANGE) includes ties together." : "Without ORDER BY, every row sees its <b>whole partition</b>: all 9 rows kept, each showing its department's " + f + ".";
  };
  [md, fn].forEach(s => s.addEventListener("change", draw)); ob.addEventListener("change", draw); draw();
};

VIZ["rank-podium"] = box => {
  head(box, "ROW_NUMBER vs RANK vs DENSE_RANK: the race", "Runners finish a 100 m race. Pick a scenario and compare the three numbering styles.");
  const ctrl = ctrlRow(box);
  const sc = selectBox(ctrl, "rp-s", "Scenario", [["0", "No ties"], ["1", "Tie for 2nd place"], ["2", "Three-way tie for 1st"]], "1");
  const out = el("div"); box.appendChild(out); const nt = note(box, "");
  const SC = [[["Asha", 10.1], ["Bela", 10.4], ["Chirag", 10.6], ["Diya", 10.9], ["Eshan", 11.2]], [["Asha", 10.1], ["Bela", 10.4], ["Chirag", 10.4], ["Diya", 10.9], ["Eshan", 11.2]], [["Asha", 10.1], ["Bela", 10.1], ["Chirag", 10.1], ["Diya", 10.9], ["Eshan", 11.2]]];
  const badge = (v, c) => `<span style="display:inline-block;min-width:1.8em;text-align:center;font:600 .82rem var(--f-mono);padding:2px 6px;border-radius:6px;${tint(c, 22)}">${v}</span>`;
  const draw = () => {
    const R = SC[+sc.value];
    out.innerHTML = htable(["runner", "time (s)", "ROW_NUMBER", "RANK", "DENSE_RANK"], R.map((r, i) => {
      const rk = R.filter(x => x[1] < r[1]).length + 1, dr = new Set(R.filter(x => x[1] < r[1]).map(x => x[1])).size + 1, tie = R.filter(x => x[1] === r[1]).length > 1;
      return { cells: [r[0], r[1].toFixed(1), badge(i + 1, "--k6"), badge(rk, "--c2"), badge(dr, "--k3")], style: tie ? tint("--c2", 8) : "" };
    }), { num: [0, 1, 0, 0, 0] });
    nt.innerHTML = ["With no ties, all three give 1, 2, 3, 4, 5.", "Bela and Chirag tie. <b>ROW_NUMBER</b> breaks the tie arbitrarily (2, 3). <b>RANK</b> gives both 2, then <b>skips</b> to 4, like Olympic medals. <b>DENSE_RANK</b> gives both 2, then 3: no gaps.", "Three share 1st. RANK jumps to 4. DENSE_RANK goes to 2. “Top 2 distinct times” needs DENSE_RANK ≤ 2 (4 runners); “top 2 positions” needs RANK ≤ 2 (3 runners)."][+sc.value];
  };
  sc.addEventListener("change", draw); draw();
  note(box, "Memory trick: ROW_NUMBER = ticket numbers (always unique). RANK = Olympic podium (ties share, next place skipped). DENSE_RANK = salary levels (ties share, no gaps).");
};

VIZ["frame-slider"] = box => {
  head(box, "Window frames: the sliding window", "North region's daily revenue. Choose how many rows before and after the current row the frame covers, then move the current row. The line shows the result for every row.");
  const D = [100, 120, 90, 150, 150, 80, 200, 170], days = ["Mar 1", "2", "3", "4", "5", "6", "7", "8"];
  const ctrl = ctrlRow(box);
  const fnS = selectBox(ctrl, "fs-f", "Function", [["AVG", "AVG"], ["SUM", "SUM"]], "AVG");
  const pre = slider(ctrl, "fs-p", "PRECEDING", 0, 8, 1, 2, v => v === 8 ? "UNBOUNDED" : v);
  const fol = slider(ctrl, "fs-n", "FOLLOWING", 0, 3, 1, 0, v => v);
  const ctrl2 = ctrlRow(box); const cur = slider(ctrl2, "fs-c", "Current row", 0, 7, 1, 4, v => days[v].length < 3 ? "Mar " + days[v] : days[v]);
  const cv = addCanvas(box, 220, "Bar chart of daily revenue with the frame highlighted");
  const sqlp = el("pre", { style: "margin:8px 0;white-space:pre-wrap" }); box.appendChild(sqlp);
  const st = statsRow(box);
  const val = (i) => { const p = +pre.value === 8 ? i : +pre.value, a = Math.max(0, i - p), b = Math.min(7, i + +fol.value); const s = D.slice(a, b + 1); return [a, b, fnS.value === "SUM" ? s.reduce((x, y) => x + y, 0) : s.reduce((x, y) => x + y, 0) / s.length]; };
  onDraw(() => {
    const { x, w, h } = prep(cv), pad = { l: 34, r: 10, t: 12, b: 24 };
    const all = D.map((_, i) => val(i)[2]), mx = Math.max(...D, ...all) * 1.1;
    const X = i => pad.l + (i + 0.5) * (w - pad.l - pad.r) / 8, bw = (w - pad.l - pad.r) / 8 * 0.6, Y = lin(0, mx, h - pad.b, pad.t);
    frame(x, w, h, pad);
    const [a, b, v] = val(+cur.value);
    x.fillStyle = css("--accent-soft") || "rgba(0,0,0,.05)"; x.fillRect(X(a) - bw * 0.8, pad.t, X(b) - X(a) + bw * 1.6, h - pad.t - pad.b);
    D.forEach((d, i) => { x.fillStyle = i === +cur.value ? css("--sub-sql") : i >= a && i <= b ? css("--k3") : css("--line"); x.fillRect(X(i) - bw / 2, Y(d), bw, h - pad.b - Y(d)); text(x, days[i], X(i), h - 8, css("--muted"), "center"); });
    x.strokeStyle = css("--c2"); x.lineWidth = 2; x.beginPath(); all.forEach((v2, i) => i ? x.lineTo(X(i), Y(v2)) : x.moveTo(X(i), Y(v2))); x.stroke(); all.forEach((v2, i) => dot(x, X(i), Y(v2), 3, css("--c2")));
    text(x, Math.round(mx), 4, pad.t + 8);
    const p = +pre.value === 8 ? "UNBOUNDED PRECEDING" : `${pre.value} PRECEDING`, n = +fol.value ? `${fol.value} FOLLOWING` : "CURRENT ROW";
    sqlp.textContent = `${fnS.value}(revenue) OVER (ORDER BY sale_date\n    ROWS BETWEEN ${p} AND ${n}) AS result`;
    setStats(st, [["Frame rows", `${b - a + 1} (${days[a].length < 3 ? "Mar " + days[a] : days[a]} → ${days[b].length < 3 ? "Mar " + days[b] : days[b]})`], ["Values", D.slice(a, b + 1).join(" + ")], ["Result", +v.toFixed(1)]]);
  });
  [pre, fol, cur].forEach(s => s.addEventListener("input", () => ACTIVE.forEach(f => f()))); fnS.addEventListener("change", () => ACTIVE.forEach(f => f()));
  legend(box, [["--sub-sql", "current row"], ["--k3", "rows inside the frame"], ["--c2", "result line (every row)"]]);
  note(box, "Try: PRECEDING = UNBOUNDED, FOLLOWING = 0 with SUM → running total. PRECEDING = 6 with AVG → 7-day moving average. Note the first rows average fewer days (warm-up).");
};

VIZ["lag-arrows"] = box => {
  head(box, "LAG and LEAD: shifting a column", "LAG looks back n rows, LEAD looks forward. Think of photocopying the column and sliding the copy down (LAG) or up (LEAD).");
  const D = [["Jan", 400], ["Feb", 460], ["Mar", 430], ["Apr", 520], ["May", 600], ["Jun", 570]];
  const ctrl = ctrlRow(box);
  const fn = selectBox(ctrl, "la-f", "Function", [["LAG", "LAG"], ["LEAD", "LEAD"]], "LAG");
  const n = slider(ctrl, "la-n", "offset n", 1, 3, 1, 1, v => v);
  const dv = checkbox(ctrl, "la-d", "default 0 instead of NULL", false);
  const sqlp = el("pre", { style: "margin:8px 0;white-space:pre-wrap" }); box.appendChild(sqlp);
  const out = el("div"); box.appendChild(out); const nt = note(box, "");
  const draw = () => {
    const k = +n.value, lag = fn.value === "LAG";
    sqlp.textContent = `SELECT month, revenue,\n  ${fn.value}(revenue, ${k}${dv.checked ? ", 0" : ""}) OVER (ORDER BY month) AS other,\n  revenue - ${fn.value}(revenue, ${k}) OVER (ORDER BY month) AS diff,\n  ROUND(100.0 * (revenue - ${fn.value}(revenue, ${k}) OVER (ORDER BY month))\n        / ${fn.value}(revenue, ${k}) OVER (ORDER BY month), 1) AS pct\nFROM monthly;`;
    out.innerHTML = htable(["month", "revenue", `${fn.value}(…,${k})`, "", "diff", "% change"], D.map((r, i) => {
      const j = lag ? i - k : i + k, o = D[j] ? D[j][1] : null, src = D[j] ? D[j][0] : "";
      return { cells: [r[0], r[1], o === null ? (dv.checked ? "0" : null) : `<strong>${o}</strong>`, o === null ? "" : `<span class="sqlmeta">${lag ? "↑" : "↓"} from ${src}</span>`, o === null ? null : (r[1] - o > 0 ? "+" : "") + (r[1] - o), o === null ? null : (100 * (r[1] - o) / o).toFixed(1) + "%"], style: o === null ? tint("--c2", 10) : "" };
    }), { num: [0, 1, 1, 0, 1, 1] });
    nt.innerHTML = lag ? `The first ${k} row${k > 1 ? "s have" : " has"} nothing ${k} step${k > 1 ? "s" : ""} back, so LAG returns NULL (or your default). Month-over-month growth = (this − previous) / previous.` : `The last ${k} row${k > 1 ? "s have" : " has"} nothing ahead, so LEAD returns NULL. Use LEAD for “time until the next event”.`;
  };
  [fn].forEach(s => s.addEventListener("change", draw)); n.addEventListener("input", draw); dv.addEventListener("change", draw); draw();
};

VIZ["islands"] = box => {
  head(box, "Gaps and islands: find login streaks", "Tap the days to switch a login on or off. The trick: date − ROW_NUMBER() stays constant inside a run of consecutive days, so it works as a group label.");
  const on = [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1];
  const cal = el("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:6px 0 10px" }); box.appendChild(cal);
  const out = el("div"); box.appendChild(out); const st = statsRow(box);
  const draw = () => {
    const ds = on.map((v, i) => v ? i + 1 : null).filter(Boolean);
    const grp = {}; ds.forEach((d, i) => { const g = d - (i + 1); (grp[g] = grp[g] || []).push(d); });
    const gk = Object.keys(grp).map(Number), col = g => PCOL[gk.indexOf(g) % 5];
    cal.innerHTML = on.map((v, i) => { const d = i + 1, g = v ? d - (ds.indexOf(d) + 1) : null; return `<button type="button" data-i="${i}" style="font:500 .78rem var(--f-mono);padding:8px 0;border-radius:8px;cursor:pointer;border:1.5px solid ${v ? `var(${col(g)})` : "var(--line)"};${v ? tint(col(g), 22) : "background:transparent"};color:var(--ink)">${d}<br><span style="font-size:.62rem;color:var(--muted)">Mar</span></button>`; }).join("");
    out.innerHTML = htable(["login_date", "ROW_NUMBER()", "day − rn  (island key)"], ds.map((d, i) => ({ cells: [`Mar ${d}`, i + 1, `<strong>${d - (i + 1)}</strong>`], style: tint(col(d - (i + 1)), 16) })), { num: [0, 1, 1] });
    const lens = gk.map(g => grp[g].length);
    setStats(st, [["Logins", ds.length], ["Streaks", gk.length], ["Longest streak", lens.length ? Math.max(...lens) + " days" : "–"]]);
    cal.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { on[+b.dataset.i] ^= 1; draw(); }));
  };
  draw();
  note(box, "In SQL: GROUP BY user_id, date(login_date, '-' || rn || ' days'), then COUNT(*) per group gives each streak's length. Remember to remove duplicate logins on the same day first.");
};

VIZ["cohort-grid"] = box => {
  head(box, "Cohort retention heatmap", "Each row is a cohort: users who signed up in the same week. Each column is weeks since signup. Tap a cell to read it in plain words.");
  const C = [["Week 1", 120, [120, 66, 48, 41, 38]], ["Week 2", 150, [150, 78, 57, 50]], ["Week 3", 135, [135, 81, 62]], ["Week 4", 160, [160, 104]], ["Week 5", 140, [140]]];
  const ctrl = ctrlRow(box); const mode = selectBox(ctrl, "cg-m", "Show", [["pct", "% retained"], ["n", "active users"]], "pct");
  const wrap = el("div", { class: "tbl" }); box.appendChild(wrap); const nt = note(box, "Tap a cell.");
  const draw = () => {
    wrap.innerHTML = `<table><tr><th>cohort</th><th class="num">size</th>${[0, 1, 2, 3, 4].map(w => `<th class="num">wk ${w}</th>`).join("")}</tr>${C.map(([c, n, a], r) => `<tr><td>${c}</td><td class="num">${n}</td>${[0, 1, 2, 3, 4].map(w => { const v = a[w]; if (v == null) return '<td></td>'; const p = v / n; return `<td class="num" data-r="${r}" data-w="${w}" style="cursor:pointer;${tint("--sub-sql", Math.round(8 + p * 60))}">${mode.value === "pct" ? Math.round(p * 100) + "%" : v}</td>`; }).join("")}</tr>`).join("")}</table>`;
    wrap.querySelectorAll("td[data-r]").forEach(td => td.addEventListener("click", () => { const [c, n, a] = C[+td.dataset.r], w = +td.dataset.w; nt.innerHTML = w === 0 ? `${c}: ${n} users signed up. Week 0 is always 100%.` : `Of the <b>${n}</b> users who signed up in ${c}, <b>${a[w]}</b> were active ${w} week${w > 1 ? "s" : ""} later → <b>${Math.round(100 * a[w] / n)}%</b> week-${w} retention.`; }));
  };
  mode.addEventListener("change", draw); draw();
  note(box, "Read down a column to compare cohorts at the same age (is week-1 retention improving?). Read along a row to see one cohort decay. The triangle shape is normal: newer cohorts haven't had time yet.");
};


/* ================= System design ================= */
function archExplorer(box, title, desc, lanes, info, start) {
  head(box, title, desc);
  lanes.forEach(([lt, items]) => {
    const w = el("div", { style: "margin:8px 0" }); w.appendChild(el("div", { class: "eyebrow" }, lt));
    const r = el("div", { style: "display:flex;flex-wrap:wrap;gap:6px;align-items:center" });
    items.forEach(([k, t], i) => { r.appendChild(el("button", { type: "button", class: "btn", "data-k": k, style: "border-color:var(--sub-sys);color:var(--sub-sys)" }, t)); if (i < items.length - 1) r.appendChild(el("span", { style: "color:var(--muted)" }, "→")); });
    w.appendChild(r); box.appendChild(w);
  });
  const d = el("div", { class: "worked", "aria-live": "polite", style: "margin-top:10px" }); box.appendChild(d);
  const row = (k, v) => v ? `<p style="margin:.35em 0"><strong>${k}:</strong> ${v}</p>` : "";
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-k]"); if (!b) return;
    $$("[data-k]", box).forEach(x => { const on = x === b; x.style.background = on ? "var(--sub-sys)" : "transparent"; x.style.color = on ? "var(--surface)" : "var(--sub-sys)"; });
    const i = info[b.dataset.k];
    d.innerHTML = `<b>${b.textContent}</b>${row("What it does", i.what)}${row("Think of it as", i.like)}${row("Typical tech", i.tech)}${row("How it scales", i.scale)}${row("What goes wrong", i.fail)}`;
  });
  $(`[data-k=${start}]`, box).click();
}
function journey(box, title, desc, steps) {
  head(box, title, desc);
  const bar = el("div", { style: "display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid var(--line);margin:8px 0" }); box.appendChild(bar);
  const ctrl = ctrlRow(box); const bp = button(ctrl, "← Back"), bn = button(ctrl, "Next step →", "btn solid");
  const card = el("div", { class: "worked", "aria-live": "polite" }); box.appendChild(card);
  const st = statsRow(box);
  const total = steps.reduce((s, x) => s + x[3], 0);
  let k = 0;
  const draw = () => {
    bar.innerHTML = steps.map((s, i) => `<div title="${s[0]}" style="flex:${Math.max(s[3], total * 0.012)};background:var(${i <= k ? PCOL[i % 5] : "--line"});opacity:${i === k ? 1 : i < k ? .55 : .5}"></div>`).join("");
    const s = steps[k];
    card.innerHTML = `<span class="eyebrow" style="color:var(${PCOL[k % 5]})">Step ${k + 1} of ${steps.length} · ${s[0]}</span><p style="margin:.4em 0">${s[1]}</p>${s[2] ? `<p style="margin:.4em 0;color:var(--muted)"><em>Analogy:</em> ${s[2]}</p>` : ""}`;
    const so = steps.slice(0, k + 1).reduce((a, x) => a + x[3], 0);
    setStats(st, [["This step", s[3] + " ms"], ["Elapsed so far", so.toLocaleString("en-US") + " ms"], ["Whole journey", total.toLocaleString("en-US") + " ms"]]);
    bp.disabled = k === 0; bn.disabled = k === steps.length - 1;
  };
  bn.addEventListener("click", () => { k = Math.min(steps.length - 1, k + 1); draw(); }); bp.addEventListener("click", () => { k = Math.max(0, k - 1); draw(); }); draw();
}
function numIn(ctrl, id, label, val, step, w = "6.5em") { const lab = el("label", { for: id }); lab.appendChild(document.createTextNode(label + " ")); const i = el("input", { type: "number", id, value: val, step, min: 0, style: `width:${w};font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)` }); lab.appendChild(i); ctrl.appendChild(lab); return i; }
const fmt = (v, d = 0) => (+v).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });

VIZ["qps-calc"] = box => {
  head(box, "Back-of-envelope: users → traffic", "Interviewers love a quick estimate. Change the inputs; every number below is explained in words.");
  const c1 = ctrlRow(box);
  const U = numIn(c1, "q-u", "Registered users", 6000, 500), A = numIn(c1, "q-a", "% active per day", 40, 5, "4.5em"), R = numIn(c1, "q-r", "Requests per active user per day", 10, 1, "4.5em");
  const c2 = ctrlRow(box);
  const P = numIn(c2, "q-p", "% of the day's traffic in the busiest hour", 20, 1, "4.5em"), L = numIn(c2, "q-l", "Seconds per request", 4, 0.5, "4.5em");
  const st = statsRow(box); const ex = el("div", { class: "worked", style: "margin-top:10px" }); box.appendChild(ex);
  const draw = () => {
    const dau = +U.value * +A.value / 100, daily = dau * +R.value, avg = daily / 86400, peak = daily * +P.value / 100 / 3600, conc = peak * +L.value;
    setStats(st, [["Requests / day", fmt(daily)], ["Average per second", fmt(avg, 2)], ["Peak per second", fmt(peak, 2)], ["In flight at peak", fmt(Math.ceil(conc))]]);
    ex.innerHTML = `<p style="margin:.3em 0">${fmt(U.value)} users × ${A.value}% active = <strong>${fmt(dau)}</strong> daily active users, each making ${R.value} requests = <strong>${fmt(daily)}</strong> requests a day.</p><p style="margin:.3em 0">Averaged over 86,400 seconds that's only ${fmt(avg, 2)} per second, but traffic isn't flat: ${P.value}% of it lands in one hour → <strong>${fmt(peak, 2)} requests/second at peak</strong>. Design for the peak, not the average.</p><p style="margin:.3em 0">Little's law: requests in flight = arrival rate × time each takes = ${fmt(peak, 2)} × ${L.value} s ≈ <strong>${fmt(Math.ceil(conc))} concurrent requests</strong>. That's what your servers, connection pools and LLM rate limits must handle at once.</p>`;
  };
  [U, A, R, P, L].forEach(i => i.addEventListener("input", draw)); draw();
};

VIZ["journey-basic"] = box => journey(box, "Follow one request through the system", "A field rep opens the app and asks for a doctor's risk score. Step through each component. The bar shows where the time goes (illustrative numbers).", [
  ["Client (app / browser)", "The phone app sends an HTTPS request: <code>GET /score?hcp=123</code> with the user's login token.", "A customer walks into a restaurant and places an order.", 5],
  ["DNS + CDN", "DNS turns the domain name into an IP address. A CDN serves static files (app code, images) from a server near the user, so they don't travel to your data centre.", "Google Maps finding the restaurant's address; the takeaway counter at the entrance hands out menus instantly.", 20],
  ["Load balancer", "Spreads incoming requests across several identical copies of your service and stops sending traffic to any copy that fails its health check.", "The host at the door who sends each guest to a free waiter.", 2],
  ["API gateway", "One front door for all services: checks the login token (authentication), applies rate limits, routes /score to the scoring service, logs the call.", "The manager who checks your reservation and tells you which section to sit in.", 8],
  ["Service (stateless)", "Your code (e.g. FastAPI in a container). Stateless = it keeps nothing in memory between requests, so any copy can serve any request, and you can add copies freely.", "A waiter. Any waiter can take any order because the order is written on the ticket, not in the waiter's head.", 10],
  ["Cache (Redis)", "Checks if this answer was computed recently. A hit returns in ~1 ms and skips everything below. Here: a miss.", "The chef's counter of ready-made popular dishes.", 1],
  ["Database / feature store", "Fetches the doctor's latest features (prescriptions, visits) by key. Indexed lookups take a few milliseconds.", "The pantry with labelled shelves.", 12],
  ["Model inference", "Loads the features into the model (already in memory) and predicts. An XGBoost model takes about a millisecond; a large LLM takes seconds.", "The chef cooking the dish.", 15],
  ["Queue (async side work)", "The service drops a message on a queue (Kafka/SQS) for logging and monitoring, without waiting for it, so the user isn't slowed down.", "Putting the dirty plates on the conveyor to the kitchen instead of washing them before serving.", 2],
  ["Response", "The score and its top reasons return through the gateway to the app. The result is also written to the cache for next time.", "The dish arrives at the table.", 5]
]);

VIZ["journey-agent"] = box => journey(box, "One agent request at scale", "A user asks the copilot: “Which oncology brands grew fastest last quarter and why?” Follow it through a production agent platform (illustrative timings).", [
  ["Client → gateway", "The web app opens a streaming connection (SSE or WebSocket) and sends the question with the user's token. The gateway authenticates, applies a per-user rate limit and attaches the user's permissions.", "Checking in at reception with your ID badge.", 40],
  ["API service", "A stateless FastAPI service creates a run ID and thread ID, stores the request in Postgres, puts a job on the queue and immediately tells the client “accepted, run 8f2…”. The HTTP request isn't held open while the agent works.", "A token number at a bank counter: you don't stand at the window while they process.", 30],
  ["Queue → worker", "A worker pod picks up the job, loads the conversation state from the checkpointer (Postgres) and starts the LangGraph graph. More jobs waiting → the autoscaler (KEDA) adds workers.", "The next free clerk calls your token number.", 120],
  ["Router / planner (LLM)", "A small, fast model classifies the question and plans: SQL for the numbers, document search for the reasons. Its partial output streams to the user via Redis pub/sub → SSE.", "The clerk reads your request and decides which departments to ask.", 900],
  ["Tool: SQL", "The SQL tool (text-to-SQL, read-only role, row-level security, 10 s timeout) queries the warehouse. The result is summarised before it goes back into the prompt.", "Asking the accounts department for the figures.", 1800],
  ["Tool: retrieval", "Hybrid search + reranker over field notes, filtered by the user's region permissions.", "Asking the records room for relevant notes.", 600],
  ["Checkpoint", "After each step the graph state is saved. If the pod crashes, another worker resumes from here instead of starting over (and repeating tool calls).", "The clerk writes progress on your file so a colleague can pick it up.", 20],
  ["Answer (large LLM)", "The main model writes the answer with citations, streaming tokens to the user as they're generated. Users see text after ~1 s even though the full answer takes several seconds.", "The clerk explaining the answer to you, sentence by sentence.", 4000],
  ["Guardrails + logging", "Output checks (PII, citations valid), then the trace (every step, tokens, cost, latency) goes to LangSmith/Langfuse; metrics to Prometheus.", "The supervisor's quick check and the record in the register.", 150]
]);

VIZ["autoscale-sim"] = box => {
  head(box, "Autoscaling over a working day", "Traffic (requests/sec) to a model API from 6 am to midnight. Each pod handles a fixed load. The autoscaler adds pods when load per pod exceeds the target, but new pods take a few minutes to start. Red = overloaded (slow or failing requests).");
  const ctrl = ctrlRow(box);
  const cap = slider(ctrl, "as-c", "Requests/sec one pod can handle", 5, 40, 1, 20, v => v);
  const tgt = slider(ctrl, "as-t", "Target utilisation", 0.4, 0.95, 0.05, 0.6, v => Math.round(v * 100) + "%");
  const ctrl2 = ctrlRow(box);
  const mn = slider(ctrl2, "as-m", "Min pods", 1, 10, 1, 2, v => v);
  const lag = slider(ctrl2, "as-l", "Start-up delay (min)", 1, 15, 1, 4, v => v);
  const cv = addCanvas(box, 230, "Traffic, capacity and pods over the day"); const st = statsRow(box);
  legend(box, [["--k6", "traffic"], ["--sub-sys", "capacity (pods × per-pod limit)"], ["--bad", "overloaded"]]);
  const T = []; for (let m = 0; m <= 18 * 60; m += 5) { const h = 6 + m / 60; const v = 8 + 140 * Math.exp(-((h - 11) ** 2) / 3.5) + 110 * Math.exp(-((h - 15.5) ** 2) / 4) + (h > 13 && h < 13.6 ? 120 : 0); T.push([m, v]); }
  onDraw(() => {
    const { x, w, h } = prep(cv), pad = { l: 34, r: 10, t: 12, b: 22 };
    const c = +cap.value, tg = +tgt.value, mnp = +mn.value, lg = +lag.value;
    let pods = mnp, pending = []; const P = [];
    T.forEach(([m, v]) => { pending = pending.filter(p => { if (p[0] <= m) { pods = Math.max(pods, p[1]); return false; } return true; }); const want = Math.max(mnp, Math.ceil(v / (c * tg))); if (want > pods && !pending.some(p => p[1] >= want)) pending.push([m + lg, want]); if (want < pods) pods = Math.max(want, pods - 1); P.push(pods); });
    const mx = Math.max(...T.map(t => t[1]), ...P.map(p => p * c)) * 1.08;
    const X = lin(0, 18 * 60, pad.l, w - pad.r), Y = lin(0, mx, h - pad.b, pad.t);
    frame(x, w, h, pad);
    let over = 0;
    T.forEach(([m, v], i) => { if (v > P[i] * c) { over += 5; x.fillStyle = css("--bad-soft"); x.fillRect(X(m) - 2, pad.t, 4.5, h - pad.t - pad.b); } });
    x.strokeStyle = css("--sub-sys"); x.lineWidth = 2; x.beginPath(); T.forEach(([m], i) => { const y = Y(P[i] * c); if (i) { x.lineTo(X(m), Y(P[i - 1] * c)); x.lineTo(X(m), y); } else x.moveTo(X(m), y); }); x.stroke();
    x.strokeStyle = css("--k6"); x.lineWidth = 2; x.beginPath(); T.forEach(([m, v], i) => i ? x.lineTo(X(m), Y(v)) : x.moveTo(X(m), Y(v))); x.stroke();
    [6, 9, 12, 15, 18, 21, 24].forEach(hh => text(x, (hh % 24) + ":00", X((hh - 6) * 60), h - 6, css("--muted"), "center"));
    text(x, fmt(mx) + " rps", 2, pad.t + 8);
    const podHours = P.reduce((s, p) => s + p * 5 / 60, 0);
    setStats(st, [["Max pods", Math.max(...P)], ["Pod-hours (cost)", fmt(podHours)], ["Overloaded", over + " min"]]);
  });
  [cap, tgt, mn, lag].forEach(s => s.addEventListener("input", () => ACTIVE.forEach(f => f())));
  note(box, "Try: lower the target utilisation (more headroom) or raise min pods to absorb the 1 pm spike, and watch cost (pod-hours) rise. That trade-off is the whole autoscaling conversation.");
};

VIZ["ml-arch"] = box => archExplorer(box, "An ML system, piece by piece", "Tap any box. The model itself is one small box; most of the system is data plumbing and safety nets.", [
  ["Data and features", [["src", "Source systems"], ["etl", "Pipelines (ETL)"], ["fs", "Feature store"]]],
  ["Training", [["train", "Training pipeline"], ["track", "Experiment tracking"], ["reg", "Model registry"]]],
  ["Serving", [["ci", "CI/CD"], ["serve", "Model service"], ["app", "Business app"]]],
  ["Watching", [["mon", "Monitoring"], ["fb", "Labels & feedback"], ["retrain", "Retraining"]]]
], {
  src: { what: "Where raw data lives: policy and claims systems, core banking, EHR, CRM, event streams.", like: "The farms that supply the restaurant.", tech: "OLTP databases (Oracle, Postgres), Kafka streams, files in S3/ADLS.", fail: "Schema changes upstream silently break features; late or missing data." },
  etl: { what: "Scheduled jobs that clean, join and aggregate raw data into tables and features.", like: "Washing and chopping vegetables before service.", tech: "Spark / Databricks, dbt, Airflow or Databricks Workflows for scheduling.", scale: "Distributed compute (Spark) and incremental processing.", fail: "Data leakage (using information from after the prediction time), duplicates, silent nulls. Add data-quality checks (Great Expectations, dbt tests)." },
  fs: { what: "One place that stores features with timestamps and serves them two ways: in bulk for training (offline) and by key in milliseconds for live predictions (online).", like: "A pantry where every ingredient has a label and a date, used both for practice cooking and real service.", tech: "Databricks Feature Store, Feast, SageMaker Feature Store; online store in Redis/DynamoDB.", scale: "Offline: Delta/Parquet tables. Online: key-value store.", fail: "Training–serving skew: the feature is computed one way in training and another way live. Point-in-time joins prevent leakage." },
  train: { what: "Code that pulls a training snapshot, trains (e.g. XGBoost), tunes, evaluates on a time-based holdout, and checks fairness and calibration.", tech: "Python, scikit-learn/XGBoost, Spark ML; runs as a job, not a notebook.", fail: "Not reproducible: unpinned data, code or library versions." },
  track: { what: "Records every run: data version, parameters, metrics, plots, the model file.", like: "A lab notebook that writes itself.", tech: "MLflow (built into Databricks), Weights & Biases, SageMaker Experiments.", fail: "Without it, nobody can say which model is in production or how it was built." },
  reg: { what: "Stores approved model versions with stages or aliases (staging, champion, challenger, archived) and who approved them.", like: "The menu board: only approved dishes go on it.", tech: "MLflow Model Registry / Unity Catalog, SageMaker Model Registry.", fail: "Manual file copies of model.pkl; no approval trail (a big problem in banking and healthcare)." },
  ci: { what: "Automated tests and deployment: unit tests, data tests, a model quality gate (must beat the champion), build a container, deploy to staging then production.", tech: "GitHub Actions / GitLab CI / Azure DevOps, Docker, Terraform, Argo CD.", fail: "Deploying by hand from a laptop; no rollback path." },
  serve: { what: "Makes predictions available: a nightly batch job writing scores to a table, or a REST API answering in milliseconds.", like: "The kitchen pass where finished dishes go out.", tech: "Batch: Spark job. Real-time: FastAPI/BentoML in Docker on Kubernetes, SageMaker / Databricks Model Serving.", scale: "Stateless replicas behind a load balancer, autoscaling.", fail: "Latency spikes from slow feature lookups; the model loaded on every request instead of once at start-up." },
  app: { what: "Where the prediction is used: a claims triage queue, a loan decision engine, an EHR alert, a CRM next-best-action.", tech: "Business rules engine + UI; the model score is one input to a decision.", fail: "Nobody acts on the score. Adoption and workflow fit decide the value, not AUC." },
  mon: { what: "Watches service health (latency, errors), data drift (PSI), prediction drift, and model performance once labels arrive.", like: "The smoke alarm and the customer feedback cards.", tech: "Prometheus + Grafana, Evidently, WhyLabs, SageMaker Model Monitor, Databricks Lakehouse Monitoring.", fail: "Only monitoring uptime: the API is 'healthy' while predictions have quietly gone wrong." },
  fb: { what: "Collects the true outcomes (was the claim fraud? did the loan default?) and joins them to past predictions.", tech: "Outcome tables joined on prediction ID and timestamp.", fail: "Labels arrive months later, and only for cases you acted on (selection bias)." },
  retrain: { what: "Rebuilds the model on fresh data on a schedule or when monitoring triggers it, then sends it back through validation and approval.", tech: "Scheduled pipeline (monthly/quarterly) + drift-triggered runs; champion–challenger comparison.", fail: "Auto-deploying a retrained model without checks; retraining on data that your own model influenced (feedback loops)." }
}, "fs");

VIZ["deploy-strategies"] = box => {
  head(box, "Releasing a new model safely", "You have model v1 in production and a new v2. Pick a strategy and how much traffic v2 gets. Turn on “v2 has a hidden problem” to see how many of 10,000 daily users would be affected before you notice.");
  const ctrl = ctrlRow(box);
  const s = selectBox(ctrl, "ds-s", "Strategy", [["shadow", "Shadow"], ["canary", "Canary"], ["bg", "Blue–green"], ["ab", "A/B test"]], "canary");
  const p = slider(ctrl, "ds-p", "Traffic to v2", 0, 100, 5, 5, v => v + "%");
  const bug = checkbox(ctrl, "ds-b", "v2 has a hidden problem", false);
  const vis = el("div", { style: "display:grid;grid-template-columns:auto 1fr;gap:8px 10px;align-items:center;margin:10px 0" }); box.appendChild(vis);
  const st = statsRow(box); const d = el("div", { class: "worked", style: "margin-top:8px" }); box.appendChild(d);
  const info = {
    shadow: ["v2 receives a <strong>copy</strong> of real requests and its predictions are logged, but users only ever see v1's answer.", "Zero user risk; compare v1 and v2 on identical live traffic. Costs double compute.", "First step for any risky model: credit scoring, fraud, clinical."],
    canary: ["A small share of real users (1% → 5% → 25% → 100%) gets v2. Watch errors, latency and business metrics at each step.", "Limits the blast radius; automatic rollback if metrics breach thresholds.", "Default for most model and service updates."],
    bg: ["Two full environments: blue (v1) and green (v2). Test green, then flip the router so 100% goes to green at once. Keep blue running to flip back.", "Instant switch and instant rollback; needs double infrastructure for a while.", "When you can't mix versions (e.g. a database schema change) or need a clean cut-over."],
    ab: ["Users are randomly split (e.g. 50/50) for weeks, and a business metric (conversion, loss rate) is compared with a statistical test.", "Measures real business impact, not just model metrics. Slow, and half of users get the worse version during the test.", "When the question is “does v2 make more money / save more?”"]
  };
  const draw = () => {
    const k = s.value; let share = k === "shadow" ? 0 : k === "bg" ? (+p.value >= 50 ? 100 : 0) : +p.value;
    p.disabled = k === "shadow";
    const bars = [["v1 (current)", 100 - share, "--k6"], ["v2 (new)", share, "--sub-sys"]];
    vis.innerHTML = bars.map(([n, v, c]) => `<span style="font:.8rem var(--f-mono)">${n}</span><div style="background:var(--line);border-radius:6px;height:18px;position:relative"><div style="width:${v}%;height:100%;border-radius:6px;background:var(${c})"></div><span style="position:absolute;right:6px;top:0;font:.72rem/18px var(--f-mono)">${v}%${k === "shadow" && n.startsWith("v2") ? " served · 100% mirrored" : ""}</span></div>`).join("");
    const hit = bug.checked ? Math.round(10000 * share / 100) : 0;
    setStats(st, [["Users served by v2 / day", fmt(10000 * share / 100)], ["Affected if v2 is bad", bug.checked ? fmt(hit) : "–"], ["Rollback", { shadow: "nothing to roll back", canary: "route back to v1 (seconds)", bg: "flip router (seconds)", ab: "end the test" }[k]]]);
    d.innerHTML = `<p style="margin:.3em 0">${info[k][0]}</p><p style="margin:.3em 0"><strong>Trade-off:</strong> ${info[k][1]}</p><p style="margin:.3em 0"><strong>Use when:</strong> ${info[k][2]}</p>${k === "bg" ? '<p class="sqlmeta">Blue–green is all or nothing: below 50% the router stays on blue, from 50% it flips to green.</p>' : ""}`;
  };
  s.addEventListener("change", draw); p.addEventListener("input", draw); bug.addEventListener("change", draw); draw();
};

VIZ["psi-calc"] = box => {
  head(box, "Drift detector: Population Stability Index", "Grey bars: how a feature (e.g. applicant income) was distributed in training. Coloured bars: this month's live data. Shift it and watch PSI.");
  const ctrl = ctrlRow(box);
  const sh = slider(ctrl, "ps-s", "Shift the live data", -1.5, 1.5, 0.1, 0.3, v => (v > 0 ? "+" : "") + v.toFixed(1) + " sd");
  const sp = slider(ctrl, "ps-w", "Spread", 0.6, 1.6, 0.1, 1, v => "× " + v.toFixed(1));
  const cv = addCanvas(box, 200, "Training versus live distribution by bin"); const st = statsRow(box); const nt = note(box, "");
  const cdf = z => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z ** 3)));
  const edges = [-Infinity, -1.6, -1.1, -0.65, -0.3, 0, 0.3, 0.65, 1.1, 1.6, Infinity];
  onDraw(() => {
    const { x, w, h } = prep(cv), pad = { l: 10, r: 10, t: 10, b: 20 };
    const E = edges.slice(1).map((e, i) => cdf(e) - cdf(edges[i]));
    const A = edges.slice(1).map((e, i) => Math.max(1e-4, cdf((e - +sh.value) / +sp.value) - cdf((edges[i] - +sh.value) / +sp.value)));
    const terms = E.map((e, i) => (A[i] - e) * Math.log(A[i] / e)), psi = terms.reduce((a, b) => a + b, 0);
    const mx = Math.max(...E, ...A) * 1.1, bw = (w - pad.l - pad.r) / 10, Y = lin(0, mx, h - pad.b, pad.t);
    const col = psi < 0.1 ? css("--good") : psi < 0.25 ? css("--c2") : css("--bad");
    E.forEach((e, i) => { const x0 = pad.l + i * bw; x.fillStyle = css("--line"); x.fillRect(x0 + bw * 0.1, Y(e), bw * 0.38, h - pad.b - Y(e)); x.fillStyle = col; x.fillRect(x0 + bw * 0.52, Y(A[i]), bw * 0.38, h - pad.b - Y(A[i])); text(x, "B" + (i + 1), x0 + bw / 2, h - 5, css("--muted"), "center"); });
    const top = terms.map((t, i) => [t, i]).sort((a, b) => b[0] - a[0])[0];
    setStats(st, [["PSI", psi.toFixed(3)], ["Status", psi < 0.1 ? "Stable" : psi < 0.25 ? "Investigate" : "Major shift"], ["Biggest contributor", `bin B${top[1] + 1} (${top[0].toFixed(3)})`]]);
    nt.innerHTML = `PSI = Σ (live% − train%) × ln(live% / train%) over the bins. Rules of thumb: <b style="color:var(--good)">&lt; 0.10 stable</b>, <b style="color:var(--c2)">0.10–0.25 investigate</b>, <b style="color:var(--bad)">&gt; 0.25 significant shift</b> → check the data pipeline first, then consider recalibrating or retraining.`;
  });
  [sh, sp].forEach(s => s.addEventListener("input", () => ACTIVE.forEach(f => f())));
};

VIZ["rag-arch"] = box => archExplorer(box, "Production RAG: the services", "Tap a box to see its job, typical tech, how it scales and how it breaks. The arrows show the online query path; ingestion runs separately.", [
  ["Front door", [["ui", "Chat UI"], ["gw", "API gateway"]]],
  ["Query path", [["orch", "Orchestrator"], ["ret", "Retrieval service"], ["llmgw", "LLM gateway"], ["llm", "LLM"]]],
  ["Shared stores", [["cache", "Redis cache"], ["vdb", "Vector + keyword index"], ["pg", "Postgres"], ["s3", "Object storage"]]],
  ["Offline + safety", [["ingest", "Ingestion workers"], ["guard", "Guardrails"], ["obs", "Observability & eval"]]]
], {
  ui: { what: "Web/mobile chat. Streams tokens as they arrive (Server-Sent Events or WebSocket), shows citations and thumbs up/down.", tech: "React/Next.js, Streamlit for internal pilots.", fail: "No streaming → users stare at a spinner for 8 seconds and think it's broken." },
  gw: { what: "Single entry point: SSO login (OAuth/OIDC), per-user and per-team rate limits, request size limits, routing to services.", like: "Security desk at the building entrance.", tech: "Kong, AWS API Gateway, NGINX/Envoy ingress, Azure APIM.", scale: "Horizontally; it's stateless.", fail: "No per-user limits → one script floods the LLM quota for everyone." },
  orch: { what: "The brain of each request: loads chat history, rewrites the question, calls retrieval, builds the prompt, calls the LLM, runs checks. For agents, this is the LangGraph graph.", tech: "Python FastAPI + LangGraph/LangChain/LlamaIndex, async I/O.", scale: "Stateless pods behind a load balancer; state lives in Postgres/Redis. It mostly waits on network calls, so async code serves many requests per pod.", fail: "Synchronous blocking calls → a few slow LLM calls exhaust all workers." },
  ret: { what: "Embeds the query, runs hybrid search (vector + BM25) with permission filters, reranks, returns top chunks with metadata.", tech: "Embedding model (API or TEI on GPU), cross-encoder reranker, FastAPI.", scale: "Embedding and reranker on GPU or CPU pods scaled on queue depth; can be its own microservice because it scales differently from the orchestrator.", fail: "Permission filter applied after retrieval → leaks or empty results; reranker becomes the latency bottleneck." },
  llmgw: { what: "One internal API in front of all models: routing (small vs large), fallbacks between providers, retries with back-off, token counting per team, caching, key management.", like: "A switchboard operator who knows which expert is free and how much each call costs.", tech: "LiteLLM, Portkey, Azure APIM, a custom proxy.", fail: "Every service calls the provider directly → no cost control, no fallback when a provider rate-limits you." },
  llm: { what: "Generates the answer. Either a hosted API or a self-hosted open model.", tech: "API: Azure OpenAI, Bedrock (Claude), Vertex (Gemini). Self-hosted: vLLM or TGI serving Llama/Mistral/Qwen on GPU nodes.", scale: "API: quota (tokens per minute) and multiple deployments/regions. Self-hosted: more GPU replicas, autoscaled on queue length or time-to-first-token.", fail: "Hitting the tokens-per-minute quota at peak → 429 errors. Plan quota for peak, not average." },
  cache: { what: "Short-lived data: exact and semantic answer cache, retrieval results, sessions, rate-limit counters, pub/sub for streaming.", tech: "Redis / ElastiCache / Azure Cache for Redis.", fail: "Caching answers without the user's permission scope → one user sees another's restricted data." },
  vdb: { what: "Stores chunk vectors and text with metadata; answers similarity + keyword queries.", tech: "OpenSearch/Elasticsearch (hybrid in one place), pgvector, Qdrant, Pinecone, Weaviate, Databricks Vector Search.", scale: "Replicas for read throughput, shards for size; HNSW index in memory.", fail: "Index not updated when documents change; deleted documents still answer questions." },
  pg: { what: "Durable records: users, conversations, feedback, document metadata, agent checkpoints, audit log.", tech: "PostgreSQL (RDS/Aurora/Azure Database).", scale: "Read replicas, connection pooling (PgBouncer).", fail: "Too many connections from autoscaled pods; no pooling." },
  s3: { what: "Raw documents and parsed versions; the source of truth for re-indexing.", tech: "S3, ADLS, GCS.", fail: "No versioning → can't reproduce what the bot knew on a given day." },
  ingest: { what: "Event-driven pipeline: a document lands → queue → workers parse, chunk, embed, upsert into the index; deletes propagate.", like: "The back-office team filing new documents into the library every night.", tech: "S3 events/SQS or Kafka, Celery/Argo/Databricks jobs, Unstructured or Azure Document Intelligence for parsing.", scale: "Batch embeddings on GPU workers; scale workers on queue depth.", fail: "Re-embedding everything on every change; no idempotency → duplicate chunks." },
  guard: { what: "Input checks (prompt injection, PII), output checks (toxicity, PII, citation validity), topic restrictions.", tech: "Llama Guard, NeMo Guardrails, Presidio for PII, provider moderation.", fail: "Guardrails add latency if run in sequence; run cheap checks in parallel with generation where possible." },
  obs: { what: "Traces each request (prompt, chunks, tool calls, tokens, cost, latency), dashboards, alerts, offline eval runs on a golden set, user feedback analysis.", tech: "LangSmith, Langfuse, Arize Phoenix, OpenTelemetry → Grafana/Datadog.", fail: "No traces → can't tell whether a bad answer was retrieval or generation." }
}, "orch");

VIZ["latency-budget"] = box => {
  head(box, "Where do the seconds go?", "A single RAG answer, step by step. Adjust the slow parts and see total time vs the time until the user sees the first word.");
  const ctrl = ctrlRow(box);
  const rw = checkbox(ctrl, "lb-rw", "Query rewrite with an LLM", true);
  const rr = checkbox(ctrl, "lb-rr", "Cross-encoder rerank", true);
  const sm = checkbox(ctrl, "lb-st", "Stream the answer", true);
  const ctrl2 = ctrlRow(box);
  const ot = slider(ctrl2, "lb-o", "Answer length (tokens)", 100, 1000, 50, 400, v => v);
  const tps = slider(ctrl2, "lb-t", "Generation speed (tokens/s)", 20, 150, 10, 60, v => v);
  const bar = el("div", { style: "display:flex;height:26px;border-radius:7px;overflow:hidden;margin:10px 0 4px;border:1px solid var(--line)" }); box.appendChild(bar);
  const lg = el("div", { class: "legend" }); box.appendChild(lg); const st = statsRow(box);
  const draw = () => {
    const S = [["Gateway + auth", 30, "--muted"], ["Rewrite (small LLM)", rw.checked ? 450 : 0, "--k5"], ["Embed query", 40, "--k6"], ["Hybrid search", 70, "--k3"], ["Rerank", rr.checked ? 180 : 0, "--k4"], ["Build prompt", 15, "--muted"], ["LLM first token", 700, "--c2"], ["LLM rest of answer", Math.round(+ot.value / +tps.value * 1000), "--sub-sys"], ["Output checks", 120, "--good"]].filter(s => s[1] > 0);
    const total = S.reduce((a, s) => a + s[1], 0), first = S.slice(0, S.findIndex(s => s[0] === "LLM first token") + 1).reduce((a, s) => a + s[1], 0);
    bar.innerHTML = S.map(s => `<div title="${s[0]}: ${s[1]} ms" style="flex:${s[1]};background:var(${s[2]})"></div>`).join("");
    lg.innerHTML = S.map(s => `<span><i style="background:var(${s[2]})"></i>${s[0]} ${s[1]} ms</span>`).join("");
    setStats(st, [["Total", (total / 1000).toFixed(1) + " s"], ["User sees first words after", ((sm.checked ? first : total) / 1000).toFixed(1) + " s"], ["Biggest chunk", S.reduce((a, b) => b[1] > a[1] ? b : a)[0]]]);
  };
  [rw, rr, sm].forEach(c => c.addEventListener("change", draw)); [ot, tps].forEach(s => s.addEventListener("input", draw)); draw();
  note(box, "Generation dominates, so: stream, keep answers concise, use a faster model for rewriting (or skip it for clear questions), and run output checks on chunks while streaming.");
};

VIZ["genai-capacity"] = box => {
  head(box, "Capacity planner: GenAI app for thousands of users", "Estimate peak load for an LLM app, and what it means for API quotas or self-hosted GPUs. All inputs are assumptions you can change; the per-GPU throughput must be measured for your model with a load test.");
  const c1 = ctrlRow(box);
  const U = numIn(c1, "gc-u", "Users", 6000, 500), PA = numIn(c1, "gc-pa", "% using it in the peak hour", 20, 5, "4.5em"), QH = numIn(c1, "gc-q", "Questions per user in that hour", 4, 1, "4.5em");
  const c2 = ctrlRow(box);
  const CALLS = numIn(c2, "gc-c", "LLM calls per question", 3, 1, "4.5em"), IT = numIn(c2, "gc-i", "Input tokens per call", 2500, 250), OT = numIn(c2, "gc-o", "Output tokens per call", 300, 50), LAT = numIn(c2, "gc-l", "Seconds per question", 8, 1, "4.5em");
  const c3 = ctrlRow(box);
  const GT = numIn(c3, "gc-g", "Output tokens/s one GPU sustains (measure!)", 1500, 100), HR = numIn(c3, "gc-h", "Headroom ×", 1.5, 0.1, "4.5em");
  const st = statsRow(box); const ex = el("div", { class: "worked", style: "margin-top:10px" }); box.appendChild(ex);
  const draw = () => {
    const active = +U.value * +PA.value / 100, qph = active * +QH.value, qps = qph / 3600, calls = qps * +CALLS.value, conc = qps * +LAT.value;
    const itpm = calls * 60 * +IT.value, otpm = calls * 60 * +OT.value, otps = calls * +OT.value, gpus = Math.max(1, Math.ceil(otps * +HR.value / +GT.value));
    setStats(st, [["Peak questions/s", fmt(qps, 2)], ["Questions in flight", fmt(Math.ceil(conc))], ["Input tokens/min", fmt(itpm)], ["Output tokens/min", fmt(otpm)], ["GPUs (self-host)", gpus]]);
    ex.innerHTML = `<p style="margin:.3em 0">${fmt(active)} people active in the busiest hour × ${QH.value} questions = <strong>${fmt(qph)} questions/hour ≈ ${fmt(qps, 2)}/s</strong>. Each needs ${CALLS.value} LLM calls (rewrite, answer, check…) = ${fmt(calls, 1)} calls/s.</p><p style="margin:.3em 0"><strong>API route:</strong> your quota must cover about <strong>${fmt(itpm)} input + ${fmt(otpm)} output tokens per minute</strong> at peak (plus headroom), or you'll get 429 rate-limit errors. Ask for quota in more than one region/deployment and put a fallback model behind the LLM gateway.</p><p style="margin:.3em 0"><strong>Self-host route:</strong> the cluster must generate ${fmt(otps)} output tokens/s. At ${fmt(GT.value)} tokens/s per GPU with ×${HR.value} headroom → <strong>${gpus} GPU${gpus > 1 ? "s" : ""}</strong> for the main model (minimum 2 for redundancy), plus separate capacity for embeddings and the reranker. Prefill of long prompts also costs GPU time, so validate with a load test (k6, Locust, vLLM's benchmark script).</p><p style="margin:.3em 0">Little's law: ${fmt(qps, 2)}/s × ${LAT.value} s ≈ <strong>${fmt(Math.ceil(conc))} questions in progress at once</strong>, which sizes your async workers, connection pools and streaming connections.</p>`;
  };
  [U, PA, QH, CALLS, IT, OT, LAT, GT, HR].forEach(i => i.addEventListener("input", draw)); draw();
};

VIZ["cache-layers"] = box => {
  head(box, "Caching layers in a GenAI app", "Requests fall through the caches from top to bottom. Change the hit rates and see the average latency and cost per 1,000 questions (illustrative costs).");
  const ctrl = ctrlRow(box);
  const h1 = slider(ctrl, "cl-1", "Exact answer cache hit", 0, 0.5, 0.05, 0.1, v => Math.round(v * 100) + "%");
  const h2 = slider(ctrl, "cl-2", "Semantic cache hit", 0, 0.5, 0.05, 0.15, v => Math.round(v * 100) + "%");
  const ctrl2 = ctrlRow(box);
  const h3 = slider(ctrl2, "cl-3", "Retrieval cache hit", 0, 0.8, 0.05, 0.3, v => Math.round(v * 100) + "%");
  const h4 = checkbox(ctrl2, "cl-4", "Provider prompt caching (static system prompt)", true);
  const flow = el("div", { style: "display:grid;gap:6px;margin:10px 0" }); box.appendChild(flow); const st = statsRow(box);
  const draw = () => {
    const a = +h1.value, b = +h2.value, r = +h3.value;
    const pExact = a, pSem = (1 - a) * b, pFull = (1 - a) * (1 - b);
    const retMs = r * 5 + (1 - r) * 250, llmMs = h4.checked ? 3400 : 3800, llmCost = h4.checked ? 0.0105 : 0.0135;
    const lat = pExact * 5 + pSem * 45 + pFull * (45 + retMs + llmMs), cost = 1000 * (pSem * 0.00002 + pFull * (0.00002 + llmCost));
    const rows = [["1 · Exact cache (Redis key = normalised question + user scope)", pExact, "5 ms, $0"], ["2 · Semantic cache (embed question, find a near-identical past question)", pSem, "≈45 ms, tiny embedding cost"], ["3 · Full pipeline (retrieval " + (r ? Math.round(r * 100) + "% cached" : "uncached") + ", then LLM" + (h4.checked ? " with prompt cache" : "") + ")", pFull, `≈${fmt(45 + retMs + llmMs)} ms, ≈$${llmCost.toFixed(4)}`]];
    flow.innerHTML = rows.map(([t, p, c], i) => `<div style="display:grid;grid-template-columns:1fr auto;gap:4px;align-items:center"><span style="font-size:.84rem">${t}<br><span class="sqlmeta">${c}</span></span><strong style="font-family:var(--f-mono)">${Math.round(p * 100)}%</strong><div style="grid-column:1/-1;height:8px;border-radius:4px;background:var(--line)"><div style="width:${p * 100}%;height:100%;border-radius:4px;background:var(${["--good", "--k6", "--sub-sys"][i]})"></div></div></div>`).join("");
    setStats(st, [["Avg latency", (lat / 1000).toFixed(2) + " s"], ["Cost / 1,000 questions", "$" + cost.toFixed(2)], ["Questions reaching the LLM", Math.round(pFull * 100) + "%"]]);
  };
  [h1, h2, h3].forEach(s => s.addEventListener("input", draw)); h4.addEventListener("change", draw); draw();
  note(box, "Inside the model server there's one more cache, the KV cache, which vLLM manages automatically (and can reuse for shared prompt prefixes). Every answer cache must be invalidated when the underlying documents change, and keyed by the user's permission scope.");
};

VIZ["arch-insurance"] = box => archExplorer(box, "Insurance claims fraud: the deployed system", "Tap each part. Flow: a claim is filed → features → score → triage → investigators → outcomes feed back.", [
  ["Claim comes in", [["fnol", "Claim filed (FNOL)"], ["feat", "Feature build"], ["score", "Fraud model"]]],
  ["Decision", [["rules", "Rules + thresholds"], ["triage", "Triage queue"], ["siu", "Investigators (SIU)"]]],
  ["Learning loop", [["label", "Outcomes"], ["monitor", "Monitoring"], ["gov", "Governance"]]]
], {
  fnol: { what: "First Notice of Loss: the customer reports a claim (app, call centre, garage). The claims system creates a claim record and publishes a 'claim created' event.", tech: "Guidewire / in-house claims system, Kafka or SQS event.", fail: "Key fields arrive later (repair estimate, police report), so the first score has less information." },
  feat: { what: "Builds ~100–300 features: claim amount vs policy sum, days since policy start, number of past claims, garage/hospital history, claimant–garage network links, text signals from the claim description.", like: "The detective's checklist of red flags.", tech: "Spark/Databricks batch features + online feature store for the latest values; graph features (shared phone numbers, addresses) from a graph database.", fail: "Leakage: using fields only known after investigation (e.g. 'claim rejected') in training." },
  score: { what: "XGBoost/LightGBM model outputs a fraud probability and the top SHAP reasons. Scored at claim creation (real-time API, < 200 ms) and re-scored nightly in batch as new documents arrive.", tech: "MLflow model in a FastAPI container on Kubernetes or SageMaker endpoint; nightly Spark batch job.", fail: "Only 1–2% of claims are fraud: optimise PR-AUC and precision at the top, not accuracy." },
  rules: { what: "Combines the score with business rules (e.g. very large claims always reviewed; tiny claims fast-tracked). The threshold is set by investigator capacity: if SIU can review 150 claims a week, flag the top 150 by score.", tech: "Decision engine / rules in the claims system.", fail: "A threshold chosen by F1 on a notebook instead of by capacity and cost of fraud vs cost of investigation." },
  triage: { what: "Low-risk claims are fast-tracked for straight-through payment (good customer experience); medium go to normal handling; high go to the investigation queue with reason codes.", like: "A hospital triage desk: urgent, standard, fast lane.", fail: "Too many false alarms → investigators ignore the queue (alert fatigue)." },
  siu: { what: "Special Investigation Unit reviews flagged claims using the reasons shown (e.g. 'policy started 9 days before loss', 'garage linked to 14 prior claims'). Humans make the final decision.", fail: "No explanation shown → investigators can't trust or use the score." },
  label: { what: "Investigation outcomes (confirmed fraud / genuine) become labels, often months later. Unflagged claims are rarely investigated, so labels are biased towards what the model already flags.", tech: "Outcome tables joined to scoring logs by claim ID.", fail: "Training only on investigated claims → the model learns its own blind spots. Send a small random sample of unflagged claims for review." },
  monitor: { what: "Weekly: flag rate, score distribution and feature PSI; monthly: hit rate (share of flagged claims confirmed as fraud), money saved, fast-track error rate.", tech: "Evidently/Lakehouse Monitoring dashboards, alerts in Teams/Slack.", fail: "Fraudsters adapt (concept drift); a new product line changes the data." },
  gov: { what: "Model documentation, bias checks across protected groups and regions, explanation for every flag, audit trail of versions and approvals; regulators (e.g. IRDAI in India) and internal audit can ask why a claim was delayed.", tech: "Model registry approvals, SHAP reason codes stored with each score, fairness reports.", fail: "Using features that act as proxies for protected attributes (e.g. pincode → community)." }
}, "score");

VIZ["arch-credit"] = box => archExplorer(box, "Bank: real-time credit decisions", "A loan application gets a decision in seconds. Tap each part.", [
  ["Application", [["apply", "Application"], ["bureau", "Bureau + internal data"], ["fs2", "Feature service"]]],
  ["Decision (< 1 s)", [["model2", "Scorecard / XGBoost"], ["engine", "Decision engine"], ["explain", "Reason codes"]]],
  ["Control", [["champ", "Champion–challenger"], ["mon2", "Monitoring (PSI, AUC)"], ["mrm", "Model risk management"]]]
], {
  apply: { what: "Customer applies in the app or branch: income, employment, loan amount, consent to fetch credit data.", fail: "Self-reported income is noisy; verify via bank statements or account aggregator data." },
  bureau: { what: "Fetches the credit bureau report (CIBIL/Experian score, past loans, delinquencies) and internal data (salary credits, existing products).", tech: "Bureau API calls with timeouts and caching; core banking data from the warehouse.", fail: "Bureau API slow or down → need a timeout and a fallback path (manual review)." },
  fs2: { what: "Computes the exact same features as in training (debt-to-income, utilisation, months since last delinquency) from the fetched data.", tech: "Shared feature code (same library in training and serving), online feature store.", fail: "Training–serving skew: a feature computed slightly differently live silently shifts every score." },
  model2: { what: "A probability of default (PD) model. Often logistic regression scorecards (very explainable) or monotonic-constrained XGBoost.", tech: "Model in a container/endpoint; p99 latency target well under 100 ms.", fail: "Non-monotonic effects (higher income → higher risk in one range) are hard to defend to regulators; use monotonic constraints." },
  engine: { what: "Turns PD into a decision with policy rules: approve / decline / refer to underwriter, plus the loan limit and interest rate (risk-based pricing). The model doesn't decide alone.", like: "The credit committee's rulebook applied automatically.", tech: "Decision engines (FICO Blaze, Experian PowerCurve, in-house rules service).", fail: "Rules and model maintained by different teams drift apart." },
  explain: { what: "The top factors behind a decline are turned into plain reason codes ('high credit utilisation', 'recent missed payment'). Regulations in many countries require telling customers why they were declined.", tech: "Scorecard points or SHAP values mapped to approved reason texts.", fail: "SHAP on correlated features gives unstable reasons; validate reason codes with compliance." },
  champ: { what: "The new model runs in shadow (scores every application, decides nothing) for a period, then on a small share of traffic; promoted only if better on discrimination (AUC/Gini), calibration and business KPIs.", fail: "Comparing on the old model's approved population only (reject inference problem: you never see outcomes for declined applicants)." },
  mon2: { what: "Monthly PSI on the score and on key features (CSI), approval rate, early delinquency (e.g. 30+ days past due at 3 months), AUC/Gini once outcomes mature (12+ months), calibration by score band.", fail: "Outcomes take a year; rely on early-warning indicators and input drift in the meantime." },
  mrm: { what: "Model risk management (US SR 11-7; similar RBI and EU expectations): an independent team validates the model before use and periodically; model inventory, documentation, limitations, approvals and annual reviews.", tech: "Model inventory, validation reports, registry with approval states.", fail: "Shipping a model without independent validation — in a bank, this is a regulatory finding." }
}, "engine");

VIZ["arch-health"] = box => archExplorer(box, "Hospital: readmission risk in the clinical workflow", "Predict which inpatients are likely to be readmitted within 30 days, so care managers can intervene. Tap each part.", [
  ["Data", [["ehr", "EHR data"], ["etl3", "Clinical data pipeline"], ["phi", "PHI security"]]],
  ["Prediction", [["batch3", "Scoring every few hours"], ["model3", "Risk model"], ["silent", "Silent mode trial"]]],
  ["Action", [["ui3", "Score in the EHR"], ["care", "Care manager workflow"], ["mon3", "Monitoring & equity"]]]
], {
  ehr: { what: "Electronic Health Record: diagnoses, labs, vitals, medications, prior admissions, length of stay, discharge plans.", tech: "Epic, Cerner/Oracle Health; HL7 v2 messages and FHIR APIs; nightly reporting databases (e.g. Epic Clarity).", fail: "Data entered late (diagnosis codes often finalised after discharge) → the live model sees less than the training data did." },
  etl3: { what: "Pulls and cleans clinical data, maps codes (ICD-10, LOINC), builds features such as number of admissions in the last 6 months, abnormal labs, comorbidity scores.", tech: "Spark/Databricks or SQL pipelines inside the hospital's network or a compliant cloud.", fail: "Training on discharge-time data but scoring during the stay (leakage of information that isn't known yet)." },
  phi: { what: "Protected Health Information must stay protected: encryption, access control, audit logs, minimum necessary data, de-identification for model development.", tech: "Private cloud/on-prem, VPCs, HIPAA (US) or DPDP Act (India) controls, BAAs with vendors.", fail: "Sending PHI to an external API without agreements; logging patient data in plain text." },
  batch3: { what: "Scores all current inpatients every few hours (or nightly) rather than per click: decisions are made over days, so real-time isn't needed.", tech: "Scheduled job writes scores back into the EHR via an integration (FHIR/HL7 or vendor ML platform).", fail: "Over-engineering a real-time API for a decision made once a day." },
  model3: { what: "Gradient boosting or logistic regression on structured EHR features; calibrated probabilities so '30%' really means about 30%.", fail: "Good AUC but poorly calibrated → wrong number of patients flagged; check calibration per hospital site." },
  silent: { what: "Before go-live, the model runs in silent mode for weeks: scores are stored but not shown. Clinicians compare predictions with what actually happened, and thresholds are tuned.", like: "A new doctor shadowing a senior before treating patients alone.", fail: "Skipping it → alert fatigue or mistrust from day one." },
  ui3: { what: "A risk flag or column in the patient list (e.g. high / medium / low) with the top contributing factors, inside the screens clinicians already use.", fail: "A separate dashboard nobody opens. Integration into the existing workflow decides adoption." },
  care: { what: "High-risk patients get interventions: medication reconciliation, follow-up appointment booked before discharge, a phone call in 48 hours. The threshold matches how many patients the care team can actually handle.", fail: "Flagging 40% of patients when the team can follow up with 10%." },
  mon3: { what: "Track drift (case mix changes, new coding practices, events like COVID), calibration, PPV at the threshold, intervention rates, and performance across age, gender, ethnicity and insurance type.", tech: "Monthly reports reviewed by a clinical AI governance committee.", fail: "Measuring success by AUC instead of readmission rates; ignoring that interventions change outcomes (the model's success makes its labels look wrong)." }
}, "silent");

/* ================= boot ================= */
(function () {
  function boot() {
    document.querySelectorAll('.viz[data-viz]').forEach((box) => {
      const f = VIZ[box.dataset.viz];
      if (!f) return;
      try { f(box); } catch (e) { console.error(e); box.innerHTML = '<p class="note">This visual could not load.</p>'; }
    });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ACTIVE.forEach((f) => f()), 150); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => ACTIVE.forEach((f) => f()));
    new MutationObserver(() => ACTIVE.forEach((f) => f())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
