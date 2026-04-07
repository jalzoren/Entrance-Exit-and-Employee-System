<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employee_id = intval($_GET['employee_id'] ?? 0);
    
    if ($employee_id <= 0) {
        echo json_encode(['error' => true, 'message' => 'Invalid employee ID.']);
        exit;
    }

    $stmt = $conn->prepare("SELECT photo_ID, photo_data FROM employee_photos WHERE employee_ID = ? ORDER BY photo_ID ASC LIMIT 5");
    $stmt->execute([$employee_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Optional: Try to decode embeddings for easier frontend use
    foreach ($results as &$row) {
        $decoded = json_decode($row['photo_data'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $row['embedding'] = $decoded;        // Nice format for React
            $row['is_embedding'] = true;
        } else {
            $row['is_embedding'] = false;
        }
    }

    echo json_encode($results);

} elseif ($method === 'POST') {
    $raw_input = file_get_contents('php://input');
    $body = json_decode($raw_input, true);

    if ($body === null) {
        echo json_encode(['error' => true, 'message' => 'Invalid JSON input or request body too large.']);
        exit;
    }

    $employee_id = intval($body['employee_id'] ?? 0);
    $photos = $body['photos'] ?? [];   // Now expects array of embeddings (arrays of numbers)

    if ($employee_id <= 0) {
        echo json_encode(['error' => true, 'message' => 'Invalid employee ID.']);
        exit;
    }

    try {
        $conn->beginTransaction();

        // Clear existing photos/encodings
        $conn->prepare("DELETE FROM employee_photos WHERE employee_ID = ?")->execute([$employee_id]);

        $stmt = $conn->prepare("INSERT INTO employee_photos (employee_ID, photo_data, created_at) VALUES (?, ?, NOW())");

        foreach (array_slice($photos, 0, 5) as $embedding) {
            if (!empty($embedding) && is_array($embedding)) {
                // Convert embedding array to JSON string before saving
                $embeddingJson = json_encode($embedding);
                $stmt->execute([$employee_id, $embeddingJson]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Face embeddings saved successfully.']);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
}
?>