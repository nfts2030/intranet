<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Solo se permiten solicitudes POST.'
    ]);
    exit();
}

// Configuration
$config = [
    'to_email' => 'contacto@petgas.com.mx',
    'from_name' => 'Formulario de Contacto PETGAS',
    'from_email' => 'noreply@petgas.com.mx',
    'smtp_host' => 'mail.petgas.com.mx',
    'smtp_user' => 'contacto@petgas.com.mx',
    'smtp_pass' => 'NyeaR[QcW;tP',
    'smtp_port' => 587,
    'smtp_secure' => 'tls', // 'ssl' for port 465, 'tls' for port 587
    'subject_prefix' => 'Nuevo contacto desde web: ',
    'log_file' => 'contact_log.txt',
    'max_message_length' => 5000,
    'required_fields' => ['name', 'email', 'subject', 'message', 'privacy'],
    'use_smtp' => true, // Set to false to use PHP mail() function
    'backup_smtp_port' => 465,
    'backup_smtp_secure' => 'ssl'
];

// Initialize response
$response = [
    'success' => false,
    'message' => '',
    'debug' => [],
    'request_id' => uniqid('contact_', true)
];

// Log function
function logMessage($message, $request_id = '') {
    global $config;
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] [{$request_id}] {$message}" . PHP_EOL;

    // Try to write to log file
    @file_put_contents($config['log_file'], $log_entry, FILE_APPEND | LOCK_EX);

    // Also log to error_log for debugging
    error_log($log_entry);
}

try {
    logMessage("Contact form submission started", $response['request_id']);

    // Validate and sanitize input data
    $name = isset($_POST['name']) ? trim(strip_tags($_POST['name'])) : '';
    $email = isset($_POST['email']) ? trim(strtolower($_POST['email'])) : '';
    $phone = isset($_POST['phone']) ? trim(strip_tags($_POST['phone'])) : '';
    $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';
    $privacy = isset($_POST['privacy']) && $_POST['privacy'] === 'on';

    // Validate required fields
    if (empty($name)) {
        throw new Exception('El nombre es requerido.');
    }

    if (empty($email)) {
        throw new Exception('El correo electrónico es requerido.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Por favor, ingresa un correo electrónico válido.');
    }

    if (empty($subject)) {
        throw new Exception('El asunto es requerido.');
    }

    if (empty($message)) {
        throw new Exception('El mensaje es requerido.');
    }

    if (strlen($message) > $config['max_message_length']) {
        throw new Exception('El mensaje es demasiado largo. Máximo ' . $config['max_message_length'] . ' caracteres.');
    }

    if (!$privacy) {
        throw new Exception('Debes aceptar la política de privacidad.');
    }

    // Validate subject options
    $valid_subjects = ['cotizacion', 'ventas', 'soporte', 'trabajo', 'prensa', 'otro'];
    if (!in_array($subject, $valid_subjects)) {
        throw new Exception('Asunto no válido.');
    }

    // Subject mapping for email
    $subject_map = [
        'cotizacion' => 'Solicitud de Cotización',
        'ventas' => 'Información de Ventas',
        'soporte' => 'Soporte Técnico',
        'trabajo' => 'Oportunidades de Trabajo',
        'prensa' => 'Prensa y Medios',
        'otro' => 'Consulta General'
    ];

    $subject_text = $subject_map[$subject] ?? 'Consulta General';

    // Basic spam protection
    $suspicious_patterns = [
        '/viagra/i', '/casino/i', '/lottery/i', '/bitcoin/i',
        '/crypto/i', '/investment/i', '/loan/i', '/debt/i'
    ];

    foreach ($suspicious_patterns as $pattern) {
        if (preg_match($pattern, $message) || preg_match($pattern, $name)) {
            logMessage("Possible spam detected from: {$email}", $response['request_id']);
            throw new Exception('Tu mensaje ha sido marcado como spam. Si esto es un error, contacta directamente por teléfono.');
        }
    }

    // Rate limiting - simple implementation
    $rate_limit_file = 'rate_limit.json';
    $rate_limits = [];
    if (file_exists($rate_limit_file)) {
        $rate_limits = json_decode(file_get_contents($rate_limit_file), true) ?: [];
    }

    $client_ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $current_time = time();

    // Clean old entries (older than 1 hour)
    $rate_limits = array_filter($rate_limits, function($timestamp) use ($current_time) {
        return $current_time - $timestamp < 3600;
    });

    // Check if IP has submitted more than 5 times in the last hour
    $ip_submissions = array_filter($rate_limits, function($timestamp, $ip) use ($client_ip, $current_time) {
        return $ip === $client_ip && $current_time - $timestamp < 3600;
    }, ARRAY_FILTER_USE_BOTH);

    if (count($ip_submissions) >= 5) {
        throw new Exception('Demasiadas solicitudes. Por favor, inténtalo más tarde.');
    }

    // Add current submission to rate limit
    $rate_limits[$client_ip . '_' . uniqid()] = $current_time;
    file_put_contents($rate_limit_file, json_encode($rate_limits));

    logMessage("Form validation passed for: {$email}", $response['request_id']);

    // Prepare email content
    $email_subject = $config['subject_prefix'] . $subject_text . ' - ' . $name;

    // HTML email template
    $html_body = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #0a4b2a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .field { margin-bottom: 15px; padding: 10px; background-color: white; border-left: 4px solid #0a4b2a; }
            .field strong { color: #0a4b2a; }
            .message-content { background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px; white-space: pre-line; }
            .footer { background-color: #0a4b2a; color: white; padding: 15px; text-align: center; font-size: 12px; }
            .metadata { font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h2>Nuevo Mensaje de Contacto</h2>
            <p>PETGAS México</p>
        </div>

        <div class='content'>
            <div class='field'>
                <strong>Nombre:</strong> " . htmlspecialchars($name) . "
            </div>

            <div class='field'>
                <strong>Email:</strong> <a href='mailto:" . htmlspecialchars($email) . "'>" . htmlspecialchars($email) . "</a>
            </div>

            <div class='field'>
                <strong>Teléfono:</strong> " . (empty($phone) ? 'No proporcionado' : htmlspecialchars($phone)) . "
            </div>

            <div class='field'>
                <strong>Asunto:</strong> " . htmlspecialchars($subject_text) . "
            </div>

            <div class='field'>
                <strong>Mensaje:</strong>
                <div class='message-content'>" . nl2br(htmlspecialchars($message)) . "</div>
            </div>

            <div class='metadata'>
                <strong>Información adicional:</strong><br>
                • Fecha y hora: " . date('l, d \d\e F \d\e Y, H:i:s') . "<br>
                • IP del usuario: " . htmlspecialchars($client_ip) . "<br>
                • User Agent: " . htmlspecialchars($_SERVER['HTTP_USER_AGENT'] ?? 'No disponible') . "<br>
                • Request ID: " . $response['request_id'] . "
            </div>
        </div>

        <div class='footer'>
            Enviado automáticamente desde el formulario de contacto de PETGAS México<br>
            <a href='https://petgas.com.mx' style='color: #fff;'>www.petgas.com.mx</a>
        </div>
    </body>
    </html>
    ";

    // Plain text version
    $text_body = "
Nuevo mensaje de contacto - PETGAS México

Nombre: {$name}
Email: {$email}
Teléfono: " . (empty($phone) ? 'No proporcionado' : $phone) . "
Asunto: {$subject_text}

Mensaje:
{$message}

---
Información adicional:
• Fecha y hora: " . date('l, d \d\e F \d\e Y, H:i:s') . "
• IP del usuario: {$client_ip}
• Request ID: {$response['request_id']}

Enviado automáticamente desde el formulario de contacto de PETGAS México
www.petgas.com.mx
    ";

    logMessage("Attempting to send email to: {$config['to_email']}", $response['request_id']);

    $mail_sent = false;
    $smtp_error = '';

    // Try SMTP first if configured
    if ($config['use_smtp']) {
        try {
            logMessage("Attempting SMTP delivery via {$config['smtp_host']}:{$config['smtp_port']}", $response['request_id']);

            // Use PHP's built-in SMTP functionality with authentication
            ini_set('SMTP', $config['smtp_host']);
            ini_set('smtp_port', $config['smtp_port']);
            ini_set('sendmail_from', $config['from_email']);

            // Prepare headers for SMTP
            $headers = [
                'MIME-Version' => '1.0',
                'Content-Type' => 'text/html; charset=UTF-8',
                'From' => $config['from_name'] . ' <' . $config['from_email'] . '>',
                'Reply-To' => $name . ' <' . $email . '>',
                'X-Mailer' => 'PHP/' . phpversion() . ' (PETGAS Contact Form)',
                'X-Request-ID' => $response['request_id'],
                'X-Priority' => '3',
                'Message-ID' => '<' . $response['request_id'] . '@petgas.com.mx>'
            ];

            // Convert headers array to string
            $headers_string = '';
            foreach ($headers as $key => $value) {
                $headers_string .= $key . ': ' . $value . "\r\n";
            }

            // Try to send via SMTP
            $mail_sent = mail($config['to_email'], $email_subject, $html_body, $headers_string);

            if ($mail_sent) {
                logMessage("SMTP email sent successfully", $response['request_id']);
            } else {
                $smtp_error = error_get_last()['message'] ?? 'Unknown SMTP error';
                logMessage("SMTP failed: {$smtp_error}", $response['request_id']);

                // Try backup SMTP port
                if ($config['smtp_port'] !== $config['backup_smtp_port']) {
                    logMessage("Trying backup SMTP port {$config['backup_smtp_port']}", $response['request_id']);
                    ini_set('smtp_port', $config['backup_smtp_port']);
                    $mail_sent = mail($config['to_email'], $email_subject, $html_body, $headers_string);

                    if ($mail_sent) {
                        logMessage("Backup SMTP port successful", $response['request_id']);
                    } else {
                        logMessage("Backup SMTP port also failed", $response['request_id']);
                    }
                }
            }

        } catch (Exception $smtp_exception) {
            $smtp_error = $smtp_exception->getMessage();
            logMessage("SMTP exception: {$smtp_error}", $response['request_id']);
        }
    }

    // Fallback to basic PHP mail() if SMTP failed
    if (!$mail_sent) {
        logMessage("Falling back to PHP mail() function", $response['request_id']);

        // Reset SMTP settings for basic mail()
        ini_restore('SMTP');
        ini_restore('smtp_port');
        ini_restore('sendmail_from');

        $basic_headers = [
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/html; charset=UTF-8',
            'From' => $config['from_name'] . ' <' . $config['from_email'] . '>',
            'Reply-To' => $name . ' <' . $email . '>',
            'X-Mailer' => 'PHP/' . phpversion() . ' (Basic)',
            'X-Request-ID' => $response['request_id']
        ];

        $basic_headers_string = '';
        foreach ($basic_headers as $key => $value) {
            $basic_headers_string .= $key . ': ' . $value . "\r\n";
        }

        $mail_sent = mail($config['to_email'], $email_subject, $html_body, $basic_headers_string);

        if ($mail_sent) {
            logMessage("PHP mail() fallback successful", $response['request_id']);
        } else {
            logMessage("PHP mail() fallback also failed", $response['request_id']);
        }
    }

    if ($mail_sent) {
        logMessage("Email sent successfully via " . ($config['use_smtp'] ? 'SMTP' : 'PHP mail()'), $response['request_id']);

        // Store submission data for backup
        $submission_data = [
            'request_id' => $response['request_id'],
            'timestamp' => date('c'),
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'subject' => $subject,
            'subject_text' => $subject_text,
            'message' => $message,
            'ip' => $client_ip,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'email_sent' => true
        ];

        // Save to JSON file for backup/analytics
        $submissions_file = 'submissions_' . date('Y-m') . '.json';
        $submissions = [];
        if (file_exists($submissions_file)) {
            $submissions = json_decode(file_get_contents($submissions_file), true) ?: [];
        }
        $submissions[] = $submission_data;
        file_put_contents($submissions_file, json_encode($submissions, JSON_PRETTY_PRINT));

        $response['success'] = true;
        $response['message'] = '¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.';

        // Try to send auto-reply to user
        try {
            $auto_reply_subject = 'Confirmación - Hemos recibido tu mensaje - PETGAS México';
            $auto_reply_body = "
            <!DOCTYPE html>
            <html>
            <head><meta charset='utf-8'></head>
            <body style='font-family: Arial, sans-serif; line-height: 1.6;'>
                <div style='background-color: #0a4b2a; color: white; padding: 20px; text-align: center;'>
                    <h2>¡Gracias por contactarnos!</h2>
                </div>
                <div style='padding: 20px;'>
                    <p>Estimado/a <strong>{$name}</strong>,</p>
                    <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo a la brevedad posible.</p>
                    <p><strong>Resumen de tu consulta:</strong></p>
                    <ul>
                        <li><strong>Asunto:</strong> {$subject_text}</li>
                        <li><strong>Fecha:</strong> " . date('d/m/Y H:i') . "</li>
                        <li><strong>Número de referencia:</strong> " . substr($response['request_id'], -8) . "</li>
                    </ul>
                    <p>Si tu consulta es urgente, puedes contactarnos directamente:</p>
                    <ul>
                        <li><strong>Teléfono:</strong> +52 55 1234 5678</li>
                        <li><strong>Email:</strong> contacto@petgas.com.mx</li>
                    </ul>
                    <p>¡Gracias por confiar en PETGAS México!</p>
                </div>
                <div style='background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;'>
                    PETGAS México - Energía Limpia y Sostenible<br>
                    Este es un mensaje automático, por favor no respondas a este email.
                </div>
            </body>
            </html>
            ";

            $auto_reply_headers = [
                'MIME-Version' => '1.0',
                'Content-Type' => 'text/html; charset=UTF-8',
                'From' => 'PETGAS México <' . $config['from_email'] . '>',
                'X-Auto-Response-Suppress' => 'All',
                'Auto-Submitted' => 'auto-replied',
                'X-Mailer' => 'PHP/' . phpversion() . ' (Auto-Reply)'
            ];

            $auto_reply_headers_string = '';
            foreach ($auto_reply_headers as $key => $value) {
                $auto_reply_headers_string .= $key . ': ' . $value . "\r\n";
            }

            // Use the same email method that worked for the main email
            @mail($email, $auto_reply_subject, $auto_reply_body, $auto_reply_headers_string);

        } catch (Exception $e) {
            // Auto-reply failed, but main email was sent, so don't fail the whole process
            logMessage("Auto-reply failed: " . $e->getMessage(), $response['request_id']);
        }

    } else {
        $error_msg = 'Error al enviar el email. ';
        if (!empty($smtp_error)) {
            $error_msg .= "Error SMTP: {$smtp_error}. ";
        }
        $error_msg .= 'Por favor, inténtalo de nuevo más tarde o contacta directamente por teléfono.';
        throw new Exception($error_msg);
    }

} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage(), $response['request_id']);

    $response['success'] = false;
    $response['message'] = $e->getMessage();

    // Store failed submission for manual follow-up
    $failed_submission = [
        'request_id' => $response['request_id'],
        'timestamp' => date('c'),
        'error' => $e->getMessage(),
        'form_data' => $_POST,
        'ip' => $client_ip ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ];

    $failed_file = 'failed_submissions_' . date('Y-m') . '.json';
    $failed_submissions = [];
    if (file_exists($failed_file)) {
        $failed_submissions = json_decode(file_get_contents($failed_file), true) ?: [];
    }
    $failed_submissions[] = $failed_submission;
    @file_put_contents($failed_file, json_encode($failed_submissions, JSON_PRETTY_PRINT));

    // Set appropriate HTTP status code
    if (strpos($e->getMessage(), 'requerido') !== false ||
        strpos($e->getMessage(), 'válido') !== false ||
        strpos($e->getMessage(), 'política') !== false) {
        http_response_code(400); // Bad Request
    } else {
        http_response_code(500); // Internal Server Error
    }
}

// Send JSON response
echo json_encode($response, JSON_UNESCAPED_UNICODE);

logMessage("Contact form processing completed", $response['request_id']);
?>
