<?php
// config/db.php
// รับผิดชอบ: สร้างการเชื่อมต่อฐานข้อมูล MySQL ที่รันอยู่ใน XAMPP ผ่าน PDO
// ไฟล์นี้ถูก require จากทุกไฟล์ที่ต้องคุยกับฐานข้อมูล
//
// ก่อนใช้งาน ต้อง:
//   1. เปิด XAMPP Control Panel แล้วกด Start ที่ "Apache" และ "MySQL"
//   2. import ไฟล์ database/schema.sql ผ่าน http://localhost/phpmyadmin
//   3. ถ้าตั้งรหัสผ่าน root ของ MySQL ไว้ไม่ใช่ค่าว่าง ให้แก้ค่า DB_PASS ด้านล่าง

$DB_HOST = "localhost";
$DB_PORT = "3306";
$DB_NAME = "e_waste_rush";
$DB_USER = "root";        // ค่า default ของ XAMPP MySQL
$DB_PASS = "";            // XAMPP ปกติไม่ตั้งรหัสผ่านให้ root

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        "success" => false,
        "message" => "เชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบว่า Start MySQL ใน XAMPP แล้วหรือยัง และ import schema.sql แล้วหรือยัง",
    ]);
    exit;
    //เซฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟฟ
}
?>
