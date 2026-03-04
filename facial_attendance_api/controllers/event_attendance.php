<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once("../config/database.php");

$event_id = $_GET["event_id"] ?? ($_GET["event_ID"] ?? 0);

try {
    $query = "
        SELECT 
            e.employee_code,
            CONCAT(e.employee_firstName, ' ', e.employee_LastName) AS fullName,
            d.department_name,
            a.time_in,
            a.time_out,
            a.status
        FROM employees e
        JOIN department d ON e.department_ID = d.department_ID
        LEFT JOIN attendance a 
            ON e.employee_ID = a.employee_ID
            AND a.event_ID = ?
        ORDER BY e.employee_lastName, e.employee_firstName
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute([$event_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [];
    foreach ($rows as $row) {
        $attended = !empty($row["time_in"]);
        $status = null;
        if ($row["status"] === "Late") {
            $status = "Late";
        } elseif ($attended) {
            $status = "On Time";
        }
        $response[] = [
            "employee_code"   => $row["employee_code"],
            "fullName"        => $row["fullName"],
            "department_name" => $row["department_name"],
            "checkIn"         => $row["time_in"],
            "checkOut"        => $row["time_out"],
            "attended"        => $attended,
            "status"          => $status
        ];
    }

    echo json_encode($response);
} catch (Exception $e) {
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}
