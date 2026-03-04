<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");
$otp = trim($data["otp"] ?? "");
$new_password = $data["new_password"] ?? "";

if ($email === "" || $otp === "" || $new_password === "") {
    echo json_encode(["error" => true, "message" => "email, otp and new_password required"]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(["error" => true, "message" => "Email not found"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, otp_code, expires_at, used FROM password_resets WHERE user_id = ? AND used = 0 ORDER BY id DESC LIMIT 1");
    $stmt->execute([$user["user_id"]]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$reset) {
        echo json_encode(["error" => true, "message" => "OTP not found"]);
        exit;
    }
    if ($reset["used"]) {
        echo json_encode(["error" => true, "message" => "OTP already used"]);
        exit;
    }
    if (strtotime($reset["expires_at"]) < time()) {
        echo json_encode(["error" => true, "message" => "OTP expired"]);
        exit;
    }
    if ($reset["otp_code"] !== $otp) {
        echo json_encode(["error" => true, "message" => "Invalid OTP"]);
        exit;
    }

    $hash = password_hash($new_password, PASSWORD_BCRYPT);

    $conn->beginTransaction();
    $conn->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?")->execute([$hash, $user["user_id"]]);
    $conn->prepare("UPDATE password_resets SET used = 1, used_at = NOW() WHERE id = ?")->execute([$reset["id"]]);
    $conn->commit();

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    echo json_encode(["error" => true, "message" => $e->getMessage()]);
}
