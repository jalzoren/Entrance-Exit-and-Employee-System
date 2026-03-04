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

if ($email === "") {
    echo json_encode(["error" => true, "message" => "email required"]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT user_id, email FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(["error" => true, "message" => "Email not found"]);
        exit;
    }

    $otp = str_pad((string)random_int(0, 999999), 6, "0", STR_PAD_LEFT);
    $expires = date("Y-m-d H:i:s", time() + 10 * 60);

    $conn->prepare("INSERT INTO password_resets (user_id, otp_code, expires_at, used) VALUES (?, ?, ?, 0)")
        ->execute([$user["user_id"], $otp, $expires]);

    $email_config = __DIR__ . "/../config/email_config.php";
    if (!file_exists($email_config)) {
        echo json_encode(["error" => true, "message" => "Email not configured"]);
        exit;
    }
    require_once($email_config);

    $primary = __DIR__ . "/../vendor/PHPMailer/src";
    $alt = __DIR__ . "/../vendor/PHPMailer-master/src";
    $vendorPath = is_dir($primary) ? $primary : (is_dir($alt) ? $alt : null);
    if (!$vendorPath) {
        echo json_encode(["error" => true, "message" => "PHPMailer not found. Place it in vendor/PHPMailer or vendor/PHPMailer-master"]);
        exit;
    }
    require_once $vendorPath . "/PHPMailer.php";
    require_once $vendorPath . "/SMTP.php";
    require_once $vendorPath . "/Exception.php";

    $req = ["SMTP_HOST","SMTP_USERNAME","SMTP_PASSWORD","SMTP_SECURE","SMTP_PORT","SMTP_FROM","SMTP_FROM_NAME"];
    foreach ($req as $k) {
        if (!defined($k)) {
            echo json_encode(["error" => true, "message" => "Email not configured: missing ".$k]);
            exit;
        }
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USERNAME;
    $mail->Password = SMTP_PASSWORD;
    $mail->SMTPSecure = SMTP_SECURE;
    $mail->Port = SMTP_PORT;
    $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = "Your Password Reset OTP";
    $mail->Body = "<p>Your OTP code is <strong>{$otp}</strong>. It expires in 10 minutes.</p>";
    $mail->AltBody = "Your OTP code is {$otp}. It expires in 10 minutes.";
    $mail->send();

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    echo json_encode(["error" => true, "message" => $e->getMessage()]);
}
