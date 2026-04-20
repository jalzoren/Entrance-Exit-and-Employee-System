<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$request_method = $_SERVER['REQUEST_METHOD'];


// ======================================================
// GET ATTENDANCE (OPTIONAL FILTER BY event_id)
// ======================================================
if ($request_method === 'GET') {

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
                a.method,
                e.employee_code,
                CONCAT(e.employee_firstName, ' ', e.employee_LastName) AS fullName,
                d.department_name,
                ev.event_name,
                l.location AS location_name
            FROM attendance a
            JOIN employees e ON a.employee_ID = e.employee_ID
            LEFT JOIN department d ON e.department_ID = d.department_ID
            LEFT JOIN events ev ON a.event_ID = ev.event_ID
            LEFT JOIN location l ON ev.location_ID = l.location_ID
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
if ($request_method === 'POST') {

    $data = json_decode(file_get_contents("php://input"), true);

    $employee_id     = $data["employee_id"] ?? null;
    $event_id        = $data["event_id"] ?? null;
    $attendance_type = $data["attendance_type"] ?? null;
    $method          = $data["method"] ?? 'face';

    if (!$employee_id || !$event_id || !$attendance_type) {
        echo json_encode([
            "error" => true,
            "message" => "employee_id, event_id and attendance_type required"
        ]);
        exit;
    }

    try {
        // Event must be active before accepting attendance.
        $eventCheck = $conn->prepare("SELECT COALESCE(is_active, 1) AS is_active FROM events WHERE event_ID = ?");
        $eventCheck->execute([$event_id]);
        $eventRow = $eventCheck->fetch(PDO::FETCH_ASSOC);
        if (!$eventRow || (int)$eventRow["is_active"] !== 1) {
            echo json_encode([
                "error" => true,
                "message" => "This event is currently deactivated."
            ]);
            exit;
        }

        // If setup exists, only selected employees are allowed.
        $targetCountStmt = $conn->prepare("SELECT COUNT(*) FROM event_target_employees WHERE event_ID = ?");
        $targetCountStmt->execute([$event_id]);
        $targetCount = (int)$targetCountStmt->fetchColumn();

        if ($targetCount > 0) {
            $allowedStmt = $conn->prepare("SELECT COUNT(*) FROM event_target_employees WHERE event_ID = ? AND employee_ID = ?");
            $allowedStmt->execute([$event_id, $employee_id]);
            $isAllowed = (int)$allowedStmt->fetchColumn() > 0;
            if (!$isAllowed) {
                echo json_encode([
                    "error" => true,
                    "message" => "Employee is not included in this event setup."
                ]);
                exit;
            }
        }

        $currentTime = date("Y-m-d H:i:s");

        // Debug log (can be checked in PHP error log)
        // error_log("Attendance Request: EmpID=$employee_id, EvID=$event_id, Type=$attendance_type");

        // Check for any existing record for this employee and event
        $checkQuery = "
            SELECT attendance_ID, time_in, time_out
            FROM attendance
            WHERE employee_ID = ? AND event_ID = ?
            ORDER BY time_in DESC LIMIT 1
        ";

        $stmt = $conn->prepare($checkQuery);
        $stmt->execute([$employee_id, $event_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);


        // ==================================================
        // CHECK IN
        // ==================================================
        if ($attendance_type === "Check In") {

            if ($existing) {
                $isCheckOutEmpty = empty($existing["time_out"]) || $existing["time_out"] === '0000-00-00 00:00:00';
                
                if (!$isCheckOutEmpty) {
                    echo json_encode([
                        "error" => true,
                        "message" => "Attendance completed for today (Already Checked Out)"
                    ]);
                } else {
                    echo json_encode([
                        "error" => true,
                        "message" => "Already checked in for this event"
                    ]);
                }
                exit;
            }

            // --- Calculate Status dynamically based on Event Time ---
            $status = "On Time";
            try {
                $evStmt = $conn->prepare("SELECT event_time, time FROM events WHERE event_ID = ?");
                $evStmt->execute([$event_id]);
                $ev = $evStmt->fetch(PDO::FETCH_ASSOC);
                
                $schedTimeStr = $ev["event_time"] ?? ($ev["time"] ?? null);
                if ($schedTimeStr) {
                    $schedTs = strtotime(date("Y-m-d ") . $schedTimeStr);
                    $currTs  = strtotime($currentTime);
                    // If more than 15 minutes late
                    if ($currTs > ($schedTs + 900)) {
                        $status = "Late";
                    }
                }
            } catch (Exception $e_ev) {
                // fallback to "On Time"
            }

            // Primary Attempt: status column
            try {
                $insertQuery = "
                    INSERT INTO attendance
                    (employee_ID, event_ID, time_in, status, method)
                    VALUES (?, ?, ?, ?, ?)
                ";
                $stmt = $conn->prepare($insertQuery);
                $stmt->execute([ $employee_id, $event_id, $currentTime, $status, $method ]);
            } catch (Exception $e1) {
                // Fallback Attempt: attendance_status column
                try {
                    $insertQuery = "
                        INSERT INTO attendance
                        (employee_ID, event_ID, time_in, attendance_status, method)
                        VALUES (?, ?, ?, ?, ?)
                    ";
                    $stmt = $conn->prepare($insertQuery);
                    $stmt->execute([ $employee_id, $event_id, $currentTime, $status, $method ]);
                } catch (Exception $e2) {
                    throw new Exception("Could not insert attendance: " . $e1->getMessage());
                }
            }

            echo json_encode([
                "success" => true,
                "message" => "Checked in successfully as " . $status,
                "status"  => $status
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

            $isAlreadyCheckedOut = !empty($existing["time_out"]) && $existing["time_out"] !== '0000-00-00 00:00:00';
            if ($isAlreadyCheckedOut) {
                echo json_encode([
                    "error" => true,
                    "message" => "Already checked out for this event"
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