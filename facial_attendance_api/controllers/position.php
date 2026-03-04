<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

try {
    $q1 = "SELECT position_ID, position_name FROM position ORDER BY position_name";
    $stmt = $conn->prepare($q1);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e1) {
    try {
        $q2 = "SELECT position_ID, position AS position_name FROM position ORDER BY position";
        $stmt = $conn->prepare($q2);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e2) {
        try {
            $q3 = "SELECT position_ID, position_name FROM positions ORDER BY position_name";
            $stmt = $conn->prepare($q3);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e3) {
            try {
                $q4 = "SELECT position_ID, position AS position_name FROM positions ORDER BY position";
                $stmt = $conn->prepare($q4);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (Exception $e4) {
                echo json_encode([
                    "error" => true,
                    "message" => $e4->getMessage()
                ]);
            }
        }
    }
}
