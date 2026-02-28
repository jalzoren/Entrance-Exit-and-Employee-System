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

        $query = "
            SELECT 
                ev.event_ID,
                ev.event_name,
                ev.event_date,
                ev.event_time,
                ev.description,
                et.eventtype_name,
                l.location_name,

                COUNT(a.attendance_ID) AS attended_count

            FROM events ev

            LEFT JOIN eventtype et
                ON ev.eventtype_ID = et.eventtype_ID

            LEFT JOIN location l
                ON ev.location_ID = l.location_ID

            LEFT JOIN attendance a
                ON ev.event_ID = a.event_ID

            GROUP BY
                ev.event_ID,
                ev.event_name,
                ev.event_date,
                ev.event_time,
                ev.description,
                et.eventtype_name,
                l.location_name

            ORDER BY ev.event_date DESC, ev.event_time DESC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute();

        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($events);

    } catch (Exception $e) {

        echo json_encode([
            "error" => true,
            "message" => $e->getMessage()
        ]);
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

        $query = "
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

        $stmt = $conn->prepare($query);
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