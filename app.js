(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view = $('#view');
const KEY = 'gewu.v1';
let S; try { S = Object.assign({ theme: 'dark', color: 'cat', temp: 298, quiz: {}, recite: null, hist: [], ar: 'book' }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = { theme: 'dark', color: 'cat', temp: 298, quiz: {}, recite: null, hist: [], ar: 'book' }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let toastT; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); };

let E = [], BY = {};
const CAT = {
  alk: { n: '碱金属', v: '--alk' }, ae: { n: '碱土金属', v: '--ae' }, tm: { n: '过渡金属', v: '--tm' }, ptm: { n: '后过渡金属', v: '--ptm' },
  met: { n: '类金属', v: '--met' }, non: { n: '非金属', v: '--non' }, hal: { n: '卤素', v: '--hal' }, nob: { n: '稀有气体', v: '--nob' },
  lan: { n: '镧系元素', v: '--lan' }, act: { n: '锕系元素', v: '--act' }, unk: { n: '性质未明', v: '--unk' }
};
function catOf(e) {
  if (e.cat.startsWith('unknown')) return 'unk';
  if ([9, 17, 35, 53, 85].includes(e.n)) return 'hal';
  return { 'alkali metal': 'alk', 'alkaline earth metal': 'ae', 'transition metal': 'tm', 'post-transition metal': 'ptm', metalloid: 'met', 'diatomic nonmetal': 'non', 'polyatomic nonmetal': 'non', 'noble gas': 'nob', lanthanide: 'lan', actinide: 'act' }[e.cat] || 'unk';
}
const GROUPS = ['', 'ⅠA', 'ⅡA', 'ⅢB', 'ⅣB', 'ⅤB', 'ⅥB', 'ⅦB', 'Ⅷ', 'Ⅷ', 'Ⅷ', 'ⅠB', 'ⅡB', 'ⅢA', 'ⅣA', 'ⅤA', 'ⅥA', 'ⅦA', '0'];
const groupName = e => e.cat === 'lanthanide' || e.cat === 'actinide' ? `ⅢB 族（${e.cat === 'lanthanide' ? '镧系' : '锕系'}）` : `第 ${e.x} 纵列 · ${GROUPS[e.x]} 族`;
const UNSTABLE = n => n === 43 || n === 61 || (n >= 84 && n <= 89) || n >= 93;
const massStr = e => UNSTABLE(e.n) ? `[${Math.round(e.m)}]` : (+e.m.toFixed(e.m < 10 ? 3 : 2)).toString();
// 中学课本常用相对原子质量
const BOOK = { H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Ne: 20, Na: 23, Mg: 24, Al: 27, Si: 28, P: 31, S: 32, Cl: 35.5, Ar: 40, K: 39, Ca: 40, Cr: 52, Mn: 55, Fe: 56, Co: 59, Ni: 59, Cu: 64, Zn: 65, Br: 80, Ag: 108, Sn: 119, I: 127, Ba: 137, Pt: 195, Au: 197, Hg: 201, Pb: 207 };
// 中学常见化合价
const VAL = { H: '+1', O: '−2', C: '+2、+4', N: '−3、+2、+4、+5', F: '−1', Na: '+1', Mg: '+2', Al: '+3', Si: '+4', P: '−3、+5', S: '−2、+4、+6', Cl: '−1、+1、+5、+7', K: '+1', Ca: '+2', Mn: '+2、+4、+6、+7', Fe: '+2、+3', Cu: '+1、+2', Zn: '+2', Ag: '+1', Ba: '+2', Hg: '+2', Br: '−1', I: '−1', Li: '+1', Cr: '+3、+6' };
const phaseAt = (e, T) => { if (e.mp == null) return null; if (T < e.mp) return 's'; if (e.bp == null) return 'l'; return T < e.bp ? 'l' : 'g'; };
const PH = { s: '固', l: '液', g: '气' };
const PROPS = {
  m: { n: '相对原子质量', get: e => e.m, unit: '' },
  eneg: { n: '电负性', get: e => e.eneg, unit: '' },
  ie: { n: '第一电离能', get: e => e.ie, unit: 'kJ/mol' },
  ea: { n: '电子亲和能', get: e => e.ea, unit: 'kJ/mol' },
  den: { n: '密度', get: e => e.dg, unit: 'g/cm³', log: true },
  mp: { n: '熔点', get: e => e.mp, unit: 'K' },
  bp: { n: '沸点', get: e => e.bp, unit: 'K' }
};
const BLOCK = { s: ['s 区', '--alk'], p: ['p 区', '--non'], d: ['d 区', '--tm'], f: ['f 区', '--lan'] };

/* ---------- table ---------- */
let filterCat = null, query = '', hoverN = null, selN = null;
function renderTable() {
  const cm = S.color;
  const seg = [['cat', '分类'], ['phase', '物态'], ['block', '分区'], ['eneg', '电负性'], ['ie', '电离能'], ['m', '原子质量'], ['den', '密度'], ['mp', '熔点'], ['bp', '沸点']];
  view.innerHTML = `
  <div class="bar"><div class="seg" id="cm">${seg.map(([k, n]) => `<button data-k="${k}" class="${cm === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="search"><input id="q" placeholder="搜索：铁 / Fe / 26 / tie" value="${esc(query)}"></div></div>
  ${cm === 'phase' ? `<div class="temp"><span>温度</span><input type="range" id="T" min="0" max="6000" step="1" value="${S.temp}"><b id="Tv"></b><button class="seg" style="padding:5px 9px;border-radius:9px;font-size:12px" id="room">室温</button></div>` : ''}
  <div class="mobile-hint">左右滑动查看完整周期表，点元素看详情</div>
  <div class="scroller"><div class="pt" id="pt"></div></div>
  <div id="legend"></div>
  <div class="mnemo"><h3>前 20 号元素口诀（点字查看）</h3><p id="mn"></p></div>`;
  const pt = $('#pt');
  let h = `<div class="preview" id="preview"></div>`;
  for (const e of E) h += `<button class="el" data-n="${e.n}" style="grid-column:${e.x};grid-row:${e.y}"><span class="n">${e.n}</span><span class="s">${e.s}</span><span class="z">${esc(e.zh)}<i>${massStr(e)}</i></span><span class="ph" hidden></span></button>`;
  h += `<div class="el gap" style="grid-column:3;grid-row:6">57–71<br>镧系</div><div class="el gap" style="grid-column:3;grid-row:7">89–103<br>锕系</div>`;
  pt.innerHTML = h;
  $('#mn').innerHTML = E.slice(0, 20).map((e, i) => `<span data-n="${e.n}">${esc(e.zh)}</span>${i % 5 === 4 ? (i === 19 ? '' : '，') : ''}`).join('').replace(/，$/, '') + '。';
  $$('#mn span').forEach(s => s.onclick = () => openEl(+s.dataset.n));
  $$('#cm button').forEach(b => b.onclick = () => { S.color = b.dataset.k; save(); filterCat = null; renderTable(); });
  const q = $('#q'); q.oninput = () => { query = q.value.trim(); paint(); };
  pt.addEventListener('click', e => { const b = e.target.closest('.el[data-n]'); if (b) openEl(+b.dataset.n); });
  pt.addEventListener('mouseover', e => { const b = e.target.closest('.el[data-n]'); if (b && +b.dataset.n !== hoverN) { hoverN = +b.dataset.n; preview(); } });
  if ($('#T')) {
    const T = $('#T'); const upd = () => { S.temp = +T.value; $('#Tv').textContent = `${S.temp} K · ${(S.temp - 273.15).toFixed(0)} ℃`; paint(); }; T.oninput = upd; T.onchange = save;
    $('#room').onclick = () => { T.value = 298; upd(); save(); };
    $('#Tv').textContent = `${S.temp} K · ${(S.temp - 273.15).toFixed(0)} ℃`;
  }
  paint(); preview();
}
function matches(e) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (/^\d+$/.test(q)) return e.n === +q;
  const plain = e.py.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('ü', 'v');
  return e.zh.includes(query) || e.s.toLowerCase() === q || e.en.toLowerCase().startsWith(q) || plain.startsWith(q.replace('ü', 'v')) || (q.length > 1 && e.s.toLowerCase().startsWith(q));
}
function paint() {
  const cm = S.color;
  let vals = null, P = PROPS[cm];
  if (P) { const vs = E.map(P.get).filter(v => v != null && v > 0); let lo = Math.min(...vs), hi = Math.max(...vs); if (P.log) { lo = Math.log(lo); hi = Math.log(hi); } vals = { lo, hi }; }
  for (const b of $$('#pt .el[data-n]')) {
    const e = BY[b.dataset.n]; let c = `var(${CAT[catOf(e)].v})`, o = null;
    const phEl = b.querySelector('.ph'); phEl.hidden = true;
    let dim = !matches(e);
    if (cm === 'cat') { if (filterCat && catOf(e) !== filterCat) dim = true; }
    else if (cm === 'block') { c = `var(${BLOCK[e.bl]?.[1] || '--unk'})`; if (filterCat && e.bl !== filterCat) dim = true; }
    else if (cm === 'phase') {
      const p = phaseAt(e, S.temp);
      c = p === 'g' ? 'var(--acc2)' : p === 'l' ? 'var(--acc)' : p === 's' ? 'var(--ink3)' : 'var(--unk)';
      o = p === 's' ? .1 : p ? .32 : .04;
      phEl.hidden = !p; phEl.textContent = p ? PH[p] : ''; phEl.className = 'ph ' + (p || '');
      if (!p) dim = dim || false;
    } else {
      let v = P.get(e);
      if (v == null || v <= 0) { c = 'var(--unk)'; o = .03; }
      else { if (P.log) v = Math.log(v); const t = (v - vals.lo) / ((vals.hi - vals.lo) || 1); c = 'var(--acc)'; o = .05 + t * .8; }
    }
    b.style.setProperty('--c', c);
    b.classList.toggle('heat', o != null); if (o != null) b.style.setProperty('--o', o); else b.style.removeProperty('--o');
    b.classList.toggle('dim', dim);
    b.classList.toggle('sel', e.n === selN);
  }
  legend();
}
function legend() {
  const cm = S.color, L = $('#legend');
  if (cm === 'cat') L.innerHTML = `<div class="legend">${Object.entries(CAT).map(([k, v]) => `<button data-c="${k}" class="${filterCat === k ? 'on' : ''}" style="--c:var(${v.v})"><i></i>${v.n}</button>`).join('')}</div>`;
  else if (cm === 'block') L.innerHTML = `<div class="legend">${Object.entries(BLOCK).map(([k, v]) => `<button data-c="${k}" class="${filterCat === k ? 'on' : ''}" style="--c:var(${v[1]})"><i></i>${v[0]}</button>`).join('')}</div>`;
  else if (cm === 'phase') { const cnt = { s: 0, l: 0, g: 0 }; E.forEach(e => { const p = phaseAt(e, S.temp); if (p) cnt[p]++; }); L.innerHTML = `<div class="legend"><button style="--c:var(--ink3)"><i></i>固态 ${cnt.s}</button><button style="--c:var(--acc)"><i></i>液态 ${cnt.l}</button><button style="--c:var(--acc2)"><i></i>气态 ${cnt.g}</button><button style="--c:var(--unk);opacity:.6"><i></i>缺少数据</button></div>`; }
  else { const P = PROPS[cm]; const vs = E.map(P.get).filter(v => v != null && v > 0); L.innerHTML = `<div class="grad"><span>${fmt(Math.min(...vs))}</span><span class="gb"></span><span>${fmt(Math.max(...vs))} ${P.unit}</span><span style="margin-left:8px">${P.n}${P.log ? '（对数刻度）' : ''} · 灰色为暂无数据</span></div>`; }
  $$('#legend .legend button[data-c]').forEach(b => b.onclick = () => { filterCat = filterCat === b.dataset.c ? null : b.dataset.c; paint(); });
}
const fmt = v => v == null ? '—' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : Math.abs(v) < 0.01 ? v.toExponential(2) : (+v.toFixed(3)).toString();
function preview() {
  const pv = $('#preview'); if (!pv) return;
  const e = BY[hoverN || selN || 26];
  pv.innerHTML = `<div class="pv-tile" style="--c:var(${CAT[catOf(e)].v})"><span class="n">${e.n}</span><span class="s">${e.s}</span><span class="z">${esc(e.zh)}</span></div>
  <div class="pv-info"><h2>${esc(e.zh)} <small>${esc(e.py)} · ${esc(e.en)}</small></h2>
  <p>${CAT[catOf(e)].n} · 第 ${e.p} 周期 · ${groupName(e)}</p>
  <p>相对原子质量 <b class="mono">${massStr(e)}</b>　电子层 <b class="mono">${e.sh.join(' ')}</b></p>
  <p class="mono" style="color:var(--ink3)">${esc(e.cs || '')}</p></div>`;
}

/* ---------- drawer ---------- */
function conf(s) { return esc(s || '').replace(/([spdf])(\d+)/g, '$1<sup>$2</sup>'); }
function atomSVG(e) {
  const sh = e.sh, n = sh.length; const r0 = 22, gap = 30, W = 2 * r0 + 16 + n * gap + 20, H = 110, cy = 55, cx = r0 + 8;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${e.n > 99 ? 12 : 14}" fill="currentColor">+${e.n}</text>`;
  sh.forEach((k, i) => { const x = cx + r0 + 12 + i * gap; s += `<path d="M ${x} ${cy - 30} Q ${x + 14} ${cy} ${x} ${cy + 30}" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="${x + 7}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700" stroke="var(--card)" stroke-width="5" paint-order="stroke">${k}</text>`; });
  return s + '</svg>';
}
function bohrSVG(e) {
  const sh = e.sh, R = 104, step = Math.min(18, 86 / sh.length);
  let s = `<svg width="220" height="220" viewBox="-110 -110 220 220"><circle r="12" fill="var(--c)"/>`;
  sh.forEach((k, i) => { const r = 22 + (i + 1) * step - 4; s += `<circle r="${r}" fill="none" stroke="var(--line)" stroke-width="1"/><g class="orb" style="animation:spin ${8 + i * 4}s linear infinite ${i % 2 ? 'reverse' : ''}">`; for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2; s += `<circle cx="${(r * Math.cos(a)).toFixed(2)}" cy="${(r * Math.sin(a)).toFixed(2)}" r="${k > 18 ? 2 : 2.8}" fill="var(--acc)"/>`; } s += '</g>'; });
  return s + `</svg><style>@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.orb{animation:none!important}}</style>`;
}
function openEl(n) {
  const e = BY[n]; if (!e) return; selN = n;
  const c = `var(${CAT[catOf(e)].v})`;
  const f = (k, v, w) => `<div class="fact ${w ? 'w' : ''}"><span>${k}</span><b>${v}</b></div>`;
  const dens = e.den == null ? '—' : `${fmt(e.den)} ${e.du === 'g/L' ? 'g/L' : 'g/cm³'}`;
  const temp = v => v == null ? '—' : `${fmt(v)} K（${(v - 273.15).toFixed(1)} ℃）`;
  const ph = phaseAt(e, 298);
  $('#drawerIn').innerHTML = `
  <div class="dnav"><button id="dPrev" ${n === 1 ? 'disabled' : ''}>‹ ${n > 1 ? esc(BY[n - 1].zh) : ''}</button><button id="dClose">关闭</button><button id="dNext" ${n === 118 ? 'disabled' : ''}>${n < 118 ? esc(BY[n + 1].zh) : ''} ›</button></div>
  <div class="dh"><div class="pv-tile" style="--c:${c}"><span class="n">${e.n}</span><span class="s">${e.s}</span><span class="z">${massStr(e)}</span></div>
  <div><h2>${esc(e.zh)}</h2><div class="py">${esc(e.py)}</div><div class="en">${esc(e.en)}</div><div style="margin-top:8px"><span style="font-size:12px;padding:3px 9px;border-radius:7px;background:color-mix(in srgb,${c} 22%,transparent);color:var(--ink)">${CAT[catOf(e)].n}</span></div></div></div>
  <div class="facts">
    ${f('原子序数', e.n)}${f('相对原子质量', massStr(e) + (BOOK[e.s] != null ? `<small style="color:var(--ink3);font-weight:400">　课本取 ${BOOK[e.s]}</small>` : ''))}
    ${f('周期', `第 ${e.p} 周期`)}${f('族', groupName(e).replace('第 ' + e.x + ' 纵列 · ', ''))}
    ${f('分区', (e.bl || '—') + ' 区')}${f('室温物态', ph ? PH[ph] + '态' : '—')}
    ${VAL[e.s] ? f('常见化合价', VAL[e.s], true) : ''}
    ${f('电子排布式', `<span class="mono conf">${conf(e.cf)}</span>`, true)}
    ${f('简写', `<span class="mono conf">${conf(e.cs)}</span>`, true)}
  </div>
  <div class="secT">原子结构示意图</div><div class="atom">${atomSVG(e)}</div>
  <div class="secT">电子层模型</div><div class="bohr" style="--c:${c}">${bohrSVG(e)}</div>
  <div class="facts">
    ${f('电负性（鲍林）', fmt(e.eneg))}${f('第一电离能', e.ie == null ? '—' : fmt(e.ie) + ' kJ/mol')}
    ${f('熔点', temp(e.mp), true)}${f('沸点', temp(e.bp), true)}
    ${f('密度', dens)}${f('电子亲和能', e.ea == null ? '—' : fmt(e.ea) + ' kJ/mol')}
    ${e.by ? f('发现', esc(e.by), true) : ''}
  </div>`;
  $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on');
  $('#drawer').scrollTop = 0;
  $('#dPrev').onclick = () => openEl(n - 1); $('#dNext').onclick = () => openEl(n + 1); $('#dClose').onclick = closeEl;
  if ($('#pt')) { paint(); hoverN = null; preview(); }
}
function closeEl() { selN = null; $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on'); if ($('#pt')) paint(); }
$('#scrim').onclick = closeEl;
document.addEventListener('keydown', e => {
  if (e.target.matches('input')) return;
  if (e.key === 'Escape') closeEl();
  if (selN && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const n = selN + (e.key === 'ArrowRight' ? 1 : -1); if (BY[n]) openEl(n); }
});

/* ---------- calculator ---------- */
function parseFormula(str) {
  let s = str.replace(/\s+/g, '').replace(/[·•∙⋅*．。]/g, '.').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/[［]/g, '[').replace(/[］]/g, ']');
  s = s.replace(/[₀-₉]/g, d => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)));
  if (!s) throw new Error('请输入化学式');
  const parts = s.split('.');
  const total = {};
  for (const part of parts) {
    if (!part) throw new Error('“·”两边都要有内容');
    let i = 0; const m = part.match(/^\d+/); let coef = 1; if (m) { coef = +m[0]; i = m[0].length; }
    const stack = [{}];
    while (i < part.length) {
      const ch = part[i];
      if (ch === '(' || ch === '[') { stack.push({}); i++; }
      else if (ch === ')' || ch === ']') { if (stack.length < 2) throw new Error('括号不匹配'); i++; const m2 = part.slice(i).match(/^\d+/); const k = m2 ? +m2[0] : 1; if (m2) i += m2[0].length; const top = stack.pop(); for (const x in top) stack[stack.length - 1][x] = (stack[stack.length - 1][x] || 0) + top[x] * k; }
      else if (/[A-Z]/.test(ch)) { let sym = ch; i++; if (i < part.length && /[a-z]/.test(part[i])) { sym += part[i]; i++; } if (!SYM[sym]) throw new Error(`没有“${sym}”这种元素，注意大小写`); const m2 = part.slice(i).match(/^\d+/); const k = m2 ? +m2[0] : 1; if (m2) i += m2[0].length; stack[stack.length - 1][sym] = (stack[stack.length - 1][sym] || 0) + k; }
      else if (/[a-z]/.test(ch)) throw new Error(`“${ch}”应该是大写字母开头的元素符号`);
      else throw new Error(`无法识别“${ch}”`);
    }
    if (stack.length !== 1) throw new Error('括号没有闭合');
    for (const x in stack[0]) total[x] = (total[x] || 0) + stack[0][x] * coef;
  }
  return total;
}
let SYM = {};
const arOf = (sym, mode) => mode === 'book' && BOOK[sym] != null ? BOOK[sym] : +BY[SYM[sym]].m.toFixed(3);
const pretty = f => esc(f).replace(/(\d+)/g, (m, d, off, str) => (off === 0 || /[.·]/.test(str[off - 1])) ? m : `<sub>${m}</sub>`).replace(/\./g, '·');
function renderCalc() {
  const pre = ['H2O', 'CO2', 'NaCl', 'H2SO4', 'CaCO3', 'NaOH', 'HCl', 'NH3', 'KMnO4', 'C6H12O6', 'Ca(OH)2', 'Fe2O3', 'NaHCO3', 'CuSO4·5H2O', 'Fe2(SO4)3', '(NH4)2SO4', 'C2H5OH', 'KAl(SO4)2·12H2O'];
  view.innerHTML = `<div class="calc"><h1>相对分子质量计算</h1><p class="lead">输入化学式即可得到相对分子质量和各元素的质量分数。支持括号与结晶水，如 Ca(OH)2、CuSO4·5H2O（“·”可用英文句点或 * 代替）。</p>
  <div class="fin"><input id="f" placeholder="例如 CuSO4·5H2O" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(S.lastF || 'CuSO4·5H2O')}"><div class="seg" id="arm"><button data-v="book" class="${S.ar === 'book' ? 'on' : ''}">课本取值</button><button data-v="exact" class="${S.ar === 'exact' ? 'on' : ''}">精确值</button></div></div>
  <div class="chips">${pre.map(p => `<button class="chip" data-f="${esc(p)}">${pretty(p)}</button>`).join('')}</div>
  <div id="out"></div>
  ${S.hist.length ? `<div class="hist"><div class="secT">最近计算</div><div class="chips">${S.hist.map(p => `<button class="chip" data-f="${esc(p)}">${pretty(p)}</button>`).join('')}</div></div>` : ''}
  <p class="note">“课本取值”采用中学化学常用的近似相对原子质量（如 Cl 取 35.5、Cu 取 64），未列出的元素使用精确值；“精确值”采用国际纯粹与应用化学联合会公布的标准原子量。</p></div>`;
  const f = $('#f');
  const run = (store) => {
    const v = f.value.trim(); S.lastF = v; save();
    const out = $('#out'); if (!v) { out.innerHTML = ''; return; }
    let t; try { t = parseFormula(v); } catch (err) { out.innerHTML = `<div class="err">${esc(err.message)}</div>`; return; }
    const rows = Object.entries(t).map(([s, k]) => ({ s, k, ar: arOf(s, S.ar) })); rows.forEach(r => r.sub = r.k * r.ar);
    const M = rows.reduce((a, r) => a + r.sub, 0);
    const r3 = x => +x.toFixed(S.ar === 'book' ? 2 : 3);
    out.innerHTML = `<div class="res"><div class="big"><span class="f">${pretty(v.replace(/[·•*]/g, '.'))}</span><span class="m">${r3(M)}</span><span style="color:var(--ink3);font-size:13px">M = ${r3(M)} g/mol</span></div>
    <table><thead><tr><th>元素</th><th>个数</th><th>A<sub>r</sub></th><th>小计</th><th style="width:38%">质量分数</th></tr></thead><tbody>
    ${rows.map(r => { const e = BY[SYM[r.s]]; const w = r.sub / M * 100; return `<tr><td><b>${r.s}</b> <span style="color:var(--ink3)">${esc(e.zh)}</span></td><td class="mono">${r.k}</td><td class="mono">${r.ar}</td><td class="mono">${r3(r.sub)}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar2" style="flex:1;--c:var(${CAT[catOf(e)].v})"><i style="width:${w}%"></i></div><span class="mono" style="min-width:52px;text-align:right">${w.toFixed(2)}%</span></div></td></tr>`; }).join('')}
    </tbody></table></div>`;
    if (store) { S.hist = [v, ...S.hist.filter(x => x !== v)].slice(0, 10); save(); }
  };
  let deb; f.oninput = () => { clearTimeout(deb); deb = setTimeout(() => run(false), 150); };
  f.onchange = () => run(true);
  f.addEventListener('keydown', e => { if (e.key === 'Enter') run(true); });
  $$('.chip[data-f]').forEach(b => b.onclick = () => { f.value = b.dataset.f; run(true); });
  $$('#arm button').forEach(b => b.onclick = () => { S.ar = b.dataset.v; save(); $$('#arm button').forEach(x => x.classList.toggle('on', x === b)); run(false); });
  run(false);
}

/* ---------- learn ---------- */
let L = null;
function renderLearn() {
  const best = S.recite ? `最快 ${(S.recite / 1000).toFixed(1)} 秒` : '还没有成绩';
  const qb = k => S.quiz[k] != null ? `最好 ${S.quiz[k]} / 10` : '还没有成绩';
  if (!L) {
    view.innerHTML = `<div class="learn"><h1>记忆训练</h1><p class="lead">从前 20 号元素开始，把名称、符号、位置和原子结构记牢。</p>
    <div class="cards">
      <button class="lc" data-m="recite"><div class="ic">1→20</div><h3>默写前 20 号</h3><p>按顺序输入元素符号或名称，计时挑战。</p><small>${best}</small></button>
      <button class="lc" data-m="q20"><div class="ic">H?</div><h3>前 36 号速认</h3><p>名称、符号、原子序数、原子结构示意图混合出题。</p><small>${qb('q20')}</small></button>
      <button class="lc" data-m="qall"><div class="ic">Og</div><h3>全表挑战</h3><p>118 种元素随机出题，含周期与族的定位题。</p><small>${qb('qall')}</small></button>
    </div>
    <div class="mnemo"><h3>口诀</h3><p>氢氦锂铍硼，碳氮氧氟氖，<br>钠镁铝硅磷，硫氯氩钾钙。</p></div></div>`;
    $$('.lc').forEach(b => b.onclick = () => { startLearn(b.dataset.m); });
    return;
  }
  if (L.m === 'recite') return renderRecite();
  renderQuiz();
}
function startLearn(m) {
  if (m === 'recite') L = { m, i: 0, t0: 0, done: false };
  else L = { m, qs: makeQs(m === 'q20' ? 36 : 118), i: 0, ok: 0, ans: false };
  renderLearn();
}
let clockT;
function renderRecite() {
  clearInterval(clockT);
  view.innerHTML = `<div class="learn"><div class="qtop"><button class="btn" id="back">‹ 返回</button><span class="clock" id="clk">0.0</span></div>
  <h1 style="margin-top:4px">默写前 20 号元素</h1><p class="lead">在输入框里依次写出第 ${L.i + 1} 号元素的符号或名称，回车或自动确认。</p>
  <div class="recite">${E.slice(0, 20).map((e, i) => `<div class="rc ${i < L.i ? 'ok' : i === L.i && !L.done ? 'cur' : ''}" style="--c:var(${CAT[catOf(e)].v})">${i < L.i ? `<b>${e.s}</b>${esc(e.zh)}` : i + 1}</div>`).join('')}</div>
  ${L.done ? `<div class="qbox"><div class="qq">完成</div><div class="qa">${(L.time / 1000).toFixed(1)} 秒</div><p style="color:var(--ink2)">${L.time <= S.recite ? '新纪录！' : `最快 ${(S.recite / 1000).toFixed(1)} 秒`}</p><button class="btn pri" id="again">再来一次</button></div>` :
  `<div class="rin"><input id="ri" placeholder="第 ${L.i + 1} 号：符号或名称" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn" id="skip">提示</button></div>`}</div>`;
  $('#back').onclick = () => { clearInterval(clockT); L = null; renderLearn(); };
  if (L.done) { $('#again').onclick = () => startLearn('recite'); return; }
  const ri = $('#ri'); ri.focus();
  const check = (final) => {
    const v = ri.value.trim(); if (!v) return;
    const e = E[L.i];
    if (v.toLowerCase() === e.s.toLowerCase() && (v === e.s || v.length > 1 || final) || v === e.zh) {
      if (!L.t0) L.t0 = Date.now();
      L.i++;
      if (L.i >= 20) { L.done = true; L.time = Date.now() - L.t0; if (!S.recite || L.time < S.recite) S.recite = L.time; save(); }
      renderRecite();
    } else if (final) { ri.classList.remove('bad'); void ri.offsetWidth; ri.classList.add('bad'); ri.select(); }
  };
  ri.oninput = () => { if (!L.t0 && ri.value) { L.t0 = Date.now(); } check(false); };
  ri.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) check(true); };
  $('#skip').onclick = () => { const e = E[L.i]; toast(`第 ${L.i + 1} 号是 ${e.zh}（${e.s}）`); if (!L.t0) L.t0 = Date.now(); L.t0 -= 5000; };
  clockT = setInterval(() => { const c = $('#clk'); if (!c) return clearInterval(clockT); c.textContent = L.t0 ? ((Date.now() - L.t0) / 1000).toFixed(1) : '0.0'; }, 100);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function makeQs(N) {
  const pool = E.slice(0, N); const qs = [];
  const kinds = N <= 36 ? ['name2sym', 'sym2name', 'num', 'atom', 'pos'] : ['name2sym', 'sym2name', 'num', 'pos'];
  for (const e of shuffle(pool.slice()).slice(0, 10)) {
    let k = kinds[Math.floor(Math.random() * kinds.length)];
    if (k === 'atom' && e.n > 20) k = 'sym2name';
    const others = shuffle(pool.filter(x => x !== e)).slice(0, 3);
    const near = k === 'num' || k === 'atom' ? shuffle(E.filter(x => x !== e && Math.abs(x.n - e.n) <= 4 && x.n <= Math.max(N, 8))).slice(0, 3) : others;
    const opts = shuffle([e, ...(near.length === 3 ? near : others)]);
    qs.push({ e, k, opts });
  }
  return qs;
}
function renderQuiz() {
  if (L.i >= 10) {
    const k = L.m; const prev = S.quiz[k]; if (prev == null || L.ok > prev) { S.quiz[k] = L.ok; save(); }
    view.innerHTML = `<div class="learn"><div class="qbox"><div class="qq">本轮成绩</div><div class="qa">${L.ok} / 10</div><p style="color:var(--ink2)">${prev != null && L.ok > prev ? '刷新了最好成绩！' : `最好成绩 ${S.quiz[k]} / 10`}</p><div style="display:flex;gap:10px;justify-content:center"><button class="btn" id="back">返回</button><button class="btn pri" id="again">再来一轮</button></div></div></div>`;
    $('#back').onclick = () => { L = null; renderLearn(); }; $('#again').onclick = () => startLearn(k); return;
  }
  const q = L.qs[L.i], e = q.e;
  const prompt = { name2sym: ['这个元素的符号是？', esc(e.zh)], sym2name: ['这个符号是什么元素？', e.s], num: ['原子序数为几号的是哪种元素？', `${e.n} 号`], atom: ['这个原子结构示意图表示哪种元素？', `<div style="color:var(--ink)">${atomSVG(e).replace(/\+\d+/, '+?')}</div>`], pos: ['位于这个位置的是哪种元素？', `<span style="font-size:24px">第 ${e.p} 周期 · ${e.cat === 'lanthanide' || e.cat === 'actinide' ? `${e.cat === 'lanthanide' ? '镧' : '锕'}系第 ${e.x - 2} 个` : GROUPS[e.x] + ' 族' + (e.x >= 8 && e.x <= 10 ? `（第 ${e.x} 纵列）` : '')}</span>`] }[q.k];
  const label = o => q.k === 'name2sym' ? o.s : q.k === 'sym2name' ? o.zh : `${o.zh} ${o.s}`;
  view.innerHTML = `<div class="learn"><div class="qtop"><button class="btn" id="back">‹ 返回</button><span>第 ${L.i + 1} / 10 题 · 答对 ${L.ok}</span></div>
  <div class="qbox"><div class="qq">${prompt[0]}</div><div class="qa">${prompt[1]}</div>
  <div class="opts">${q.opts.map(o => `<button class="opt" data-n="${o.n}">${esc(label(o))}</button>`).join('')}</div>
  <div id="exp" style="margin-top:16px;color:var(--ink2);font-size:14px;min-height:22px"></div>
  <button class="btn pri" id="nx" style="margin-top:10px" hidden>${L.i === 9 ? '看成绩' : '下一题'}</button></div></div>`;
  $('#back').onclick = () => { L = null; renderLearn(); };
  $$('.opt').forEach(b => b.onclick = () => {
    if (L.ans) return; L.ans = true;
    const ok = +b.dataset.n === e.n; if (ok) L.ok++;
    $$('.opt').forEach(x => { x.disabled = true; if (+x.dataset.n === e.n) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
    $('#exp').innerHTML = `${esc(e.zh)}（${e.s}），${e.n} 号，第 ${e.p} 周期 ${groupName(e).replace(/^第 \d+ 纵列 · /, '')}，电子层 ${e.sh.join('、')}`;
    $('#nx').hidden = false; $('#nx').focus();
  });
  $('#nx').onclick = () => { L.i++; L.ans = false; renderQuiz(); };
}

/* ---------- router ---------- */
const route = () => (location.hash.replace(/^#\/?/, '') || 'table');
function render() {
  const r = route();
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  clearInterval(clockT);
  if (r !== 'learn') L = null;
  ({ table: renderTable, calc: renderCalc, learn: renderLearn }[r] || renderTable)();
}
window.addEventListener('hashchange', () => { closeEl(); render(); window.scrollTo(0, 0); });
$('#theme').onclick = () => { S.theme = S.theme === 'light' ? 'dark' : 'light'; save(); document.documentElement.dataset.theme = S.theme === 'light' ? 'light' : ''; if (S.theme !== 'light') delete document.documentElement.dataset.theme; document.querySelector('meta[name=theme-color]').content = S.theme === 'light' ? '#f4f6f8' : '#0e1318'; };
view.innerHTML = '<div style="padding:120px 0;text-align:center;color:var(--ink3)">载入元素数据…</div>';
fetch('data/elements.json').then(r => r.json()).then(d => {
  E = d; d.forEach(e => { BY[e.n] = e; SYM[e.s] = e.n; });
  render();
  const f = document.createElement('footer'); f.className = 'foot';
  f.innerHTML = '元素性质数据整理自开源项目 <a href="https://github.com/Bowserinator/Periodic-Table-JSON" target="_blank" rel="noopener">Periodic-Table-JSON</a>，中文名称依据全国科学技术名词审定委员会公布的用字。<br>记录只保存在本机浏览器中。';
  document.body.appendChild(f);
}).catch(() => { view.innerHTML = '<div style="padding:120px 0;text-align:center">数据加载失败，请刷新重试</div>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
