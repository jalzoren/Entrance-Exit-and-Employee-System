<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); 


require_once __DIR__ . '/../config/db.php'; 

try {
   
    $stmt = $pdo->query("
        SELECT 
            eventtype_ID,
            eventtype AS eventtype_name
        FROM eventtype
        ORDER BY eventtype_name
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Failed to load event types',
        'error'   => $e->getMessage(),
    ]);
}