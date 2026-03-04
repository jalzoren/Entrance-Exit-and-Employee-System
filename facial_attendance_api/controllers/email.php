<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

try {
    $q1 = "SELECT email_ID, email_address AS email FROM email ORDER BY email_address";
    $stmt = $conn->prepare($q1);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e1) {
    try {
        $q2 = "SELECT email_ID, email FROM email ORDER BY email";
        $stmt = $conn->prepare($q2);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e2) {
        try {
            $q3 = "SELECT email_ID, email_address AS email FROM emails ORDER BY email_address";
            $stmt = $conn->prepare($q3);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e3) {
            try {
                $q4 = "SELECT email_ID, email FROM emails ORDER BY email";
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
