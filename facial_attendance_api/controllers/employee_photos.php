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

    $stmt = $conn->prepare("SELECT photo_ID, photo_data, photo_png FROM employee_photos 
                            WHERE employee_ID = ? ORDER BY photo_ID ASC LIMIT 5");
    $stmt->execute([$employee_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as &$row) {
        // Decode embedding for frontend (face recognition)
        $decoded = json_decode($row['photo_data'] ?? '', true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $row['embedding'] = $decoded;
        }

        // Prepare preview image for display
        if (!empty($row['photo_png'])) {
            // If it doesn't already have data: prefix, add it
            if (strpos($row['photo_png'], 'data:image') === false) {
                $row['preview'] = 'data:image/jpeg;base64,' . $row['photo_png'];
            } else {
                $row['preview'] = $row['photo_png'];
            }
        } else {
            $row['preview'] = null;
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
    $photos = $body['photos'] ?? [];   // array of { embedding: [...], photo_png: "data:image/jpeg;base64,..." }

    if ($employee_id <= 0) {
        echo json_encode(['error' => true, 'message' => 'Invalid employee ID.']);
        exit;
    }

    try {
        $conn->beginTransaction();

        // Clear old photos
        $conn->prepare("DELETE FROM employee_photos WHERE employee_ID = ?")->execute([$employee_id]);

        $stmt = $conn->prepare("INSERT INTO employee_photos (employee_ID, photo_data, photo_png, created_at) 
                                VALUES (?, ?, ?, NOW())");

        foreach (array_slice($photos, 0, 5) as $item) {
            if (!empty($item['embedding']) && is_array($item['embedding'])) {
                $embeddingJson = json_encode($item['embedding']);
                
                // Clean photo_png - remove data URL prefix to save space
                $photoPng = $item['photo_png'] ?? null;
                if ($photoPng && strpos($photoPng, 'base64,') !== false) {
                    $photoPng = explode('base64,', $photoPng)[1];
                }

                $stmt->execute([$employee_id, $embeddingJson, $photoPng]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Photos and embeddings saved successfully.']);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['error' => true, 'message' => $e->getMessage()]);
    }
}
?>