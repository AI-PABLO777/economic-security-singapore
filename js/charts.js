// Легка SVG-бібліотека графіків: лінійні графіки з пороговою зоною та стовпчикові діаграми.
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, d = 2, fixed = false) => (v === null || v === undefined) ? '—' : Number(v).toLocaleString('uk-UA', { maximumFractionDigits: d, minimumFractionDigits: fixed ? d : 0 });
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(min, max, n = 5) {
    const span = max - min || 1;
    const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const t = []; for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }

  function tooltip(container) {
    let tip = container.querySelector('.chart-tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; container.appendChild(tip); }
    return tip;
  }

  /**
   * opts: { years:[], series:[{name, color, data:{y:v}}], unit, digits,
   *         band:{lo, hi, label}  (зона оптимальних значень),
   *         lines:[{v, label}]    (порогові лінії), yMin, yMax, static }
   */
  function line(container, opts) {
    container.innerHTML = '';
    container.classList.add('chart');
    const W = 900, H = 330, m = { t: 16, r: 18, b: 34, l: 56 };
    const years = opts.years;
    const vals = [];
    opts.series.forEach(s => years.forEach(y => { if (s.data[y] != null) vals.push(s.data[y]); }));
    (opts.lines || []).forEach(l => vals.push(l.v));
    if (opts.band) { if (isFinite(opts.band.lo)) vals.push(opts.band.lo); if (isFinite(opts.band.hi)) vals.push(opts.band.hi); }
    let min = opts.yMin != null ? opts.yMin : Math.min(...vals), max = opts.yMax != null ? opts.yMax : Math.max(...vals);
    const pad = (max - min) * 0.08 || 1; if (opts.yMin == null) min -= pad; if (opts.yMax == null) max += pad;
    const ticks = niceTicks(min, max); min = ticks[0]; max = ticks[ticks.length - 1];
    const x = i => m.l + (W - m.l - m.r) * (years.length === 1 ? 0.5 : i / (years.length - 1));
    const y = v => m.t + (H - m.t - m.b) * (1 - (v - min) / (max - min));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title || 'Графік' }, container);

    if (opts.band) {
      const lo = Math.max(min, isFinite(opts.band.lo) ? opts.band.lo : min), hi = Math.min(max, isFinite(opts.band.hi) ? opts.band.hi : max);
      if (hi > lo) {
        el('rect', { x: m.l, y: y(hi), width: W - m.l - m.r, height: y(lo) - y(hi), class: 'band' }, svg);
        const t = el('text', { x: W - m.r - 6, y: y(hi) + 14, 'text-anchor': 'end', class: 'band-label' }, svg);
        t.textContent = opts.band.label || 'Оптимальна зона';
      }
    }
    ticks.forEach(v => {
      el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid' }, svg);
      const t = el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, svg);
      t.textContent = fmt(v, 3);
    });
    years.forEach((yr, i) => {
      const t = el('text', { x: x(i), y: H - m.b + 18, 'text-anchor': 'middle', class: 'axis' }, svg);
      t.textContent = years.length > 12 && i % 2 ? '' : yr;
    });
    (opts.lines || []).forEach(l => {
      if (l.v < min || l.v > max) return;
      el('line', { x1: m.l, x2: W - m.r, y1: y(l.v), y2: y(l.v), class: 'threshold' }, svg);
      const t = el('text', { x: m.l + 6, y: y(l.v) + 14, class: 'threshold-label' }, svg);
      t.textContent = l.label;
    });
    opts.series.forEach(s => {
      let d = '', pen = false;
      years.forEach((yr, i) => {
        const v = s.data[yr];
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true;
      });
      el('path', { d, class: 'series-line', stroke: s.color }, svg);
      years.forEach((yr, i) => {
        const v = s.data[yr]; if (v == null) return;
        el('circle', { cx: x(i), cy: y(v), r: 4, fill: s.color, class: 'dot' }, svg);
      });
    });
    // пряма підписка останнього значення (для ≤ 2 рядів)
    if (opts.series.length <= 2) opts.series.forEach((s, k) => {
      const ys = years.filter(yr => s.data[yr] != null); if (!ys.length) return;
      const yr = ys[ys.length - 1], i = years.indexOf(yr);
      const other = opts.series[1 - k];
      const below = other && other.data[yr] != null && other.data[yr] > s.data[yr];
      const t = el('text', { x: x(i) - 8, y: y(s.data[yr]) + (below ? 20 : -10), 'text-anchor': 'end', class: 'direct-label' }, svg);
      t.textContent = fmt(s.data[yr], opts.digits, true);
    });

    if (opts.series.length > 1) {
      const lg = document.createElement('div'); lg.className = 'legend';
      lg.innerHTML = opts.series.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');
      container.insertBefore(lg, svg);
    }
    if (opts.static) return;
    // шар наведення: перехрестя + підказка
    const cross = el('line', { y1: m.t, y2: H - m.b, class: 'crosshair', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
    const tip = tooltip(container);
    const move = ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) * W / r.width;
      const i = Math.max(0, Math.min(years.length - 1, Math.round((px - m.l) / (W - m.l - m.r) * (years.length - 1))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      const yr = years[i];
      tip.innerHTML = `<b>${yr}</b>` + opts.series.map(s => `<div><i style="background:${s.color}"></i>${s.name}: <b>${fmt(s.data[yr], opts.digits, true)}</b> ${opts.unit || ''}</div>`).join('');
      tip.style.display = 'block';
      const cx = x(i) * r.width / W;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, cx + 12)) + 'px';
      tip.style.top = '8px';
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; cross.setAttribute('visibility', 'hidden'); });
  }

  /** Горизонтальна стовпчикова діаграма: items:[{label, value, color, note}], max */
  function hbar(container, opts) {
    container.innerHTML = '';
    container.classList.add('chart');
    const rowH = 34, m = { t: 6, r: 200, b: 6, l: 250 }, W = 1100;
    const H = m.t + m.b + rowH * opts.items.length;
    const max = opts.max || Math.max(...opts.items.map(i => i.value));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title || 'Діаграма' }, container);
    const tip = opts.static ? null : tooltip(container);
    opts.items.forEach((it, k) => {
      const y0 = m.t + k * rowH;
      const t = el('text', { x: m.l - 10, y: y0 + rowH / 2 + 4, 'text-anchor': 'end', class: 'axis' }, svg);
      t.textContent = it.label;
      el('rect', { x: m.l, y: y0 + 7, width: W - m.l - m.r, height: rowH - 14, rx: 4, class: 'track' }, svg);
      const w = Math.max(2, (W - m.l - m.r) * it.value / max);
      const b = el('rect', { x: m.l, y: y0 + 7, width: w, height: rowH - 14, rx: 4, fill: it.color }, svg);
      const v = el('text', { x: m.l + w + 6, y: y0 + rowH / 2 + 4, class: 'direct-label' }, svg);
      v.textContent = it.valueLabel != null ? it.valueLabel : fmt(it.value);
      if (tip) {
        b.addEventListener('pointermove', ev => {
          const r = container.getBoundingClientRect();
          tip.innerHTML = `<b>${it.label}</b><div>${it.note || fmt(it.value)}</div>`;
          tip.style.display = 'block';
          tip.style.left = Math.min(r.width - tip.offsetWidth - 4, ev.clientX - r.left + 12) + 'px';
          tip.style.top = Math.max(0, ev.clientY - r.top - 40) + 'px';
        });
        b.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
      }
    });
  }

  root.ESCharts = { line, hbar, fmt };
})(window);
