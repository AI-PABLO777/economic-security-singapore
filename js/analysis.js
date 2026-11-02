// Побудова аналітичної сторінки з даних (raw-data.js → model.js → content.js)
(function () {
  const M = ESModel.build(RAW);
  const C = ESContent;
  const fmt = ESCharts.fmt;
  const byId = Object.fromEntries(M.IND.map(i => [i.id, i]));
  const COL = { s1: '#2a78d6', s2: '#eb6834' };
  const LVL_COLOR = { opt: '#0ca30c', sat: '#7cc242', uns: '#fab219', dan: '#ec835a', crit: '#d03b3b', abs: '#7a1212' };

  const badge = l => l ? `<span class="lvl lvl-${l.key}">${l.name}</span>` : '<span class="lvl lvl-na">Немає даних</span>';
  const trendBadge = t => ({
    safe: '<span class="trend-up">▲ безпечна</span>',
    danger: '<span class="trend-down">▼ небезпечна</span>',
    'n/a': '<span class="trend-flat">— не визначається</span>',
  })[t] || '';
  const optInterval = scale => ESModel.SCALES[scale].filter(i => i.level === 'opt').map(i => i.txt).join(' ');
  const digitsFor = id => (id === 'cover' ? 3 : /^(le|imr)/.test(id) ? 1 : 2);

  const GROUPS = [
    { id: 'g-cereal', title: '1. Урожайність зернових культур', unit: 'ц/га', ids: ['cereal'], scale: 'cereal' },
    { id: 'g-le', title: '2. Очікувана тривалість життя при народженні', unit: 'років', ids: ['leF', 'leM'], scale: 'le', names: ['Жінки', 'Чоловіки'] },
    { id: 'g-imr', title: '3. Смертність немовлят', unit: 'на 1000 живонароджених', ids: ['imrF', 'imrM'], scale: 'imr', names: ['Дівчата', 'Хлопчики'], yMin: 0 },
    { id: 'g-cover', title: '4. Коефіцієнт покриття імпорту експортом', unit: 'разів', ids: ['cover'], scale: 'cover' },
    { id: 'g-rd', title: '5. Витрати на дослідження та розробки', unit: '% ВВП', ids: ['rd'], scale: 'rd', yMin: 0 },
    { id: 'g-ineq', title: '6. Співвідношення доходів 10 % найбагатших і 10 % найбідніших', unit: 'разів', ids: ['ineq'], scale: 'ineq', yMin: 0 },
    { id: 'g-debt', title: '7. Загальний борг центрального уряду', unit: '% ВВП', ids: ['debt'], scale: 'debt', yMin: 0 },
  ];
  const BANDS = { le: [78, Infinity], imr: [0, 4], cover: [1, 1.2], rd: [3, Infinity], ineq: [1, 4.5], debt: [0, 20], cereal: [45, 55] };

  // ---------- KPI ----------
  const assessed = M.IND.filter(i => i.level);
  const nOpt = assessed.filter(i => i.level.key === 'opt').length;
  const nBad = assessed.filter(i => ['dan', 'crit', 'abs'].includes(i.level.key)).length;
  document.getElementById('kpis').innerHTML = `
    <div class="card kpi"><span class="label">Інтегральна оцінка (середній бал, 0–5)</span><span class="value">${fmt(M.integral)} <small>/ 5</small></span>${badge(M.integralLevel)}</div>
    <div class="card kpi"><span class="label">Показників в оптимальній зоні</span><span class="value">${nOpt} <small>з ${assessed.length}</small></span><span class="muted">тривалість життя, смертність немовлят</span></div>
    <div class="card kpi"><span class="label">Показників у зоні «абсолютна небезпека»</span><span class="value">${nBad} <small>з ${assessed.length}</small></span><span class="muted">державний борг, нерівність доходів</span></div>
    <div class="card kpi"><span class="label">Період аналізу / джерела</span><span class="value">${C.period}</span><span class="muted">World Bank WDI, SingStat</span></div>`;

  // ---------- Зведена таблиця ----------
  document.querySelector('#summary-table tbody').innerHTML = M.IND.map((i, k) => `
    <tr>
      <td>${k + 1}</td>
      <td><a href="#${GROUPS.find(g => g.ids.includes(i.id)).id}">${i.name}</a></td>
      <td>${i.unit}</td>
      <td class="num">${i.lastYear || '—'}</td>
      <td class="num"><b>${fmt(i.last, digitsFor(i.id), true)}</b></td>
      <td class="num">${optInterval(i.scale)}</td>
      <td class="num">${i.level ? i.level.interval : '—'}</td>
      <td>${badge(i.level)}</td>
      <td class="num">${i.level ? i.level.score : '—'}</td>
      <td>${trendBadge(C.comments[i.id].trend)}</td>
    </tr>`).join('') + `
    <tr><td></td><td colspan="7"><b>Інтегральна оцінка</b> = (${assessed.map(i => i.level.score).join(' + ')}) / ${assessed.length}</td><td class="num"><b>${fmt(M.integral)}</b></td><td>${badge(M.integralLevel)}</td></tr>`;

  // ---------- Діаграма балів ----------
  ESCharts.hbar(document.getElementById('score-chart'), {
    max: 5, title: 'Бальна оцінка показників',
    items: assessed.map(i => ({
      label: i.name.replace('Очікувана тривалість життя при народженні', 'Тривалість життя').replace('Співвідношення доходів 10 % найбагатших і 10 % найбідніших', 'Співвідношення доходів 10/10').replace('Коефіцієнт покриття імпорту експортом', 'Покриття імпорту експортом').replace('Загальний борг центрального уряду', 'Борг центрального уряду').replace('Витрати на дослідження та розробки', 'Витрати на НДДКР'),
      value: Math.max(i.level.score, 0.08), valueLabel: `${i.level.score} — ${i.level.name}`,
      color: LVL_COLOR[i.level.key], note: `${fmt(i.last, digitsFor(i.id), true)} ${i.unit} (${i.lastYear}) → ${i.level.name}, ${i.level.score} б.`,
    })),
  });

  // ---------- Інтегральна оцінка по роках ----------
  const iy = Object.keys(M.integralByYear);
  ESCharts.line(document.getElementById('integral-chart'), {
    years: iy, unit: 'балів', digits: 2, yMin: 0, yMax: 5, title: 'Інтегральна оцінка за роками',
    series: [{ name: 'Інтегральна оцінка', color: COL.s1, data: M.integralByYear }],
    band: { lo: 4.5, hi: 5, label: 'Оптимальний рівень (≥ 4,5)' },
    lines: [{ v: 3.5, label: 'Межа задовільного рівня — 3,5' }, { v: 2.5, label: 'Межа незадовільного рівня — 2,5' }],
  });
  document.querySelector('#integral-table tbody').innerHTML = iy.map(y => {
    const l = (s => ESModel.INTEGRAL_SCALE.find(x => s >= x.lo))(M.integralByYear[y]);
    const lv = ESModel.LEVELS.find(x => x.key === l.level);
    return `<tr><td>${y}</td>${['leF', 'leM', 'imrF', 'imrM', 'cover', 'rd', 'ineq', 'debt'].map(id => `<td class="num">${byId[id].levels[y] ? byId[id].levels[y].score : '—'}</td>`).join('')}<td class="num"><b>${fmt(M.integralByYear[y])}</b></td><td>${badge(lv)}</td></tr>`;
  }).join('');

  // ---------- Шкала інтегральної оцінки ----------
  document.getElementById('integral-scale').innerHTML = `<table class="scale-table"><thead><tr><th>Бал</th>${ESModel.INTEGRAL_SCALE.map(s => `<th>${s.txt}</th>`).join('')}</tr></thead><tbody><tr><td><b>Рівень</b></td>${ESModel.INTEGRAL_SCALE.map(s => `<td class="${s.level === M.integralLevel.key ? 'hit' : ''}">${badge(ESModel.LEVELS.find(x => x.key === s.level))}</td>`).join('')}</tr></tbody></table>`;

  // ---------- Розділи показників ----------
  const host = document.getElementById('indicators');
  GROUPS.forEach(g => {
    const inds = g.ids.map(id => byId[id]);
    const years = ESModel.YEARS.filter(y => inds.some(i => i.series[y] != null));
    const sec = document.createElement('section');
    sec.className = 'card indicator'; sec.id = g.id;
    const scale = ESModel.SCALES[g.scale];
    const hitKeys = inds.map(i => i.level && i.level.interval);
    const scaleTable = `<div class="table-wrap"><table class="scale-table"><thead><tr><th>Інтервал</th>${scale.map(s => `<th>${s.txt}</th>`).join('')}</tr></thead>
      <tbody><tr><td><b>Рівень</b></td>${scale.map(s => `<td class="${hitKeys.includes(s.txt) ? 'hit' : ''}">${badge(ESModel.LEVELS.find(x => x.key === s.level))}</td>`).join('')}</tr></tbody></table></div>
      <p class="muted">Рамкою виділено інтервал, у який потрапляє останнє фактичне значення.</p>`;

    const facts = inds.map((i, k) => `
      <div class="fact"><div class="k">${g.names ? g.names[k] + ', ' : ''}${i.lastYear || 'дані'}</div><div class="v">${i.last != null ? fmt(i.last, digitsFor(i.id), true) : '—'}</div></div>`).join('') +
      (inds[0].first != null ? `<div class="fact"><div class="k">Зміна ${inds[0].firstYear}–${inds[0].lastYear}${g.names ? ' (' + g.names[0].toLowerCase() + ')' : ''}</div><div class="v">${inds[0].change > 0 ? '+' : ''}${fmt(inds[0].change, digitsFor(inds[0].id), true)}</div></div>` : '') +
      `<div class="fact"><div class="k">Оптимальний інтервал</div><div class="v">${optInterval(g.scale)}</div></div>`;

    let dataTable = '';
    if (years.length) {
      const extra = g.ids[0] === 'cover' ? ['exp', 'imp'] : g.ids[0] === 'ineq' ? ['incTop', 'incBot'] : [];
      const extraNames = { exp: 'Експорт, % ВВП', imp: 'Імпорт, % ВВП', incTop: '10-й дециль, S$/міс.', incBot: '1-й дециль, S$/міс.' };
      dataTable = `<div class="table-wrap"><table><thead><tr><th>Рік</th>${extra.map(e => `<th class="num">${extraNames[e]}</th>`).join('')}
        ${inds.map((i, k) => `<th class="num">${g.names ? g.names[k] : 'Значення'}</th><th>Рівень</th>`).join('')}</tr></thead><tbody>
        ${years.map(y => `<tr><td>${y}</td>${extra.map(e => `<td class="num">${fmt(RAW[e][y], e.startsWith('inc') ? 0 : 2, true)}</td>`).join('')}
          ${inds.map(i => `<td class="num">${fmt(i.series[y], digitsFor(i.id), true)}</td><td>${badge(i.levels[y])}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`;
    }
    const cm = C.comments[g.ids[0]];
    const comments = g.ids.map(id => C.comments[id]);
    sec.innerHTML = `
      <div class="indicator-head"><div><h2>${g.title}</h2><span class="muted">Одиниця виміру: ${g.unit}</span></div>
        <div>${inds.map((i, k) => (g.names ? `<span class="muted">${g.names[k]}:</span> ` : '') + badge(i.level)).join(' ')}</div></div>
      <div class="facts">${facts}</div>
      <div class="indicator-grid stack">
        <div>${years.length ? `<div id="chart-${g.id}"></div><p class="muted">Зелена зона на графіку — оптимальний інтервал ${optInterval(g.scale)}; пунктир — порогові межі. Наведіть курсор, щоб побачити значення.</p>` : '<div class="note">Даних за показником немає (World Bank: AG.YLD.CREL.KG — «no data» для Сингапуру).</div>'}</div>
        <div>${dataTable}</div>
      </div>
      <h3 style="margin-top:18px">Порівняння з пороговими значеннями</h3>
      ${scaleTable}
      ${inds.some(i => i.formula) ? `<div class="note info"><b>Формула розрахунку:</b> ${inds.find(i => i.formula).formula}</div>` : ''}
      <h3 style="margin-top:18px">Аналіз</h3>
      ${comments.map((c, k) => `<p>${g.names ? `<b>${g.names[k]}.</b> ` : ''}${c.text}</p>`).join('')}
      <p><b>Тенденція:</b> ${trendBadge(cm.trend)} — ${cm.trendText}</p>
      ${cm.threat ? `<div class="note"><b>Загроза:</b> ${cm.threat}</div>` : ''}
      <p class="muted">Джерело: ${inds.map(i => i.src.split('; ').map(u => u.startsWith('http') ? `<a href="${u.split(' ')[0]}" target="_blank" rel="noopener">${u}</a>` : u).join('; ')).join('; ')}</p>`;
    host.appendChild(sec);

    if (years.length) {
      const sc = ESModel.SCALES[g.scale];
      const lines = [];
      if (g.scale === 'cover') lines.push({ v: 1.25, label: '1,25 — межа задовільного рівня' }, { v: 1.3, label: '1,3 — межа незадовільного рівня' });
      if (g.scale === 'rd') lines.push({ v: 2, label: '2 % — межа задовільного рівня' }, { v: 1.5, label: '1,5 % — межа незадовільного рівня' });
      if (g.scale === 'debt') lines.push({ v: 60, label: '60 % — межа абсолютної небезпеки' });
      if (g.scale === 'ineq') lines.push({ v: 7, label: '7 — межа абсолютної небезпеки' });
      if (g.scale === 'le') lines.push({ v: 75, label: '75 — межа задовільного рівня' });
      if (g.scale === 'imr') lines.push({ v: 5, label: '5 — межа задовільного рівня' });
      const b = BANDS[g.scale];
      ESCharts.line(document.getElementById('chart-' + g.id), {
        years, unit: g.unit, digits: digitsFor(g.ids[0]), yMin: g.yMin, title: g.title,
        series: inds.map((i, k) => ({ name: g.names ? g.names[k] : i.name, color: k ? COL.s2 : COL.s1, data: i.series })),
        band: { lo: b[0], hi: b[1], label: `Оптимальна зона ${optInterval(g.scale)}` }, lines,
      });
    }
  });

  // ---------- Тенденції, загрози ----------
  document.getElementById('safe-trends').innerHTML = C.safeTrends.map(t => `<li>${t}</li>`).join('');
  document.getElementById('danger-trends').innerHTML = C.dangerTrends.map(t => `<li>${t}</li>`).join('');
  document.getElementById('threats').innerHTML = C.threats.map((t, k) => `<div class="card threat"><div class="n">${k + 1}</div><div><h3>${t.title}</h3><p style="margin:0">${t.text}</p></div></div>`).join('');
  document.querySelectorAll('[data-integral]').forEach(e => { e.textContent = fmt(M.integral); });
})();
