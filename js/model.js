// Модель оцінювання економічної безпеки: порогові інтервали, класифікація, розрахунки.
(function (root) {
  const LEVELS = [
    { key: 'opt',  name: 'Оптимальний',          score: 5 },
    { key: 'sat',  name: 'Задовільний',          score: 4 },
    { key: 'uns',  name: 'Незадовільний',        score: 3 },
    { key: 'dan',  name: 'Небезпечний',          score: 2 },
    { key: 'crit', name: 'Критичний',            score: 1 },
    { key: 'abs',  name: 'Абсолютна небезпека',  score: 0 },
  ];
  const L = Object.fromEntries(LEVELS.map(l => [l.key, l]));

  // Інтервал: [lo, hi] з ознаками включення меж; рядок для відображення
  const I = (txt, lo, loInc, hi, hiInc, lvl) => ({ txt, lo, loInc, hi, hiInc, level: lvl });
  const INF = Infinity;

  const SCALES = {
    cereal: [
      I('(0; 15)', 0, false, 15, false, 'abs'), I('[15; 20)', 15, true, 20, false, 'crit'),
      I('[20; 25)', 20, true, 25, false, 'dan'), I('[25; 35)', 25, true, 35, false, 'uns'),
      I('[35; 45)', 35, true, 45, false, 'sat'), I('[45; 55]', 45, true, 55, true, 'opt'),
      I('(55; 75]', 55, false, 75, true, 'sat'), I('(75; 95]', 75, false, 95, true, 'uns'),
      I('(95; 100]', 95, false, 100, true, 'dan'), I('(100; 150]', 100, false, 150, true, 'crit'),
      I('(150; ∞)', 150, false, INF, false, 'abs'),
    ],
    le: [
      I('(0; 66)', 0, false, 66, false, 'abs'), I('[66; 68)', 66, true, 68, false, 'crit'),
      I('[68; 70)', 68, true, 70, false, 'dan'), I('[70; 75)', 70, true, 75, false, 'uns'),
      I('[75; 78)', 75, true, 78, false, 'sat'), I('[78; ∞)', 78, true, INF, false, 'opt'),
    ],
    imr: [
      I('[0; 4]', 0, true, 4, true, 'opt'), I('(4; 5]', 4, false, 5, true, 'sat'),
      I('(5; 7]', 5, false, 7, true, 'uns'), I('(7; 9]', 7, false, 9, true, 'dan'),
      I('(9; 11]', 9, false, 11, true, 'crit'), I('(11; 1000]', 11, false, 1000, true, 'abs'),
    ],
    cover: [
      I('(0; 0,85)', 0, false, 0.85, false, 'abs'), I('[0,85; 0,9)', 0.85, true, 0.9, false, 'crit'),
      I('[0,9; 0,95)', 0.9, true, 0.95, false, 'dan'), I('[0,95; 0,975)', 0.95, true, 0.975, false, 'uns'),
      I('[0,975; 1)', 0.975, true, 1, false, 'sat'), I('[1; 1,2]', 1, true, 1.2, true, 'opt'),
      I('(1,2; 1,25]', 1.2, false, 1.25, true, 'sat'), I('(1,25; 1,3]', 1.25, false, 1.3, true, 'uns'),
      I('(1,3; 1,5]', 1.3, false, 1.5, true, 'dan'), I('(1,5; 1,7]', 1.5, false, 1.7, true, 'crit'),
      I('(1,7; ∞)', 1.7, false, INF, false, 'abs'),
    ],
    rd: [
      I('(0; 0,5)', 0, false, 0.5, false, 'abs'), I('[0,5; 1)', 0.5, true, 1, false, 'crit'),
      I('[1; 1,5)', 1, true, 1.5, false, 'dan'), I('[1,5; 2)', 1.5, true, 2, false, 'uns'),
      I('[2; 3)', 2, true, 3, false, 'sat'), I('[3; ∞)', 3, true, INF, false, 'opt'),
    ],
    ineq: [
      I('[1; 4,5]', 1, true, 4.5, true, 'opt'), I('(4,5; 5]', 4.5, false, 5, true, 'sat'),
      I('(5; 5,5]', 5, false, 5.5, true, 'uns'), I('(5,5; 6]', 5.5, false, 6, true, 'dan'),
      I('(6; 7]', 6, false, 7, true, 'crit'), I('(7; ∞)', 7, false, INF, false, 'abs'),
    ],
    debt: [
      I('[0; 20]', 0, true, 20, true, 'opt'), I('(20; 30]', 20, false, 30, true, 'sat'),
      I('(30; 40]', 30, false, 40, true, 'uns'), I('(40; 50]', 40, false, 50, true, 'dan'),
      I('(50; 60]', 50, false, 60, true, 'crit'), I('(60; ∞)', 60, false, INF, false, 'abs'),
    ],
  };

  function classify(scale, v) {
    if (v === null || v === undefined || isNaN(v)) return null;
    for (const it of SCALES[scale]) {
      const okLo = it.loInc ? v >= it.lo : v > it.lo;
      const okHi = it.hi === INF ? true : (it.hiInc ? v <= it.hi : v < it.hi);
      if (okLo && okHi) return { ...L[it.level], interval: it.txt };
    }
    return null;
  }

  const YEARS = [];
  for (let y = 2015; y <= 2025; y++) YEARS.push(String(y));

  function build(RAW) {
    const r2 = x => Math.round(x * 100) / 100;
    const r3 = x => Math.round(x * 1000) / 1000;
    const cover = {}, ineq = {}, cerealC = {};
    for (const y of YEARS) {
      if (RAW.exp[y] != null && RAW.imp[y] != null) cover[y] = r3(RAW.exp[y] / RAW.imp[y]);
      if (RAW.incTop[y] != null && RAW.incBot[y] != null) ineq[y] = r2(RAW.incTop[y] / RAW.incBot[y]);
      if (RAW.cereal[y] != null) cerealC[y] = r2(RAW.cereal[y] / 100); // кг/га → ц/га
    }
    const IND = [
      { id: 'cereal', scale: 'cereal', name: 'Урожайність зернових культур', unit: 'ц/га', series: cerealC,
        src: 'https://data.worldbank.org/indicator/AG.YLD.CREL.KG?locations=SG',
        formula: 'Урожайність (ц/га) = Урожайність (кг/га) / 100' },
      { id: 'leF', scale: 'le', name: 'Очікувана тривалість життя при народженні — жінки', unit: 'років', series: RAW.leF,
        src: 'https://data.worldbank.org/indicator/SP.DYN.LE00.FE.IN?locations=SG' },
      { id: 'leM', scale: 'le', name: 'Очікувана тривалість життя при народженні — чоловіки', unit: 'років', series: RAW.leM,
        src: 'https://data.worldbank.org/indicator/SP.DYN.LE00.MA.IN?locations=SG' },
      { id: 'imrF', scale: 'imr', name: 'Смертність немовлят — дівчата', unit: '‰', series: RAW.imrF,
        src: 'https://data.worldbank.org/indicator/SP.DYN.IMRT.FE.IN?locations=SG' },
      { id: 'imrM', scale: 'imr', name: 'Смертність немовлят — хлопчики', unit: '‰', series: RAW.imrM,
        src: 'https://data.worldbank.org/indicator/SP.DYN.IMRT.MA.IN?locations=SG' },
      { id: 'cover', scale: 'cover', name: 'Коефіцієнт покриття імпорту експортом', unit: 'разів', series: cover,
        src: 'https://data.worldbank.org/indicator/NE.EXP.GNFS.ZS?locations=SG; https://data.worldbank.org/indicator/NE.IMP.GNFS.ZS?locations=SG',
        formula: 'Kпокр = Експорт (% ВВП) / Імпорт (% ВВП)' },
      { id: 'rd', scale: 'rd', name: 'Витрати на дослідження та розробки', unit: '% ВВП', series: RAW.rd,
        src: 'https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS?locations=SG' },
      { id: 'ineq', scale: 'ineq', name: 'Співвідношення доходів 10 % найбагатших і 10 % найбідніших', unit: 'разів', series: ineq,
        src: 'https://data.gov.sg/datasets/d_1dc0ffa8e519eb9a069db01c8dab6bf0/view (SingStat)',
        formula: 'Kдец = Середній дохід 10-го децилю / Середній дохід 1-го децилю' },
      { id: 'debt', scale: 'debt', name: 'Загальний борг центрального уряду', unit: '% ВВП', series: RAW.debt,
        src: 'https://data.worldbank.org/indicator/GC.DOD.TOTL.GD.ZS?locations=SG' },
    ];
    for (const ind of IND) {
      const ys = Object.keys(ind.series).sort();
      ind.lastYear = ys.length ? ys[ys.length - 1] : null;
      ind.last = ind.lastYear ? ind.series[ind.lastYear] : null;
      ind.firstYear = ys.length ? ys[0] : null;
      ind.first = ind.firstYear ? ind.series[ind.firstYear] : null;
      ind.level = classify(ind.scale, ind.last);
      ind.firstLevel = classify(ind.scale, ind.first);
      ind.levels = Object.fromEntries(ys.map(y => [y, classify(ind.scale, ind.series[y])]));
      ind.change = ys.length ? r2(ind.last - ind.first) : null;
      // тенденція: порівняння бальної оцінки першого та останнього року + напрям руху значення
      if (ind.level && ind.firstLevel) {
        const d = ind.level.score - ind.firstLevel.score;
        ind.trend = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
      }
    }
    const assessed = IND.filter(i => i.level);
    const integral = r2(assessed.reduce((s, i) => s + i.level.score, 0) / assessed.length);
    // інтегральна оцінка по роках (лише показники з даними за рік)
    const integralByYear = {};
    for (const y of YEARS) {
      const sc = IND.map(i => i.levels[y]).filter(Boolean).map(l => l.score);
      if (sc.length === 8) integralByYear[y] = r2(sc.reduce((a, b) => a + b, 0) / sc.length);
    }
    return { IND, integral, integralLevel: integralLevel(integral), integralByYear, assessedCount: assessed.length };
  }

  // Шкала інтегральної оцінки (середній бал 0–5)
  const INTEGRAL_SCALE = [
    { txt: '[4,5; 5]', lo: 4.5, level: 'opt' }, { txt: '[3,5; 4,5)', lo: 3.5, level: 'sat' },
    { txt: '[2,5; 3,5)', lo: 2.5, level: 'uns' }, { txt: '[1,5; 2,5)', lo: 1.5, level: 'dan' },
    { txt: '[0,5; 1,5)', lo: 0.5, level: 'crit' }, { txt: '[0; 0,5)', lo: 0, level: 'abs' },
  ];
  function integralLevel(v) {
    for (const s of INTEGRAL_SCALE) if (v >= s.lo) return { ...L[s.level], interval: s.txt };
    return L.abs;
  }

  root.ESModel = { LEVELS, SCALES, INTEGRAL_SCALE, classify, build, YEARS };
})(typeof window !== 'undefined' ? window : globalThis);
