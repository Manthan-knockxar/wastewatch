/* =====================================================
   WASTEWATCH — Auth Module (localStorage-based)
   ===================================================== */

const AUTH = {
  USERS_KEY: 'wastewatch_users',
  SESSION_KEY: 'wastewatch_session',

  /* ── Helpers ───────────────────────────────────── */
  _getUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
  },
  _saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },
  async _hash(str) {
    const buf = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /* ── Cities ────────────────────────────────────── */
  CITIES: [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
  ],

  /* ── City Data (waste per capita kg/yr, recycling %, active programs) ── */
  CITY_DATA: {
    'Mumbai':     { population: 20.4, wastePerCapita: 3.8, recycling: 22, rank: 'A', programs: ['Beach Cleanup Drives', 'BMC Waste Segregation Mandate', 'Plastic Ban Enforcement'], orgs: ['Beach Warriors', 'Stree Mukti Sanghatana'] },
    'Delhi':      { population: 19.0, wastePerCapita: 4.2, recycling: 15, rank: 'B', programs: ['MCD Door-to-Door Collection', 'Waste-to-Energy at Okhla'], orgs: ['Chintan', 'Rag Pickers Association'] },
    'Bengaluru':  { population: 12.3, wastePerCapita: 3.1, recycling: 30, rank: 'S', programs: ['Dry Waste Collection Centers', 'BBMP Composting Push', 'Hasiru Dala Integration'], orgs: ['Hasiru Dala', 'Saahas Zero Waste'] },
    'Hyderabad':  { population: 10.1, wastePerCapita: 3.5, recycling: 18, rank: 'B', programs: ['GHMC Swachh Auto-Tippers', 'Bulk Generator Rules'], orgs: ['Centre for Sustainable Development'] },
    'Chennai':    { population: 10.9, wastePerCapita: 3.3, recycling: 20, rank: 'A', programs: ['Corporation Micro-Composting', 'Beach Restoration'], orgs: ['Environmentalist Foundation of India'] },
    'Kolkata':    { population: 14.8, wastePerCapita: 3.9, recycling: 12, rank: 'C', programs: ['KMC Landfill Remediation'], orgs: ['Calcutta Youth Front'] },
    'Pune':       { population: 7.4,  wastePerCapita: 2.9, recycling: 35, rank: 'S', programs: ['SWaCH Cooperative Model', 'PMC Biogas Plants'], orgs: ['SWaCH', 'Janwani'] },
    'Ahmedabad':  { population: 8.0,  wastePerCapita: 3.2, recycling: 17, rank: 'B', programs: ['AMC Source Segregation', 'AMRUT Solid Waste'], orgs: ['Paryavaran Mitra'] },
    'Jaipur':     { population: 3.9,  wastePerCapita: 3.6, recycling: 14, rank: 'C', programs: ['JMC Smart Bins Pilot'], orgs: ['I Am Jaipur'] },
    'Lucknow':    { population: 3.6,  wastePerCapita: 3.7, recycling: 11, rank: 'D', programs: ['LMC Waste Processing Plant'], orgs: ['Neer Foundation'] },
  },

  /* ── Register ──────────────────────────────────── */
  async register(username, password, city) {
    if (!username || !password || !city) return { ok: false, msg: 'All fields required.' };
    if (username.length < 3) return { ok: false, msg: 'Username must be 3+ characters.' };
    if (password.length < 4) return { ok: false, msg: 'Password must be 4+ characters.' };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, city })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.error };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data.user));
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: 'Server error' };
    }
  },

  /* ── Login ─────────────────────────────────────── */
  async login(username, password) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.error };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data.user));
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: 'Server error' };
    }
  },

  /* ── Session ───────────────────────────────────── */
  isLoggedIn() {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  },
  getCurrentUser() {
    const data = sessionStorage.getItem(this.SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  async logout() {
    await fetch('/api/logout', { method: 'POST' });
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  /* ── Waste Log ─────────────────────────────────── */
  async addWasteEntry(entry) {
    await fetch('/api/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: entry.date,
        orders: entry.orders,
        packaging_type: entry.packaging,
        waste_kg: entry.wasteGrams / 1000
      })
    });
  },
  async removeWasteEntry(entryId) {
    await fetch(`/api/waste/${entryId}`, { method: 'DELETE' });
  },
  async getWasteLog() {
    const res = await fetch('/api/waste');
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs.map(log => ({
      id: log.id,
      date: log.date,
      orders: log.orders,
      packaging: log.packaging_type,
      wasteGrams: log.waste_kg * 1000
    }));
  },

  /* ── Pledges ───────────────────────────────────── */
  PLEDGE_TYPES: [
    { id: 'no_cutlery',     name: 'No Cutlery',              icon: '🍴', desc: 'Opt out of plastic cutlery on every order.' },
    { id: 'reusable',       name: 'Reusable Containers',     icon: '♻️', desc: 'Request or use reusable packaging whenever possible.' },
    { id: 'limit_orders',   name: 'Max 2 Orders/Week',       icon: '📉', desc: 'Limit food delivery to maximum 2 orders per week.' },
    { id: 'segregate',      name: 'Segregate Waste',         icon: '🗂️', desc: 'Properly sort packaging waste into recyclable categories.' },
    { id: 'eco_restaurants', name: 'Support Eco Restaurants', icon: '🌱', desc: 'Prefer restaurants using biodegradable packaging.' },
    { id: 'spread',         name: 'Spread Awareness',        icon: '📢', desc: 'Share waste facts and this site with friends & family.' },
  ],

  async togglePledge(pledgeId, wasActive) {
    await fetch('/api/pledges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pledge_id: pledgeId,
        isActive: !wasActive,
        rank: 1,
        impact: 0
      })
    });
  },
  async getPledges() {
    const res = await fetch('/api/pledges');
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    data.pledges.forEach(p => {
      map[p.pledge_id] = { activatedAt: p.activated_at, rank: p.rank, impact: p.impact };
    });
    return map;
  },
  getPledgeRank(activatedAt) {
    if (!activatedAt) return { rank: 0, label: '—', next: 7 };
    const days = Math.floor((Date.now() - new Date(activatedAt).getTime()) / 86400000);
    if (days >= 90) return { rank: 5, label: 'LEGEND', next: null };
    if (days >= 60) return { rank: 4, label: 'MASTER', next: 90 - days };
    if (days >= 30) return { rank: 3, label: 'WARRIOR', next: 60 - days };
    if (days >= 14) return { rank: 2, label: 'ADEPT', next: 30 - days };
    if (days >= 7)  return { rank: 1, label: 'INITIATE', next: 14 - days };
    return { rank: 0, label: 'NOVICE', next: 7 - days };
  },
};
