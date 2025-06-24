<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Load environment variables
$env_file = __DIR__ . '/.env';
$env_vars = [];
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $env_vars[trim($key)] = trim($value);
        }
    }
}

// Twilio configuration
$twilio_sid = $env_vars['TWILIO_ACCOUNT_SID'] ?? '';
$twilio_token = $env_vars['TWILIO_AUTH_TOKEN'] ?? '';
$twilio_phone = $env_vars['TWILIO_PHONE_NUMBER'] ?? '';
$agent_phone = $env_vars['AGENT_PHONE_NUMBER'] ?? '';

function makeCall($to_number, $from_number, $twilio_sid, $twilio_token) {
    $url = "https://api.twilio.com/2010-04-01/Accounts/$twilio_sid/Calls.json";
    
    $data = [
        'To' => $to_number,
        'From' => $from_number,
        'Url' => 'http://demo.twilio.com/docs/voice.xml'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, "$twilio_sid:$twilio_token");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['response' => json_decode($response, true), 'http_code' => $http_code];
}

// Route handling
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/crm/api.php', '', $path);
$path = str_replace('/crm/api', '', $path);

// Debug: log the path
error_log("API Path: " . $path);

switch ($path) {
    case '/call':
    case '/api/call':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $to_number = $input['to'] ?? '';
            
            if (empty($to_number)) {
                http_response_code(400);
                echo json_encode(['error' => 'Phone number is required']);
                exit;
            }
            
            $result = makeCall($to_number, $twilio_phone, $twilio_sid, $twilio_token);
            
            if ($result['http_code'] === 201) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Call initiated successfully',
                    'call_sid' => $result['response']['sid']
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => $result['response']['message'] ?? 'Failed to initiate call'
                ]);
            }
        }
        break;
        
    case '/status':
    case '/api/status':
        echo json_encode([
            'status' => 'running',
            'service' => 'CRM Twilio API',
            'timestamp' => date('c')
        ]);
        break;
        
    case '/config':
    case '/api/config':
        echo json_encode([
            'twilio_configured' => !empty($twilio_sid) && !empty($twilio_token),
            'phone_number' => $twilio_phone
        ]);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?>
