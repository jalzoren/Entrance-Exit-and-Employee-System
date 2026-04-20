<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once(__DIR__ . "/../config/database.php");

try {
    // Schema Resilience: check if department or departments table exists
    $deptTable = "department";
    try {
        $conn->query("SELECT 1 FROM department LIMIT 1");
    } catch (Exception $e) {
        $deptTable = "departments";
    }

    // We'll treat Check In as "Entry" and Check Out as "Exit"
    // We'll use UNION to get both types of movements from the attendance table
    $query = "
        (SELECT 
            a.time_in AS timestamp,
            'Entry' AS type,
            e.employee_code,
            CONCAT(e.employee_firstName, ' ', e.employee_LastName) AS fullName,
            d.department_name,
            l.location AS location,
            a.method
        FROM attendance a
        JOIN employees e ON a.employee_ID = e.employee_ID
        LEFT JOIN $deptTable d ON e.department_ID = d.department_ID
        LEFT JOIN events ev ON a.event_ID = ev.event_ID
        LEFT JOIN location l ON ev.location_ID = l.location_ID
        WHERE a.time_in IS NOT NULL AND a.time_in != '0000-00-00 00:00:00')

        UNION ALL

        (SELECT 
            a.time_out AS timestamp,
            'Exit' AS type,
            e.employee_code,
            CONCAT(e.employee_firstName, ' ', e.employee_LastName) AS fullName,
            d.department_name,
            l.location AS location,
            a.method
        FROM attendance a
        JOIN employees e ON a.employee_ID = e.employee_ID
        LEFT JOIN $deptTable d ON e.department_ID = d.department_ID
        LEFT JOIN events ev ON a.event_ID = ev.event_ID
        LEFT JOIN location l ON ev.location_ID = l.location_ID
        WHERE a.time_out IS NOT NULL AND a.time_out != '0000-00-00 00:00:00')

        ORDER BY timestamp DESC
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($rows);

} catch (Exception $e) {
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}
