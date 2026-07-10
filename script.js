/* ==========================================================================
   CME WATCH — script.js
   Fetches, analyzes and renders Coronal Mass Ejection data from
   NASA's DONKI API (https://api.nasa.gov/DONKI/CME)
   ========================================================================== */

(() => {
  'use strict';

  const API_BASE = 'https://api.nasa.gov/DONKI/CME';

  const els = {
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    apiKey: document.getElementById('apiKey'),
    fetchBtn: document.getElementById('fetchBtn'),
    statusLed: document.getElementById('statusLed'),
    statusText: document.getElementById('statusText'),
    clock: document.getElementById('clock'),
    alertBar: document.getElementById('alertBar'),
    statTotal: document.getElementById('statTotal'),
    statAvgSpeed: document.getElementById('statAvgSpeed'),
    statMaxSpeed: document.getElementById('statMaxSpeed'),
    statEarthDirected: document.getElementById('statEarthDirected'),
    eventList: document.getElementById('eventList'),
    listCount: document.getElementById('listCount'),
    chart: document.getElementById('speedChart'),
    chartEmpty: document.getElementById('chartEmpty'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalClose: document.getElementById('modalClose'),
    modalTitle: document.getElementById('modalTitle'),
    modalBadge: document.getElementById('modalBadge'),
    modalBody: document.getElementById('modalBody'),
  };

  let currentEvents = [];
  let currentSort = 'date';

  /* ------------------------------------------------------------------ */
  /* Clock                                                               */
  /* ------------------------------------------------------------------ */

  function tickClock() {
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString('pt-BR', { hour12: false }) + ' UTC' +
      (now.getTimezoneOffset() <= 0 ? '+' : '-') +
      String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ------------------------------------------------------------------ */
  /* Default date range: last 30 days                                    */
  /* ------------------------------------------------------------------ */

  function fmtDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function setRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    els.startDate.value = fmtDate(start);
    els.endDate.value = fmtDate(end);
  }
  setRange(30);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      setRange(Number(chip.dataset.range));
    });
  });

  /* ------------------------------------------------------------------ */
  /* Status / alerts                                                     */
  /* ------------------------------------------------------------------ */

  function setStatus(mode, text) {
    els.statusLed.className = 'status-led' + (mode ? ' ' + mode : '');
    els.statusText.textContent = text;
  }

  function showAlert(message) {
    els.alertBar.hidden = false;
    els.alertBar.textContent = message;
  }
  function hideAlert() {
    els.alertBar.hidden = true;
    els.alertBar.textContent = '';
  }

  /* ------------------------------------------------------------------ */
  /* Fetch                                                               */
  /* ------------------------------------------------------------------ */

  async function fetchCMEData() {
    const start = els.startDate.value;
    const end = els.endDate.value;
    const key = els.apiKey.value.trim() || 'DEMO_KEY';

    if (!start || !end) {
      showAlert('Selecione uma data inicial e final antes de executar o scan.');
      return;
    }
    if (new Date(start) > new Date(end)) {
      showAlert('A data inicial não pode ser depois da data final.');
      return;
    }

    hideAlert();
    setStatus('loading', 'SCANNING...');
    els.fetchBtn.disabled = true;

    const url = `${API_BASE}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(key)}`;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Limite de requisições da API excedido (rate limit). Tente novamente mais tarde ou use sua própria API key.');
        }
        throw new Error(`Falha na requisição à API DONKI (HTTP ${res.status}).`);
      }

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        currentEvents = [];
        renderAll();
        setStatus('', 'STANDBY');
        showAlert('Nenhum evento CME encontrado no intervalo selecionado.');
        els.fetchBtn.disabled = false;
        return;
      }

      currentEvents = data.map(normalizeEvent);
      renderAll();
      setStatus('live', `${currentEvents.length} EVENT(S) LOCKED`);
    } catch (err) {
      console.error(err);
      setStatus('error', 'SCAN FAILED');
      showAlert(err.message || 'Erro desconhecido ao buscar dados da NASA DONKI API.');
    } finally {
      els.fetchBtn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Normalize raw DONKI record into something easy to render            */
  /* ------------------------------------------------------------------ */

  function normalizeEvent(raw) {
    const analysis = pickBestAnalysis(raw.cmeAnalyses);
    return {
      id: raw.activityID,
      startTime: raw.startTime,
      sourceLocation: raw.sourceLocation || '—',
      note: raw.note || '',
      instruments: (raw.instruments || []).map(i => i.displayName),
      speed: analysis ? analysis.speed : null,
      type: analysis ? analysis.type : null,
      isEarthDirected: analysis ? !!analysis.isMostAccurate && isEarthDirected(analysis) : false,
      latitude: analysis ? analysis.latitude : null,
      longitude: analysis ? analysis.longitude : null,
      halfAngle: analysis ? analysis.halfAngle : null,
      link: raw.link || null,
      linkedEvents: (raw.linkedEvents || []).map(e => e.activityID),
      raw,
    };
  }

  function pickBestAnalysis(analyses) {
    if (!analyses || analyses.length === 0) return null;
    const mostAccurate = analyses.find(a => a.isMostAccurate);
    return mostAccurate || analyses[analyses.length - 1];
  }

  function isEarthDirected(analysis) {
    // Rough heuristic: near-zero lat/long half-angle cones tend to be geoeffective.
    if (analysis.latitude == null || analysis.longitude == null) return false;
    return Math.abs(analysis.latitude) < 30 && Math.abs(analysis.longitude) < 30;
  }

  /* ------------------------------------------------------------------ */
  /* Stats                                                               */
  /* ------------------------------------------------------------------ */

  function renderStats() {
    const withSpeed = currentEvents.filter(e => typeof e.speed === 'number');
    const total = currentEvents.length;
    const avgSpeed = withSpeed.length
      ? Math.round(withSpeed.reduce((sum, e) => sum + e.speed, 0) / withSpeed.length)
      : null;
    const maxSpeed = withSpeed.length
      ? Math.max(...withSpeed.map(e => e.speed))
      : null;
    const earthDirected = currentEvents.filter(e => e.isEarthDirected).length;

    els.statTotal.innerHTML = total || '—';
    els.statAvgSpeed.innerHTML = avgSpeed != null ? `${avgSpeed}<small>km/s</small>` : '—';
    els.statMaxSpeed.innerHTML = maxSpeed != null ? `${maxSpeed}<small>km/s</small>` : '—';
    els.statEarthDirected.innerHTML = total ? `${earthDirected}/${total}` : '—';
  }

  /* ------------------------------------------------------------------ */
  /* Event list                                                          */
  /* ------------------------------------------------------------------ */

  function sortedEvents() {
    const list = [...currentEvents];
    if (currentSort === 'speed') {
      list.sort((a, b) => (b.speed || 0) - (a.speed || 0));
    } else {
      list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
    return list;
  }

  function renderList() {
    const list = sortedEvents();
    els.listCount.textContent = `${currentEvents.length} registro(s)`;

    if (list.length === 0) {
      els.eventList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">◌</div>
          <p>Nenhum dado carregado ainda.<br>Selecione um intervalo e clique em EXECUTAR SCAN.</p>
        </div>`;
      return;
    }

    els.eventList.innerHTML = list.map((e, i) => {
      const fast = e.speed && e.speed >= 1000;
      const dateStr = formatDateTime(e.startTime);
      return `
        <div class="event-card ${fast ? 'event-card--fast' : ''}" data-id="${e.id}" style="animation-delay:${Math.min(i, 12) * 0.03}s">
          <div class="event-card__row">
            <span class="event-card__date">${dateStr}</span>
            <span class="event-card__speed">${e.speed != null ? e.speed + ' km/s' : 'N/D'}</span>
          </div>
          <div class="event-card__meta">
            <span>${e.sourceLocation}</span>
            ${e.type ? `<span>${e.type}</span>` : ''}
            ${e.isEarthDirected ? '<span>EARTH-DIRECTED</span>' : ''}
          </div>
        </div>`;
    }).join('');

    els.eventList.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.id));
    });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      renderList();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Modal                                                               */
  /* ------------------------------------------------------------------ */

  function openModal(id) {
    const e = currentEvents.find(ev => ev.id === id);
    if (!e) return;

    els.modalBadge.textContent = e.type || 'CME';
    els.modalTitle.textContent = e.id;

    els.modalBody.innerHTML = `
      <dl>
        <dt>INÍCIO</dt><dd>${formatDateTime(e.startTime)}</dd>
        <dt>ORIGEM SOLAR</dt><dd>${e.sourceLocation}</dd>
        <dt>VELOCIDADE</dt><dd>${e.speed != null ? e.speed + ' km/s' : 'Não modelado'}</dd>
        <dt>TIPO</dt><dd>${e.type || '—'}</dd>
        <dt>LATITUDE</dt><dd>${e.latitude != null ? e.latitude + '°' : '—'}</dd>
        <dt>LONGITUDE</dt><dd>${e.longitude != null ? e.longitude + '°' : '—'}</dd>
        <dt>MEIO-ÂNGULO</dt><dd>${e.halfAngle != null ? e.halfAngle + '°' : '—'}</dd>
        <dt>INSTRUMENTOS</dt><dd>${e.instruments.length ? e.instruments.join(', ') : '—'}</dd>
        <dt>EARTH-DIRECTED</dt><dd>${e.isEarthDirected ? 'SIM' : 'NÃO / INDETERMINADO'}</dd>
        <dt>EVENTOS LIGADOS</dt><dd>${e.linkedEvents.length ? e.linkedEvents.join(', ') : '—'}</dd>
        ${e.link ? `<dt>FONTE</dt><dd><a href="${e.link}" target="_blank" rel="noopener">Ver no DONKI →</a></dd>` : ''}
      </dl>
      ${e.note ? `<div class="modal__note">${escapeHtml(e.note)}</div>` : ''}
    `;

    els.modalOverlay.hidden = false;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  els.modalClose.addEventListener('click', () => { els.modalOverlay.hidden = true; });
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) els.modalOverlay.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') els.modalOverlay.hidden = true;
  });

  /* ------------------------------------------------------------------ */
  /* Chart — plain canvas line chart, no external libraries              */
  /* ------------------------------------------------------------------ */

  function renderChart() {
    const canvas = els.chart;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 900;
    const cssHeight = 280;

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const points = [...currentEvents]
      .filter(e => typeof e.speed === 'number')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    if (points.length === 0) {
      els.chartEmpty.style.display = 'flex';
      return;
    }
    els.chartEmpty.style.display = 'none';

    const padding = { top: 20, right: 24, bottom: 30, left: 50 };
    const w = cssWidth - padding.left - padding.right;
    const h = cssHeight - padding.top - padding.bottom;

    const speeds = points.map(p => p.speed);
    const minSpeed = 0;
    const maxSpeed = Math.max(...speeds) * 1.1;

    const xFor = (i) => padding.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
    const yFor = (v) => padding.top + h - ((v - minSpeed) / (maxSpeed - minSpeed)) * h;

    // grid lines
    ctx.strokeStyle = 'rgba(61,255,122,0.12)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(143,184,154,0.7)';
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const v = (maxSpeed / gridSteps) * i;
      const y = yFor(v);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();
      ctx.fillText(Math.round(v), 6, y + 3);
    }

    // danger threshold line at 1000 km/s if in range
    if (maxSpeed > 1000) {
      const y = yFor(1000);
      ctx.strokeStyle = 'rgba(255,77,94,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // area fill
    ctx.beginPath();
    ctx.moveTo(xFor(0), yFor(0));
    points.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.speed)));
    ctx.lineTo(xFor(points.length - 1), yFor(0));
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + h);
    grad.addColorStop(0, 'rgba(61,255,122,0.25)');
    grad.addColorStop(1, 'rgba(61,255,122,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.speed);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3dff7a';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(61,255,122,0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // points
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.speed);
      const fast = p.speed >= 1000;
      ctx.beginPath();
      ctx.arc(x, y, fast ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = fast ? '#ff4d5e' : '#3dff7a';
      ctx.fill();
    });
  }

  window.addEventListener('resize', () => {
    if (currentEvents.length) renderChart();
  });

  /* ------------------------------------------------------------------ */
  /* Render orchestration                                                */
  /* ------------------------------------------------------------------ */

  function renderAll() {
    renderStats();
    renderList();
    renderChart();
  }

  /* ------------------------------------------------------------------ */
  /* Wire up                                                             */
  /* ------------------------------------------------------------------ */

  els.fetchBtn.addEventListener('click', fetchCMEData);

  // Auto-run an initial scan with DEMO_KEY on load for immediate feedback
  fetchCMEData();

})();
