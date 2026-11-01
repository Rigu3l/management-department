<?php
// api/reports.php — every management report behind one endpoint.
// GET ?type=<report>&period=...|from&to&department=<id>
//   types: occupancy, rooms, revenue, expenses, reservations, departments,
//          employees, kpis, adr, revpar, satisfaction, complaints,
//          inventory, maintenance, housekeeping, fnb, financial, historical
// POST {title, type, generated_by, parameters} logs a generated report.
//
// Response: { columns: [{key,label,format}], rows, summary: [{label,value,format}],
//             chart: {kind, labels, series:[{label,data}]} | null, extra }
require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../config/database.php';

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = read_json_body();
    $stmt = $pdo->prepare(
        "INSERT INTO reports (title, type, generated_by, parameters) VALUES (:t, :ty, :g, :p)");
    $stmt->execute([
        't' => $b['title'] ?? 'Report', 'ty' => $b['type'] ?? 'general',
        'g' => $b['generated_by'] ?? null,
        'p' => isset($b['parameters']) ? json_encode($b['parameters']) : null,
    ]);
    json_response(['success' => true, 'id' => (int) $pdo->lastInsertId()]);
}

$type = $_GET['type'] ?? 'occupancy';
['from' => $from, 'to' => $to, 'period' => $preset] = period_range();
$dept = department_filter();
$m = hotel_metrics($pdo, $from, $to);

$days = [];
$cur = strtotime($from); $endTs = strtotime($to);
while ($cur <= $endTs) { $days[] = date('Y-m-d', $cur); $cur = strtotime('+1 day', $cur); }

// Per-day occupied rooms (shared by occupancy / adr / revpar reports).
$occupiedByDay = array_fill_keys($days, 0);
$stmt = $pdo->prepare(
    "SELECT check_in, check_out FROM reservations
      WHERE status IN ('confirmed','checked_in','checked_out')
        AND check_in <= :to AND check_out > :from");
$stmt->execute(['from' => $from, 'to' => $to]);
foreach ($stmt->fetchAll() as $s) {
    foreach ($days as $day) {
        if ($s['check_in'] <= $day && $s['check_out'] > $day) $occupiedByDay[$day]++;
    }
}
$roomRevenueByDay = [];
$stmt = $pdo->prepare(
    "SELECT txn_date, SUM(amount) total FROM financial_transactions
      WHERE type = 'revenue' AND category = 'Rooms' AND txn_date BETWEEN :from AND :to
      GROUP BY txn_date");
$stmt->execute(['from' => $from, 'to' => $to]);
foreach ($stmt->fetchAll() as $r) $roomRevenueByDay[$r['txn_date']] = (float) $r['total'];

$out = ['success' => true, 'type' => $type, 'period' => ['from' => $from, 'to' => $to, 'preset' => $preset],
        'department' => $dept, 'columns' => [], 'rows' => [], 'summary' => [], 'chart' => null];

switch ($type) {

case 'occupancy':
    $rows = [];
    foreach ($days as $day) {
        $occ = $occupiedByDay[$day];
        $rows[] = ['date' => $day, 'occupied' => $occ, 'available' => $m['total_rooms'] - $occ,
                   'total_rooms' => $m['total_rooms'],
                   'rate' => $m['total_rooms'] ? round($occ / $m['total_rooms'] * 100, 1) : 0];
    }
    $out['title'] = 'Hotel Occupancy Monitoring';
    $out['columns'] = [['key'=>'date','label'=>'Date'],['key'=>'occupied','label'=>'Occupied rooms'],
        ['key'=>'available','label'=>'Available rooms'],['key'=>'total_rooms','label'=>'Total rooms'],
        ['key'=>'rate','label'=>'Occupancy rate','format'=>'pct']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Average occupancy', 'value' => $m['occupancy_rate'], 'format' => 'pct'],
        ['label' => 'Room-nights sold', 'value' => $m['rooms_sold']],
        ['label' => 'Capacity (room-nights)', 'value' => $m['capacity_nights']],
    ];
    $out['chart'] = ['kind' => 'line', 'labels' => $days,
        'series' => [['label' => 'Occupancy %', 'data' => array_column($rows, 'rate')]]];
    break;

case 'rooms':
    $rows = $pdo->query(
        "SELECT room_number, room_type, floor, status, rate FROM rooms ORDER BY floor, room_number")->fetchAll();
    $counts = [];
    foreach ($rows as $r) $counts[$r['status']] = ($counts[$r['status']] ?? 0) + 1;
    $out['title'] = 'Room Availability Report';
    $out['columns'] = [['key'=>'room_number','label'=>'Room'],['key'=>'room_type','label'=>'Type'],
        ['key'=>'floor','label'=>'Floor'],['key'=>'status','label'=>'Status'],
        ['key'=>'rate','label'=>'Nightly rate','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Available now', 'value' => $counts['available'] ?? 0],
        ['label' => 'Occupied now', 'value' => $counts['occupied'] ?? 0],
        ['label' => 'Reserved', 'value' => $counts['reserved'] ?? 0],
        ['label' => 'Cleaning / maintenance', 'value' => ($counts['cleaning'] ?? 0) + ($counts['maintenance'] ?? 0)],
    ];
    $out['chart'] = ['kind' => 'doughnut', 'labels' => array_keys($counts),
        'series' => [['label' => 'Rooms', 'data' => array_values($counts)]]];
    break;

case 'revenue':
case 'expenses':
    $kind = $type === 'revenue' ? 'revenue' : 'expense';
    $sql = "SELECT t.category, COALESCE(d.name, 'Hotel-wide') department, COUNT(*) entries, SUM(t.amount) total
              FROM financial_transactions t LEFT JOIN departments d ON d.id = t.department_id
             WHERE t.type = :kind AND t.txn_date BETWEEN :from AND :to";
    $args = ['kind' => $kind, 'from' => $from, 'to' => $to];
    if ($dept !== null) { $sql .= " AND t.department_id = :dept"; $args['dept'] = $dept; }
    $sql .= " GROUP BY t.category, department ORDER BY total DESC";
    $stmt = $pdo->prepare($sql); $stmt->execute($args);
    $rows = $stmt->fetchAll();
    $total = array_sum(array_map(fn($r) => (float) $r['total'], $rows));
    $out['title'] = $kind === 'revenue' ? 'Revenue Performance Monitoring' : 'Expense Monitoring';
    $out['columns'] = [['key'=>'category','label'=>'Category'],['key'=>'department','label'=>'Department'],
        ['key'=>'entries','label'=>'Entries'],['key'=>'total','label'=>'Total','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => $kind === 'revenue' ? 'Total revenue' : 'Total expenses', 'value' => $total, 'format' => 'money'],
        ['label' => 'Daily average', 'value' => round($total / max(1, count($days)), 2), 'format' => 'money'],
        ['label' => 'Categories', 'value' => count($rows)],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => array_column($rows, 'category'),
        'series' => [['label' => 'Total', 'data' => array_map(fn($r) => (float) $r['total'], $rows)]]];
    break;

case 'reservations':
    $stmt = $pdo->prepare(
        "SELECT DATE(created_at) day, COUNT(*) created,
                SUM(status = 'cancelled') cancelled, SUM(status = 'no_show') no_show,
                SUM(total_amount) booking_value
           FROM reservations
          WHERE created_at >= :from AND created_at < DATE_ADD(:to, INTERVAL 1 DAY)
          GROUP BY day");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $byDay = [];
    foreach ($stmt->fetchAll() as $r) $byDay[$r['day']] = $r;
    $rows = [];
    foreach ($days as $day) {
        $r = $byDay[$day] ?? null;
        $rows[] = ['date' => $day, 'created' => (int) ($r['created'] ?? 0),
                   'cancelled' => (int) ($r['cancelled'] ?? 0), 'no_show' => (int) ($r['no_show'] ?? 0),
                   'booking_value' => (float) ($r['booking_value'] ?? 0)];
    }
    $totCreated = array_sum(array_column($rows, 'created'));
    $totCancelled = array_sum(array_column($rows, 'cancelled'));
    $src = $pdo->prepare(
        "SELECT source, COUNT(*) c FROM reservations
          WHERE created_at >= :from AND created_at < DATE_ADD(:to, INTERVAL 1 DAY) GROUP BY source ORDER BY c DESC");
    $src->execute(['from' => $from, 'to' => $to]);
    $out['title'] = 'Reservation Analytics';
    $out['columns'] = [['key'=>'date','label'=>'Date'],['key'=>'created','label'=>'New reservations'],
        ['key'=>'cancelled','label'=>'Cancelled'],['key'=>'no_show','label'=>'No-show'],
        ['key'=>'booking_value','label'=>'Booking value','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'New reservations', 'value' => $totCreated],
        ['label' => 'Cancellation rate', 'value' => $totCreated ? round($totCancelled / $totCreated * 100, 1) : 0, 'format' => 'pct'],
        ['label' => 'Total booking value', 'value' => array_sum(array_column($rows, 'booking_value')), 'format' => 'money'],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => $days,
        'series' => [['label' => 'New reservations', 'data' => array_column($rows, 'created')]]];
    $out['extra'] = ['by_source' => $src->fetchAll()];
    break;

case 'departments':
    $stmt = $pdo->prepare(
        "SELECT d.id, d.name department,
                COALESCE(SUM(CASE WHEN t.type='revenue' THEN t.amount END),0) revenue,
                COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount END),0) expenses,
                (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status='active') employees,
                (SELECT COUNT(*) FROM maintenance_requests mr WHERE mr.department_id = d.id AND mr.status IN ('pending','in_progress'))
              + (SELECT COUNT(*) FROM complaints_incidents ci WHERE ci.department_id = d.id AND ci.status <> 'resolved') open_items
           FROM departments d
           LEFT JOIN financial_transactions t ON t.department_id = d.id AND t.txn_date BETWEEN :from AND :to
          GROUP BY d.id, d.name ORDER BY d.id");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $rows = array_map(fn($r) => $r + ['net' => (float) $r['revenue'] - (float) $r['expenses']], $stmt->fetchAll());
    $out['title'] = 'Department Performance Reports';
    $out['columns'] = [['key'=>'department','label'=>'Department'],['key'=>'revenue','label'=>'Revenue','format'=>'money'],
        ['key'=>'expenses','label'=>'Expenses','format'=>'money'],['key'=>'net','label'=>'Net','format'=>'money'],
        ['key'=>'employees','label'=>'Active staff'],['key'=>'open_items','label'=>'Open items']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Total revenue', 'value' => array_sum(array_column($rows, 'revenue')), 'format' => 'money'],
        ['label' => 'Total expenses', 'value' => array_sum(array_column($rows, 'expenses')), 'format' => 'money'],
        ['label' => 'Net', 'value' => array_sum(array_column($rows, 'net')), 'format' => 'money'],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => array_column($rows, 'department'),
        'series' => [['label' => 'Revenue', 'data' => array_map(fn($r) => (float) $r['revenue'], $rows)],
                     ['label' => 'Expenses', 'data' => array_map(fn($r) => (float) $r['expenses'], $rows)]]];
    break;

case 'employees':
    $sql = "SELECT e.full_name name, d.name department, e.position, e.status,
                   (SELECT COUNT(*) FROM housekeeping_tasks h WHERE h.assigned_to = e.id AND h.status='completed'
                      AND h.scheduled_date BETWEEN :from AND :to) hk_done,
                   (SELECT COUNT(*) FROM maintenance_requests mr WHERE mr.assigned_to = e.id AND mr.status='completed'
                      AND DATE(mr.reported_at) BETWEEN :from2 AND :to2) maint_done
              FROM employees e JOIN departments d ON d.id = e.department_id";
    $args = ['from' => $from, 'to' => $to, 'from2' => $from, 'to2' => $to];
    if ($dept !== null) { $sql .= " WHERE e.department_id = :dept"; $args['dept'] = $dept; }
    $sql .= " ORDER BY d.name, e.full_name";
    $stmt = $pdo->prepare($sql); $stmt->execute($args);
    $rows = array_map(fn($r) => $r + ['tasks_completed' => (int) $r['hk_done'] + (int) $r['maint_done']], $stmt->fetchAll());
    $out['title'] = 'Employee Performance Monitoring';
    $out['columns'] = [['key'=>'name','label'=>'Employee'],['key'=>'department','label'=>'Department'],
        ['key'=>'position','label'=>'Position'],['key'=>'status','label'=>'Status'],
        ['key'=>'tasks_completed','label'=>'Tasks completed (period)']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Employees', 'value' => count($rows)],
        ['label' => 'Active', 'value' => count(array_filter($rows, fn($r) => $r['status'] === 'active'))],
        ['label' => 'Tasks completed', 'value' => array_sum(array_column($rows, 'tasks_completed'))],
    ];
    break;

case 'kpis':
    $rows = [];
    foreach ($pdo->query("SELECT k.*, d.name department FROM kpi_targets k LEFT JOIN departments d ON d.id = k.department_id ORDER BY k.id")->fetchAll() as $k) {
        $actual = kpi_actual($pdo, $k['name'], $from, $to);
        $target = (float) $k['target_value'];
        $lowerBetter = str_contains(strtolower($k['name']), 'response time');
        $attain = ($actual !== null && $target > 0)
            ? round(min(100, $lowerBetter ? $target / max($actual, 0.01) * 100 : $actual / $target * 100), 1) : null;
        $rows[] = ['name' => $k['name'], 'department' => $k['department'] ?? 'Hotel-wide',
                   'target' => $target, 'unit' => $k['unit'], 'actual' => $actual, 'attainment' => $attain];
    }
    $out['title'] = 'Key Performance Indicators (KPIs)';
    $out['columns'] = [['key'=>'name','label'=>'KPI'],['key'=>'department','label'=>'Department'],
        ['key'=>'actual','label'=>'Actual'],['key'=>'target','label'=>'Target'],['key'=>'unit','label'=>'Unit'],
        ['key'=>'attainment','label'=>'Attainment','format'=>'pct']];
    $out['rows'] = $rows;
    $att = array_filter(array_column($rows, 'attainment'), fn($v) => $v !== null);
    $out['summary'] = [
        ['label' => 'KPIs tracked', 'value' => count($rows)],
        ['label' => 'Average attainment', 'value' => $att ? round(array_sum($att) / count($att), 1) : 0, 'format' => 'pct'],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => array_column($rows, 'name'),
        'series' => [['label' => 'Attainment %', 'data' => array_map(fn($v) => $v ?? 0, array_column($rows, 'attainment'))]]];
    break;

case 'adr':
case 'revpar':
    $rows = [];
    foreach ($days as $day) {
        $sold = $occupiedByDay[$day];
        $rev = $roomRevenueByDay[$day] ?? 0;
        $adr = $sold > 0 ? round($rev / $sold, 2) : 0;
        $occ = $m['total_rooms'] ? round($sold / $m['total_rooms'] * 100, 1) : 0;
        $rows[] = ['date' => $day, 'rooms_sold' => $sold, 'room_revenue' => $rev,
                   'adr' => $adr, 'occupancy' => $occ, 'revpar' => round($adr * $occ / 100, 2)];
    }
    $isAdr = $type === 'adr';
    $out['title'] = $isAdr ? 'Average Daily Rate (ADR) Report' : 'Revenue per Available Room (RevPAR) Report';
    $out['columns'] = $isAdr
        ? [['key'=>'date','label'=>'Date'],['key'=>'rooms_sold','label'=>'Rooms sold'],
           ['key'=>'room_revenue','label'=>'Room revenue','format'=>'money'],['key'=>'adr','label'=>'ADR','format'=>'money']]
        : [['key'=>'date','label'=>'Date'],['key'=>'occupancy','label'=>'Occupancy','format'=>'pct'],
           ['key'=>'adr','label'=>'ADR','format'=>'money'],['key'=>'revpar','label'=>'RevPAR','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Average ADR', 'value' => $m['adr'], 'format' => 'money'],
        ['label' => 'Average RevPAR', 'value' => $m['revpar'], 'format' => 'money'],
        ['label' => 'Occupancy', 'value' => $m['occupancy_rate'], 'format' => 'pct'],
    ];
    $key = $isAdr ? 'adr' : 'revpar';
    $out['chart'] = ['kind' => 'line', 'labels' => $days,
        'series' => [['label' => strtoupper($key), 'data' => array_column($rows, $key)]]];
    break;

case 'satisfaction':
    $stmt = $pdo->prepare(
        "SELECT category, COUNT(*) responses, AVG(rating) avg_rating,
                SUM(rating >= 4) / COUNT(*) * 100 satisfied_pct
           FROM guest_feedback WHERE DATE(created_at) BETWEEN :from AND :to GROUP BY category ORDER BY responses DESC");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $rows = $stmt->fetchAll();
    $stmt = $pdo->prepare(
        "SELECT AVG(rating) a, COUNT(*) c FROM guest_feedback WHERE DATE(created_at) BETWEEN :from AND :to");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $all = $stmt->fetch();
    $stmt = $pdo->prepare(
        "SELECT guest_name, rating, category, comment, DATE(created_at) day FROM guest_feedback
          WHERE DATE(created_at) BETWEEN :from AND :to ORDER BY created_at DESC LIMIT 8");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $out['title'] = 'Guest Satisfaction Analytics';
    $out['columns'] = [['key'=>'category','label'=>'Category'],['key'=>'responses','label'=>'Responses'],
        ['key'=>'avg_rating','label'=>'Average rating','format'=>'rating'],['key'=>'satisfied_pct','label'=>'Satisfied (4-5 stars)','format'=>'pct']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Overall average', 'value' => $all['a'] !== null ? round((float) $all['a'], 2) : 0, 'format' => 'rating'],
        ['label' => 'Responses', 'value' => (int) ($all['c'] ?? 0)],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => array_column($rows, 'category'),
        'series' => [['label' => 'Average rating', 'data' => array_map(fn($r) => round((float) $r['avg_rating'], 2), $rows)]]];
    $out['extra'] = ['comments' => $stmt->fetchAll()];
    break;

case 'complaints':
    $sql = "SELECT DATE(ci.created_at) date, ci.title, ci.type, COALESCE(d.name, '—') department,
                   ci.severity, ci.status
              FROM complaints_incidents ci LEFT JOIN departments d ON d.id = ci.department_id
             WHERE DATE(ci.created_at) BETWEEN :from AND :to";
    $args = ['from' => $from, 'to' => $to];
    if ($dept !== null) { $sql .= " AND ci.department_id = :dept"; $args['dept'] = $dept; }
    $sql .= " ORDER BY ci.created_at DESC";
    $stmt = $pdo->prepare($sql); $stmt->execute($args);
    $rows = $stmt->fetchAll();
    $resolved = count(array_filter($rows, fn($r) => $r['status'] === 'resolved'));
    $statusCounts = [];
    foreach ($rows as $r) $statusCounts[$r['status']] = ($statusCounts[$r['status']] ?? 0) + 1;
    $out['title'] = 'Complaint and Incident Summaries';
    $out['columns'] = [['key'=>'date','label'=>'Date'],['key'=>'title','label'=>'Title'],['key'=>'type','label'=>'Type'],
        ['key'=>'department','label'=>'Department'],['key'=>'severity','label'=>'Severity'],['key'=>'status','label'=>'Status']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Total recorded', 'value' => count($rows)],
        ['label' => 'Resolved', 'value' => $resolved],
        ['label' => 'Resolution rate', 'value' => count($rows) ? round($resolved / count($rows) * 100, 1) : 0, 'format' => 'pct'],
        ['label' => 'Still open', 'value' => count($rows) - $resolved],
    ];
    $out['chart'] = ['kind' => 'doughnut', 'labels' => array_keys($statusCounts),
        'series' => [['label' => 'Records', 'data' => array_values($statusCounts)]]];
    break;

case 'inventory':
    $sql = "SELECT i.name, i.category, COALESCE(d.name, '—') department, i.quantity, i.unit,
                   i.reorder_level, i.unit_cost, i.quantity * i.unit_cost stock_value,
                   CASE WHEN i.quantity = 0 THEN 'Out of stock' WHEN i.quantity <= i.reorder_level THEN 'Low stock' ELSE 'OK' END status
              FROM inventory_items i LEFT JOIN departments d ON d.id = i.department_id";
    $args = [];
    if ($dept !== null) { $sql .= " WHERE i.department_id = :dept"; $args['dept'] = $dept; }
    $sql .= " ORDER BY status DESC, i.category, i.name";
    $stmt = $pdo->prepare($sql); $stmt->execute($args);
    $rows = $stmt->fetchAll();
    $out['title'] = 'Inventory and Stock Reports';
    $out['columns'] = [['key'=>'name','label'=>'Item'],['key'=>'category','label'=>'Category'],
        ['key'=>'department','label'=>'Department'],['key'=>'quantity','label'=>'Quantity'],['key'=>'unit','label'=>'Unit'],
        ['key'=>'reorder_level','label'=>'Reorder level'],['key'=>'stock_value','label'=>'Stock value','format'=>'money'],
        ['key'=>'status','label'=>'Status']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Items tracked', 'value' => count($rows)],
        ['label' => 'Low / out of stock', 'value' => count(array_filter($rows, fn($r) => $r['status'] !== 'OK'))],
        ['label' => 'Total stock value', 'value' => array_sum(array_column($rows, 'stock_value')), 'format' => 'money'],
    ];
    break;

case 'maintenance':
    $sql = "SELECT DATE(mr.reported_at) date, mr.title, COALESCE(r.room_number, '—') room,
                   mr.priority, mr.status, COALESCE(e.full_name, 'Unassigned') assigned_to,
                   CASE WHEN mr.completed_at IS NOT NULL
                        THEN ROUND(TIMESTAMPDIFF(MINUTE, mr.reported_at, mr.completed_at) / 60, 1) END hours
              FROM maintenance_requests mr
              LEFT JOIN rooms r ON r.id = mr.room_id
              LEFT JOIN employees e ON e.id = mr.assigned_to
             WHERE DATE(mr.reported_at) BETWEEN :from AND :to";
    $args = ['from' => $from, 'to' => $to];
    if ($dept !== null) { $sql .= " AND mr.department_id = :dept"; $args['dept'] = $dept; }
    $sql .= " ORDER BY mr.reported_at DESC";
    $stmt = $pdo->prepare($sql); $stmt->execute($args);
    $rows = $stmt->fetchAll();
    $done = array_filter($rows, fn($r) => $r['status'] === 'completed');
    $hours = array_filter(array_column($done, 'hours'), fn($v) => $v !== null);
    $out['title'] = 'Maintenance Performance Reports';
    $out['columns'] = [['key'=>'date','label'=>'Reported'],['key'=>'title','label'=>'Request'],['key'=>'room','label'=>'Room'],
        ['key'=>'priority','label'=>'Priority'],['key'=>'status','label'=>'Status'],
        ['key'=>'assigned_to','label'=>'Assigned to'],['key'=>'hours','label'=>'Completion (hrs)']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Requests', 'value' => count($rows)],
        ['label' => 'Completed', 'value' => count($done)],
        ['label' => 'Completion rate', 'value' => count($rows) ? round(count($done) / count($rows) * 100, 1) : 0, 'format' => 'pct'],
        ['label' => 'Avg completion time', 'value' => $hours ? round(array_sum($hours) / count($hours), 1) : 0],
    ];
    break;

case 'housekeeping':
    $stmt = $pdo->prepare(
        "SELECT scheduled_date date, COUNT(*) scheduled,
                SUM(status = 'completed') completed, SUM(status IN ('pending','in_progress')) pending
           FROM housekeeping_tasks WHERE scheduled_date BETWEEN :from AND :to GROUP BY scheduled_date");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $byDay = [];
    foreach ($stmt->fetchAll() as $r) $byDay[$r['date']] = $r;
    $rows = [];
    foreach ($days as $day) {
        $r = $byDay[$day] ?? null;
        $sch = (int) ($r['scheduled'] ?? 0); $comp = (int) ($r['completed'] ?? 0);
        $rows[] = ['date' => $day, 'scheduled' => $sch, 'completed' => $comp,
                   'pending' => (int) ($r['pending'] ?? 0),
                   'rate' => $sch ? round($comp / $sch * 100, 1) : 0];
    }
    $totSch = array_sum(array_column($rows, 'scheduled'));
    $totComp = array_sum(array_column($rows, 'completed'));
    $out['title'] = 'Housekeeping Performance Reports';
    $out['columns'] = [['key'=>'date','label'=>'Date'],['key'=>'scheduled','label'=>'Tasks scheduled'],
        ['key'=>'completed','label'=>'Completed'],['key'=>'pending','label'=>'Pending'],
        ['key'=>'rate','label'=>'Completion rate','format'=>'pct']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Tasks scheduled', 'value' => $totSch],
        ['label' => 'Completed', 'value' => $totComp],
        ['label' => 'Completion rate', 'value' => $totSch ? round($totComp / $totSch * 100, 1) : 0, 'format' => 'pct'],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => $days,
        'series' => [['label' => 'Scheduled', 'data' => array_column($rows, 'scheduled')],
                     ['label' => 'Completed', 'data' => array_column($rows, 'completed')]]];
    break;

case 'fnb':
    $stmt = $pdo->prepare(
        "SELECT txn_date date, type, SUM(amount) total FROM financial_transactions
          WHERE department_id = 4 AND txn_date BETWEEN :from AND :to GROUP BY txn_date, type");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $byDay = [];
    foreach ($stmt->fetchAll() as $r) $byDay[$r['date']][$r['type']] = (float) $r['total'];
    $rows = [];
    foreach ($days as $day) {
        $rev = $byDay[$day]['revenue'] ?? 0; $exp = $byDay[$day]['expense'] ?? 0;
        $rows[] = ['date' => $day, 'revenue' => $rev, 'expenses' => $exp, 'net' => $rev - $exp];
    }
    $totRev = array_sum(array_column($rows, 'revenue'));
    $totExp = array_sum(array_column($rows, 'expenses'));
    $out['title'] = 'Food and Beverage Sales Reports';
    $out['columns'] = [['key'=>'date','label'=>'Date'],['key'=>'revenue','label'=>'F&B revenue','format'=>'money'],
        ['key'=>'expenses','label'=>'F&B expenses','format'=>'money'],['key'=>'net','label'=>'Net','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Total F&B revenue', 'value' => $totRev, 'format' => 'money'],
        ['label' => 'Total F&B expenses', 'value' => $totExp, 'format' => 'money'],
        ['label' => 'Net margin', 'value' => $totRev ? round(($totRev - $totExp) / $totRev * 100, 1) : 0, 'format' => 'pct'],
    ];
    $out['chart'] = ['kind' => 'line', 'labels' => $days,
        'series' => [['label' => 'F&B revenue', 'data' => array_column($rows, 'revenue')]]];
    break;

case 'financial':
    $stmt = $pdo->prepare(
        "SELECT category,
                COALESCE(SUM(CASE WHEN type='revenue' THEN amount END),0) revenue,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) expenses
           FROM financial_transactions WHERE txn_date BETWEEN :from AND :to GROUP BY category ORDER BY revenue DESC");
    $stmt->execute(['from' => $from, 'to' => $to]);
    $rows = array_map(fn($r) => $r + ['net' => (float) $r['revenue'] - (float) $r['expenses']], $stmt->fetchAll());
    $totRev = array_sum(array_column($rows, 'revenue'));
    $totExp = array_sum(array_column($rows, 'expenses'));
    $out['title'] = 'Financial Summaries';
    $out['columns'] = [['key'=>'category','label'=>'Category'],['key'=>'revenue','label'=>'Revenue','format'=>'money'],
        ['key'=>'expenses','label'=>'Expenses','format'=>'money'],['key'=>'net','label'=>'Net','format'=>'money']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Total revenue', 'value' => $totRev, 'format' => 'money'],
        ['label' => 'Total expenses', 'value' => $totExp, 'format' => 'money'],
        ['label' => 'Net income', 'value' => $totRev - $totExp, 'format' => 'money'],
        ['label' => 'Profit margin', 'value' => $totRev ? round(($totRev - $totExp) / $totRev * 100, 1) : 0, 'format' => 'pct'],
    ];
    $out['chart'] = ['kind' => 'bar', 'labels' => array_column($rows, 'category'),
        'series' => [['label' => 'Revenue', 'data' => array_map(fn($r) => (float) $r['revenue'], $rows)],
                     ['label' => 'Expenses', 'data' => array_map(fn($r) => (float) $r['expenses'], $rows)]]];
    break;

case 'historical':
    $prev = prev_period($from, $to);
    $pm = hotel_metrics($pdo, $prev['from'], $prev['to']);
    $curRev = txn_total($pdo, 'revenue', $from, $to);
    $prevRev = txn_total($pdo, 'revenue', $prev['from'], $prev['to']);
    $curExp = txn_total($pdo, 'expense', $from, $to);
    $prevExp = txn_total($pdo, 'expense', $prev['from'], $prev['to']);
    $cntRes = function ($f, $t) use ($pdo) {
        $s = $pdo->prepare("SELECT COUNT(*) FROM reservations WHERE created_at >= :f AND created_at < DATE_ADD(:t, INTERVAL 1 DAY)");
        $s->execute(['f' => $f, 't' => $t]);
        return (int) $s->fetchColumn();
    };
    $avgFb = function ($f, $t) use ($pdo) {
        $s = $pdo->prepare("SELECT AVG(rating) FROM guest_feedback WHERE DATE(created_at) BETWEEN :f AND :t");
        $s->execute(['f' => $f, 't' => $t]);
        $v = $s->fetchColumn();
        return $v === null ? 0.0 : round((float) $v, 2);
    };
    $metrics = [
        ['metric' => 'Occupancy rate', 'current' => $m['occupancy_rate'], 'previous' => $pm['occupancy_rate'], 'format' => 'pct'],
        ['metric' => 'Revenue', 'current' => $curRev, 'previous' => $prevRev, 'format' => 'money'],
        ['metric' => 'Expenses', 'current' => $curExp, 'previous' => $prevExp, 'format' => 'money'],
        ['metric' => 'Net income', 'current' => $curRev - $curExp, 'previous' => $prevRev - $prevExp, 'format' => 'money'],
        ['metric' => 'Reservations', 'current' => $cntRes($from, $to), 'previous' => $cntRes($prev['from'], $prev['to']), 'format' => 'num'],
        ['metric' => 'ADR', 'current' => $m['adr'], 'previous' => $pm['adr'], 'format' => 'money'],
        ['metric' => 'RevPAR', 'current' => $m['revpar'], 'previous' => $pm['revpar'], 'format' => 'money'],
        ['metric' => 'Guest satisfaction', 'current' => $avgFb($from, $to), 'previous' => $avgFb($prev['from'], $prev['to']), 'format' => 'rating'],
    ];
    $rows = array_map(function ($r) {
        $r['change'] = round($r['current'] - $r['previous'], 2);
        $r['change_pct'] = $r['previous'] != 0 ? round($r['change'] / abs($r['previous']) * 100, 1) : null;
        return $r;
    }, $metrics);
    $out['title'] = 'Historical Performance Comparison';
    $out['columns'] = [['key'=>'metric','label'=>'Metric'],['key'=>'current','label'=>'Current period'],
        ['key'=>'previous','label'=>'Previous period'],['key'=>'change','label'=>'Change'],
        ['key'=>'change_pct','label'=>'Change %','format'=>'pct']];
    $out['rows'] = $rows;
    $out['summary'] = [
        ['label' => 'Current period', 'value' => "$from to $to"],
        ['label' => 'Previous period', 'value' => "{$prev['from']} to {$prev['to']}"],
    ];
    $out['extra'] = ['previous_period' => $prev];
    break;

default:
    json_error("Unknown report type: $type", 422);
}

json_response($out);
