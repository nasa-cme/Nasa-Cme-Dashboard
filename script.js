/* ==========================================================================
   CME WATCH — script.js
   Fetches, analyzes and renders Coronal Mass Ejection data from
   Supabase REST API (populated by GitHub Actions pipeline)
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Configuração do Supabase (apenas chave pública anon)                */
  /* ------------------------------------------------------------------ */
  const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
  const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';

  const SUPABASE_ENDPOINT = `${SUPABASE_URL}/rest/v1`;

  const els = {
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
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
    lastUpdateText: document.getElementById('lastUpdateText'),
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
  /* Fetch from Supabase                                                 */
  /* ------------------------------------------------------------------ */

  async function fetchCMEData() {
    const start = els.startDate.value;
    const end = els.endDate.value;

    if (!start || !end) {
      showAlert('Selecione uma data inicial e final antes de executar.');
      return;
    }
    if (new Date(start) > new Date(end)) {
      showAlert('A data inicial não pode ser depois da data final.');
      return;
    }

    hideAlert();
    setStatus('loading', 'CARREGANDO...');
    els.fetchBtn.disabled = true;

    // Formatar datas para ISO 8601 com hora
    const startISO = `${start}T00:00:00`;
    const endISO = `${end}T23:59:59`;

    const url = `${SUPABASE_ENDPOINT}/cme_events?start_time=gte.${encodeURIComponent(startISO)}&start_time=lte.${encodeURIComponent(endISO)}&order=start_time.desc&limit=1000`;

    try {
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Falha na requisição ao Supabase (HTTP ${res.status}).`);
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
      setStatus('live', `${currentEvents.length} EVENT(S) LOADED`);
    } catch (err) {
      console.error(err);
      setStatus('error', 'LOAD FAILED');
      showAlert(err.message || 'Erro desconhecido ao buscar dados do Supabase.');
    } finally {
      els.fetchBtn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Normalize Supabase record for rendering                             */
  /* ------------------------------------------------------------------ */

  function normalizeEvent(record) {
    return {
      id: record.activity_id,
      startTime: record.start_time,
      sourceLocation: record.source_location || '—',
      note: record.note || '',
      instruments: Array.isArray(record.instruments) ? record.instruments : [],
      speed: record.speed,
      type: record.type,
      isEarthDirected: record.is_earth_directed,
      latitude: record.latitude,
      longitude: record.longitude,
      halfAngle: record.half_angle,
      link: record.link || null,
      linkedEvents: Array.isArray(record.linked_events) ? record.linked_events : [],
    };
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

    els.statTotal.textContent = total || '—';
    els.statAvgSpeed.innerHTML = avgSpeed != null ? `${escapeHtml(String(avgSpeed))}<small>km/s</small>` : '—';
    els.statMaxSpeed.innerHTML = maxSpeed != null ? `${escapeHtml(String(maxSpeed))}<small>km/s</small>` : '—';
    els.statEarthDirected.textContent = total ? `${earthDirected}/${total}` : '—';
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
          <p>Nenhum dado carregado ainda.<br>Selecione um intervalo e clique em ATUALIZAR DADOS.</p>
        </div>`;
      return;
    }

    els.eventList.innerHTML = list.map((e, i) => {
      const fast = e.speed && e.speed >= 1000;
      const dateStr = formatDateTime(e.startTime);
      return `
        <div class="event-card ${fast ? 'event-card--fast' : ''}" data-id="${escapeHtml(e.id)}" style="animation-delay:${Math.min(i, 12) * 0.03}s">
          <div class="event-card__row">
            <span class="event-card__date">${dateStr}</span>
            <span class="event-card__speed">${e.speed != null ? escapeHtml(String(e.speed)) + ' km/s' : 'N/D'}</span>
          </div>
          <div class="event-card__meta">
            <span>${escapeHtml(e.sourceLocation)}</span>
            ${e.type ? `<span>${escapeHtml(e.type)}</span>` : ''}
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

  function isValidUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function openModal(id) {
    const e = currentEvents.find(ev => ev.id === id);
    if (!e) return;

    els.modalBadge.textContent = e.type || 'CME';
    els.modalTitle.textContent = e.id;

    const instrumentsText = e.instruments.length ? e.instruments.map(i => escapeHtml(i)).join(', ') : '—';
    const linkedEventsText = e.linkedEvents.length ? e.linkedEvents.map(i => escapeHtml(i)).join(', ') : '—';

    els.modalBody.innerHTML = `
      <dl>
        <dt>INÍCIO</dt><dd>${formatDateTime(e.startTime)}</dd>
        <dt>ORIGEM SOLAR</dt><dd>${escapeHtml(e.sourceLocation)}</dd>
        <dt>VELOCIDADE</dt><dd>${e.speed != null ? escapeHtml(String(e.speed)) + ' km/s' : 'Não modelado'}</dd>
        <dt>TIPO</dt><dd>${e.type ? escapeHtml(e.type) : '—'}</dd>
        <dt>LATITUDE</dt><dd>${e.latitude != null ? escapeHtml(String(e.latitude)) + '°' : '—'}</dd>
        <dt>LONGITUDE</dt><dd>${e.longitude != null ? escapeHtml(String(e.longitude)) + '°' : '—'}</dd>
        <dt>MEIO-ÂNGULO</dt><dd>${e.halfAngle != null ? escapeHtml(String(e.halfAngle)) + '°' : '—'}</dd>
        <dt>INSTRUMENTOS</dt><dd>${instrumentsText}</dd>
        <dt>EARTH-DIRECTED</dt><dd>${e.isEarthDirected ? 'SIM' : 'NÃO / INDETERMINADO'}</dd>
        <dt>EVENTOS LIGADOS</dt><dd>${linkedEventsText}</dd>
        ${isValidUrl(e.link) ? `<dt>FONTE</dt><dd><a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Ver no DONKI →</a></dd>` : ''}
      </dl>
      ${e.note ? `<div class="modal__note">${escapeHtml(e.note)}</div>` : ''}
    `;

    els.modalOverlay.style.display = 'flex';
    els.modalOverlay.hidden = false;
  }

  function closeModal() {
    els.modalOverlay.style.display = 'none';
    els.modalOverlay.hidden = true;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  els.modalClose.addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.modalOverlay.hidden) closeModal();
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

    const speeds = points.map(p => Number(p.speed));
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
      ctx.fillText(Math.round(v).toString(), 6, y + 3);
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
    points.forEach((p, i) => ctx.lineTo(xFor(i), yFor(Number(p.speed))));
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
      const x = xFor(i), y = yFor(Number(p.speed));
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
      const x = xFor(i), y = yFor(Number(p.speed));
      const fast = Number(p.speed) >= 1000;
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
  /* Fetch last pipeline execution info                                  */
  /* ------------------------------------------------------------------ */

  async function fetchLastUpdate() {
    try {
      const url = `${SUPABASE_ENDPOINT}/execucoes?order=executed_at.desc&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lastExec = data[0];
        const date = new Date(lastExec.executed_at);
        els.lastUpdateText.textContent = date.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar última atualização:', err);
    }
  }

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

  // Auto-run on load
  fetchCMEData();
  fetchLastUpdate();

})();
