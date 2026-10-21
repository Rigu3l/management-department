// src/lib/mock.js — demo data used when the PHP API is unreachable
// (frontend-only preview). Data is generated relative to today with a
// seeded RNG, and mirrors the shapes returned by backend/api/*.php.

import { DEPARTMENTS } from './data';
import { addDays, todayISO, periodRange, monthRange } from './format';

// --- seeded RNG -------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + rand() * (b - a);
const intBetween = (a, b) => Math.floor(between(a, b + 1));

const TODAY = todayISO();
const D = (off) => addDays(TODAY, off);

// --- reference data ---------------------------------------------------------
export const ROOMS = [
  ['101', 'Standard', 1, 'occupied', 2500], ['102', 'Standard', 1, 'occupied', 2500],
  ['103', 'Standard', 1, 'available', 2500], ['104', 'Standard', 1, 'cleaning', 2500],
  ['105', 'Standard', 1, 'occupied', 2500], ['106', 'Standard', 1, 'available', 2500],
  ['107', 'Standard', 1, 'reserved', 2500], ['108', 'Standard', 1, 'occupied', 2500],
  ['201', 'Deluxe', 2, 'occupied', 4200], ['202', 'Deluxe', 2, 'occupied', 4200],
  ['203', 'Deluxe', 2, 'available', 4200], ['204', 'Deluxe', 2, 'maintenance', 4200],
  ['205', 'Deluxe', 2, 'occupied', 4200], ['206', 'Deluxe', 2, 'occupied', 4200],
  ['207', 'Deluxe', 2, 'reserved', 4200], ['208', 'Deluxe', 2, 'cleaning', 4200],
  ['301', 'Family', 3, 'occupied', 5800], ['302', 'Family', 3, 'available', 5800],
  ['303', 'Family', 3, 'occupied', 5800], ['304', 'Family', 3, 'reserved', 5800],
  ['401', 'Suite', 4, 'occupied', 9500], ['402', 'Suite', 4, 'available', 9500],
  ['403', 'Suite', 4, 'occupied', 9500], ['404', 'Suite', 4, 'maintenance', 9500],
].map(([room_number, room_type, floor, status, rate], i) => ({ id: i + 1, room_number, room_type, floor, status, rate }));

export const EMPLOYEES = [
  [1, 'Maria Clara Santos', 'General Manager'], [1, 'Jose Miguel Reyes', 'Assistant Manager'],
  [2, 'Ana Patricia Lim', 'Front Office Manager'], [2, 'Carlo James Tan', 'Receptionist'],
  [2, 'Bea Nicole Cruz', 'Receptionist'], [2, 'Mark Anthony Uy', 'Concierge'],
  [3, 'Rosa Elena Diaz', 'Housekeeping Supervisor'], [3, 'Pedro Juan Ramos', 'Room Attendant'],
  [3, 'Liza Marie Ong', 'Room Attendant'], [3, 'Kevin Paul Sy', 'Room Attendant'],
  [3, 'Grace Ann Villanueva', 'Laundry Attendant'],
  [4, 'Chef Marco Antonio Lee', 'F&B Manager'], [4, 'Sarah Jane Go', 'Restaurant Supervisor'],
  [4, 'David Kim Chua', 'Bartender'],
  [5, 'Antonio Miguel Flores', 'Executive Chef'], [5, 'Rina Mae Torres', 'Sous Chef'],
  [5, 'Paolo Gabriel Ruiz', 'Line Cook'],
  [6, 'Karen Joy Mendoza', 'Finance Manager'], [6, 'Brian Christopher Aquino', 'Accountant'],
  [7, 'Roberto Luis Garcia', 'Maintenance Supervisor'], [7, 'Erwin John Bautista', 'Technician'],
  [7, 'Joel Patrick Santos', 'Technician'],
  [8, 'Fernando Jose Navarro', 'Security Head'], [8, 'Michael Angelo Dela Cruz', 'Security Officer'],
].map(([department_id, full_name, position], i) => ({
  id: i + 1, department_id, full_name, position, status: 'active',
  department: DEPARTMENTS.find((d) => d.id === department_id).name,
}));

const GUESTS = ['Juan Dela Cruz', 'Maria Clara Reyes', 'Jose Rizal Mercado', 'Ana Marie Santos',
  'Pedro Penduko Lim', 'Rosa Maria Diaz', 'Carlos Miguel Tan', 'Elena Grace Uy', 'Roberto Carlos Go',
  'Liza Marie Sy', 'John Paul Cruz', 'Mary Ann Flores', 'Joseph Marco Lee', 'Katherine Joy Ong',
  'Daniel James Chua', 'Sarah Michelle Aquino', 'Michael John Torres', 'Jessica Anne Ruiz',
  'Kevin Brian Mendoza', 'Angelica Rose Garcia', 'Christian Paul Navarro', 'Nicole Ashley Bautista',
  'Mark Joseph Villanueva', 'Patricia Mae Ramos', 'Andrew Luis Fernandez'];
const SOURCES = ['Walk-in', 'Phone', 'Online', 'Online', 'Travel agency'];

// --- generated operational data ----------------------------------------------
const stays = [];   // reservations
for (let start = -88; start <= 11; start++) {
  const n = pick([5, 6, 6, 7, 8]);
  for (let k = 0; k < n; k++) {
    const room = pick(ROOMS);
    const nights = pick([1, 2, 2, 3, 3, 4]);
    const end = start + nights;
    let status;
    if (end < 0) status = rand() < 0.88 ? 'checked_out' : rand() < 0.6 ? 'cancelled' : 'no_show';
    else if (start <= 0 && end >= 0) status = 'checked_in';
    else status = rand() < 0.92 ? 'confirmed' : 'cancelled';
    stays.push({
      guest_name: pick(GUESTS), room_id: room.id, check_in: D(start), check_out: D(end),
      status, guests: intBetween(1, 4), total_amount: Math.round(room.rate * nights * between(0.9, 1.12)),
      source: pick(SOURCES), created: D(start - intBetween(1, 10)),
    });
  }
}

const txns = [];    // financial transactions (daily aggregates)
for (let off = -90; off <= 0; off++) {
  const date = D(off);
  const busy = Math.abs(off) % 7 <= 1;
  const base = between(0.52, 0.70) + (busy ? 0.10 : 0);
  const roomRev = Math.round(24 * 3900 * base * between(0.92, 1.05));
  const fbRev = Math.round(roomRev * between(0.28, 0.42));
  txns.push({ department_id: 6, type: 'revenue', category: 'Rooms', amount: roomRev, date });
  txns.push({ department_id: 4, type: 'revenue', category: 'Food & Beverage', amount: fbRev, date });
  if (rand() < 0.3) txns.push({ department_id: 6, type: 'revenue', category: 'Events', amount: Math.round(between(8000, 45000)), date });
  if (rand() < 0.45) txns.push({ department_id: 6, type: 'revenue', category: 'Other', amount: Math.round(between(800, 4500)), date });
  txns.push({ department_id: 4, type: 'expense', category: 'Supplies', amount: Math.round(fbRev * between(0.35, 0.5)), date });
  txns.push({ department_id: 6, type: 'expense', category: 'Utilities', amount: Math.round(between(6500, 9800)), date });
  if (off % 15 === 0) txns.push({ department_id: 6, type: 'expense', category: 'Salaries', amount: Math.round(between(210000, 260000)), date });
  if (rand() < 0.35) txns.push({ department_id: 7, type: 'expense', category: 'Maintenance', amount: Math.round(between(1200, 15000)), date });
  if (rand() < 0.3) txns.push({ department_id: 3, type: 'expense', category: 'Supplies', amount: Math.round(between(900, 5200)), date });
  if (off % 30 === 0) txns.push({ department_id: 1, type: 'expense', category: 'Marketing', amount: Math.round(between(12000, 30000)), date });
}

const feedback = [];
const FB_COMMENTS = {
  5: ['Excellent stay, staff were very accommodating.', 'Rooms were spotless and the food was great.', 'Will definitely come back.'],
  4: ['Good experience overall.', 'Comfortable room, breakfast could improve.', 'Friendly staff, quick check-in.'],
  3: ['Average stay, aircon was a bit noisy.', 'Service was slow during dinner.'],
  2: ['Room was not ready at check-in time.'], 1: ['Very disappointed with the cleanliness.'],
};
for (let i = 0; i < 85; i++) {
  const r = rand();
  const rating = r < 0.46 ? 5 : r < 0.8 ? 4 : r < 0.92 ? 3 : r < 0.97 ? 2 : 1;
  feedback.push({
    guest_name: pick(GUESTS), rating, category: pick(['Overall', 'Cleanliness', 'Service', 'Food', 'Value']),
    comment: pick(FB_COMMENTS[rating]), date: D(-intBetween(0, 60)),
  });
}

const hkTasks = []; // housekeeping tasks, last 14 days
const HK_STAFF = [8, 9, 10];
for (let off = -13; off <= 0; off++) {
  const count = intBetween(6, 10);
  for (let k = 0; k < count; k++) {
    hkTasks.push({
      room_id: pick(ROOMS).id, assigned_to: pick(HK_STAFF),
      task_type: pick(['Room cleaning', 'Room cleaning', 'Deep cleaning', 'Turndown', 'Inspection', 'Laundry']),
      status: off < 0 ? 'completed' : pick(['completed', 'completed', 'in_progress', 'pending', 'pending']),
      date: D(off),
    });
  }
}
for (const room of ROOMS.slice(0, 6)) {
  hkTasks.push({ room_id: room.id, assigned_to: pick(HK_STAFF), task_type: 'Room cleaning', status: 'pending', date: TODAY });
}

const maintenance = [
  ['Aircon not cooling — Room 204', '204', 'high', 'completed', -20, 3.5],
  ['Leaking faucet — Room 304', '304', 'high', 'in_progress', -3, null],
  ['Broken door lock — Room 108', '108', 'urgent', 'completed', -6, 2],
  ['Flickering lights — corridor 2F', '—', 'medium', 'completed', -10, 5],
  ['Clogged drain — Room 201', '201', 'medium', 'completed', -14, 1.5],
  ['Elevator inspection (quarterly)', '—', 'medium', 'completed', -15, 26],
  ['Pool pump making noise', '—', 'medium', 'pending', -1, null],
  ['Water heater replacement — Room 403', '403', 'high', 'in_progress', -2, null],
  ['Cracked tile — Room 302 bathroom', '302', 'low', 'pending', 0, null],
  ['Fire alarm battery replacement', '—', 'high', 'pending', 0, null],
  ['TV no signal — Room 105', '105', 'low', 'completed', -4, 1],
  ['Window seal repair — Room 401', '401', 'medium', 'completed', -18, 4],
  ['Generator test run', '—', 'medium', 'completed', -7, 2.5],
  ['Paint touch-up — lobby wall', '—', 'low', 'in_progress', -1, null],
  ['Aircon filter cleaning — all floors', '—', 'medium', 'completed', -25, 30],
].map(([title, room, priority, status, off, hours], i) => ({
  id: i + 1, title, room, priority, status, date: D(off), hours,
  assigned_to: EMPLOYEES[pick([20, 21])].full_name, department_id: 7,
}));

const complaints = [
  ['Noisy air-conditioning unit in Room 205', 'complaint', 2, 'medium', 'resolved', -12],
  ['Delayed room service during dinner peak', 'complaint', 4, 'medium', 'resolved', -9],
  ['Guest slipped in lobby (wet floor)', 'incident', 8, 'high', 'resolved', -8],
  ['Water leak reported in Room 304 bathroom', 'complaint', 7, 'high', 'in_progress', -3],
  ['Wi-Fi outage on the 3rd floor', 'incident', 7, 'medium', 'in_progress', -2],
  ['Incorrect billing charge disputed', 'complaint', 6, 'medium', 'open', -1],
  ['Lost and found: umbrella left in restaurant', 'incident', 4, 'low', 'resolved', -6],
  ['Room 102 not cleaned before check-in', 'complaint', 3, 'high', 'resolved', -5],
  ['Elevator briefly out of service', 'incident', 7, 'high', 'resolved', -15],
  ['Breakfast buffet ran out of items', 'complaint', 4, 'low', 'resolved', -11],
  ['Suspicious person loitering at parking area', 'incident', 8, 'critical', 'resolved', -4],
  ['Guest requested late check-out, denied rudely', 'complaint', 2, 'medium', 'open', 0],
  ['Pool area lights malfunctioning', 'incident', 7, 'medium', 'open', 0],
  ['Double booking reported for Suite 401', 'complaint', 2, 'high', 'open', -1],
].map(([title, type, department_id, severity, status, off], i) => ({
  id: i + 1, title, type, department_id, severity, status, date: D(off),
  department: DEPARTMENTS.find((d) => d.id === department_id).name,
}));

const inventory = [
  ['Bath towels', 'Linens', 3, 340, 'pcs', 150, 120], ['Bed sheets (queen)', 'Linens', 3, 128, 'pcs', 100, 450],
  ['Pillow cases', 'Linens', 3, 210, 'pcs', 120, 85], ['Shampoo sachets', 'Toiletries', 3, 460, 'pcs', 300, 12.5],
  ['Soap bars', 'Toiletries', 3, 95, 'pcs', 200, 18], ['Toothbrush kits', 'Toiletries', 3, 380, 'pcs', 200, 25],
  ['Laundry detergent', 'Cleaning', 3, 26, 'liters', 30, 210], ['Disinfectant spray', 'Cleaning', 3, 44, 'bottles', 24, 160],
  ['Floor cleaner', 'Cleaning', 3, 18, 'liters', 20, 145], ['Rice (sack 25kg)', 'F&B Stock', 5, 12, 'sacks', 8, 1650],
  ['Coffee beans', 'F&B Stock', 4, 9, 'kg', 10, 780], ['Cooking oil', 'F&B Stock', 5, 30, 'liters', 15, 130],
  ['Eggs (tray)', 'F&B Stock', 5, 22, 'trays', 12, 260], ['Light bulbs (LED)', 'Maintenance', 7, 58, 'pcs', 25, 95],
  ['Aircon filters', 'Maintenance', 7, 14, 'pcs', 12, 320], ['Printer paper (ream)', 'Office', 1, 7, 'reams', 10, 240],
  ['Ballpoint pens (box)', 'Office', 1, 15, 'boxes', 6, 180], ['Guest slippers', 'Toiletries', 3, 265, 'pairs', 150, 35],
  ['Bottled water (case)', 'F&B Stock', 4, 40, 'cases', 20, 210], ['Trash bags (roll)', 'Cleaning', 3, 33, 'rolls', 15, 75],
].map(([name, category, department_id, quantity, unit, reorder_level, unit_cost], i) => ({
  id: i + 1, name, category, department_id, quantity, unit, reorder_level, unit_cost,
  department: DEPARTMENTS.find((d) => d.id === department_id).name,
  stock_value: quantity * unit_cost,
  status: quantity === 0 ? 'Out of stock' : quantity <= reorder_level ? 'Low stock' : 'OK',
}));

// --- mutable management state (demo CRUD) ------------------------------------
let nextId = 1000;
export const mockBudgets = [];
for (const monthOff of [-1, 0]) {
  const base = new Date(`${TODAY.slice(0, 7)}-01T00:00:00`);
  base.setMonth(base.getMonth() + monthOff);
  const month = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-01`;
  for (const [dept, cat, amt] of [
    [6, 'Salaries', 480000], [6, 'Utilities', 260000], [6, 'Marketing', 60000],
    [4, 'Supplies', 150000], [3, 'Supplies', 45000], [7, 'Maintenance', 80000],
    [5, 'Supplies', 120000], [2, 'Supplies', 25000], [8, 'Supplies', 15000], [1, 'Other', 40000],
  ]) {
    mockBudgets.push({
      id: nextId++, department_id: dept, category: cat, period_month: month,
      amount: Math.round(amt * between(0.95, 1.05)), notes: `Monthly ${cat.toLowerCase()} budget`,
      department: DEPARTMENTS.find((d) => d.id === dept).name,
    });
  }
}

export const mockTargets = [
  ['Occupancy rate', null, 75, '%'], ['Guest satisfaction', null, 4.5, 'rating'],
  ['Average Daily Rate (ADR)', null, 3900, 'PHP'], ['Revenue per Available Room (RevPAR)', null, 2900, 'PHP'],
  ['Housekeeping completion rate', 3, 95, '%'], ['Maintenance response time', 7, 4, 'hours'],
  ['Complaint resolution rate', null, 90, '%'], ['Employee attendance', null, 97, '%'],
].map(([name, department_id, target_value, unit]) => ({
  id: nextId++, name, department_id, target_value, unit, period: 'monthly',
  department: department_id ? DEPARTMENTS.find((d) => d.id === department_id).name : null,
}));

export const mockDecisions = [
  ['Approve weekend promo rate for Deluxe rooms', 'Offer 15% off Deluxe rooms on weekends to lift occupancy.', 'Maria Clara Santos', 'Ana Patricia Lim', 2, 5, 'in_progress'],
  ['Hire two additional room attendants', 'Housekeeping is short-staffed on weekends; approve two hires.', 'Maria Clara Santos', 'Rosa Elena Diaz', 3, 12, 'pending'],
  ['Replace lobby air-conditioning unit', 'Unit is beyond repair; get three supplier quotations.', 'Jose Miguel Reyes', 'Roberto Luis Garcia', 7, 20, 'pending'],
  ['Switch laundry service to in-house', 'Cost comparison shows in-house laundry saves about 18% monthly.', 'Karen Joy Mendoza', 'Rosa Elena Diaz', 3, -4, 'in_progress'],
  ['Renew corporate rate agreement with ABC Corp', 'Corporate bookings are 12% of room revenue; renew at the same rate.', 'Maria Clara Santos', 'Karen Joy Mendoza', 6, 3, 'pending'],
  ['Upgrade Wi-Fi access points on 3rd floor', 'Repeated guest complaints about weak signal on the 3rd floor.', 'Jose Miguel Reyes', 'Roberto Luis Garcia', 7, -11, 'completed'],
  ['Introduce guest feedback QR cards in rooms', 'Collect more feedback at checkout using QR cards per room.', 'Maria Clara Santos', 'Ana Patricia Lim', 2, -2, 'completed'],
  ['Reduce breakfast buffet food waste', 'Track daily leftovers and adjust preparation quantities.', 'Chef Marco Antonio Lee', 'Antonio Miguel Flores', 5, 8, 'in_progress'],
  ['Schedule quarterly fire safety drill', 'Coordinate with Security and local fire station.', 'Fernando Jose Navarro', 'Fernando Jose Navarro', 8, 15, 'pending'],
  ['Approve Q4 marketing campaign budget', 'Social media and travel-site ads for the holiday season.', 'Maria Clara Santos', 'Karen Joy Mendoza', 6, 25, 'pending'],
].map(([title, description, decided_by, assigned_to, department_id, dl, status], i) => ({
  id: nextId++, title, description, decided_by, assigned_to, department_id,
  department: DEPARTMENTS.find((d) => d.id === department_id).name,
  deadline: D(dl), status, created_at: `${D(-intBetween(3, 25))} 10:00:00`,
  completed_at: status === 'completed' ? `${D(-2)} 15:00:00` : null,
  overdue: status !== 'completed' && D(dl) < TODAY,
}));

export const mockAlerts = [
  ['Occupancy above 85% this weekend', 'Forecast occupancy for the coming weekend is above 85%. Consider staffing up housekeeping.', 'warning', 'Occupancy', 'unread', 0],
  ['Low stock: Soap bars', 'Soap bars are below the reorder level (95 left, reorder at 200).', 'warning', 'Inventory', 'unread', 0],
  ['Low stock: Laundry detergent', 'Laundry detergent is below the reorder level (26 liters left, reorder at 30).', 'warning', 'Inventory', 'read', -1],
  ['Urgent maintenance still open', 'A maintenance request with urgent/high priority has been open for more than 48 hours.', 'critical', 'Maintenance', 'unread', 0],
  ['Guest satisfaction dipped this week', 'Average rating this week is below the 4.5 target.', 'warning', 'Guest feedback', 'read', -2],
  ['Expenses trending above budget', "Utilities spending is on pace to exceed this month's budget.", 'info', 'Finance', 'unread', -1],
  ['New complaint requires attention', 'An unresolved high-severity complaint was recorded at the front desk.', 'warning', 'Guest feedback', 'unread', 0],
  ["Housekeeping tasks pending", "Several of today's room cleaning tasks are still pending.", 'info', 'Housekeeping', 'read', 0],
].map(([title, message, severity, source, status, off], i) => ({
  id: nextId++, title, message, severity, source, status,
  created_at: `${D(off)} 09:00:00`, resolved_at: null,
}));

// --- metric helpers (mirror bootstrap.php) ------------------------------------
const inRange = (date, from, to) => date >= from && date <= to;
const dayList = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};
const occupiedOn = (day) => stays.filter((s) =>
  ['confirmed', 'checked_in', 'checked_out'].includes(s.status) && s.check_in <= day && s.check_out > day).length;
const txnSum = (type, from, to, dept = null, cat = null) => txns
  .filter((t) => t.type === type && inRange(t.date, from, to)
    && (dept == null || t.department_id === dept) && (cat == null || t.category === cat))
  .reduce((a, t) => a + t.amount, 0);

export function mockMetrics(from, to) {
  const days = dayList(from, to);
  const sold = days.reduce((a, d) => a + occupiedOn(d), 0);
  const capacity = ROOMS.length * days.length;
  const roomRevenue = txnSum('revenue', from, to, null, 'Rooms');
  const occupancy = capacity ? Math.round((sold / capacity) * 1000) / 10 : 0;
  const adr = sold ? Math.round((roomRevenue / sold) * 100) / 100 : 0;
  return {
    total_rooms: ROOMS.length, days: days.length, rooms_sold: sold, capacity_nights: capacity,
    occupancy_rate: occupancy, room_revenue: roomRevenue, adr,
    revpar: capacity ? Math.round((roomRevenue / capacity) * 100) / 100 : 0,
  };
}

export function mockKpiActual(name, from, to) {
  const n = name.toLowerCase();
  if (n.includes('occupancy')) return mockMetrics(from, to).occupancy_rate;
  if (n.includes('satisfaction')) {
    const f = feedback.filter((x) => inRange(x.date, from, to));
    return f.length ? Math.round((f.reduce((a, x) => a + x.rating, 0) / f.length) * 100) / 100 : null;
  }
  if (n.includes('average daily rate') || n.includes('(adr)')) return mockMetrics(from, to).adr;
  if (n.includes('revpar') || n.includes('revenue per available')) return mockMetrics(from, to).revpar;
  if (n.includes('housekeeping')) {
    const t = hkTasks.filter((x) => inRange(x.date, from, to));
    return t.length ? Math.round((t.filter((x) => x.status === 'completed').length / t.length) * 1000) / 10 : null;
  }
  if (n.includes('maintenance') && n.includes('response')) {
    const done = maintenance.filter((x) => x.status === 'completed' && x.hours != null && inRange(x.date, from, to));
    return done.length ? Math.round((done.reduce((a, x) => a + x.hours, 0) / done.length) * 10) / 10 : null;
  }
  if (n.includes('complaint')) {
    const c = complaints.filter((x) => inRange(x.date, from, to));
    return c.length ? Math.round((c.filter((x) => x.status === 'resolved').length / c.length) * 1000) / 10 : null;
  }
  return null;
}

const withAttainment = (k, from, to) => {
  const actual = mockKpiActual(k.name, from, to);
  const lowerBetter = k.name.toLowerCase().includes('response time');
  const attainment = actual != null && k.target_value > 0
    ? Math.round(Math.min(100, lowerBetter ? (k.target_value / Math.max(actual, 0.01)) * 100 : (actual / k.target_value) * 100) * 10) / 10
    : null;
  return { ...k, target: k.target_value, actual, attainment };
};

// --- dashboard ---------------------------------------------------------------
export function mockDashboard(params = {}) {
  const { from, to, period } = periodRange(params.period || 'weekly', params);
  const m = mockMetrics(from, to);
  const revenue = txnSum('revenue', from, to);
  const expenses = txnSum('expense', from, to);
  const created = stays.filter((s) => inRange(s.created, from, to));
  const fb = feedback.filter((x) => inRange(x.date, from, to));
  const trend = dayList(from, to).map((date) => ({
    date,
    revenue: txnSum('revenue', date, date),
    expenses: txnSum('expense', date, date),
    occupancy: Math.round((occupiedOn(date) / ROOMS.length) * 1000) / 10,
  }));
  const departments = DEPARTMENTS.map((d) => {
    const rev = txnSum('revenue', from, to, d.id);
    const exp = txnSum('expense', from, to, d.id);
    return { id: d.id, name: d.name, revenue: rev, expenses: exp, net: rev - exp };
  });
  return {
    success: true,
    period: { from, to, preset: period },
    cards: {
      occupancy_rate: m.occupancy_rate, rooms_sold: m.rooms_sold, total_rooms: m.total_rooms,
      revenue, expenses, net: revenue - expenses,
      reservations: created.length,
      arrivals: stays.filter((s) => inRange(s.check_in, from, to)).length,
      departures: stays.filter((s) => s.status === 'checked_out' && inRange(s.check_out, from, to)).length,
      adr: m.adr, revpar: m.revpar,
      satisfaction: fb.length ? Math.round((fb.reduce((a, x) => a + x.rating, 0) / fb.length) * 100) / 100 : null,
      satisfaction_responses: fb.length,
      open_tasks: maintenance.filter((x) => ['pending', 'in_progress'].includes(x.status)).length
        + hkTasks.filter((x) => x.date <= TODAY && ['pending', 'in_progress'].includes(x.status)).length,
      unread_alerts: mockAlerts.filter((a) => a.status === 'unread').length,
    },
    trend,
    departments,
    kpis: mockTargets.map((k) => withAttainment(k, from, to)),
    outstanding: {
      maintenance_open: maintenance.filter((x) => ['pending', 'in_progress'].includes(x.status)).length,
      housekeeping_pending: hkTasks.filter((x) => x.date <= TODAY && ['pending', 'in_progress'].includes(x.status)).length,
      complaints_open: complaints.filter((x) => x.status !== 'resolved').length,
      decisions_overdue: mockDecisions.filter((x) => x.overdue).length,
      low_stock: inventory.filter((x) => x.status !== 'OK').length,
    },
    recent_decisions: [...mockDecisions].slice(0, 5).map(({ id, title, assigned_to, deadline, status }) =>
      ({ id, title, assigned_to, deadline, status })),
    latest_alerts: [...mockAlerts].slice(0, 5).map(({ id, title, severity, source, status, created_at }) =>
      ({ id, title, severity, source, status, created_at })),
  };
}

// --- reports -------------------------------------------------------------------
export function mockReport(params = {}) {
  const type = params.type || 'occupancy';
  const { from, to, period } = periodRange(params.period || 'weekly', params);
  const dept = params.department ? Number(params.department) : null;
  const m = mockMetrics(from, to);
  const days = dayList(from, to);
  const out = {
    success: true, type, period: { from, to, preset: period }, department: dept,
    columns: [], rows: [], summary: [], chart: null,
  };
  const roomRevOn = (day) => txnSum('revenue', day, day, null, 'Rooms');

  switch (type) {
    case 'occupancy': {
      out.title = 'Hotel Occupancy Monitoring';
      out.columns = [
        { key: 'date', label: 'Date' }, { key: 'occupied', label: 'Occupied rooms' },
        { key: 'available', label: 'Available rooms' }, { key: 'total_rooms', label: 'Total rooms' },
        { key: 'rate', label: 'Occupancy rate', format: 'pct' }];
      out.rows = days.map((date) => {
        const occupied = occupiedOn(date);
        return { date, occupied, available: ROOMS.length - occupied, total_rooms: ROOMS.length,
                 rate: Math.round((occupied / ROOMS.length) * 1000) / 10 };
      });
      out.summary = [
        { label: 'Average occupancy', value: m.occupancy_rate, format: 'pct' },
        { label: 'Room-nights sold', value: m.rooms_sold },
        { label: 'Capacity (room-nights)', value: m.capacity_nights }];
      out.chart = { kind: 'line', labels: days, series: [{ label: 'Occupancy %', data: out.rows.map((r) => r.rate) }] };
      break;
    }
    case 'rooms': {
      const counts = {};
      for (const r of ROOMS) counts[r.status] = (counts[r.status] || 0) + 1;
      out.title = 'Room Availability Report';
      out.columns = [
        { key: 'room_number', label: 'Room' }, { key: 'room_type', label: 'Type' },
        { key: 'floor', label: 'Floor' }, { key: 'status', label: 'Status' },
        { key: 'rate', label: 'Nightly rate', format: 'money' }];
      out.rows = ROOMS;
      out.summary = [
        { label: 'Available now', value: counts.available || 0 },
        { label: 'Occupied now', value: counts.occupied || 0 },
        { label: 'Reserved', value: counts.reserved || 0 },
        { label: 'Cleaning / maintenance', value: (counts.cleaning || 0) + (counts.maintenance || 0) }];
      out.chart = { kind: 'doughnut', labels: Object.keys(counts), series: [{ label: 'Rooms', data: Object.values(counts) }] };
      break;
    }
    case 'revenue':
    case 'expenses': {
      const kind = type === 'revenue' ? 'revenue' : 'expense';
      const groups = new Map();
      for (const t of txns.filter((x) => x.type === kind && inRange(x.date, from, to)
        && (dept == null || x.department_id === dept))) {
        const key = `${t.category}|${t.department_id}`;
        const g = groups.get(key) || {
          category: t.category,
          department: DEPARTMENTS.find((d) => d.id === t.department_id)?.name || 'Hotel-wide',
          entries: 0, total: 0,
        };
        g.entries++; g.total += t.amount;
        groups.set(key, g);
      }
      out.rows = [...groups.values()].sort((a, b) => b.total - a.total);
      const total = out.rows.reduce((a, r) => a + r.total, 0);
      out.title = kind === 'revenue' ? 'Revenue Performance Monitoring' : 'Expense Monitoring';
      out.columns = [
        { key: 'category', label: 'Category' }, { key: 'department', label: 'Department' },
        { key: 'entries', label: 'Entries' }, { key: 'total', label: 'Total', format: 'money' }];
      out.summary = [
        { label: kind === 'revenue' ? 'Total revenue' : 'Total expenses', value: total, format: 'money' },
        { label: 'Daily average', value: Math.round((total / Math.max(1, days.length)) * 100) / 100, format: 'money' },
        { label: 'Categories', value: out.rows.length }];
      out.chart = { kind: 'bar', labels: out.rows.map((r) => r.category), series: [{ label: 'Total', data: out.rows.map((r) => r.total) }] };
      break;
    }
    case 'reservations': {
      out.title = 'Reservation Analytics';
      out.columns = [
        { key: 'date', label: 'Date' }, { key: 'created', label: 'New reservations' },
        { key: 'cancelled', label: 'Cancelled' }, { key: 'no_show', label: 'No-show' },
        { key: 'booking_value', label: 'Booking value', format: 'money' }];
      out.rows = days.map((date) => {
        const c = stays.filter((s) => s.created === date);
        return {
          date, created: c.length,
          cancelled: c.filter((s) => s.status === 'cancelled').length,
          no_show: c.filter((s) => s.status === 'no_show').length,
          booking_value: c.reduce((a, s) => a + s.total_amount, 0),
        };
      });
      const tot = out.rows.reduce((a, r) => a + r.created, 0);
      const canc = out.rows.reduce((a, r) => a + r.cancelled, 0);
      out.summary = [
        { label: 'New reservations', value: tot },
        { label: 'Cancellation rate', value: tot ? Math.round((canc / tot) * 1000) / 10 : 0, format: 'pct' },
        { label: 'Total booking value', value: out.rows.reduce((a, r) => a + r.booking_value, 0), format: 'money' }];
      out.chart = { kind: 'bar', labels: days, series: [{ label: 'New reservations', data: out.rows.map((r) => r.created) }] };
      const bySource = {};
      for (const s of stays.filter((x) => inRange(x.created, from, to))) bySource[s.source] = (bySource[s.source] || 0) + 1;
      out.extra = { by_source: Object.entries(bySource).map(([source, c]) => ({ source, c })) };
      break;
    }
    case 'departments': {
      out.title = 'Department Performance Reports';
      out.columns = [
        { key: 'department', label: 'Department' }, { key: 'revenue', label: 'Revenue', format: 'money' },
        { key: 'expenses', label: 'Expenses', format: 'money' }, { key: 'net', label: 'Net', format: 'money' },
        { key: 'employees', label: 'Active staff' }, { key: 'open_items', label: 'Open items' }];
      out.rows = DEPARTMENTS.map((d) => {
        const revenue = txnSum('revenue', from, to, d.id);
        const expenses = txnSum('expense', from, to, d.id);
        return {
          department: d.name, revenue, expenses, net: revenue - expenses,
          employees: EMPLOYEES.filter((e) => e.department_id === d.id).length,
          open_items: maintenance.filter((x) => x.department_id === d.id && ['pending', 'in_progress'].includes(x.status)).length
            + complaints.filter((x) => x.department_id === d.id && x.status !== 'resolved').length,
        };
      });
      out.summary = [
        { label: 'Total revenue', value: out.rows.reduce((a, r) => a + r.revenue, 0), format: 'money' },
        { label: 'Total expenses', value: out.rows.reduce((a, r) => a + r.expenses, 0), format: 'money' },
        { label: 'Net', value: out.rows.reduce((a, r) => a + r.net, 0), format: 'money' }];
      out.chart = { kind: 'bar', labels: out.rows.map((r) => r.department),
        series: [{ label: 'Revenue', data: out.rows.map((r) => r.revenue) }, { label: 'Expenses', data: out.rows.map((r) => r.expenses) }] };
      break;
    }
    case 'employees': {
      out.title = 'Employee Performance Monitoring';
      out.columns = [
        { key: 'name', label: 'Employee' }, { key: 'department', label: 'Department' },
        { key: 'position', label: 'Position' }, { key: 'status', label: 'Status' },
        { key: 'tasks_completed', label: 'Tasks completed (period)' }];
      out.rows = EMPLOYEES
        .filter((e) => dept == null || e.department_id === dept)
        .map((e) => ({
          name: e.full_name, department: e.department, position: e.position, status: e.status,
          tasks_completed:
            hkTasks.filter((t) => t.assigned_to === e.id && t.status === 'completed' && inRange(t.date, from, to)).length
            + maintenance.filter((x) => x.assigned_to === e.full_name && x.status === 'completed' && inRange(x.date, from, to)).length,
        }));
      out.summary = [
        { label: 'Employees', value: out.rows.length },
        { label: 'Active', value: out.rows.filter((r) => r.status === 'active').length },
        { label: 'Tasks completed', value: out.rows.reduce((a, r) => a + r.tasks_completed, 0) }];
      break;
    }
    case 'kpis': {
      out.title = 'Key Performance Indicators (KPIs)';
      out.columns = [
        { key: 'name', label: 'KPI' }, { key: 'department', label: 'Department' },
        { key: 'actual', label: 'Actual' }, { key: 'target', label: 'Target' }, { key: 'unit', label: 'Unit' },
        { key: 'attainment', label: 'Attainment', format: 'pct' }];
      out.rows = mockTargets.map((k) => ({ ...withAttainment(k, from, to), department: k.department || 'Hotel-wide' }));
      const att = out.rows.map((r) => r.attainment).filter((v) => v != null);
      out.summary = [
        { label: 'KPIs tracked', value: out.rows.length },
        { label: 'Average attainment', value: att.length ? Math.round((att.reduce((a, v) => a + v, 0) / att.length) * 10) / 10 : 0, format: 'pct' }];
      out.chart = { kind: 'bar', labels: out.rows.map((r) => r.name),
        series: [{ label: 'Attainment %', data: out.rows.map((r) => r.attainment ?? 0) }] };
      break;
    }
    case 'adr':
    case 'revpar': {
      const isAdr = type === 'adr';
      out.title = isAdr ? 'Average Daily Rate (ADR) Report' : 'Revenue per Available Room (RevPAR) Report';
      out.rows = days.map((date) => {
        const sold = occupiedOn(date);
        const rev = roomRevOn(date);
        const adr = sold ? Math.round((rev / sold) * 100) / 100 : 0;
        const occ = Math.round((sold / ROOMS.length) * 1000) / 10;
        return { date, rooms_sold: sold, room_revenue: rev, adr, occupancy: occ, revpar: Math.round(adr * occ) / 100 };
      });
      out.columns = isAdr
        ? [{ key: 'date', label: 'Date' }, { key: 'rooms_sold', label: 'Rooms sold' },
           { key: 'room_revenue', label: 'Room revenue', format: 'money' }, { key: 'adr', label: 'ADR', format: 'money' }]
        : [{ key: 'date', label: 'Date' }, { key: 'occupancy', label: 'Occupancy', format: 'pct' },
           { key: 'adr', label: 'ADR', format: 'money' }, { key: 'revpar', label: 'RevPAR', format: 'money' }];
      out.summary = [
        { label: 'Average ADR', value: m.adr, format: 'money' },
        { label: 'Average RevPAR', value: m.revpar, format: 'money' },
        { label: 'Occupancy', value: m.occupancy_rate, format: 'pct' }];
      const key = isAdr ? 'adr' : 'revpar';
      out.chart = { kind: 'line', labels: days, series: [{ label: key.toUpperCase(), data: out.rows.map((r) => r[key]) }] };
      break;
    }
    case 'satisfaction': {
      const f = feedback.filter((x) => inRange(x.date, from, to));
      const cats = {};
      for (const x of f) {
        const c = cats[x.category] || { category: x.category, responses: 0, sum: 0, sat: 0 };
        c.responses++; c.sum += x.rating; if (x.rating >= 4) c.sat++;
        cats[x.category] = c;
      }
      out.title = 'Guest Satisfaction Analytics';
      out.columns = [
        { key: 'category', label: 'Category' }, { key: 'responses', label: 'Responses' },
        { key: 'avg_rating', label: 'Average rating', format: 'rating' },
        { key: 'satisfied_pct', label: 'Satisfied (4-5 stars)', format: 'pct' }];
      out.rows = Object.values(cats).map((c) => ({
        category: c.category, responses: c.responses,
        avg_rating: Math.round((c.sum / c.responses) * 100) / 100,
        satisfied_pct: Math.round((c.sat / c.responses) * 1000) / 10,
      })).sort((a, b) => b.responses - a.responses);
      out.summary = [
        { label: 'Overall average', value: f.length ? Math.round((f.reduce((a, x) => a + x.rating, 0) / f.length) * 100) / 100 : 0, format: 'rating' },
        { label: 'Responses', value: f.length }];
      out.chart = { kind: 'bar', labels: out.rows.map((r) => r.category), series: [{ label: 'Average rating', data: out.rows.map((r) => r.avg_rating) }] };
      out.extra = { comments: [...f].slice(-8).reverse().map((x) => ({
        guest_name: x.guest_name, rating: x.rating, category: x.category, comment: x.comment, day: x.date })) };
      break;
    }
    case 'complaints': {
      out.title = 'Complaint and Incident Summaries';
      out.columns = [
        { key: 'date', label: 'Date' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' },
        { key: 'department', label: 'Department' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }];
      out.rows = complaints
        .filter((c) => inRange(c.date, from, to) && (dept == null || c.department_id === dept))
        .map((c) => ({ date: c.date, title: c.title, type: c.type, department: c.department, severity: c.severity, status: c.status }));
      const resolved = out.rows.filter((r) => r.status === 'resolved').length;
      const counts = {};
      for (const r of out.rows) counts[r.status] = (counts[r.status] || 0) + 1;
      out.summary = [
        { label: 'Total recorded', value: out.rows.length },
        { label: 'Resolved', value: resolved },
        { label: 'Resolution rate', value: out.rows.length ? Math.round((resolved / out.rows.length) * 1000) / 10 : 0, format: 'pct' },
        { label: 'Still open', value: out.rows.length - resolved }];
      out.chart = { kind: 'doughnut', labels: Object.keys(counts), series: [{ label: 'Records', data: Object.values(counts) }] };
      break;
    }
    case 'inventory': {
      out.title = 'Inventory and Stock Reports';
      out.columns = [
        { key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'department', label: 'Department' },
        { key: 'quantity', label: 'Quantity' }, { key: 'unit', label: 'Unit' }, { key: 'reorder_level', label: 'Reorder level' },
        { key: 'stock_value', label: 'Stock value', format: 'money' }, { key: 'status', label: 'Status' }];
      out.rows = inventory.filter((i) => dept == null || i.department_id === dept);
      out.summary = [
        { label: 'Items tracked', value: out.rows.length },
        { label: 'Low / out of stock', value: out.rows.filter((r) => r.status !== 'OK').length },
        { label: 'Total stock value', value: out.rows.reduce((a, r) => a + r.stock_value, 0), format: 'money' }];
      break;
    }
    case 'maintenance': {
      out.title = 'Maintenance Performance Reports';
      out.columns = [
        { key: 'date', label: 'Reported' }, { key: 'title', label: 'Request' }, { key: 'room', label: 'Room' },
        { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
        { key: 'assigned_to', label: 'Assigned to' }, { key: 'hours', label: 'Completion (hrs)' }];
      out.rows = maintenance.filter((x) => inRange(x.date, from, to)).map((x) => ({ ...x }));
      const done = out.rows.filter((r) => r.status === 'completed');
      const hrs = done.map((r) => r.hours).filter((v) => v != null);
      out.summary = [
        { label: 'Requests', value: out.rows.length },
        { label: 'Completed', value: done.length },
        { label: 'Completion rate', value: out.rows.length ? Math.round((done.length / out.rows.length) * 1000) / 10 : 0, format: 'pct' },
        { label: 'Avg completion time', value: hrs.length ? Math.round((hrs.reduce((a, v) => a + v, 0) / hrs.length) * 10) / 10 : 0 }];
      break;
    }
    case 'housekeeping': {
      out.title = 'Housekeeping Performance Reports';
      out.columns = [
        { key: 'date', label: 'Date' }, { key: 'scheduled', label: 'Tasks scheduled' },
        { key: 'completed', label: 'Completed' }, { key: 'pending', label: 'Pending' },
        { key: 'rate', label: 'Completion rate', format: 'pct' }];
      out.rows = days.map((date) => {
        const t = hkTasks.filter((x) => x.date === date);
        const completed = t.filter((x) => x.status === 'completed').length;
        return {
          date, scheduled: t.length, completed,
          pending: t.filter((x) => ['pending', 'in_progress'].includes(x.status)).length,
          rate: t.length ? Math.round((completed / t.length) * 1000) / 10 : 0,
        };
      });
      const totSch = out.rows.reduce((a, r) => a + r.scheduled, 0);
      const totComp = out.rows.reduce((a, r) => a + r.completed, 0);
      out.summary = [
        { label: 'Tasks scheduled', value: totSch },
        { label: 'Completed', value: totComp },
        { label: 'Completion rate', value: totSch ? Math.round((totComp / totSch) * 1000) / 10 : 0, format: 'pct' }];
      out.chart = { kind: 'bar', labels: days, series: [
        { label: 'Scheduled', data: out.rows.map((r) => r.scheduled) },
        { label: 'Completed', data: out.rows.map((r) => r.completed) }] };
      break;
    }
    case 'fnb': {
      out.title = 'Food and Beverage Sales Reports';
      out.columns = [
        { key: 'date', label: 'Date' }, { key: 'revenue', label: 'F&B revenue', format: 'money' },
        { key: 'expenses', label: 'F&B expenses', format: 'money' }, { key: 'net', label: 'Net', format: 'money' }];
      out.rows = days.map((date) => {
        const revenue = txnSum('revenue', date, date, 4);
        const expenses = txnSum('expense', date, date, 4);
        return { date, revenue, expenses, net: revenue - expenses };
      });
      const totRev = out.rows.reduce((a, r) => a + r.revenue, 0);
      const totExp = out.rows.reduce((a, r) => a + r.expenses, 0);
      out.summary = [
        { label: 'Total F&B revenue', value: totRev, format: 'money' },
        { label: 'Total F&B expenses', value: totExp, format: 'money' },
        { label: 'Net margin', value: totRev ? Math.round(((totRev - totExp) / totRev) * 1000) / 10 : 0, format: 'pct' }];
      out.chart = { kind: 'line', labels: days, series: [{ label: 'F&B revenue', data: out.rows.map((r) => r.revenue) }] };
      break;
    }
    case 'financial': {
      const cats = {};
      for (const t of txns.filter((x) => inRange(x.date, from, to))) {
        const c = cats[t.category] || { category: t.category, revenue: 0, expenses: 0 };
        if (t.type === 'revenue') c.revenue += t.amount; else c.expenses += t.amount;
        cats[t.category] = c;
      }
      out.title = 'Financial Summaries';
      out.columns = [
        { key: 'category', label: 'Category' }, { key: 'revenue', label: 'Revenue', format: 'money' },
        { key: 'expenses', label: 'Expenses', format: 'money' }, { key: 'net', label: 'Net', format: 'money' }];
      out.rows = Object.values(cats).map((c) => ({ ...c, net: c.revenue - c.expenses }))
        .sort((a, b) => b.revenue - a.revenue);
      const totRev = out.rows.reduce((a, r) => a + r.revenue, 0);
      const totExp = out.rows.reduce((a, r) => a + r.expenses, 0);
      out.summary = [
        { label: 'Total revenue', value: totRev, format: 'money' },
        { label: 'Total expenses', value: totExp, format: 'money' },
        { label: 'Net income', value: totRev - totExp, format: 'money' },
        { label: 'Profit margin', value: totRev ? Math.round(((totRev - totExp) / totRev) * 1000) / 10 : 0, format: 'pct' }];
      out.chart = { kind: 'bar', labels: out.rows.map((r) => r.category), series: [
        { label: 'Revenue', data: out.rows.map((r) => r.revenue) },
        { label: 'Expenses', data: out.rows.map((r) => r.expenses) }] };
      break;
    }
    case 'historical': {
      const daysCount = days.length;
      const pto = addDays(from, -1);
      const pfrom = addDays(pto, -(daysCount - 1));
      const pm = mockMetrics(pfrom, pto);
      const fbAvg = (f, t) => {
        const x = feedback.filter((v) => inRange(v.date, f, t));
        return x.length ? Math.round((x.reduce((a, v) => a + v.rating, 0) / x.length) * 100) / 100 : 0;
      };
      const metrics = [
        ['Occupancy rate', m.occupancy_rate, pm.occupancy_rate, 'pct'],
        ['Revenue', txnSum('revenue', from, to), txnSum('revenue', pfrom, pto), 'money'],
        ['Expenses', txnSum('expense', from, to), txnSum('expense', pfrom, pto), 'money'],
        ['Net income', txnSum('revenue', from, to) - txnSum('expense', from, to),
          txnSum('revenue', pfrom, pto) - txnSum('expense', pfrom, pto), 'money'],
        ['Reservations', stays.filter((s) => inRange(s.created, from, to)).length,
          stays.filter((s) => inRange(s.created, pfrom, pto)).length, 'num'],
        ['ADR', m.adr, pm.adr, 'money'],
        ['RevPAR', m.revpar, pm.revpar, 'money'],
        ['Guest satisfaction', fbAvg(from, to), fbAvg(pfrom, pto), 'rating'],
      ];
      out.title = 'Historical Performance Comparison';
      out.columns = [
        { key: 'metric', label: 'Metric' }, { key: 'current', label: 'Current period' },
        { key: 'previous', label: 'Previous period' }, { key: 'change', label: 'Change' },
        { key: 'change_pct', label: 'Change %', format: 'pct' }];
      out.rows = metrics.map(([metric, current, previous, format]) => ({
        metric, current, previous, format,
        change: Math.round((current - previous) * 100) / 100,
        change_pct: previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null,
      }));
      out.summary = [
        { label: 'Current period', value: `${from} to ${to}` },
        { label: 'Previous period', value: `${pfrom} to ${pto}` }];
      out.extra = { previous_period: { from: pfrom, to: pto } };
      break;
    }
    default:
      break;
  }
  return out;
}

// --- demo CRUD (budgets, targets, decisions, alerts) ---------------------------
export function mockBudgetsList(month) {
  const { from, to } = monthRange(month);
  return {
    success: true, month,
    data: mockBudgets
      .filter((b) => b.period_month === `${month}-01`)
      .map((b) => {
        const spent = txns
          .filter((t) => t.type === 'expense' && t.category === b.category
            && inRange(t.date, from, to) && (b.department_id == null || t.department_id === b.department_id))
          .reduce((a, t) => a + t.amount, 0);
        return { ...b, spent, remaining: b.amount - spent,
                 used_pct: b.amount > 0 ? Math.round((spent / b.amount) * 1000) / 10 : 0 };
      }),
  };
}

export function mockTargetsList(params = {}) {
  const { from, to } = periodRange(params.period || 'monthly', params);
  return { success: true, period: { from, to }, data: mockTargets.map((k) => withAttainment(k, from, to)) };
}

export function mockSaveBudget(data) {
  if (data.id) {
    const i = mockBudgets.findIndex((b) => b.id === data.id);
    if (i >= 0) mockBudgets[i] = { ...mockBudgets[i], ...data,
      department: data.department_id ? DEPARTMENTS.find((d) => d.id === Number(data.department_id))?.name : 'Hotel-wide' };
    return { success: true, id: data.id };
  }
  const id = nextId++;
  mockBudgets.push({ ...data, id, period_month: `${String(data.period_month).slice(0, 7)}-01`,
    department: data.department_id ? DEPARTMENTS.find((d) => d.id === Number(data.department_id))?.name : 'Hotel-wide' });
  return { success: true, id };
}

export function mockDeleteBudget(id) {
  const i = mockBudgets.findIndex((b) => b.id === Number(id));
  if (i >= 0) mockBudgets.splice(i, 1);
  return { success: true };
}

export function mockSaveTarget(data) {
  const shaped = { ...data, target_value: Number(data.target_value),
    department: data.department_id ? DEPARTMENTS.find((d) => d.id === Number(data.department_id))?.name : null };
  if (data.id) {
    const i = mockTargets.findIndex((k) => k.id === data.id);
    if (i >= 0) mockTargets[i] = { ...mockTargets[i], ...shaped };
    return { success: true, id: data.id };
  }
  const id = nextId++;
  mockTargets.push({ ...shaped, id });
  return { success: true, id };
}

export function mockDeleteTarget(id) {
  const i = mockTargets.findIndex((k) => k.id === Number(id));
  if (i >= 0) mockTargets.splice(i, 1);
  return { success: true };
}

export function mockDecisionsList(params = {}) {
  let list = [...mockDecisions];
  if (params.status) list = list.filter((d) => d.status === params.status);
  if (params.department) list = list.filter((d) => d.department_id === Number(params.department));
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter((d) => d.title.toLowerCase().includes(q)
      || (d.assigned_to || '').toLowerCase().includes(q) || (d.decided_by || '').toLowerCase().includes(q));
  }
  list = list.map((d) => ({ ...d, overdue: d.status !== 'completed' && d.deadline && d.deadline < TODAY }));
  return {
    success: true, data: list,
    summary: {
      total: list.length,
      pending: list.filter((d) => d.status === 'pending').length,
      in_progress: list.filter((d) => d.status === 'in_progress').length,
      completed: list.filter((d) => d.status === 'completed').length,
      overdue: list.filter((d) => d.overdue).length,
    },
  };
}

export function mockSaveDecision(data) {
  const shaped = { ...data, department_id: data.department_id ? Number(data.department_id) : null,
    department: data.department_id ? DEPARTMENTS.find((d) => d.id === Number(data.department_id))?.name : 'Hotel-wide',
    overdue: data.status !== 'completed' && data.deadline && data.deadline < TODAY };
  if (data.id) {
    const i = mockDecisions.findIndex((d) => d.id === data.id);
    if (i >= 0) mockDecisions[i] = { ...mockDecisions[i], ...shaped,
      completed_at: data.status === 'completed' ? mockDecisions[i].completed_at || `${TODAY} 12:00:00` : null };
    return { success: true, id: data.id };
  }
  const id = nextId++;
  mockDecisions.unshift({ ...shaped, id, created_at: `${TODAY} 09:00:00`, completed_at: null });
  return { success: true, id };
}

export function mockDeleteDecision(id) {
  const i = mockDecisions.findIndex((d) => d.id === Number(id));
  if (i >= 0) mockDecisions.splice(i, 1);
  return { success: true };
}

export function mockAlertsList(params = {}) {
  let list = [...mockAlerts];
  if (params.status) list = list.filter((a) => a.status === params.status);
  if (params.severity) list = list.filter((a) => a.severity === params.severity);
  return { success: true, data: list, unread: mockAlerts.filter((a) => a.status === 'unread').length };
}

export function mockCreateAlert(data) {
  const id = nextId++;
  mockAlerts.unshift({ ...data, id, status: 'unread', created_at: `${TODAY} 10:00:00`, resolved_at: null });
  return { success: true, id };
}

export function mockSetAlertStatus(id, status) {
  const a = mockAlerts.find((x) => x.id === Number(id));
  if (a) { a.status = status; if (status === 'resolved') a.resolved_at = `${TODAY} 12:00:00`; }
  return { success: true };
}

export function mockDeleteAlert(id) {
  const i = mockAlerts.findIndex((a) => a.id === Number(id));
  if (i >= 0) mockAlerts.splice(i, 1);
  return { success: true };
}
