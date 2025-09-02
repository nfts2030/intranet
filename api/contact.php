<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 0 in production
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log');

// Load environment variables from .env file
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Handle CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include PHPMailer if available
$mailerAvailable = false;
if (file_exists('./PHPMailer/src/Exception.php') && 
    file_exists('./PHPMailer/src/PHPMailer.php') && 
    file_exists('./PHPMailer/src/SMTP.php')) {
    require './PHPMailer/src/Exception.php';
    require './PHPMailer/src/PHPMailer.php';
    require './PHPMailer/src/SMTP.php';
    $mailerAvailable = true;
}

$response = ['success' => false, 'message' => 'Error: Datos no recibidos.'];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitize input data (using FILTER_SANITIZE_FULL_SPECIAL_CHARS instead of deprecated FILTER_SANITIZE_STRING)
    $name = isset($_POST['name']) ? trim(filter_var($_POST['name'], FILTER_SANITIZE_FULL_SPECIAL_CHARS)) : '';
    $email = isset($_POST['email']) ? trim(filter_var($_POST['email'], FILTER_SANITIZE_EMAIL)) : '';
    $phone = isset($_POST['phone']) ? trim(filter_var($_POST['phone'], FILTER_SANITIZE_FULL_SPECIAL_CHARS)) : '';
    $subject = isset($_POST['subject']) ? trim(filter_var($_POST['subject'], FILTER_SANITIZE_FULL_SPECIAL_CHARS)) : '';
    $message = isset($_POST['message']) ? trim(filter_var($_POST['message'], FILTER_SANITIZE_FULL_SPECIAL_CHARS)) : '';
    $privacy = isset($_POST['privacy']) ? filter_var($_POST['privacy'], FILTER_VALIDATE_BOOLEAN) : false;

    // Validate required fields
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        $response = ['success' => false, 'message' => 'Por favor, completa todos los campos requeridos.'];
    } elseif (!$privacy) {
        $response = ['success' => false, 'message' => 'Debes aceptar la política de privacidad.'];
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response = ['success' => false, 'message' => 'Por favor, ingresa un correo electrónico válido.'];
    } else {
        // Generate reference number
        $referencia = uniqid('contact_', true);

        // Insert data into Supabase
        $client = new GuzzleHttp\Client();
        $supabase_url = $_ENV['SUPABASE_URL'];
        $supabase_key = $_ENV['SUPABASE_KEY'];

        $data = [
            'nombre' => $name,
            'email' => $email,
            'telefono' => $phone,
            'mensaje' => $message,
            'referencia' => $referencia
        ];

        try {
            $response = $client->post($supabase_url . '/rest/v1/clientes', [
                'headers' => [
                    'apikey' => $supabase_key,
                    'Authorization' => 'Bearer ' . $supabase_key,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation'
                ],
                'json' => $data
            ]);
            $result = json_decode($response->getBody()->getContents(), true);
            if ($response->getStatusCode() !== 201) {
                throw new Exception('Supabase insert error: ' . $response->getBody()->getContents());
            }
        } catch (Exception $e) {
            error_log("Supabase insert failed: " . $e->getMessage());
            $response = ['success' => false, 'message' => 'Error al guardar los datos en la base de datos.'];
            echo json_encode($response);
            exit();
        }

        // Analyze message with Gemini
        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/analyze_message.php');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['message' => $message]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $gemini_response = curl_exec($ch);
            curl_close($ch);
            $category_data = json_decode($gemini_response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON response from Gemini API: ' . $gemini_response);
            }
            $category = $category_data['category'];
        } catch (Exception $e) {
            error_log("Gemini API call failed: " . $e->getMessage());
            $response = ['success' => false, 'message' => 'Error al analizar el mensaje con Gemini.'];
            echo json_encode($response);
            exit();
        }

        // Update supabase with category
        try {
            $update_response = $client->patch($supabase_url . '/rest/v1/clientes?referencia=eq.' . $referencia, [
                'headers' => [
                    'apikey' => $supabase_key,
                    'Authorization' => 'Bearer ' . $supabase_key,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation'
                ],
                'json' => ['categoria' => $category]
            ]);
            if ($update_response->getStatusCode() !== 200) {
                throw new Exception('Supabase update error: ' . $update_response->getBody()->getContents());
            }
        } catch (Exception $e) {
            error_log("Supabase update failed: " . $e->getMessage());
            $response = ['success' => false, 'message' => 'Error al actualizar la categoría en la base de datos.'];
            echo json_encode($response);
            exit();
        }

        // Try to send email using PHPMailer first
        if ($mailerAvailable) {
            try {
                $mail = new PHPMailer\PHPMailer\PHPMailer(true);

                // Server settings from environment variables
                $mail->isSMTP();
                $mail->Host = getenv('SMTP_HOST') ?: 'mail.petgas.com.mx';
                $mail->SMTPAuth = true;
                $mail->Username = getenv('SMTP_USERNAME') ?: 'contacto@petgas.com.mx';
                $mail->Password = getenv('SMTP_PASSWORD');
                $mail->SMTPSecure = getenv('SMTP_SECURE') ?: 'ssl';
                $mail->Port = getenv('SMTP_PORT') ?: 465;
                $mail->CharSet = 'UTF-8';
                
                // Debugging
                $mail->SMTPDebug = 2; // Enable verbose debug output
                $mail->Debugoutput = function($str, $level) {
                    error_log("PHPMailer: $str");
                };

                // Recipients
                $fromEmail = getenv('MAIL_FROM') ?: 'contacto@petgas.com.mx';
                $toEmail = getenv('MAIL_TO') ?: 'contacto@petgas.com.mx';
                $mail->setFrom($fromEmail, 'PETGAS Web');
                $mail->addAddress($toEmail, 'Contacto PETGAS');
                $mail->addReplyTo($email, $name);

                // Content
                $mail->isHTML(true);
                $mail->Subject = 'Nuevo mensaje de contacto: ' . $subject;
                
                // Create email body
                $emailBody = "
                <html>
                <head>
                    <title>Nuevo mensaje de contacto</title>
                </head>
                <body>
                    <h2>Nuevo mensaje de contacto</h2>
                    <p><strong>Nombre:</strong> {$name}</p>
                    <p><strong>Email:</strong> {$email}</p>
                    <p><strong>Teléfono:</strong> {$phone}</p>
                    <p><strong>Asunto:</strong> {$subject}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>{$message}</p>
                </body>
                </html>
                ";
                
                $mail->Body = $emailBody;
                $mail->AltBody = "Nombre: {$name}\nEmail: {$email}\nTeléfono: {$phone}\nAsunto: {$subject}\nMensaje: {$message}";

                // Send email
                if ($mail->send()) {
                    $response = [
                        'success' => true, 
                        'sent' => true,
                        'message' => '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.'
                    ];
                } else {
                    // Email failed to send
                    error_log("Failed to send email: " . $mail->ErrorInfo);
                    $response = [
                        'success' => true, 
                        'sent' => false,
                        'stored' => true,
                        'message' => '¡Mensaje recibido! Sin embargo, hubo un problema al enviar la notificación. Hemos guardado tu mensaje y nos pondremos en contacto contigo pronto.'
                    ];
                }
            } catch (Exception $e) {
                // Log the error for debugging
                error_log("PHPMailer Error: " . $e->getMessage());
                // Even if email fails, we still saved to file
                $response = ['success' => true, 'message' => '¡Mensaje recibido con éxito! Nos pondremos en contacto contigo pronto.'];
            }
        } else {
            // If PHPMailer is not available, just save to file
            $response = ['success' => true, 'message' => '¡Mensaje recibido con éxito! Nos pondremos en contacto contigo pronto.'];
        }
    }
} else {
    $response = ['success' => false, 'message' => 'Método de solicitud no válido.'];
}

// Return JSON response
echo json_encode($response);
?>