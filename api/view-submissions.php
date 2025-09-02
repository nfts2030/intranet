<?php
// API endpoint to view contact form submissions
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $file = './all_contact_submissions.json';
    
    if (file_exists($file)) {
        $content = file_get_contents($file);
        if (!empty($content)) {
            echo $content;
        } else {
            echo json_encode([]);
        }
    } else {
        echo json_encode([]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>