(() => {
  const CATEGORIES = ['Technology', 'Cultural', 'Sports', 'Academic', 'Career', 'Social', 'Workshop'];
  const $ = (s, el = document) => el.querySelector(s);

  const state = {
    token: localStorage.getItem('cp_token'),
    user: JSON.parse(localStorage.getItem('cp_user') || 'null'),
    category: 'All',
    q: '',
    view: 'browse',
    authMode: 'login',
  };

  // ---------- helpers ----------
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch('/api' + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && state.token) signOut(true);
      throw new Error(data.error || 'Something went wrong.');
    }
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  }

  // ---------- rendering ----------
  function eventCard(ev, mode) {
    const full = ev.spotsLeft === 0;
    const spotClass = full ? 'full' : ev.spotsLeft <= 10 ? 'low' : '';
    const spotText = full ? 'Full' : `${ev.spotsLeft} of ${ev.capacity} spots left`;

    const foot = el('div', { class: 'event-foot' }, el('span', { class: 'spots ' + spotClass }, spotText));

    if (mode === 'organize') {
      foot.append(el('button', { class: 'btn btn-danger', onclick: () => removeEvent(ev) }, 'Remove'));
    } else if (ev.isRegistered) {
      foot.append(el('button', { class: 'btn btn-ghost', onclick: () => cancel(ev) }, 'Cancel registration'));
    } else {
      const b = el('button', { class: 'btn btn-primary', onclick: () => register(ev) }, full ? 'Full' : 'Register');
      if (full) b.disabled = true;
      foot.append(b);
    }

    return el('article', { class: 'card event' },
      el('span', { class: 'tag' }, ev.category),
      el('h3', {}, ev.title),
      el('div', { class: 'meta' },
        el('span', {}, '📅 ' + fmtDate(ev.date) + ' · ' + fmtTime(ev.time)),
        el('span', {}, '📍 ' + ev.venue),
        ...(ev.organizer && ev.organizer.name ? [el('span', {}, '👤 ' + ev.organizer.name)] : [])
      ),
      ...(ev.description ? [el('p', { class: 'desc' }, ev.description)] : []),
      foot
    );
  }

  function renderGrid(container, events, mode, emptyMsg) {
    container.replaceChildren();
    if (!events.length) {
      container.append(el('p', { class: 'empty' }, emptyMsg));
      return;
    }
    events.forEach((e) => container.append(eventCard(e, mode)));
  }

  function renderChips() {
    const wrap = $('#chips');
    wrap.replaceChildren();
    ['All', ...CATEGORIES].forEach((c) => {
      wrap.append(el('button', {
        class: 'chip' + (state.category === c ? ' active' : ''),
        onclick: () => { state.category = c; renderChips(); loadBrowse(); },
      }, c));
    });
  }

  // ---------- data loading ----------
  async function loadBrowse() {
    try {
      const params = new URLSearchParams();
      if (state.category !== 'All') params.set('category', state.category);
      if (state.q) params.set('q', state.q);
      const { events } = await api('/events?' + params);
      renderGrid($('#browseGrid'), events, 'browse', 'No events match your search.');
    } catch (e) { toast(e.message); }
  }

  async function loadMine() {
    try {
      const { events } = await api('/events/mine/registered');
      renderGrid($('#mineGrid'), events, 'browse', "You haven't registered for any events yet.");
    } catch (e) { toast(e.message); }
  }

  async function loadOrganized() {
    try {
      const { events } = await api('/events/mine/organized');
      renderGrid($('#organizeGrid'), events, 'organize', 'You have not published any events yet.');
    } catch (e) { toast(e.message); }
  }

  function refreshCurrent() {
    if (state.view === 'browse') loadBrowse();
    else if (state.view === 'mine') loadMine();
    else if (state.view === 'organize') loadOrganized();
  }

  // ---------- actions ----------
  async function register(ev) {
    if (!state.token) { openAuth('login'); toast('Please sign in to register.'); return; }
    try { await api(`/events/${ev.id}/register`, { method: 'POST' }); toast('You are registered!'); refreshCurrent(); }
    catch (e) { toast(e.message); refreshCurrent(); }
  }
  async function cancel(ev) {
    try { await api(`/events/${ev.id}/register`, { method: 'DELETE' }); toast('Registration cancelled.'); refreshCurrent(); }
    catch (e) { toast(e.message); }
  }
  async function removeEvent(ev) {
    if (!confirm(`Remove "${ev.title}"? Registered students will lose their spot.`)) return;
    try { await api(`/events/${ev.id}`, { method: 'DELETE' }); toast('Event removed.'); loadOrganized(); }
    catch (e) { toast(e.message); }
  }

  // ---------- views ----------
  function showView(name) {
    if ((name === 'mine' || name === 'organize') && !state.token) { openAuth('login'); return; }
    if (name === 'organize' && state.user?.role !== 'organizer') return;
    state.view = name;
    document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== 'view-' + name));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    refreshCurrent();
  }

  function renderAuthState() {
    const signedIn = !!state.token && !!state.user;
    $('#loginBtn').hidden = signedIn;
    $('#signupBtn').hidden = signedIn;
    $('#logoutBtn').hidden = !signedIn;
    $('#userLabel').hidden = !signedIn;
    $('#userLabel').textContent = signedIn ? `${state.user.name} (${state.user.role})` : '';
    $('#navMine').hidden = !signedIn;
    $('#navOrganize').hidden = !(signedIn && state.user.role === 'organizer');
  }

  function signOut(expired = false) {
    state.token = null; state.user = null;
    localStorage.removeItem('cp_token'); localStorage.removeItem('cp_user');
    renderAuthState();
    showView('browse');
    toast(expired ? 'Session expired. Please sign in again.' : 'Signed out.');
  }

  // ---------- auth modal ----------
  function openAuth(mode) {
    state.authMode = mode;
    const signup = mode === 'signup';
    $('#authTitle').textContent = signup ? 'Create your account' : 'Sign in';
    $('#authSubmit').textContent = signup ? 'Sign up' : 'Sign in';
    $('#nameRow').hidden = !signup;
    $('#authForm [name=name]').required = signup;
    $('#authForm [name=password]').autocomplete = signup ? 'new-password' : 'current-password';
    $('#authHint').hidden = signup;
    $('#authError').textContent = '';
    $('#authModal').showModal();
  }

  $('#loginBtn').onclick = () => openAuth('login');
  $('#signupBtn').onclick = () => openAuth('signup');
  $('#logoutBtn').onclick = () => signOut();
  $('#authCancel').onclick = () => $('#authModal').close();

  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = { email: f.get('email'), password: f.get('password') };
    if (state.authMode === 'signup') body.name = f.get('name');
    try {
      const data = await api(state.authMode === 'signup' ? '/auth/register' : '/auth/login', { method: 'POST', body });
      state.token = data.token; state.user = data.user;
      localStorage.setItem('cp_token', data.token);
      localStorage.setItem('cp_user', JSON.stringify(data.user));
      $('#authModal').close();
      e.target.reset();
      renderAuthState();
      toast(`Welcome, ${data.user.name}!`);
      refreshCurrent();
    } catch (err) {
      $('#authError').textContent = err.message;
    }
  });

  // ---------- organizer form ----------
  const sel = $('#categorySelect');
  CATEGORIES.forEach((c) => sel.append(el('option', { value: c }, c)));
  $('#eventForm [name=date]').min = new Date().toISOString().slice(0, 10);

  $('#eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await api('/events', { method: 'POST', body });
      e.target.reset();
      toast('Event published!');
      loadOrganized();
    } catch (err) { toast(err.message); }
  });

  // ---------- wiring ----------
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', (e) => { e.preventDefault(); showView(b.dataset.view); })
  );

  let searchTimer;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value.trim(); loadBrowse(); }, 250);
  });

  renderChips();
  renderAuthState();
  loadBrowse();
  if (state.token) api('/auth/me').catch(() => {});
})();
