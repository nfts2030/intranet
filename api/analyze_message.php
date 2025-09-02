<?php
require_once __DIR__ . '/vendor/autoload.php';

use Gemini\Client;
use Gemini\Data\Content;
use Gemini\Enums\Role;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing message parameter']);
    exit();
}

$message = $data['message'];

$client = new Client(getenv('GEMINI_API_KEY'));

$prompt = "Clasifica este mensaje de cliente en una categoría:\n- Queja\n- Sugerencia\n- Consulta\n- Otro\n\nMensaje: \"{$message}\"\n\nResponde SOLO con la categoría.";

$response = $client->geminiPro()->generateContent(
    Content::text($prompt)
);

$category = $response->text();

echo json_encode(['category' => $category]);

