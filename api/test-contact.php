<?php
// Test script for contact form
$_SERVER['REQUEST_METHOD'] = 'POST';

$_POST['name'] = 'Test User';
$_POST['email'] = 'test@example.com';
$_POST['phone'] = '1234567890';
$_POST['subject'] = 'Test Subject';
$_POST['message'] = 'This is a test message';
$_POST['privacy'] = '1';

// Include the contact script
include 'contact.php';
?>