<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER['REQUEST_METHOD'];

function columnExists($conn, $table, $column) {
    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return false;
    }
}

function ensureEventSetupSchema($conn) {
    try {
        if (!columnExists($conn, "events", "is_active")) {
            $conn->exec("ALTER TABLE events ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
        }
    } catch (Exception $e) { }

    try {
        $conn->exec("
            CREATE TABLE IF NOT EXISTS event_target_employees (
                target_ID INT AUTO_INCREMENT PRIMARY KEY,
                event_ID INT NOT NULL,
                employee_ID INT NOT NULL,
                UNIQUE KEY uniq_event_employee (event_ID, employee_ID)
            )
        ");
    } catch (Exception $e) { }
}

// Handle preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}


// ======================================================
// GET ALL EVENTS
// ======================================================
if ($method === 'GET') {
    ensureEventSetupSchema($conn);

    if (isset($_GET["id"]) && isset($_GET["include_targets"])) {
        $event_id = $_GET["id"];
        try {
            $hasStatusCol = columnExists($conn, "events", "status");
            if ($hasStatusCol) {
                $eventStmt = $conn->prepare("SELECT event_ID, COALESCE(is_active, 1) AS is_active, COALESCE(status, '') AS status FROM events WHERE event_ID = ?");
            } else {
                $eventStmt = $conn->prepare("SELECT event_ID, COALESCE(is_active, 1) AS is_active FROM events WHERE event_ID = ?");
            }
            $eventStmt->execute([$event_id]);
            $eventRow = $eventStmt->fetch(PDO::FETCH_ASSOC);

            $targetStmt = $conn->prepare("SELECT employee_ID FROM event_target_employees WHERE event_ID = ?");
            $targetStmt->execute([$event_id]);
            $targets = $targetStmt->fetchAll(PDO::FETCH_COLUMN);

            $out = [
                "event_ID" => $event_id,
                "is_active" => (int)($eventRow["is_active"] ?? 0),
                "employee_ids" => array_map("intval", $targets ?: [])
            ];
            if (!empty($eventRow) && array_key_exists('status', $eventRow)) {
                $out['status'] = $eventRow['status'];
            }
            echo json_encode($out);
        } catch (Exception $e) {
            echo json_encode([
                "error" => true,
                "message" => $e->getMessage()
            ]);
        }
        exit;
    }

    // --- AUTO-ARCHIVE PAST EVENTS ---
    // Move events to archive if they are from a previous day.
    // We keep today's events active until the day is fully over or past their end time.
    try {
        $today = date("Y-m-d");
        $nowTime = date("H:i:s");
        
        // 1. Archive events where event_date < today
        $conn->exec("UPDATE events SET is_archived = 1 WHERE (event_date < '$today' OR DATE(date) < '$today') AND is_archived = 0");

        // 2. Archive today's events if they are past their time_end
        // If time_end is NULL, we use a 6-hour grace period after event_time.
        $sixHoursAgo = date("H:i:s", strtotime("-6 hours"));
        
        $conn->exec("
            UPDATE events 
            SET is_archived = 1 
            WHERE (event_date = '$today' OR DATE(date) = '$today') 
              AND is_archived = 0
              AND (
                  (time_end IS NOT NULL AND time_end < '$nowTime') OR 
                  (time_end IS NULL AND (event_time < '$sixHoursAgo' OR time < '$sixHoursAgo'))
              )
        ");
    } catch (Exception $e_auto) {
        // Silently fail if auto-archive encounters schema issues
    }

    // --- Check for is_archived column existence once ---
    static $hasArchivedCol = null;
    if ($hasArchivedCol === null) {
        try {
            $conn->query("SELECT is_archived FROM events LIMIT 1");
            $hasArchivedCol = true;
        } catch (Exception $e) {
            $hasArchivedCol = false;
        }
    }

    $where = [];
    if ($hasArchivedCol) {
        $showArchived = (isset($_GET['archived']) && $_GET['archived'] == '1') ? 1 : 0;
        $where[] = "ev.is_archived = $showArchived";
    }
    if (isset($_GET["is_active"])) {
        $activeValue = ($_GET["is_active"] == '1') ? 1 : 0;
        $where[] = "COALESCE(ev.is_active, 1) = $activeValue";
    }
    $whereClause = !empty($where) ? (" WHERE " . implode(" AND ", $where)) : "";

    // Check if a `status` column exists so we can surface it in responses
    $hasStatusCol = columnExists($conn, "events", "status");
    $statusSelect = $hasStatusCol ? "COALESCE(ev.status, '') AS status," : "";

    try {
        // 1) event_date/event_time/description + eventtype_name/location_name
        $q1 = "
            SELECT 
                ev.event_ID,
                ev.event_name,
                DATE(ev.event_date) AS event_date,
                TIME_FORMAT(ev.event_time, '%H:%i:%s') AS event_time,
                ev.time_end,
                ev.description,
                ev.eventtype_ID,
                ev.location_ID,
                et.eventtype_name AS eventtype_name,
                l.location_name   AS location_name,
                " . $statusSelect . "
                COALESCE(ev.is_active, 1) AS is_active,
                COUNT(a.attendance_ID) AS attended_count,
                (SELECT COUNT(*) FROM event_target_employees ete WHERE ete.event_ID = ev.event_ID) AS selected_count
            FROM events ev
            LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
            LEFT JOIN location   l ON ev.location_ID   = l.location_ID
            LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
            $whereClause
            GROUP BY ev.event_ID, ev.event_name, ev.event_date, ev.event_time, ev.time_end, ev.description, ev.eventtype_ID, ev.location_ID, et.eventtype_name, l.location_name
            ORDER BY ev.event_date DESC, ev.event_time DESC
        ";
        $stmt = $conn->prepare($q1);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e1) {
        try {
            // 2) event_date/event_time/description + eventtype/location
            $q2 = "
                SELECT 
                    ev.event_ID,
                    ev.event_name,
                    DATE(ev.event_date) AS event_date,
                    TIME_FORMAT(ev.event_time, '%H:%i:%s') AS event_time,
                    ev.description,
                    ev.eventtype_ID,
                    ev.location_ID,
                    et.eventtype     AS eventtype_name,
                    l.location       AS location_name,
                    " . $statusSelect . "
                    COALESCE(ev.is_active, 1) AS is_active,
                    COUNT(a.attendance_ID) AS attended_count,
                    (SELECT COUNT(*) FROM event_target_employees ete WHERE ete.event_ID = ev.event_ID) AS selected_count
                FROM events ev
                LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                $whereClause
                GROUP BY ev.event_ID, ev.event_name, ev.event_date, ev.event_time, ev.description, ev.eventtype_ID, ev.location_ID, et.eventtype, l.location
                ORDER BY ev.event_date DESC, ev.event_time DESC
            ";
            $stmt = $conn->prepare($q2);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e2) {
            try {
                // 3) date/time/event_desc + eventtype_name/location_name
                $q3 = "
                    SELECT 
                        ev.event_ID,
                        ev.event_name,
                        DATE(ev.date)        AS event_date,
                        TIME_FORMAT(ev.time, '%H:%i:%s') AS event_time,
                        ev.time_end,
                        ev.event_desc  AS description,
                        ev.eventtype_ID,
                        ev.location_ID,
                        et.eventtype_name AS eventtype_name,
                        l.location_name   AS location_name,
                        " . $statusSelect . "
                        COALESCE(ev.is_active, 1) AS is_active,
                        COUNT(a.attendance_ID) AS attended_count,
                        (SELECT COUNT(*) FROM event_target_employees ete WHERE ete.event_ID = ev.event_ID) AS selected_count
                    FROM events ev
                    LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                    LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                    LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                    $whereClause
                    GROUP BY ev.event_ID, ev.event_name, event_date, event_time, ev.time_end, description, ev.eventtype_ID, ev.location_ID, et.eventtype_name, l.location_name
                    ORDER BY event_date DESC, event_time DESC
                ";
                $stmt = $conn->prepare($q3);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (Exception $e3) {
                try {
                    // 4) date/time/event_desc + eventtype/location
                $q4 = "
                    SELECT 
                        ev.event_ID,
                        ev.event_name,
                        DATE(ev.date)        AS event_date,
                        TIME_FORMAT(ev.time, '%H:%i:%s') AS event_time,
                        ev.time_end,
                        ev.event_desc  AS description,
                        ev.eventtype_ID,
                        ev.location_ID,
                        et.eventtype   AS eventtype_name,
                        l.location     AS location_name,
                        " . $statusSelect . "
                        COALESCE(ev.is_active, 1) AS is_active,
                        COUNT(a.attendance_ID) AS attended_count,
                        (SELECT COUNT(*) FROM event_target_employees ete WHERE ete.event_ID = ev.event_ID) AS selected_count
                    FROM events ev
                    LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                    LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                    LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                    $whereClause
                    GROUP BY ev.event_ID, ev.event_name, event_date, event_time, ev.time_end, description, ev.eventtype_ID, ev.location_ID, et.eventtype, l.location
                    ORDER BY event_date DESC, event_time DESC
                ";
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

    exit;
}


// ======================================================
// CREATE NEW EVENT
// ======================================================
if ($method === 'POST') {
    ensureEventSetupSchema($conn);

    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data["event_name"]) ||
        empty($data["eventtype_ID"]) ||
        empty($data["location_ID"]) ||
        empty($data["event_date"]) ||
        empty($data["event_time"])
    ) {
        echo json_encode([
            "error" => true,
            "message" => "Missing required fields"
        ]);
        exit;
    }

    $time_end = $data["time_end"] ?? null;

    // --- Validation: Prevent past dates ---
    $today = date("Y-m-d");
    if ($data["event_date"] < $today) {
        echo json_encode([
            "error" => true,
            "message" => "Cannot create an event in the past."
        ]);
        exit;
    }

    // --- Validation: Prevent invalid date formats ---
    if ($data["event_date"] === "0000-00-00" || $data["event_time"] === "00:00:00") {
        echo json_encode([
            "error" => true,
            "message" => "Invalid date or time entered."
        ]);
        exit;
    }

    try {
        // Try insert with event_date/event_time/time_end/description
        $query1 = "
            INSERT INTO events
            (
                event_name,
                eventtype_ID,
                location_ID,
                event_date,
                event_time,
                time_end,
                description,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ";
        $stmt = $conn->prepare($query1);
        $stmt->execute([
            $data["event_name"],
            $data["eventtype_ID"],
            $data["location_ID"],
            $data["event_date"],
            $data["event_time"],
            $time_end,
            $data["description"] ?? null
        ]);
        echo json_encode([
            "success" => true,
            "message" => "Event created successfully"
        ]);
    } catch (Exception $e1) {
        try {
            // Fallback insert with date/time/time_end/event_desc
            $query2 = "
                INSERT INTO events
                (
                    event_name,
                    eventtype_ID,
                    location_ID,
                    date,
                    time,
                    time_end,
                    event_desc,
                    is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ";
            $stmt = $conn->prepare($query2);
            $stmt->execute([
                $data["event_name"],
                $data["eventtype_ID"],
                $data["location_ID"],
                $data["event_date"],
                $data["event_time"],
                $time_end,
                $data["description"] ?? null
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Event created successfully"
            ]);
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
        }
    }

    exit;
}

// ======================================================
// UPDATE EVENT
// ======================================================
if ($method === 'PUT') {
    ensureEventSetupSchema($conn);

    $event_id = $_GET["id"] ?? null;
    if (!$event_id) {
        echo json_encode([
            "error" => true,
            "message" => "Event ID is required"
        ]);
        exit;
    }

    $data = json_decode(file_get_contents("php://input"), true);

    if (($data["action"] ?? "") === "setup_event") {
        $employeeIds = $data["employee_ids"] ?? [];
        if (!is_array($employeeIds)) {
            echo json_encode(["error" => true, "message" => "employee_ids must be an array"]);
            exit;
        }

        try {
            $conn->beginTransaction();
            $del = $conn->prepare("DELETE FROM event_target_employees WHERE event_ID = ?");
            $del->execute([$event_id]);

            if (!empty($employeeIds)) {
                $ins = $conn->prepare("INSERT IGNORE INTO event_target_employees (event_ID, employee_ID) VALUES (?, ?)");
                foreach ($employeeIds as $empId) {
                    $ins->execute([$event_id, (int)$empId]);
                }
            }
            $conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Event setup saved successfully"
            ]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            echo json_encode(["error" => true, "message" => $e->getMessage()]);
        }
        exit;
    }

    if (($data["action"] ?? "") === "activate_event") {
        try {
            $countStmt = $conn->prepare("SELECT COUNT(*) FROM event_target_employees WHERE event_ID = ?");
            $countStmt->execute([$event_id]);
            $targetCount = (int)$countStmt->fetchColumn();
            if ($targetCount <= 0) {
                echo json_encode([
                    "error" => true,
                    "message" => "Please setup employees first before activating this event."
                ]);
                exit;
            }

            if (columnExists($conn, "events", "status")) {
                $stmt = $conn->prepare("UPDATE events SET status = 'Activated' WHERE event_ID = ?");
            } else {
                $stmt = $conn->prepare("UPDATE events SET is_active = 1 WHERE event_ID = ?");
            }
            $stmt->execute([$event_id]);
            echo json_encode(["success" => true, "message" => "Event activated successfully"]);
        } catch (Exception $e) {
            echo json_encode(["error" => true, "message" => $e->getMessage()]);
        }
        exit;
    }

    if (($data["action"] ?? "") === "deactivate_event") {
        try {
            if (columnExists($conn, "events", "status")) {
                $stmt = $conn->prepare("UPDATE events SET status = 'Deactivated' WHERE event_ID = ?");
            } else {
                $stmt = $conn->prepare("UPDATE events SET is_active = 0 WHERE event_ID = ?");
            }
            $stmt->execute([$event_id]);
            echo json_encode(["success" => true, "message" => "Event deactivated successfully"]);
        } catch (Exception $e) {
            echo json_encode(["error" => true, "message" => $e->getMessage()]);
        }
        exit;
    }

    // --- RESTORE ACTION ---
    if (isset($data["restore"]) && $data["restore"] === true) {
        try {
            $newDate = $data["event_date"] ?? null;
            $newTime = $data["event_time"] ?? null;
            $newTimeEnd = $data["time_end"] ?? null;

            if ($newDate && $newTime) {
                // Restore AND update date/time to prevent immediate re-archiving
                // If columns are DATETIME, we might need to combine them, but typically
                // MySQL allows setting a DATETIME with just a date or time string.
                // However, to be safe and ensure the date is correctly set for the start time:
                
                $query = "UPDATE events SET is_archived = 0, event_date = ?, event_time = ?, time_end = ? WHERE event_ID = ?";
                $params = [$newDate, $newTime, $newTimeEnd, $event_id];
                
                try {
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                } catch (Exception $e_col) {
                    // Fallback for different column names (date/time instead of event_date/event_time)
                    // We use CONCAT to ensure 'time' (if it's a DATETIME) gets the correct date part
                    $query = "UPDATE events SET is_archived = 0, date = ?, time = ?, time_end = ? WHERE event_ID = ?";
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                }
            } else {
                // Just restore (might be re-archived immediately if still in past)
                $stmt = $conn->prepare("UPDATE events SET is_archived = 0 WHERE event_ID = ?");
                $stmt->execute([$event_id]);
            }

            echo json_encode([
                "success" => true,
                "message" => "Event restored successfully"
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "error" => true,
                "message" => $e->getMessage()
            ]);
        }
        exit;
    }

    if (
        empty($data["event_name"]) ||
        empty($data["eventtype_ID"]) ||
        empty($data["location_ID"]) ||
        empty($data["event_date"]) ||
        empty($data["event_time"])
    ) {
        echo json_encode([
            "error" => true,
            "message" => "Missing required fields"
        ]);
        exit;
    }

    $time_end = $data["time_end"] ?? null;

    // --- Validation: Prevent past dates (only if date is being changed) ---
    // Note: We allow updating an event that is today, but not to a date before today.
    $today = date("Y-m-d");
    if ($data["event_date"] < $today) {
        echo json_encode([
            "error" => true,
            "message" => "Cannot set an event date in the past."
        ]);
        exit;
    }

    // --- Validation: Prevent invalid date formats ---
    if ($data["event_date"] === "0000-00-00" || $data["event_time"] === "00:00:00") {
        echo json_encode([
            "error" => true,
            "message" => "Invalid date or time entered."
        ]);
        exit;
    }

    try {
        // Try update with event_date/event_time/time_end/description
        $query1 = "
            UPDATE events
            SET event_name   = ?,
                eventtype_ID = ?,
                location_ID  = ?,
                event_date   = ?,
                event_time   = ?,
                time_end     = ?,
                description  = ?
            WHERE event_ID   = ?
        ";
        $stmt = $conn->prepare($query1);
        $stmt->execute([
            $data["event_name"],
            $data["eventtype_ID"],
            $data["location_ID"],
            $data["event_date"],
            $data["event_time"],
            $time_end,
            $data["description"] ?? null,
            $event_id
        ]);

        if ($stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Event updated successfully"
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "message" => "No changes made"
            ]);
        }
    } catch (Exception $e1) {
        try {
            // Fallback update with date/time/time_end/event_desc
            $query2 = "
                UPDATE events
                SET event_name   = ?,
                    eventtype_ID = ?,
                    location_ID  = ?,
                    date         = ?,
                    time         = ?,
                    time_end     = ?,
                    event_desc   = ?
                WHERE event_ID   = ?
            ";
            $stmt = $conn->prepare($query2);
            $stmt->execute([
                $data["event_name"],
                $data["eventtype_ID"],
                $data["location_ID"],
                $data["event_date"],
                $data["event_time"],
                $time_end,
                $data["description"] ?? null,
                $event_id
            ]);

            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    "success" => true,
                    "message" => "Event updated successfully"
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "message" => "No changes made"
                ]);
            }
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
        }
    }

    exit;
}

// ======================================================
// DELETE EVENT (ARCHIVE)
// ======================================================
if ($method === 'DELETE') {

    $event_id = $_GET["id"] ?? null;

    if (!$event_id) {
        echo json_encode([
            "error" => true,
            "message" => "Event ID is required"
        ]);
        exit;
    }

    try {
        // Try soft delete (archive)
        $stmt = $conn->prepare("UPDATE events SET is_archived = 1 WHERE event_ID = ?");
        $stmt->execute([$event_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Event moved to archive successfully"
            ]);
        } else {
            echo json_encode([
                "error" => true,
                "message" => "Event not found or already archived"
            ]);
        }
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
