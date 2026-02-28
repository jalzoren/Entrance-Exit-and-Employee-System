<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER['REQUEST_METHOD'];


// ======================================================
// GET EMPLOYEES (JOIN TABLES)
// ======================================================
if ($method === 'GET') {

    try {

        $query = "
            SELECT 
                e.employee_ID,
                e.employee_code,
                e.employee_firstName,
                e.employee_lastName,
                d.department_name,
                p.position_name,
                em.email_address,
                e.created_at
            FROM employees e
            LEFT JOIN departments d ON e.department_ID = d.department_ID
            LEFT JOIN positions p ON e.position_ID = p.position_ID
            LEFT JOIN emails em ON e.email_ID = em.email_ID
            ORDER BY e.employee_lastName ASC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute();

        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $employees
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
// ADD EMPLOYEE
// ======================================================
if ($method === 'POST') {

    $data = json_decode(file_get_contents("php://input"), true);

    $employee_code  = $data["employee_code"] ?? null;
    $firstName      = $data["employee_firstName"] ?? null;
    $lastName       = $data["employee_lastName"] ?? null;
    $email_ID       = $data["email_ID"] ?? null;
    $department_ID  = $data["department_ID"] ?? null;
    $position_ID    = $data["position_ID"] ?? null;

    if (!$employee_code || !$firstName || !$lastName) {
        echo json_encode([
            "error" => true,
            "message" => "Required fields missing"
        ]);
        exit;
    }

    try {

        // Prevent duplicate employee_code
        $check = $conn->prepare("SELECT employee_ID FROM employees WHERE employee_code = ?");
        $check->execute([$employee_code]);

        if ($check->fetch()) {
            echo json_encode([
                "error" => true,
                "message" => "Employee code already exists"
            ]);
            exit;
        }

        $query = "
            INSERT INTO employees
            (employee_code, employee_firstName, employee_lastName, email_ID, department_ID, position_ID, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute([
            $employee_code,
            $firstName,
            $lastName,
            $email_ID,
            $department_ID,
            $position_ID
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Employee added successfully"
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
// DELETE EMPLOYEE
// ======================================================
if ($method === 'DELETE') {

    $employee_id = $_GET["id"] ?? null;

    if (!$employee_id) {
        echo json_encode([
            "error" => true,
            "message" => "Employee ID required"
        ]);
        exit;
    }

    try {

        $stmt = $conn->prepare("DELETE FROM employees WHERE employee_ID = ?");
        $stmt->execute([$employee_id]);

        echo json_encode([
            "success" => true,
            "message" => "Employee deleted successfully"
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
echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);