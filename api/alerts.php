<?php
// api/alerts.php — Operational alerts and notifications.
// GET    ?status&severity   list, newest first (+ unread count)
// POST   {...}              raise an alert manually
// PUT    {id, status}       mark read / resolved (resolved stamps resolved_at)
// DELETE ?id=N              dismiss permanently
require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../config/database.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT * FROM alerts WHERE 1=1";
    $args = [];
    if (!empty($_GET['status'])) { $sql .= " AND status = :status"; $args['status'] = $_GET['status']; }
    if (!empty($_GET['severity'])) { $sql .= " AND severity = :severity"; $args['severity'] = $_GET['severity']; }
    $sql .= " ORDER BY (status = 'resolved'), created_at DESC LIMIT 200";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    $unread = (int) $pdo->query("SELECT COUNT(*) FROM alerts WHERE status = 'unread'")->fetchColumn();
    json_response(['success' => true, 'data' => $stmt->fetchAll(), 'unread' => $unread]);
}

$body = read_json_body();

if ($method === 'POST') {
    $title = trim($body['title'] ?? '');
    if ($title === '') json_error('Title is required', 422);
    $stmt = $pdo->prepare(
        "INSERT INTO alerts (title, message, severity, source) VALUES (:t, :m, :s, :src)");
    $stmt->execute([
        't' => $title, 'm' => $body['message'] ?? null,
        's' => in_array($body['severity'] ?? 'info', ['info', 'warning', 'critical'], true) ? $body['severity'] : 'info',
        'src' => $body['source'] ?? 'Management',
    ]);
    json_response(['success' => true, 'id' => (int) $pdo->lastInsertId()]);
}

if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? 0);
    $status = $body['status'] ?? null;
    if (!$id || !in_array($status, ['unread', 'read', 'resolved'], true)) {
        json_error('id and a valid status are required', 422);
    }
    $pdo->prepare(
        "UPDATE alerts SET status = :s,
                resolved_at = CASE WHEN :s2 = 'resolved' THEN NOW() ELSE resolved_at END
          WHERE id = :id")->execute(['s' => $status, 's2' => $status, 'id' => $id]);
    json_response(['success' => true]);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) json_error('id is required', 422);
    $pdo->prepare("DELETE FROM alerts WHERE id = :id")->execute(['id' => $id]);
    json_response(['success' => true]);
}

json_error('Unsupported request', 405);
