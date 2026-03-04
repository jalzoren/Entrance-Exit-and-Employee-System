<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER['REQUEST_METHOD'];


// ======================================================
// GET ALL EVENTS
// ======================================================
if ($method === 'GET') {

    try {
        // 1) event_date/event_time/description + eventtype_name/location_name
        $q1 = "
            SELECT 
                ev.event_ID,
                ev.event_name,
                ev.event_date,
                ev.event_time,
                ev.description,
                et.eventtype_name AS eventtype_name,
                l.location_name   AS location_name,
                COUNT(a.attendance_ID) AS attended_count
            FROM events ev
            LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
            LEFT JOIN location   l ON ev.location_ID   = l.location_ID
            LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
            GROUP BY ev.event_ID, ev.event_name, ev.event_date, ev.event_time, ev.description, et.eventtype_name, l.location_name
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
                    ev.event_date,
                    ev.event_time,
                    ev.description,
                    et.eventtype     AS eventtype_name,
                    l.location       AS location_name,
                    COUNT(a.attendance_ID) AS attended_count
                FROM events ev
                LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                GROUP BY ev.event_ID, ev.event_name, ev.event_date, ev.event_time, ev.description, et.eventtype, l.location
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
                        ev.date        AS event_date,
                        ev.time        AS event_time,
                        ev.event_desc  AS description,
                        et.eventtype_name AS eventtype_name,
                        l.location_name   AS location_name,
                        COUNT(a.attendance_ID) AS attended_count
                    FROM events ev
                    LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                    LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                    LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                    GROUP BY ev.event_ID, ev.event_name, event_date, event_time, description, et.eventtype_name, l.location_name
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
                            ev.date        AS event_date,
                            ev.time        AS event_time,
                            ev.event_desc  AS description,
                            et.eventtype   AS eventtype_name,
                            l.location     AS location_name,
                            COUNT(a.attendance_ID) AS attended_count
                        FROM events ev
                        LEFT JOIN eventtype et ON ev.eventtype_ID = et.eventtype_ID
                        LEFT JOIN location   l ON ev.location_ID   = l.location_ID
                        LEFT JOIN attendance a ON ev.event_ID      = a.event_ID
                        GROUP BY ev.event_ID, ev.event_name, event_date, event_time, description, et.eventtype, l.location
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

    try {
        // Try insert with event_date/event_time/description
        $query1 = "
            INSERT INTO events
            (
                event_name,
                eventtype_ID,
                location_ID,
                event_date,
                event_time,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?)
        ";
        $stmt = $conn->prepare($query1);
        $stmt->execute([
            $data["event_name"],
            $data["eventtype_ID"],
            $data["location_ID"],
            $data["event_date"],
            $data["event_time"],
            $data["description"] ?? null
        ]);
        echo json_encode([
            "success" => true,
            "message" => "Event created successfully"
        ]);
    } catch (Exception $e1) {
        try {
            // Fallback insert with date/time/event_desc
            $query2 = "
                INSERT INTO events
                (
                    event_name,
                    eventtype_ID,
                    location_ID,
                    date,
                    time,
                    event_desc
                )
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $stmt = $conn->prepare($query2);
            $stmt->execute([
                $data["event_name"],
                $data["eventtype_ID"],
                $data["location_ID"],
                $data["event_date"],
                $data["event_time"],
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
// INVALID METHOD
// ======================================================
echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);
