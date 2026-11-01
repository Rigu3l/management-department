<?php
// api/dashboard.php — Executive dashboard summary for a period.
// GET ?period=daily|weekly|monthly|yearly  or  ?from=YYYY-MM-DD&to=YYYY-MM-DD
require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../config/database.php';

$pdo = db();
['from' => $from, 'to' => $to, 'period' => $period] = period_range();
$m = hotel_metrics($pdo, $from, $to);

$revenue = txn_total($pdo, 'revenue', $from, $to);
$expenses = txn_total($pdo, 'expense', $from, $to);

// Reservations created in the period + arrivals/departures inside it.
$stmt = $pdo->prepare(
    "SELECT COUNT(*) total,
            SUM(status = 'cancelled') cancelled,
            SUM(check_in BETWEEN :from AND :to) arrivals,
            SUM(check_out BETWEEN :from2 AND :to2 AND status = 'checked_out') departures
       FROM reservations WHERE created_at >= :from3 AND created_at < DATE_ADD(:to3, INTERVAL 1 DAY)");
$stmt->execute(['from' => $from, 'to' => $to, 'from2' => $from, 'to2' => $to, 'from3' => $from, 'to3' => $to]);
$resv = $stmt->fetch();

// Guest satisfaction in the period.
$stmt = $pdo->prepare(
    "SELECT AVG(rating) avg_rating, COUNT(*) responses
       FROM guest_feedback WHERE DATE(created_at) BETWEEN :from AND :to");
$stmt->execute(['from' => $from, 'to' => $to]);
$fb = $stmt->fetch();

// Daily revenue/expense trend + per-day occupancy over the period.
$stmt = $pdo->prepare(
    "SELECT txn_date, type, SUM(amount) total FROM financial_transactions
      WHERE txn_date BETWEEN :from AND :to GROUP BY txn_date, type");
$stmt->execute(['from' => $from, 'to' => $to]);
$txnByDay = [];
foreach ($stmt->fetchAll() as $r) {
    $txnByDay[$r['txn_date']][$r['type']] = (float) $r['total'];
}
$stmt = $pdo->prepare(
    "SELECT check_in, check_out FROM reservations
      WHERE status IN ('confirmed','checked_in','checked_out')
        AND check_in <= :to AND check_out > :from");
$stmt->execute(['from' => $from, 'to' => $to]);
$stays = $stmt->fetchAll();

$trend = [];
$cur = strtotime($from);
$end = strtotime($to);
while ($cur <= $end) {
    $day = date('Y-m-d', $cur);
    $occupied = 0;
    foreach ($stays as $s) {
        if ($s['check_in'] <= $day && $s['check_out'] > $day) $occupied++;
    }
    $trend[] = [
        'date' => $day,
        'revenue' => $txnByDay[$day]['revenue'] ?? 0,
        'expenses' => $txnByDay[$day]['expense'] ?? 0,
        'occupancy' => $m['total_rooms'] > 0 ? round($occupied / $m['total_rooms'] * 100, 1) : 0,
    ];
    $cur = strtotime('+1 day', $cur);
}

// Department performance snapshot for the period.
$deptPerf = $pdo->prepare(
    "SELECT d.id, d.name,
            COALESCE(SUM(CASE WHEN t.type = 'revenue' THEN t.amount END), 0) revenue,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) expenses
       FROM departments d
       LEFT JOIN financial_transactions t
         ON t.department_id = d.id AND t.txn_date BETWEEN :from AND :to
      GROUP BY d.id, d.name ORDER BY d.id");
$deptPerf->execute(['from' => $from, 'to' => $to]);
$deptRows = array_map(fn($r) => [
    'id' => (int) $r['id'], 'name' => $r['name'],
    'revenue' => (float) $r['revenue'], 'expenses' => (float) $r['expenses'],
    'net' => (float) $r['revenue'] - (float) $r['expenses'],
], $deptPerf->fetchAll());

// KPI targets with actuals for the period.
$kpis = [];
foreach ($pdo->query("SELECT k.*, d.name department FROM kpi_targets k LEFT JOIN departments d ON d.id = k.department_id ORDER BY k.id")->fetchAll() as $k) {
    $actual = kpi_actual($pdo, $k['name'], $from, $to);
    $target = (float) $k['target_value'];
    // For "lower is better" KPIs (response time), attainment is inverted.
    $lowerBetter = str_contains(strtolower($k['name']), 'response time');
    $attain = null;
    if ($actual !== null && $target > 0) {
        $attain = $lowerBetter ? round(min(100, $target / max($actual, 0.01) * 100), 1)
                               : round(min(100, $actual / $target * 100), 1);
    }
    $kpis[] = [
        'id' => (int) $k['id'], 'name' => $k['name'], 'department' => $k['department'],
        'target' => $target, 'unit' => $k['unit'], 'actual' => $actual, 'attainment' => $attain,
    ];
}

// Outstanding operational work (current state, not period-bound).
$openMaint = (int) $pdo->query("SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('pending','in_progress')")->fetchColumn();
$pendingHk = (int) $pdo->query("SELECT COUNT(*) FROM housekeeping_tasks WHERE status IN ('pending','in_progress') AND scheduled_date <= CURDATE()")->fetchColumn();
$openComplaints = (int) $pdo->query("SELECT COUNT(*) FROM complaints_incidents WHERE status <> 'resolved'")->fetchColumn();
$overdueDecisions = (int) $pdo->query("SELECT COUNT(*) FROM decisions WHERE status <> 'completed' AND deadline < CURDATE()")->fetchColumn();
$unreadAlerts = (int) $pdo->query("SELECT COUNT(*) FROM alerts WHERE status = 'unread'")->fetchColumn();
$lowStock = (int) $pdo->query("SELECT COUNT(*) FROM inventory_items WHERE quantity <= reorder_level")->fetchColumn();

$recentDecisions = $pdo->query(
    "SELECT id, title, assigned_to, deadline, status FROM decisions ORDER BY created_at DESC LIMIT 5")->fetchAll();
$latestAlerts = $pdo->query(
    "SELECT id, title, severity, source, status, created_at FROM alerts ORDER BY created_at DESC LIMIT 5")->fetchAll();

json_response([
    'success' => true,
    'period' => ['from' => $from, 'to' => $to, 'preset' => $period],
    'cards' => [
        'occupancy_rate' => $m['occupancy_rate'],
        'rooms_sold' => $m['rooms_sold'],
        'total_rooms' => $m['total_rooms'],
        'revenue' => $revenue,
        'expenses' => $expenses,
        'net' => $revenue - $expenses,
        'reservations' => (int) ($resv['total'] ?? 0),
        'arrivals' => (int) ($resv['arrivals'] ?? 0),
        'departures' => (int) ($resv['departures'] ?? 0),
        'adr' => $m['adr'],
        'revpar' => $m['revpar'],
        'satisfaction' => $fb['avg_rating'] !== null ? round((float) $fb['avg_rating'], 2) : null,
        'satisfaction_responses' => (int) ($fb['responses'] ?? 0),
        'open_tasks' => $openMaint + $pendingHk,
        'unread_alerts' => $unreadAlerts,
    ],
    'trend' => $trend,
    'departments' => $deptRows,
    'kpis' => $kpis,
    'outstanding' => [
        'maintenance_open' => $openMaint,
        'housekeeping_pending' => $pendingHk,
        'complaints_open' => $openComplaints,
        'decisions_overdue' => $overdueDecisions,
        'low_stock' => $lowStock,
    ],
    'recent_decisions' => $recentDecisions,
    'latest_alerts' => $latestAlerts,
]);
