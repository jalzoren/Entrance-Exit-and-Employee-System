<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER['REQUEST_METHOD'];


// ======================================================
// GET ATTENDANCE (OPTIONAL FILTER BY event_id)
// ======================================================
if ($method === 'GET') {

    $event_id = $_GET["event_id"] ?? null;

    try {

        $query = "
            SELECT 
                a.attendance_ID,
                a.employee_ID,
                a.event_ID,
                a.time_in,
                a.time_out,
                a.status,
                e.employee_code,
                CONCAT(e.employee_firstName, ' ', e.employee_LastName) AS fullName
            FROM attendance a
            JOIN employees e ON a.employee_ID = e.employee_ID
        ";

        if ($event_id) {
            $query .= " WHERE a.event_ID = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$event_id]);
        } else {
            $stmt = $conn->prepare($query);
            $stmt->execute();
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $rows
        ]);

    } catch (Exception $e) {
        echo json_encode([
            "error" => true,
            "message" => $e->getMessage()
        ]);
    }

    exit;
}


// ======================================================
// MARK ATTENDANCE (CHECK IN / CHECK OUT)
// ======================================================
if ($method === 'POST') {

    $data = json_decode(file_get_contents("php://input"), true);

    $employee_id     = $data["employee_id"] ?? null;
    $event_id        = $data["event_id"] ?? null;
    $attendance_type = $data["attendance_type"] ?? null;

    if (!$employee_id || !$event_id || !$attendance_type) {
        echo json_encode([
            "error" => true,
            "message" => "employee_id, event_id and attendance_type required"
        ]);
        exit;
    }

    try {

        $currentTime = date("Y-m-d H:i:s");

        // Check existing record
        $checkQuery = "
            SELECT attendance_ID, time_in, time_out
            FROM attendance
            WHERE employee_ID = ? AND event_ID = ?
        ";

        $stmt = $conn->prepare($checkQuery);
        $stmt->execute([$employee_id, $event_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);


        // ==================================================
        // CHECK IN
        // ==================================================
        if ($attendance_type === "Check In") {

            if ($existing) {
                echo json_encode([
                    "error" => true,
                    "message" => "Already checked in"
                ]);
                exit;
            }

            $insertQuery = "
                INSERT INTO attendance
                (employee_ID, event_ID, time_in, status)
                VALUES (?, ?, ?, ?)
            ";

            $stmt = $conn->prepare($insertQuery);
            $stmt->execute([
                $employee_id,
                $event_id,
                $currentTime,
                "On Time"
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Checked in successfully"
            ]);
            exit;
        }


        // ==================================================
        // CHECK OUT
        // ==================================================
        if ($attendance_type === "Check Out") {

            if (!$existing) {
                echo json_encode([
                    "error" => true,
                    "message" => "Cannot check out without check in"
                ]);
                exit;
            }

            if ($existing["time_out"]) {
                echo json_encode([
                    "error" => true,
                    "message" => "Already checked out"
                ]);
                exit;
            }

            $updateQuery = "
                UPDATE attendance
                SET time_out = ?
                WHERE attendance_ID = ?
            ";

            $stmt = $conn->prepare($updateQuery);
            $stmt->execute([
                $currentTime,
                $existing["attendance_ID"]
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Checked out successfully"
            ]);
            exit;
        }

        echo json_encode([
            "error" => true,
            "message" => "Invalid attendance type"
        ]);

    } catch (Exception $e) {
        echo json_encode([
            "error" => true,
            "message" => $e->getMessage()
        ]);
    }

    exit;
}


// ======================================================
// INVALID METHOD
// ======================================================
echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);