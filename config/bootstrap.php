<?php
// config/bootstrap.php — shared JSON API bootstrap for the Management
// Department module. This module has NO login page of its own: accounts
// and authentication belong to the system's login module, so these
// endpoints serve the module's pages directly on the hotel network.
header('Content-Type: application/json; charset=utf-8');

// All timestamps are Philippine time (UTC+8, no daylight saving).
date_default_timezone_set('Asia/Manila');

function json_response($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code = 400, array $extra = []): void {
    json_response(array_merge(['success' => false, 'error' => $message], $extra), $code);
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---------------------------------------------------------------------------
// Reporting periods. Every report/dashboard endpoint accepts:
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD          explicit range, or
//   ?period=daily|weekly|monthly|yearly    preset ending today
// daily = today only; weekly = the 7 days ending today; monthly = the
// current calendar month up to today; yearly = Jan 1 of this year to today.
// ---------------------------------------------------------------------------
function period_range(): array {
    $today = date('Y-m-d');
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $period = $_GET['period'] ?? null;
    if ($from && $to && strtotime($from) && strtotime($to)) {
        return ['from' => date('Y-m-d', strtotime($from)), 'to' => date('Y-m-d', strtotime($to)), 'period' => 'custom'];
    }
    switch ($period) {
        case 'daily':
            return ['from' => $today, 'to' => $today, 'period' => 'daily'];
        case 'yearly':
            return ['from' => date('Y-01-01'), 'to' => $today, 'period' => 'yearly'];
        case 'monthly':
            return ['from' => date('Y-m-01'), 'to' => $today, 'period' => 'monthly'];
        case 'weekly':
        default:
            return ['from' => date('Y-m-d', strtotime('-6 days')), 'to' => $today, 'period' => 'weekly'];
    }
}

// The equal-length period immediately before [$from, $to] (for the
// historical comparison report).
function prev_period(string $from, string $to): array {
    $days = (int) ((strtotime($to) - strtotime($from)) / 86400) + 1;
    $pto = date('Y-m-d', strtotime($from . ' -1 day'));
    $pfrom = date('Y-m-d', strtotime($pto . ' -' . ($days - 1) . ' days'));
    return ['from' => $pfrom, 'to' => $pto];
}

function period_days(string $from, string $to): int {
    return (int) ((strtotime($to) - strtotime($from)) / 86400) + 1;
}

function department_filter(): ?int {
    $d = $_GET['department'] ?? null;
    return ($d !== null && $d !== '' && is_numeric($d)) ? (int) $d : null;
}

// ---------------------------------------------------------------------------
// Shared hotel metrics. Occupied room-nights count reservations in an
// active status (confirmed / checked in / checked out) overlapping the
// period; each stay contributes only its nights inside the period.
// ---------------------------------------------------------------------------
function total_rooms(PDO $pdo): int {
    return (int) $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
}

function occupied_room_nights(PDO $pdo, string $from, string $to): int {
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(DATEDIFF(LEAST(check_out, DATE_ADD(:to, INTERVAL 1 DAY)),
                                      GREATEST(check_in, :from))), 0)
           FROM reservations
          WHERE status IN ('confirmed','checked_in','checked_out')
            AND check_in <= :to2 AND check_out > :from2"
    );
    $stmt->execute(['from' => $from, 'to' => $to, 'from2' => $from, 'to2' => $to]);
    return (int) $stmt->fetchColumn();
}

function txn_total(PDO $pdo, string $type, string $from, string $to, ?int $dept = null, ?string $category = null): float {
    $sql = "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
             WHERE type = :type AND txn_date BETWEEN :from AND :to";
    $args = ['type' => $type, 'from' => $from, 'to' => $to];
    if ($dept !== null) { $sql .= " AND department_id = :dept"; $args['dept'] = $dept; }
    if ($category !== null) { $sql .= " AND category = :cat"; $args['cat'] = $category; }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    return (float) $stmt->fetchColumn();
}

// Occupancy / ADR / RevPAR bundle for a period. Room revenue comes from
// the Accounts & Finance daily totals (financial_transactions, category
// 'Rooms'), so ADR = room revenue / rooms sold and RevPAR = ADR x
// occupancy rate, as in standard hotel reporting.
function hotel_metrics(PDO $pdo, string $from, string $to): array {
    $rooms = total_rooms($pdo);
    $days = period_days($from, $to);
    $sold = occupied_room_nights($pdo, $from, $to);
    $capacity = max(1, $rooms * $days);
    $roomRevenue = txn_total($pdo, 'revenue', $from, $to, null, 'Rooms');
    $occupancy = $capacity > 0 ? round($sold / $capacity * 100, 1) : 0.0;
    $adr = $sold > 0 ? round($roomRevenue / $sold, 2) : 0.0;
    $revpar = $capacity > 0 ? round($roomRevenue / $capacity, 2) : 0.0;
    return [
        'total_rooms' => $rooms,
        'days' => $days,
        'rooms_sold' => $sold,
        'capacity_nights' => $rooms * $days,
        'occupancy_rate' => $occupancy,
        'room_revenue' => $roomRevenue,
        'adr' => $adr,
        'revpar' => $revpar,
    ];
}

// Actual value of a KPI target over a period, matched by the target's
// name; null when the module cannot measure that KPI automatically.
function kpi_actual(PDO $pdo, string $name, string $from, string $to): ?float {
    $n = strtolower($name);
    if (str_contains($n, 'occupancy')) {
        return hotel_metrics($pdo, $from, $to)['occupancy_rate'];
    }
    if (str_contains($n, 'satisfaction')) {
        $stmt = $pdo->prepare("SELECT AVG(rating) FROM guest_feedback WHERE DATE(created_at) BETWEEN :from AND :to");
        $stmt->execute(['from' => $from, 'to' => $to]);
        $v = $stmt->fetchColumn();
        return $v === null ? null : round((float) $v, 2);
    }
    if (str_contains($n, 'average daily rate') || $n === 'adr' || str_contains($n, '(adr)')) {
        return hotel_metrics($pdo, $from, $to)['adr'];
    }
    if (str_contains($n, 'revpar') || str_contains($n, 'revenue per available')) {
        return hotel_metrics($pdo, $from, $to)['revpar'];
    }
    if (str_contains($n, 'housekeeping')) {
        $stmt = $pdo->prepare(
            "SELECT SUM(status = 'completed') / NULLIF(COUNT(*), 0) * 100 FROM housekeeping_tasks
              WHERE scheduled_date BETWEEN :from AND :to AND status <> 'cancelled'");
        $stmt->execute(['from' => $from, 'to' => $to]);
        $v = $stmt->fetchColumn();
        return $v === null ? null : round((float) $v, 1);
    }
    if (str_contains($n, 'maintenance') && (str_contains($n, 'response') || str_contains($n, 'completion time'))) {
        $stmt = $pdo->prepare(
            "SELECT AVG(TIMESTAMPDIFF(MINUTE, reported_at, completed_at)) / 60 FROM maintenance_requests
              WHERE status = 'completed' AND completed_at IS NOT NULL
                AND DATE(reported_at) BETWEEN :from AND :to");
        $stmt->execute(['from' => $from, 'to' => $to]);
        $v = $stmt->fetchColumn();
        return $v === null ? null : round((float) $v, 1);
    }
    if (str_contains($n, 'complaint')) {
        $stmt = $pdo->prepare(
            "SELECT SUM(status = 'resolved') / NULLIF(COUNT(*), 0) * 100 FROM complaints_incidents
              WHERE DATE(created_at) BETWEEN :from AND :to");
        $stmt->execute(['from' => $from, 'to' => $to]);
        $v = $stmt->fetchColumn();
        return $v === null ? null : round((float) $v, 1);
    }
    return null;
}

// Never leak stack traces to API consumers; log server-side instead.
set_exception_handler(function (Throwable $e) {
    error_log('[management] ' . $e->getMessage());
    json_error('Server error', 500);
});
