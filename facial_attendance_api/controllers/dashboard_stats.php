<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once("../config/database.php");

$today = date("Y-m-d");

try {

    $response = [];

    // ==================================
    // TOTAL EMPLOYEES
    // ==================================
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM employees");
    $stmt->execute();
    $totalEmployees = (int)$stmt->fetch(PDO::FETCH_ASSOC)["total"];

    // ==================================
    // TOTAL PRESENT TODAY
    // ==================================
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total 
        FROM attendance 
        WHERE DATE(time_in) = ?
    ");
    $stmt->execute([$today]);
    $totalPresent = (int)$stmt->fetch(PDO::FETCH_ASSOC)["total"];

    // ==================================
    // TOTAL LATE (if using status column)
    // ==================================
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total 
        FROM attendance 
        WHERE DATE(time_in) = ?
        AND status = 'Late'
    ");
    $stmt->execute([$today]);
    $totalLate = (int)$stmt->fetch(PDO::FETCH_ASSOC)["total"];

    // ==================================
    // TOTAL ABSENT (computed)
    // ==================================
    $totalAbsent = $totalEmployees - $totalPresent;

    // ==================================
    // TODAY ENTRIES
    // ==================================
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total
        FROM attendance
        WHERE DATE(time_in) = ?
    ");
    $stmt->execute([$today]);
    $todayEntries = (int)$stmt->fetch(PDO::FETCH_ASSOC)["total"];

    // ==================================
    // TODAY EXITS
    // ==================================
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total
        FROM attendance
        WHERE DATE(time_out) = ?
    ");
    $stmt->execute([$today]);
    $todayExits = (int)$stmt->fetch(PDO::FETCH_ASSOC)["total"];

    echo json_encode([
        "success" => true,
        "data" => [
            "totalEmployees" => $totalEmployees,
            "totalPresent"   => $totalPresent,
            "totalLate"      => $totalLate,
            "totalAbsent"    => $totalAbsent,
            "todayEntries"   => $todayEntries,
            "todayExits"     => $todayExits
        ]
    ]);

} catch (Exception $e) {

    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);
}