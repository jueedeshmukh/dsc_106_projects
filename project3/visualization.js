/* ── Config ─────────────────────────────────────────────── */
const COLORS = {
  historical: '#a0a0b8',
  ssp119:     '#4fc3f7',
  ssp245:     '#ffb74d',
  ssp585:     '#ef5350',
};

const LABELS = {
  historical: { name: 'Historical', desc: 'Observed past climate' },
  ssp119:     { name: 'SSP1-1.9',   desc: 'Very low emissions — aggressive climate action' },
  ssp245:     { name: 'SSP2-4.5',   desc: 'Moderate emissions — some action taken' },
  ssp585:     { name: 'SSP5-8.5',   desc: 'High emissions — business as usual' },
};

const SCENARIO_ORDER = ['historical', 'ssp119', 'ssp245', 'ssp585'];

const PARIS = [
  { value: 1.5, label: '+1.5°C Paris target' },
  { value: 2.0, label: '+2.0°C Paris target' },
];

const FUTURE_START = 2015;
const ANIM_DURATION = 1300;

/* ── State ──────────────────────────────────────────────── */
const hidden = new Set();

/* ── Dimensions ─────────────────────────────────────────── */
const MARGIN      = { top: 24, right: 10, bottom: 20, left: 52 };
const BRUSH_H     = 48;
const BRUSH_GAP   = 14;
const MAIN_H      = 380;

function chartWidth() {
  return document.getElementById('chart').parentElement.clientWidth - 40;
}

/* ════════════════════════════════════════════════════════ */
d3.csv('san_diego_temp_anomaly.csv', d => ({
  year:    +d.year,
  anomaly: +d.anomaly_smooth,
  scenario: d.scenario,
})).then(data => {

  const byScenario = d3.group(data, d => d.scenario);

  /* ── SVG ── */
  let W = chartWidth();
  const totalH = MARGIN.top + MAIN_H + BRUSH_GAP + BRUSH_H + MARGIN.bottom + 28;

  const svg = d3.select('#chart')
    .attr('width', W)
    .attr('height', totalH);

  /* clip for main chart area */
  svg.append('defs').append('clipPath')
    .attr('id', 'clip-main')
    .append('rect')
    .attr('x', MARGIN.left)
    .attr('y', MARGIN.top - 4)
    .attr('width', W - MARGIN.left - MARGIN.right)
    .attr('height', MAIN_H + 8);

  /* ── Base scales ── */
  const xExtent = d3.extent(data, d => d.year);
  const yExtent = d3.extent(data, d => d.anomaly);

  // xRef is the full-range reference scale; xMain is the current view
  let xRef = d3.scaleLinear()
    .domain(xExtent)
    .range([MARGIN.left, W - MARGIN.right]);

  let xMain = xRef.copy();

  const yMain = d3.scaleLinear()
    .domain([yExtent[0] - 0.3, yExtent[1] + 0.5])
    .range([MARGIN.top + MAIN_H, MARGIN.top]);

  const xBrushScale = d3.scaleLinear()
    .domain(xExtent)
    .range([MARGIN.left, W - MARGIN.right]);

  const yBrushScale = d3.scaleLinear()
    .domain(yMain.domain())
    .range([BRUSH_H, 0]);

  /* ── Groups ── */
  const gGrid   = svg.append('g').attr('class', 'grid');
  const gXAxis  = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${MARGIN.top + MAIN_H})`);
  const gYAxis  = svg.append('g').attr('class', 'axis').attr('transform', `translate(${MARGIN.left},0)`);
  const gParis  = svg.append('g').attr('clip-path', 'url(#clip-main)');
  const gParisLabels = svg.append('g'); // outside clip
  const gDivider = svg.append('g').attr('clip-path', 'url(#clip-main)');
  const gLines  = svg.append('g').attr('clip-path', 'url(#clip-main)');
  const gDots   = svg.append('g').attr('clip-path', 'url(#clip-main)');
  const gOverlay = svg.append('g');

  const brushTop = MARGIN.top + MAIN_H + BRUSH_GAP;
  const gBrush  = svg.append('g').attr('transform', `translate(0,${brushTop})`);

  /* ── Y axis label ── */
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(MARGIN.top + MAIN_H / 2))
    .attr('y', 13)
    .attr('text-anchor', 'middle')
    .attr('fill', '#555577')
    .attr('font-family', 'Space Mono, monospace')
    .attr('font-size', 9)
    .text('°C above pre-industrial average');

  /* ── Line generators ── */
  const lineMain = d3.line()
    .x(d => xMain(d.year))
    .y(d => yMain(d.anomaly))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const lineBrush = d3.line()
    .x(d => xBrushScale(d.year))
    .y(d => yBrushScale(d.anomaly))
    .curve(d3.curveCatmullRom.alpha(0.5));

  /* ── Draw helpers ── */
  function drawGrid() {
    gGrid.selectAll('*').remove();
    gGrid.call(
      d3.axisLeft(yMain)
        .ticks(5)
        .tickSize(-(W - MARGIN.left - MARGIN.right))
        .tickFormat('')
    ).attr('transform', `translate(${MARGIN.left},0)`);
  }

  function drawAxes() {
    gXAxis.call(d3.axisBottom(xMain).ticks(8).tickFormat(d3.format('d')));
    gYAxis.call(d3.axisLeft(yMain).ticks(5).tickFormat(d => `+${d.toFixed(1)}°C`));
  }

  function drawParis() {
    gParis.selectAll('*').remove();
    PARIS.forEach(p => {
      gParis.append('line')
        .attr('class', 'paris-line')
        .attr('x1', MARGIN.left).attr('x2', W - MARGIN.right)
        .attr('y1', yMain(p.value)).attr('y2', yMain(p.value))
        .attr('stroke', p.value === 1.5 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.38)');
    });

    gParisLabels.selectAll('*').remove();
    PARIS.forEach(p => {
      gParisLabels.append('text')
        .attr('class', 'paris-label')
        .attr('x', W - MARGIN.right + 4)
        .attr('y', yMain(p.value) + 4)
        .text(p.label);
    });
  }

  function drawDivider() {
    gDivider.selectAll('*').remove();
    const xd = xMain(FUTURE_START);
    if (xd < MARGIN.left || xd > W - MARGIN.right) return;

    gDivider.append('line')
      .attr('class', 'divider-line')
      .attr('x1', xd).attr('x2', xd)
      .attr('y1', MARGIN.top).attr('y2', MARGIN.top + MAIN_H);

    gDivider.append('text')
      .attr('class', 'divider-label')
      .attr('x', xd - 5).attr('y', MARGIN.top + 16)
      .attr('text-anchor', 'end')
      .text('◀ PAST');

    gDivider.append('text')
      .attr('class', 'divider-label')
      .attr('x', xd + 5).attr('y', MARGIN.top + 16)
      .text('FUTURE ▶');
  }

  function updateLines() {
    SCENARIO_ORDER.forEach(s => {
      const path = gLines.select(`.line-${s}`);
      if (!path.empty()) {
        path.attr('d', lineMain(byScenario.get(s)));
      }
    });
  }

  function updateDots() {
    gDots.selectAll('*').remove();
    SCENARIO_ORDER.filter(s => s !== 'historical' && !hidden.has(s)).forEach(s => {
      const sd = byScenario.get(s);
      if (!sd) return;
      PARIS.forEach(p => {
        const crossed = sd.find(d => d.anomaly >= p.value);
        if (!crossed) return;
        const cx = xMain(crossed.year);
        const cy = yMain(crossed.anomaly);
        if (cx < MARGIN.left || cx > W - MARGIN.right) return;

        gDots.append('circle')
          .attr('class', `crossing-dot dot-${s}`)
          .attr('cx', cx).attr('cy', cy)
          .attr('r', 5)
          .attr('fill', COLORS[s]);

        gDots.append('text')
          .attr('class', `crossing-dot dot-${s}`)
          .attr('x', cx + 7).attr('y', cy - 5)
          .attr('fill', COLORS[s])
          .attr('font-family', 'Space Mono, monospace')
          .attr('font-size', 9)
          .text(crossed.year);
      });
    });
  }

  function redraw() {
    drawGrid();
    drawAxes();
    drawParis();
    drawDivider();
    updateLines();
    updateDots();
  }

  /* ── Initial draw ── */
  drawGrid();
  drawAxes();
  drawParis();
  drawDivider();

  /* ── Animate lines one by one ── */
  function animateLine(scenario, delay) {
    const sd = byScenario.get(scenario);
    if (!sd) return;

    const path = gLines.append('path')
      .datum(sd)
      .attr('class', `scenario-line line-${scenario}`)
      .attr('stroke', COLORS[scenario])
      .attr('opacity', scenario === 'historical' ? 0.75 : 1)
      .attr('d', lineMain);

    const len = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', `${len} ${len}`)
      .attr('stroke-dashoffset', len)
      .transition()
      .delay(delay)
      .duration(ANIM_DURATION)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0)
      .on('end', () => {
        path.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        if (scenario !== 'historical') updateDots();
      });
  }

  SCENARIO_ORDER.forEach((s, i) => animateLine(s, i * (ANIM_DURATION + 150)));

  /* ── Brush (mini chart) ── */
  SCENARIO_ORDER.forEach(s => {
    gBrush.append('path')
      .datum(byScenario.get(s))
      .attr('fill', 'none')
      .attr('stroke', COLORS[s])
      .attr('stroke-width', 1)
      .attr('opacity', 0.35)
      .attr('d', lineBrush);
  });

  gBrush.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${BRUSH_H})`)
    .call(d3.axisBottom(xBrushScale).ticks(8).tickFormat(d3.format('d')));

  gBrush.append('text')
    .attr('x', MARGIN.left)
    .attr('y', BRUSH_H + 22)
    .attr('fill', '#444466')
    .attr('font-family', 'Space Mono, monospace')
    .attr('font-size', 9)
    .text('drag handles to focus on a time period');

  /* The brush — NO interaction with zoom, fully independent */
  const brush = d3.brushX()
    .extent([[MARGIN.left, 0], [W - MARGIN.right, BRUSH_H]])
    .on('brush', onBrush)
    .on('end', onBrushEnd);

  const brushEl = gBrush.append('g')
    .attr('class', 'brush')
    .call(brush);

  let brushActive = false;

  function onBrush(event) {
    if (!event.sourceEvent) return; // ignore programmatic
    if (!event.selection) return;
    brushActive = true;
    const [x0, x1] = event.selection;
    xMain = d3.scaleLinear()
      .domain([xBrushScale.invert(x0), xBrushScale.invert(x1)])
      .range([MARGIN.left, W - MARGIN.right]);
    redraw();
  }

  function onBrushEnd(event) {
    if (!event.sourceEvent) return;
    if (!event.selection) {
      // clicked without dragging — reset
      brushActive = false;
      xMain = xRef.copy();
      redraw();
    }
  }

  /* ── Zoom (scroll wheel + drag) — operates on main chart only ── */
  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[MARGIN.left, 0], [W - MARGIN.right, MAIN_H]])
    .extent([[MARGIN.left, 0], [W - MARGIN.right, MAIN_H]])
    .filter(event => {
      // allow wheel zoom; allow drag only if not on brush area
      if (event.type === 'wheel') return true;
      if (event.type === 'mousedown') return event.target.closest('.brush') === null;
      return true;
    })
    .on('zoom', onZoom);

  // attach zoom only to the main chart area, NOT the whole SVG
  const zoomRect = gOverlay.append('rect')
    .attr('x', MARGIN.left)
    .attr('y', MARGIN.top)
    .attr('width', W - MARGIN.left - MARGIN.right)
    .attr('height', MAIN_H)
    .attr('fill', 'transparent')
    .call(zoom);

  function onZoom(event) {
    xMain = event.transform.rescaleX(xRef);
    // update brush selection to reflect zoom
    const newSelection = [xMain.range()[0], xMain.range()[1]].map(
      r => xBrushScale(xMain.invert(r))
    );
    // clamp to brush extent
    const lo = Math.max(MARGIN.left, newSelection[0]);
    const hi = Math.min(W - MARGIN.right, newSelection[1]);
    brushEl.call(brush.move, [lo, hi]);
    redraw();
  }

  /* ── Tooltip ── */
  const tooltip = document.getElementById('tooltip');
  const bisect  = d3.bisector(d => d.year).left;

  const hoverLine = gOverlay.append('line')
    .attr('stroke', 'rgba(255,255,255,0.12)')
    .attr('stroke-width', 1)
    .attr('y1', MARGIN.top)
    .attr('y2', MARGIN.top + MAIN_H)
    .attr('opacity', 0)
    .style('pointer-events', 'none');

  zoomRect
    .on('mousemove', onMouseMove)
    .on('mouseleave', () => {
      tooltip.style.opacity = 0;
      hoverLine.attr('opacity', 0);
    });

  function onMouseMove(event) {
    const [mx] = d3.pointer(event);
    const year = Math.round(xMain.invert(mx));

    hoverLine
      .attr('x1', xMain(year)).attr('x2', xMain(year))
      .attr('opacity', 1);

    let html = `<div class="tooltip-year">${year}</div>`;

    SCENARIO_ORDER.forEach(s => {
      if (hidden.has(s)) return;
      const sd = byScenario.get(s);
      if (!sd) return;
      const idx = bisect(sd, year);
      const d = sd[Math.min(idx, sd.length - 1)];
      if (!d) return;
      html += `
        <div class="tooltip-row">
          <div class="tooltip-dot" style="background:${COLORS[s]}"></div>
          <span style="color:${COLORS[s]};font-size:11px">${LABELS[s].name}</span>
          <span style="margin-left:auto;padding-left:16px;font-family:'Space Mono',monospace;font-size:11px">+${d.anomaly.toFixed(2)}°C</span>
        </div>`;
    });

    tooltip.innerHTML = html;

    const cardRect = document.querySelector('.chart-area').getBoundingClientRect();
    let tx = event.clientX - cardRect.left + 14;
    if (tx + 230 > cardRect.width) tx -= 250;
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = (event.offsetY - 20) + 'px';
    tooltip.style.opacity = 1;
  }

  /* ── Sidebar legend (checkboxes) ── */
  const sidebar = document.getElementById('sidebar');

  SCENARIO_ORDER.forEach(s => {
    const item = document.createElement('div');
    item.className = 'legend-item active';
    item.style.color = COLORS[s];
    item.innerHTML = `
      <div class="legend-check" style="border-color:${COLORS[s]};color:${COLORS[s]}"></div>
      <div class="legend-text">
        <div class="legend-name" style="color:${COLORS[s]}">${LABELS[s].name}</div>
        <div class="legend-desc">${LABELS[s].desc}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      if (hidden.has(s)) {
        hidden.delete(s);
        item.classList.remove('hidden');
        item.classList.add('active');
        gLines.select(`.line-${s}`).attr('display', null);
      } else {
        hidden.add(s);
        item.classList.remove('active');
        item.classList.add('hidden');
        gLines.select(`.line-${s}`).attr('display', 'none');
      }
      updateDots();
    });

    sidebar.appendChild(item);
  });

  /* ── Resize ── */
  window.addEventListener('resize', () => {
    W = chartWidth();
    svg.attr('width', W);

    xRef.range([MARGIN.left, W - MARGIN.right]);
    xMain = xRef.copy();
    xBrushScale.range([MARGIN.left, W - MARGIN.right]);

    svg.select('#clip-main rect').attr('width', W - MARGIN.left - MARGIN.right);
    zoomRect.attr('width', W - MARGIN.left - MARGIN.right);
    brush.extent([[MARGIN.left, 0], [W - MARGIN.right, BRUSH_H]]);
    brushEl.call(brush);

    zoom.translateExtent([[MARGIN.left, 0], [W - MARGIN.right, MAIN_H]])
        .extent([[MARGIN.left, 0], [W - MARGIN.right, MAIN_H]]);

    // redraw brush mini lines
    gBrush.selectAll('path').each(function(d) {
      if (d) d3.select(this).attr('d', lineBrush(d));
    });

    redraw();
  });

});