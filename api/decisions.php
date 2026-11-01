<?php
// api/decisions.php — Management decision tracking (action tracking).
// GET    ?status&department&q   list, newest first, with overdue flag
// POST   {...}                  record a decision
// PUT    {id, ...}              update (status completed stamps completed_at)
// DELETE ?id=N                  delete
require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../config/database.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT dc.*, COALESCE(d.name, 'Hotel-wide') department,
                   (dc.status <> 'completed' AND dc.deadline IS NOT NULL AND dc.deadline < CURDATE()) overdue
              FROM decisions dc LEFT JOIN departments d ON d.id = dc.department_id WHERE 1=1";
    $args = [];
    if (!empty($_GET['status'])) { $sql .= " AND dc.status = :status"; $args['status'] = $_GET['status']; }
    $dept = department_filter();
    if ($dept !== null) { $sql .= " AND dc.department_id = :dept"; $args['dept'] = $dept; }
    if (!empty($_GET['q'])) {
        $sql .= " AND (dc.title LIKE :q OR dc.assigned_to LIKE :q OR dc.decided_by LIKE :q)";
        $args['q'] = '%' . $_GET['q'] . '%';
    }
    $sql .= " ORDER BY dc.status = 'completed', dc.deadline IS NULL, dc.deadline, dc.created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    $rows = array_map(fn($r) => $r + ['overdue' => (bool) $r['overdue'], 'approved' => (bool) ($r['approved'] ?? 0)], $stmt->fetchAll());
    $summary = [
        'total' => count($rows),
        'pending' => count(array_filter($rows, fn($r) => $r['status'] === 'pending')),
        'in_progress' => count(array_filter($rows, fn($r) => $r['status'] === 'in_progress')),
        'completed' => count(array_filter($rows, fn($r) => $r['status'] === 'completed')),
        'overdue' => count(array_filter($rows, fn($r) => $r['overdue'])),
        'for_approval' => count(array_filter($rows, fn($r) => $r['status'] === 'completed' && !$r['approved'])),
    ];
    json_response(['success' => true, 'data' => $rows, 'summary' => $summary]);
}

$body = read_json_body();

if ($method === 'POST' || $method === 'PUT') {
    $fields = [
        'title' => trim($body['title'] ?? ''),
        'description' => $body['description'] ?? null,
        'decided_by' => $body['decided_by'] ?? null,
        'assigned_to' => $body['assigned_to'] ?? null,
        'department_id' => ($body['department_id'] ?? null) ?: null,
        'deadline' => ($body['deadline'] ?? null) ?: null,
        'status' => in_array($body['status'] ?? 'pending', ['pending', 'in_progress', 'completed'], true)
            ? $body['status'] : 'pending',
    ];
    // Approval only sticks on a completed decision; reopening one clears
    // its approval so it must be approved again after it is re-done.
    $fields['approved'] = ($fields['status'] === 'completed' && !empty($body['approved'])) ? 1 : 0;
    if ($fields['title'] === '') json_error('Title is required', 422);
    if ($method === 'POST') {
        $stmt = $pdo->prepare(
            "INSERT INTO decisions (title, description, decided_by, assigned_to, department_id, deadline, status, completed_at, approved)
             VALUES (:title, :description, :decided_by, :assigned_to, :department_id, :deadline, :status,
                     CASE WHEN :status = 'completed' THEN NOW() ELSE NULL END, :approved)");
        $stmt->execute($fields);
        json_response(['success' => true, 'id' => (int) $pdo->lastInsertId()]);
    }
    $id = (int) ($body['id'] ?? 0);
    if (!$id) json_error('id is required', 422);
    $fields['id'] = $id;
    $stmt = $pdo->prepare(
        "UPDATE decisions SET title = :title, description = :description, decided_by = :decided_by,
                assigned_to = :assigned_to, department_id = :department_id, deadline = :deadline,
                status = :status, approved = :approved,
                completed_at = CASE WHEN :status = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END
          WHERE id = :id");
    $stmt->execute($fields);
    json_response(['success' => true]);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) json_error('id is required', 422);
    $pdo->prepare("DELETE FROM decisions WHERE id = :id")->execute(['id' => $id]);
    json_response(['success' => true]);
}

json_error('Unsupported request', 405);
