<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php'; // Correct path to config

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employee_id = intval($_GET['employee_id'] ?? 0);
    $stmt = $conn->prepare("SELECT photo_ID, photo_data FROM employee_photos WHERE employee_ID = ? ORDER BY photo_ID ASC LIMIT 5");
    $stmt->execute([$employee_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} elseif ($method === 'POST') {
    $raw_input = file_get_contents('php://input');
    $body      = json_decode($raw_input, true);
    
    if ($body === null) {
        echo json_encode(['error' => true, 'message' => 'Invalid JSON input or request body too large.']);
        exit;
    }

    $employee_id = intval($body['employee_id'] ?? 0);
    $photos      = $body['photos'] ?? [];

    if ($employee_id <= 0) {
        echo json_encode(['error' => true, 'message' => 'Invalid employee ID.']);
        exit;
    }

    try {
        $conn->beginTransaction();

        // Replace all existing photos for this employee
        $conn->prepare("DELETE FROM employee_photos WHERE employee_ID = ?")->execute([$employee_id]);

        $stmt = $conn->prepare("INSERT INTO employee_photos (employee_ID, photo_data, created_at) VALUES (?, ?, NOW())");
        foreach (array_slice($photos, 0, 5) as $photo) {
            if (!empty($photo)) {
                $stmt->execute([$employee_id, $photo]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
}
?>