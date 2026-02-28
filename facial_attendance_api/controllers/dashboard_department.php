<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once("../config/database.php");

$today = date("Y-m-d");

try {

    $query = "
        SELECT 
            d.department_ID,
            d.department_name,
            COUNT(e.employee_ID) AS totalEmployees,
            COUNT(a.attendance_ID) AS presentCount
        FROM department d
        LEFT JOIN employees e ON d.department_ID = e.department_ID
        LEFT JOIN attendance a 
            ON e.employee_ID = a.employee_ID
            AND DATE(a.time_in) = ?
        GROUP BY d.department_ID
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute([$today]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $data = [];

    foreach ($results as $row) {

        $total = (int)$row["totalEmployees"];
        $present = (int)$row["presentCount"];
        $absent = $total - $present;

        $data[] = [
            "department_name" => $row["department_name"],
            "totalEmployees"  => $total,
            "present"         => $present,
            "absent"          => $absent,
            "presentPercent"  => $total > 0 ? round(($present / $total) * 100, 1) : 0,
            "absentPercent"   => $total > 0 ? round(($absent / $total) * 100, 1) : 0
        ];
    }

    echo json_encode([
        "success" => true,
        "data" => $data
    ]);

} catch (Exception $e) {

    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}