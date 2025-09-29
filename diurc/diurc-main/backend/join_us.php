<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "diurc_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}

// Receive POST data
$firstName    = $_POST['firstName'] ?? '';
$lastName     = $_POST['lastName'] ?? '';
$studentId    = $_POST['studentId'] ?? '';
$department   = $_POST['department'] ?? '';
$email        = $_POST['email'] ?? '';
$phone        = $_POST['phone'] ?? '';
$interest     = $_POST['interest'] ?? '';
$experience   = $_POST['experience'] ?? '';
$transactionId= $_POST['transactionId'] ?? '';

// Validation
if (empty($firstName) || empty($lastName) || empty($studentId) || empty($department) || empty($email) || empty($transactionId)) {
    echo json_encode(["status" => "error", "message" => "Please fill all required fields."]);
    exit;
}

// Insert into DB
$stmt = $conn->prepare("INSERT INTO club_applications 
    (first_name, last_name, student_id, department, email, phone, interest, experience, transaction_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssssss", $firstName, $lastName, $studentId, $department, $email, $phone, $interest, $experience, $transactionId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Application submitted successfully!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
