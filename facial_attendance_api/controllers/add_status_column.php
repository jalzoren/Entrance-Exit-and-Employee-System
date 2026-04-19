<?php
header("Content-Type: application/json");
require_once(__DIR__ . "/../config/database.php");

try {
    // Add the status column if it doesn't exist
    $sql = "ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS `status` ENUM('Deactivated', 'Activated', 'Completed', '') 
            NOT NULL DEFAULT '' AFTER is_archived";

    $conn->exec($sql);

    // Optional: Migrate existing data from is_active (if you want to keep history)
    $conn->exec("UPDATE events SET `status` = 'Activated' WHERE is_active = 1 AND (`status` = '' OR `status` IS NULL)");
    $conn->exec("UPDATE events SET `status` = 'Deactivated' WHERE is_active = 0 AND (`status` = '' OR `status` IS NULL)");

    echo json_encode(["success" => true, "message" => "Column 'status' added/updated successfully. Old is_active data migrated."]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>