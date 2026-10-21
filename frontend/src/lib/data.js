// src/lib/data.js — shared reference data. Department ids match the
// seeded rows in database/schema.sql (the hotel's shared database).

export const DEPARTMENTS = [
  { id: 1, name: 'Management', code: 'MGT' },
  { id: 2, name: 'Front Office', code: 'FO' },
  { id: 3, name: 'Housekeeping', code: 'HK' },
  { id: 4, name: 'Food & Beverage', code: 'FB' },
  { id: 5, name: 'Kitchen & Food Production', code: 'KIT' },
  { id: 6, name: 'Accounts & Finance', code: 'FIN' },
  { id: 7, name: 'Maintenance', code: 'MNT' },
  { id: 8, name: 'Security', code: 'SEC' },
];

export const departmentName = (id) =>
  DEPARTMENTS.find((d) => d.id === Number(id))?.name ?? 'Hotel-wide';

// Report catalog for the Reports page. `dept: true` means the report can
// be narrowed with the department filter.
export const REPORT_GROUPS = [
  {
    group: 'Overview',
    reports: [
      { id: 'occupancy', label: 'Occupancy Monitoring' },
      { id: 'rooms', label: 'Room Availability' },
      { id: 'historical', label: 'Historical Comparison' },
    ],
  },
  {
    group: 'Finance',
    reports: [
      { id: 'revenue', label: 'Revenue Performance', dept: true },
      { id: 'expenses', label: 'Expense Monitoring', dept: true },
      { id: 'financial', label: 'Financial Summary' },
      { id: 'adr', label: 'ADR Report' },
      { id: 'revpar', label: 'RevPAR Report' },
      { id: 'fnb', label: 'F&B Sales' },
    ],
  },
  {
    group: 'Analytics',
    reports: [
      { id: 'reservations', label: 'Reservation Analytics' },
      { id: 'departments', label: 'Department Performance' },
      { id: 'employees', label: 'Employee Performance', dept: true },
      { id: 'kpis', label: 'KPIs' },
      { id: 'satisfaction', label: 'Guest Satisfaction' },
      { id: 'complaints', label: 'Complaints & Incidents', dept: true },
    ],
  },
  {
    group: 'Operations',
    reports: [
      { id: 'inventory', label: 'Inventory & Stock', dept: true },
      { id: 'maintenance', label: 'Maintenance Performance', dept: true },
      { id: 'housekeeping', label: 'Housekeeping Performance' },
    ],
  },
];

export const REPORT_TYPES = REPORT_GROUPS.flatMap((g) => g.reports);
export const reportMeta = (id) => REPORT_TYPES.find((r) => r.id === id);

export const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom range' },
];

export const EXPENSE_CATEGORIES = [
  'Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Marketing', 'Other',
];
export const REVENUE_CATEGORIES = [
  'Rooms', 'Food & Beverage', 'Events', 'Laundry', 'Other',
];
export const BUDGET_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...REVENUE_CATEGORIES])];
