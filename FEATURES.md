# Management Department — Features

The Management Department module is the hotel's command center. Managers open
one dashboard and see the hotel's live state — occupancy, reservations,
revenue, expenses, and outstanding operational work — generate reports across
every department, monitor budgets and KPI targets, assign decisions to
departments and approve them once done, and receive operational alerts.

This module has **no login page of its own** — accounts and authentication
belong to the system's login module. It reads from the **one shared MySQL
database** (`hotel_management`) that all department modules write to, so every
figure it shows is current.

## How the pages get their data

Pages never talk to MySQL directly. Each page calls a `H.store` method
(`assets/js/common.js`), which fetches a PHP JSON endpoint under `api/`.
Every endpoint answers `{ success: true, ... }`; anything else (an HTTP
error, a PHP error page, or a static server returning the `.php` source)
counts as "API unreachable" and the page falls back to built-in demo data
(`assets/js/mock.js`) with the same shapes, so the module can be previewed
without XAMPP running.

Periods work the same way on every page: `?period=daily|weekly|monthly|yearly`
(a preset ending today) or an explicit `?from=YYYY-MM-DD&to=YYYY-MM-DD` range.
All dates and times are Philippine time (Asia/Manila, UTC+8).

---

## 1. Executive Dashboard (`index.html`)

What it does:

- **Stat cards** — occupancy rate (with room-nights sold and total rooms),
  revenue (with ADR and RevPAR), expenses (with net income), reservations
  (with arrivals and departures), and open operational tasks (maintenance
  plus housekeeping counts).
- **Revenue vs. expenses trend** — a line chart over the selected period.
- **Department revenue vs. expenses** — a bar chart per department.
- **Outstanding work** — open maintenance requests, pending housekeeping
  tasks, unresolved complaints, overdue decisions, and items at or below
  reorder level.
- **KPI attainment** — the top 6 KPI targets with actual vs. target and a
  progress bar.
- **Topbar bell** — a bell icon on every page showing the unread-alert count
  and linking to Operational Alerts.

APIs it fetches:

| Data shown | API call |
|---|---|
| Stat cards, trend, department chart, outstanding work, KPIs | `GET api/dashboard.php?period=…` or `?from=…&to=…` |
| Unread-alert count on the topbar bell | `GET api/alerts.php?status=unread` |

The dashboard endpoint reads reservations, financial transactions,
guest feedback, complaints, maintenance requests, housekeeping tasks,
inventory items, decisions, and KPI targets from the shared database.

---

## 2. Reports (`reports.html`)

What it does:

- **18 report types** in one hub, grouped into Overview, Finance, Analytics,
  and Operations. Pick a type, narrow it with the period presets, a custom
  date range, and (on the reports that support it) a department filter.
- Every report returns a **table, a summary strip, and (where it fits) a
  chart** — columns, rows, and chart data all come from the one API response.
- **Export As** — download the current report as CSV or PDF (built with the
  bundled jsPDF, works offline). Every export is logged as a generated report.

| Report | `type=` value | Department filter |
|---|---|---|
| Occupancy Monitoring | `occupancy` | No |
| Room Availability | `rooms` | No |
| Historical Comparison | `historical` | No |
| Revenue Performance | `revenue` | Yes |
| Expense Monitoring | `expenses` | Yes |
| Financial Summary | `financial` | No |
| ADR Report | `adr` | No |
| RevPAR Report | `revpar` | No |
| F&B Sales | `fnb` | No |
| Reservation Analytics | `reservations` | No |
| Department Performance | `departments` | No |
| Employee Performance | `employees` | Yes |
| KPIs | `kpis` | No |
| Guest Satisfaction | `satisfaction` | No |
| Complaints & Incidents | `complaints` | Yes |
| Inventory & Stock | `inventory` | Yes |
| Maintenance Performance | `maintenance` | Yes |
| Housekeeping Performance | `housekeeping` | No |

APIs it fetches:

| Data shown | API call |
|---|---|
| Any report's table, summary, and chart | `GET api/reports.php?type=…&from=…&to=…&department=…` |
| Report log entry, written on every export | `POST api/reports.php` with `{ title, type, generated_by, parameters }` |

---

## 3. Budgets & Targets (`budgets.html`)

What it does:

- **Budgets for a month** — pick a month and see every budget (department or
  hotel-wide) with its amount, how much of it is already spent on expense
  transactions in the same category that month, what remains, and the
  percentage used.
- **KPI targets** — targets for a period with the actual measured value for
  that range and the attainment percentage (occupancy, ADR, RevPAR, guest
  satisfaction, housekeeping completion, maintenance response, complaint
  resolution, and others the module can measure automatically).

This page is **read-only by design**: budget and target editing belongs to
the Finance Department module, so Management only views them here. The
client still contains the old save/delete calls, but the endpoint serves
reads only.

APIs it fetches:

| Data shown | API call |
|---|---|
| Budgets for a month, with amount spent | `GET api/budgets.php?kind=budgets&month=YYYY-MM` |
| KPI targets, with actuals for the range | `GET api/budgets.php?kind=targets&from=…&to=…` |

---

## 4. Decision Tracking (`decisions.html`)

What it does:

- **Management assigns decisions to departments** — a decision has a title,
  details, who decided it, who is responsible, the target department, and a
  follow-up deadline. Deadlines can never be set in the past for new
  decisions; editing an already-overdue decision keeps its existing deadline
  so overdue items stay editable.
- **Status belongs to the assigned department** — pending, in progress, or
  completed is decided by the department working on it, so Management's page
  shows status as a read-only pill and offers no status control. New
  decisions start pending.
- **Management approves finished work** — once the department flags a
  decision completed, an Approval column offers it: "Awaiting completion"
  before it is done, a "For approval" button when it is done but unapproved,
  and a green "Approved" toggle after approval. Approval only sticks on
  completed decisions; reopening one clears its approval. A "For approval"
  count in the summary strip shows what needs Management's action.
- **Filters** — search text, status, and department; the list also flags
  overdue decisions.

APIs it fetches:

| Data shown / action | API call |
|---|---|
| Decision list and summary counts (total, pending, in progress, completed, overdue, for approval) | `GET api/decisions.php?status=…&department=…&q=…` |
| Record a new decision | `POST api/decisions.php` |
| Edit a decision, or toggle its approval | `PUT api/decisions.php` |
| Delete a decision | `DELETE api/decisions.php?id=…` |

---

## 5. Operational Alerts (`alerts.html`)

What it does:

- **Alert list, newest first** — alerts raised by hotel operations and by
  the management team, each with a severity (info, warning, critical), a
  source (Occupancy, Inventory, Maintenance, Housekeeping, Finance, Guest
  feedback, System), and a status (unread, read, resolved).
- **Filters** — by status and by severity, with a live unread count.
- **Actions** — mark an alert read, mark it resolved (which stamps the
  resolution time), dismiss it permanently, or raise one manually.

APIs it fetches:

| Data shown / action | API call |
|---|---|
| Alert list, plus the unread count | `GET api/alerts.php?status=…&severity=…` |
| Raise an alert manually | `POST api/alerts.php` |
| Mark read / resolved | `PUT api/alerts.php` with `{ id, status }` |
| Dismiss permanently | `DELETE api/alerts.php?id=…` |

---

## Endpoint reference

| Method | Endpoint | Used by |
|---|---|---|
| GET | `api/dashboard.php?period=…` or `?from=…&to=…` | Executive Dashboard |
| GET | `api/reports.php?type=…&from=…&to=…&department=…` | Reports |
| POST | `api/reports.php` (report log) | Reports (on export) |
| GET | `api/budgets.php?kind=budgets&month=…` | Budgets & Targets |
| GET | `api/budgets.php?kind=targets&from=…&to=…` | Budgets & Targets |
| GET / POST / PUT / DELETE | `api/decisions.php` | Decision Tracking |
| GET / POST / PUT / DELETE | `api/alerts.php` | Operational Alerts |

Supporting files: `config/bootstrap.php` (shared periods, hotel metrics,
JSON helpers), `config/database.php` (PDO connection to `hotel_management`),
`database/schema.sql` (the 16-table shared schema).
