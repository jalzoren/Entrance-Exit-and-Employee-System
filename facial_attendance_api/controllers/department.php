<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

try {
    $q1 = "SELECT department_ID, department_name FROM department ORDER BY department_name";
    $stmt = $conn->prepare($q1);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e1) {
    try {
        $q2 = "SELECT department_ID, department_name FROM departments ORDER BY department_name";
        $stmt = $conn->prepare($q2);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e2) {
        echo json_encode([
            "error" => true,
            "message" => $e2->getMessage()
        ]);
    }
}
