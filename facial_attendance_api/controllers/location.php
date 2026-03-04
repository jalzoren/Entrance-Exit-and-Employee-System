<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

try {
    $query1 = "SELECT location_ID, location_name FROM location ORDER BY location_name";
    $stmt = $conn->prepare($query1);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
    exit;
} catch (Exception $e1) {
    try {
        $query2 = "SELECT location_ID, location AS location_name FROM location ORDER BY location";
        $stmt = $conn->prepare($query2);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rows);
        exit;
    } catch (Exception $e2) {
        echo json_encode([
            "error" => true,
            "message" => $e2->getMessage()
        ]);
        exit;
    }
}
