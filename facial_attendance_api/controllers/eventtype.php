<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

try {
    // Try schema with eventtype_name column
    $q1 = "
        SELECT 
            eventtype_ID,
            eventtype_name
        FROM eventtype
        ORDER BY eventtype_name
    ";
    $stmt = $conn->prepare($q1);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
} catch (Exception $e) {
    // Fallback to schema with eventtype column
    try {
        $q2 = "
            SELECT 
                eventtype_ID,
                eventtype AS eventtype_name
            FROM eventtype
            ORDER BY eventtype
        ";
        $stmt = $conn->prepare($q2);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rows);
    } catch (Exception $e2) {
        http_response_code(500);
        echo json_encode([
            'message' => 'Failed to load event types',
            'error'   => $e2->getMessage(),
        ]);
    }
}
