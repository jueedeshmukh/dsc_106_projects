/* ── Config ─────────────────────────────────────────────── */
const COLORS = {
  historical: '#a0a0b8',
  ssp119:     '#4fc3f7',
  ssp245:     '#ffb74d',
  ssp585:     '#ef5350',
};

const LABELS = {
  historical: 'Historical (observed)',
  ssp119:     'SSP1-1.9 — Very low emissions',
  ssp245:     'SSP2-4.5 — Moderate emissions',
  ssp585:     'SSP5-8.5 — High emissions',
};

const SCENARIO_ORDER = ['historical', 'ssp119', 'ssp245', 'ssp585'];
const PARIS = [
  { value: 1.5, label: 'Paris target: +1.5°C' },
  { value: 2.0, label: 'Paris target: +2.0°C' },
];
const FUTURE_START = 2015;
const ANIM_DURATION = 1400; // ms per line

/* ── State ──────────────────────────────────────────────── */
const hidden = new Set();

/* ── Dimensions ─────────────────────────────────────────── */
const container = document.getElementById('chart');
const MARGIN = { top: 20, right: 80, bottom: 80, left: 55 };
const BRUSH_HEIGHT = 50;
const BRUSH_GAP = 16;

function getWidth() {
  return container.parentElement.clientWidth - 64; // card padding
}

/* ── Main draw function ──────────────────────────────────── */
d3.csv('san_diego_temp_anomaly.csv', d => ({
  year:    +d.year,
  anomaly: +d.anomaly_smooth,
  scenario: d.scenario,
})).then(data => {

  const byScenario = d3.group(data, d => d.scenario);

  /* ─ SVG setup ─ */
  let W = getWidth();
  let H = 420;
  const totalH = H + BRUSH_GAP + BRUSH_HEIGHT + MARGIN.top + MARGIN.bottom;

  const svg = d3.select('#chart')
    .attr('width', W)
    .attr('height', totalH);

  /* ─ Clip path ─ */
  svg.append('defs').append('clipPath')
    .attr('id', 'main-clip')
    .append('rect')
    .attr('x', MARGIN.left)
    .attr('y', MARGIN.top)
    .attr('width', W - MARGIN.left - MARGIN.right)
    .attr('height', H);

  /* ─ Main chart group ─ */
  const g = svg.append('g').attr('class', 'main-g');

  /* ─ Brush group ─ */
  const brushG = svg.append('g')
    .attr('transform', `translate(0, ${H + BRUSH_GAP + MARGIN.top})`);

  /* ─ Scales ─ */
  const allYears   = data.map(d => d.year);
  const allAnomalies = data.map(d => d.anomaly);

  const xFull = d3.scaleLinear()
    .domain([d3.min(allYears), d3.max(allYears)])
    .range([MARGIN.left, W - MARGIN.right]);

  let xMain = xFull.copy();

  const yScale = d3.scaleLinear()
    .domain([d3.min(allAnomalies) - 0.3, d3.max(allAnomalies) + 0.5])
    .range([H, MARGIN.top]);

  const xBrush = xFull.copy();

  const yBrush = d3.scaleLinear()
    .domain(yScale.domain())
    .range([BRUSH_HEIGHT, 0]);

  /* ─ Line generators ─ */
  const lineMain = d3.line()
    .x(d => xMain(d.year))
    .y(d => yScale(d.anomaly))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const lineBrush = d3.line()
    .x(d => xBrush(d.year))
    .y(d => yBrush(d.anomaly))
    .curve(d3.curveCatmullRom.alpha(0.5));

  /* ─ Grid ─ */
  const gridG = g.append('g').attr('class', 'grid');

  function drawGrid() {
    gridG.selectAll('*').remove();
    gridG.call(
      d3.axisLeft(yScale)
        .ticks(5)
        .tickSize(-(W - MARGIN.left - MARGIN.right))
        .tickFormat('')
    ).attr('transform', `translate(${MARGIN.left}, 0)`);
  }
  drawGrid();

  /* ─ Axes ─ */
  const xAxisG = g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0, ${H})`);

  const yAxisG = g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${MARGIN.left}, 0)`);

  function drawAxes() {
    xAxisG.call(
      d3.axisBottom(xMain)
        .ticks(8)
        .tickFormat(d3.format('d'))
    );
    yAxisG.call(
      d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `+${d.toFixed(1)}°C`)
    );
  }
  drawAxes();

  /* ─ Y axis label ─ */
  svg.append('text')
    .attr('transform', `rotate(-90)`)
    .attr('x', -(H / 2))
    .attr('y', 14)
    .attr('text-anchor', 'middle')
    .attr('fill', '#666688')
    .attr('font-family', 'Space Mono, monospace')
    .attr('font-size', 10)
    .text('°C above pre-industrial average');

  /* ─ Paris threshold lines ─ */
  const parisG = g.append('g').attr('class', 'paris-g').attr('clip-path', 'url(#main-clip)');

  PARIS.forEach(p => {
    parisG.append('line')
      .attr('class', 'paris-line')
      .attr('x1', MARGIN.left)
      .attr('x2', W - MARGIN.right)
      .attr('y1', yScale(p.value))
      .attr('y2', yScale(p.value))
      .attr('stroke', p.value === 1.5 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)');
  });

  /* Paris labels — outside clip ─ */
  PARIS.forEach(p => {
    svg.append('text')
      .attr('class', 'paris-label')
      .attr('x', W - MARGIN.right + 6)
      .attr('y', yScale(p.value) + 4)
      .text(p.label);
  });

  /* ─ Historical / future divider ─ */
  const divG = g.append('g').attr('class', 'divider-g');

  function drawDivider() {
    divG.selectAll('*').remove();
    const xDiv = xMain(FUTURE_START);
    divG.append('line')
      .attr('class', 'divider-line')
      .attr('x1', xDiv).attr('x2', xDiv)
      .attr('y1', MARGIN.top).attr('y2', H);

    divG.append('text')
      .attr('class', 'divider-label')
      .attr('x', xDiv + 5)
      .attr('y', MARGIN.top + 14)
      .text('◀ PAST');

    divG.append('text')
      .attr('class', 'divider-label')
      .attr('x', xDiv + 5)
      .attr('y', MARGIN.top + 28)
      .text('FUTURE ▶');
  }
  drawDivider();

  /* ─ Lines group (clipped) ─ */
  const linesG = g.append('g')
    .attr('class', 'lines-g')
    .attr('clip-path', 'url(#main-clip)');

  /* ─ Crossing dots group ─ */
  const dotsG = g.append('g')
    .attr('class', 'dots-g')
    .attr('clip-path', 'url(#main-clip)');

  /* ─ Animate lines one by one ─ */
  function animateLine(scenario, delay) {
    const scenarioData = byScenario.get(scenario);
    if (!scenarioData) return;

    const path = linesG.append('path')
      .datum(scenarioData)
      .attr('class', `scenario-line line-${scenario}`)
      .attr('stroke', COLORS[scenario])
      .attr('opacity', scenario === 'historical' ? 0.8 : 1)
      .attr('d', lineMain);

    const totalLength = path.node().getTotalLength();

    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .delay(delay)
      .duration(ANIM_DURATION)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0)
      .on('end', () => {
        path.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        // draw crossing dots after line finishes
        if (scenario !== 'historical') drawCrossingDots(scenario, scenarioData);
      });
  }

  SCENARIO_ORDER.forEach((s, i) => animateLine(s, i * (ANIM_DURATION + 200)));

  /* ─ Crossing dots ─ */
  function drawCrossingDots(scenario, scenarioData) {
    PARIS.forEach(p => {
      // find first year anomaly >= threshold
      const crossed = scenarioData.find(d => d.anomaly >= p.value);
      if (!crossed) return;

      dotsG.append('circle')
        .attr('class', `crossing-dot dot-${scenario}`)
        .attr('cx', xMain(crossed.year))
        .attr('cy', yScale(crossed.anomaly))
        .attr('r', 0)
        .attr('fill', COLORS[scenario])
        .attr('stroke', '#0a0a0f')
        .attr('stroke-width', 2)
        .transition().duration(300)
        .attr('r', 6);

      // label
      dotsG.append('text')
        .attr('class', `crossing-dot dot-${scenario}`)
        .attr('x', xMain(crossed.year) + 8)
        .attr('y', yScale(crossed.anomaly) - 6)
        .attr('fill', COLORS[scenario])
        .attr('font-family', 'Space Mono, monospace')
        .attr('font-size', 9)
        .attr('opacity', 0)
        .text(`${crossed.year}`)
        .transition().duration(300)
        .attr('opacity', 1);
    });
  }

  /* ─ Brush (mini chart) ─ */
  // brush lines
  SCENARIO_ORDER.forEach(s => {
    const scenarioData = byScenario.get(s);
    if (!scenarioData) return;
    brushG.append('path')
      .datum(scenarioData)
      .attr('fill', 'none')
      .attr('stroke', COLORS[s])
      .attr('stroke-width', 1)
      .attr('opacity', 0.4)
      .attr('d', lineBrush);
  });

  // brush x axis
  brushG.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0, ${BRUSH_HEIGHT})`)
    .call(d3.axisBottom(xBrush).ticks(8).tickFormat(d3.format('d')));

  // brush label
  brushG.append('text')
    .attr('x', MARGIN.left)
    .attr('y', BRUSH_HEIGHT + 36)
    .attr('fill', '#666688')
    .attr('font-family', 'Space Mono, monospace')
    .attr('font-size', 10)
    .text('drag handles to zoom into a time period →');

  const brush = d3.brushX()
    .extent([[MARGIN.left, 0], [W - MARGIN.right, BRUSH_HEIGHT]])
    .on('brush end', brushed);

  const brushEl = brushG.append('g')
    .attr('class', 'brush')
    .call(brush);

  brushEl.selectAll('.selection')
    .attr('fill', 'rgba(255,255,255,0.08)')
    .attr('stroke', 'rgba(255,255,255,0.2)');

  function brushed(event) {
    if (!event.selection) {
      xMain = xFull.copy();
    } else {
      const [x0, x1] = event.selection;
      xMain = d3.scaleLinear()
        .domain([xBrush.invert(x0), xBrush.invert(x1)])
        .range([MARGIN.left, W - MARGIN.right]);
    }
    updateMain();
  }

  /* ─ Zoom ─ */
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[MARGIN.left, 0], [W - MARGIN.right, H]])
    .extent([[MARGIN.left, 0], [W - MARGIN.right, H]])
    .on('zoom', zoomed);

  svg.call(zoom);

  function zoomed(event) {
    xMain = event.transform.rescaleX(xFull);
    // sync brush
    brushEl.call(brush.move, xMain.range().map(xBrush.invert).map(xFull));
    updateMain();
  }

  /* ─ Update main chart after zoom/brush ─ */
  function updateMain() {
    drawAxes();
    drawGrid();
    drawDivider();

    // update paris lines
    parisG.selectAll('.paris-line').each(function(d, i) {
      d3.select(this)
        .attr('x1', MARGIN.left)
        .attr('x2', W - MARGIN.right);
    });

    // update scenario lines
    SCENARIO_ORDER.forEach(s => {
      const scenarioData = byScenario.get(s);
      if (!scenarioData) return;
      linesG.select(`.line-${s}`)
        .attr('d', lineMain(scenarioData));
    });

    // update crossing dots
    dotsG.selectAll('.crossing-dot').remove();
    SCENARIO_ORDER.filter(s => s !== 'historical').forEach(s => {
      const scenarioData = byScenario.get(s);
      if (!scenarioData || hidden.has(s)) return;
      drawCrossingDots(s, scenarioData);
    });
  }

  /* ─ Tooltip ─ */
  const tooltip = document.getElementById('tooltip');
  const bisect = d3.bisector(d => d.year).left;

  const overlay = g.append('rect')
    .attr('x', MARGIN.left)
    .attr('y', MARGIN.top)
    .attr('width', W - MARGIN.left - MARGIN.right)
    .attr('height', H - MARGIN.top)
    .attr('fill', 'transparent')
    .on('mousemove', onMouseMove)
    .on('mouseleave', () => { tooltip.style.opacity = 0; });

  // vertical hover line
  const hoverLine = g.append('line')
    .attr('stroke', 'rgba(255,255,255,0.15)')
    .attr('stroke-width', 1)
    .attr('y1', MARGIN.top)
    .attr('y2', H)
    .attr('opacity', 0);

  function onMouseMove(event) {
    const [mx] = d3.pointer(event);
    const year = Math.round(xMain.invert(mx));

    hoverLine
      .attr('x1', xMain(year))
      .attr('x2', xMain(year))
      .attr('opacity', 1);

    let html = `<div class="tooltip-year">${year}</div>`;

    SCENARIO_ORDER.forEach(s => {
      if (hidden.has(s)) return;
      const scenarioData = byScenario.get(s);
      if (!scenarioData) return;
      const idx = bisect(scenarioData, year);
      const d = scenarioData[Math.min(idx, scenarioData.length - 1)];
      if (!d) return;
      html += `
        <div class="tooltip-row">
          <div class="tooltip-dot" style="background:${COLORS[s]}"></div>
          <span style="color:${COLORS[s]}">${LABELS[s].split('—')[0].trim()}</span>
          <span style="margin-left:auto;padding-left:16px;font-family:'Space Mono',monospace">+${d.anomaly.toFixed(2)}°C</span>
        </div>`;
    });

    tooltip.innerHTML = html;

    const cardRect = document.querySelector('.card').getBoundingClientRect();
    const svgRect = container.getBoundingClientRect();
    let tx = event.clientX - cardRect.left + 12;
    if (tx + 220 > cardRect.width) tx -= 240;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = (event.clientY - svgRect.top - 20) + 'px';
    tooltip.style.opacity = 1;
  }

  /* ─ Legend / toggles ─ */
  const legendEl = document.getElementById('legend');

  SCENARIO_ORDER.forEach(s => {
    const item = document.createElement('label');
    item.className = 'legend-item active';
    item.innerHTML = `
      <input type="checkbox" checked />
      <div class="legend-swatch" style="background:${COLORS[s]};color:${COLORS[s]}"></div>
      <span class="legend-label">${LABELS[s]}</span>
    `;
    item.addEventListener('click', () => toggleScenario(s, item));
    legendEl.appendChild(item);
  });

  function toggleScenario(scenario, item) {
    if (hidden.has(scenario)) {
      hidden.delete(scenario);
      item.classList.remove('hidden');
      linesG.select(`.line-${scenario}`).attr('display', null);
      dotsG.selectAll(`.dot-${scenario}`).attr('display', null);
    } else {
      hidden.add(scenario);
      item.classList.add('hidden');
      linesG.select(`.line-${scenario}`).attr('display', 'none');
      dotsG.selectAll(`.dot-${scenario}`).attr('display', 'none');
    }
  }

  /* ─ Resize ─ */
  window.addEventListener('resize', () => {
    W = getWidth();
    svg.attr('width', W);
    xFull.range([MARGIN.left, W - MARGIN.right]);
    xMain = xFull.copy();
    xBrush.range([MARGIN.left, W - MARGIN.right]);
    brush.extent([[MARGIN.left, 0], [W - MARGIN.right, BRUSH_HEIGHT]]);
    brushEl.call(brush);

    svg.select('#main-clip rect')
      .attr('width', W - MARGIN.left - MARGIN.right);

    overlay
      .attr('width', W - MARGIN.left - MARGIN.right);

    PARIS.forEach((p, i) => {
      svg.selectAll('.paris-label').filter((d, j) => j === i)
        .attr('x', W - MARGIN.right + 6);
    });

    updateMain();

    // redraw brush lines
    brushG.selectAll('path').each(function(d) {
      if (d) d3.select(this).attr('d', lineBrush(d));
    });
  });

});
