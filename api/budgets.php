<?php
// api/budgets.php — Budgets & Targets, read-only.
// Budgets and KPI targets are maintained by the Finance Department
// module, so this endpoint only serves reads:
// GET    ?kind=budgets&month=YYYY-MM     budgets for a month, with amount spent
// GET    ?kind=targets&from&to           KPI targets, with actuals for the range
require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../config/database.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];
$body = read_json_body();
$kind = $body['kind'] ?? ($_GET['kind'] ?? 'budgets');

if ($method === 'GET' && $kind === 'budgets') {
    $month = $_GET['month'] ?? date('Y-m');
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) json_error('month must be YYYY-MM', 422);
    $first = $month . '-01';
    $stmt = $pdo->prepare(
        "SELECT b.*, COALESCE(d.name, 'Hotel-wide') department FROM budgets b
          LEFT JOIN departments d ON d.id = b.department_id
          WHERE b.period_month = :first ORDER BY department, b.category");
    $stmt->execute(['first' => $first]);
    $rows = [];
    foreach ($stmt->fetchAll() as $b) {
        // Amount spent = expense transactions in the same category (and
        // department, when the budget is department-scoped) that month.
        $sql = "SELECT COALESCE(SUM(amount),0) FROM financial_transactions
                 WHERE type = 'expense' AND category = :cat
                   AND txn_date >= :first AND txn_date < DATE_ADD(:first, INTERVAL 1 MONTH)";
        $args = ['cat' => $b['category'], 'first' => $first];
        if ($b['department_id'] !== null) { $sql .= " AND department_id = :dept"; $args['dept'] = $b['department_id']; }
        $s = $pdo->prepare($sql); $s->execute($args);
        $spent = (float) $s->fetchColumn();
        $amount = (float) $b['amount'];
        $rows[] = $b + [
            'amount' => $amount, 'spent' => $spent, 'remaining' => $amount - $spent,
            'used_pct' => $amount > 0 ? round($spent / $amount * 100, 1) : 0,
        ];
    }
    json_response(['success' => true, 'month' => $month, 'data' => $rows]);
}

if ($method === 'GET' && $kind === 'targets') {
    ['from' => $from, 'to' => $to] = period_range();
    $rows = [];
    foreach ($pdo->query("SELECT k.*, d.name department FROM kpi_targets k LEFT JOIN departments d ON d.id = k.department_id ORDER BY k.id")->fetchAll() as $k) {
        $actual = kpi_actual($pdo, $k['name'], $from, $to);
        $target = (float) $k['target_value'];
        $lowerBetter = str_contains(strtolower($k['name']), 'response time');
        $attain = ($actual !== null && $target > 0)
            ? round(min(100, $lowerBetter ? $target / max($actual, 0.01) * 100 : $actual / $target * 100), 1) : null;
        $rows[] = $k + ['target_value' => $target, 'actual' => $actual, 'attainment' => $attain];
    }
    json_response(['success' => true, 'period' => ['from' => $from, 'to' => $to], 'data' => $rows]);
}

json_error('Unsupported request', 405);
