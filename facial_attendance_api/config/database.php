<?php

$host = "localhost";
$db_name = "employee_attendance";  
$username = "root";
$password = ""; 

try {
    $conn = new PDO(
        "mysql:host=$host;dbname=$db_name;charset=utf8mb4",
        $username,
        $password
    );

    // Set PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Disable emulated prepares for security
    $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

} catch (PDOException $exception) {

    echo json_encode([
        "error" => true,
        "message" => "Database connection failed: " . $exception->getMessage()
    ]);

    exit;
}