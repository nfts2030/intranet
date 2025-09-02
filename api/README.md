# API Documentation

## Endpoints

### POST /contact.php
Process contact form submissions.

**Request Body:**
- `name` (string, required) - User's name
- `email` (string, required) - User's email address
- `phone` (string, optional) - User's phone number
- `subject` (string, required) - Subject of the message
- `message` (string, required) - The message content
- `privacy` (boolean, required) - Privacy policy acceptance

**Response:**
```json
{
  "success": true,
  "message": "¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto."
}
```

**Functionality:**
1. Validates and sanitizes input data
2. Attempts to send email using PHPMailer with SMTP
3. Falls back to PHP's mail() function if PHPMailer fails
4. Saves submission to JSON files as backup
5. Returns success message

### GET /view-submissions.php
Retrieve all contact form submissions.

**Response:**
```json
[
  {
    "timestamp": "2025-08-28 04:45:29",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "subject": "Test Subject",
    "message": "This is a test message"
  }
]
```

## File Storage

Submissions are saved to:
- `all_contact_submissions.json` - Contains all submissions
- `contact_submissions_YYYY-MM-DD.json` - Daily submission files

## Email Configuration

The system attempts to send emails using:
1. PHPMailer with SMTP:
   - Host: mail.petgas.com.mx
   - Username: contacto@petgas.com.mx
   - Password: NyeaR[QcW;tP
   - Port: 465
   - Encryption: SSL
2. PHP's built-in mail() function as fallback