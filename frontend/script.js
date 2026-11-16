(() => {
  const $ = s => document.querySelector(s);
  const towers = [...document.querySelectorAll('.tower')];
  const stacks = towers.map(t => t.querySelector('.stack'));
  // lacquer palette: one colour per ring
  const COLORS = ['#f3e9d2', '#6cb8e6', '#2e9c7f', '#e9c46a', '#e2574c', '#e58db0', '#8a6fd1', '#a8c94a'];
  // pentatonic bell notes: any order of moves still sounds pleasant
  const NOTES = [523.25, 440.0, 392.0, 329.63, 293.66, 261.63, 220.0, 196.0];
  const ROW = 30;                  // ring height + gap (px), keep in sync with style.css
  const ROD_TOP = 312;             // where a lifted ring must clear the rod
  const API = location.protocol === 'file:' ? 'http://localhost:8080' : '';

  let n = 4, pegs, selected = null, moves = 0, history = [];
  let timerId = null, t0 = 0, started = false, solving = false, cancelSolve = false;

  /* ---------- sound ---------- */
  let ctx;
  function bell(size, soft = false) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const f = NOTES[Math.min(size, NOTES.length) - 1] || 440;
      const now = ctx.currentTime, g = ctx.createGain();
      g.gain.setValueAtTime(soft ? .08 : .22, now);
      g.gain.exponentialRampToValueAtTime(.0001, now + 1.4);
      g.connect(ctx.destination);
      [1, 2.76].forEach((m, k) => {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f * m;
        const og = ctx.createGain(); og.gain.value = k ? .25 : 1;
        o.connect(og); og.connect(g); o.start(now); o.stop(now + 1.4);
      });
    } catch (e) { /* audio not available */ }
  }

  /* ---------- helpers ---------- */
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const optimal = () => 2 ** n - 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const bestKey = () => `hanoi-bells-best-${n}`;
  function say(text, bad = false) { const m = $('#msg'); m.textContent = text; m.classList.toggle('bad', bad); }

  function startTimer() {
    if (started) return;
    started = true; t0 = Date.now();
    timerId = setInterval(() => { $('#time').textContent = fmt(Math.floor((Date.now() - t0) / 1000)); }, 500);
  }
  function stopTimer() { clearInterval(timerId); timerId = null; }

  function updateStats() {
    $('#moves').textContent = moves;
    $('#optimal').textContent = optimal();
    let b = null;
    try { b = localStorage.getItem(bestKey()); } catch (e) {}
    $('#best').textContent = b || '–';
    $('#undo').disabled = history.length === 0 || solving;
  }

  /* ---------- render ---------- */
  function render(dropTo = -1) {
    stacks.forEach((st, i) => {
      st.innerHTML = '';
      pegs[i].forEach((size, k) => {
        const d = document.createElement('div');
        d.className = 'disk';
        d.style.setProperty('--w', (30 + 66 * (size - 1) / Math.max(n - 1, 1)) + '%');
        d.style.setProperty('--c', COLORS[size - 1]);
        d.textContent = size;
        const isTop = k === pegs[i].length - 1;
        if (isTop && selected === i) {
          d.classList.add('lift');
          d.style.setProperty('--lift', (ROD_TOP - (pegs[i].length - 1) * ROW) + 'px');
        }
        if (isTop && dropTo === i) d.classList.add('drop');
        st.appendChild(d);
      });
      towers[i].classList.toggle('armed', selected === i);
    });
    updateStats();
  }

  /* ---------- game ---------- */
  function init() {
    stopTimer(); started = false; cancelSolve = true; solving = false;
    pegs = [[], [], []];
    for (let s = n; s >= 1; s--) pegs[0].push(s);
    moves = 0; history = []; selected = null;
    $('#time').textContent = '0:00';
    $('#solve').textContent = 'Show solution';
    $('#count').disabled = false; $('#reset').disabled = false;
    say('Tap a tower to lift its top ring, then tap where it should go. Keys 1, 2, 3 work too.');
    render();
  }

  function applyMove(from, to) {
    const size = pegs[from].pop();
    pegs[to].push(size);
    selected = null;
    render(to);
    bell(size);
    return size;
  }

  function choose(i) {
    if (solving) return;
    if (selected === null) {
      if (!pegs[i].length) { shake(i); say('That tower is empty. Pick a tower that has a ring.', true); return; }
      selected = i; render(); bell(pegs[i].at(-1), true);
      say(`Ring ${pegs[i].at(-1)} lifted. Where should it go?`);
      return;
    }
    if (selected === i) { selected = null; render(); say('Ring put back.'); return; }
    const top = pegs[selected].at(-1), dest = pegs[i].at(-1);
    if (dest && dest < top) {
      shake(i); say(`Ring ${top} is too big to sit on ring ${dest}.`, true); return;
    }
    startTimer();
    history.push([selected, i]);
    moves++;
    applyMove(selected, i);
    say('Good move.');
    if (pegs[2].length === n) win();
  }

  function undo() {
    if (!history.length || solving) return;
    const [from, to] = history.pop();
    moves = Math.max(0, moves - 1);
    selected = null;
    applyMove(to, from);
    say('Move undone.');
  }

  function shake(i) {
    towers[i].classList.remove('shake'); void towers[i].offsetWidth; towers[i].classList.add('shake');
  }

  /* ---------- win ---------- */
  function win() {
    stopTimer();
    const secs = Math.floor((Date.now() - t0) / 1000);
    const opt = optimal();
    const stars = moves === opt ? 3 : moves <= Math.ceil(opt * 1.5) ? 2 : 1;
    let isBest = false;
    try {
      const prev = parseInt(localStorage.getItem(bestKey()) || '0', 10);
      if (!prev || moves < prev) { localStorage.setItem(bestKey(), moves); isBest = true; }
    } catch (e) {}
    $('#winTitle').textContent = stars === 3 ? 'Perfect tune' : 'Tower complete';
    $('#winText').textContent =
      `${moves} moves in ${fmt(secs)}. The fewest possible with ${n} rings is ${opt}.` + (isBest ? ' New personal best.' : '');
    $('#stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    updateStats();
    petals();
    $('#win').showModal();
    // victory phrase: all bells from big to small
    [...Array(n).keys()].forEach(k => setTimeout(() => bell(n - k), k * 160));
  }

  function petals() {
    const box = $('#petals');
    for (let k = 0; k < 70; k++) {
      const p = document.createElement('i');
      p.className = 'petal';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.setProperty('--d', 2.5 + Math.random() * 2.5 + 's');
      p.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(p);
      setTimeout(() => p.remove(), 5500);
    }
  }

  /* ---------- solver (Prolog backend, with browser fallback) ---------- */
  function localSolve(k, f, t, v, out) {
    if (!k) return;
    localSolve(k - 1, f, v, t, out); out.push({ from: f, to: t }); localSolve(k - 1, v, t, f, out);
  }

  async function getSolution() {
    try {
      const r = await fetch(`${API}/api/solve?n=${n}`);
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      return { moves: data.moves, source: 'Prolog backend' };
    } catch (e) {
      const out = []; localSolve(n, 0, 2, 1, out);
      return { moves: out, source: 'browser (backend is offline)' };
    }
  }

  async function runSolution() {
    if (solving) { cancelSolve = true; return; }
    init();
    solving = true; cancelSolve = false;
    $('#solve').textContent = 'Stop';
    $('#count').disabled = true; $('#reset').disabled = true;
    say('Asking the solver…');
    updateStats();
    const { moves: plan, source } = await getSolution();
    const delay = n <= 4 ? 600 : n <= 6 ? 320 : 170;
    say(`Solution from the ${source}: ${plan.length} moves.`);
    for (const m of plan) {
      if (cancelSolve) break;
      await sleep(delay);
      if (cancelSolve) break;
      startTimer(); moves++;
      applyMove(m.from, m.to);
    }
    const finished = pegs[2].length === n;
    stopTimer();
    solving = false;
    $('#solve').textContent = 'Show solution';
    $('#count').disabled = false; $('#reset').disabled = false;
    updateStats();
    say(finished ? `Solved in ${moves} moves. Now try it yourself.` : 'Solution stopped.');
    if (!finished) cancelSolve = false;
  }

  async function ping() {
    const pill = $('#engine');
    try {
      const r = await fetch(`${API}/api/ping`);
      if (!r.ok) throw new Error();
      pill.textContent = 'Prolog backend online'; pill.className = 'pill on';
    } catch (e) {
      pill.textContent = 'Backend offline: the game still works'; pill.className = 'pill off';
    }
  }

  /* ---------- events ---------- */
  towers.forEach((t, i) => {
    t.addEventListener('click', () => choose(i));
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(i); } });
  });
  document.addEventListener('keydown', e => {
    if (['1', '2', '3'].includes(e.key)) choose(+e.key - 1);
    if (e.key.toLowerCase() === 'z') undo();
  });
  $('#undo').addEventListener('click', undo);
  $('#reset').addEventListener('click', init);
  $('#solve').addEventListener('click', runSolution);
  $('#count').addEventListener('change', e => { n = +e.target.value; init(); });
  $('#again').addEventListener('click', init);

  init();
  ping();
})();
