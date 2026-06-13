<?php
// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Parse route parameter
$route = isset($_GET['route']) ? $_GET['route'] : '';

// Helper to fetch Supabase settings
function get_supabase_settings() {
    $supabaseUrl = 'https://pjmdlifojfwoviyugjwq.supabase.co';
    $anonKey = 'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9';
    
    $url = $supabaseUrl . '/rest/v1/system_settings?select=setting_key,setting_value';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $anonKey,
        'Authorization: Bearer ' . $anonKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300 && $response) {
        $data = json_decode($response, true);
        if (is_array($data)) {
            $settings = [];
            foreach ($data as $row) {
                if (isset($row['setting_key'])) {
                    $settings[$row['setting_key']] = isset($row['setting_value']) ? $row['setting_value'] : null;
                }
            }
            return $settings;
        }
    }
    return [];
}

// Check route
if (preg_match('/^payments\/verify\/(.+)$/', $route, $matches)) {
    $reference = $matches[1];
    
    // Fetch settings to get paystack secret key
    $settings = get_supabase_settings();
    $paystackSecret = isset($settings['paystack_secret']) ? $settings['paystack_secret'] : '';
    
    if (!$paystackSecret) {
        // Fallback to local dev key if not configured
        $paystackSecret = 'sk_test_f0d450c6d9adea0270a749762a87b876e5646eae';
    }
    
    // Call Paystack verification API
    $url = 'https://api.paystack.co/transaction/verify/' . urlencode($reference);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $paystackSecret
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    http_response_code($httpCode);
    echo $response;
    exit;
} 
else if ($route === 'email/send') {
    // Get POST data
    $input = file_get_contents('php://input');
    $postData = json_decode($input, true);
    
    $to = isset($postData['to']) ? $postData['to'] : '';
    $subject = isset($postData['subject']) ? $postData['subject'] : '';
    $html = isset($postData['html']) ? $postData['html'] : '';
    
    if (!$to || !$subject || !$html) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields (to, subject, html)"]);
        exit;
    }
    
    $settings = get_supabase_settings();
    $resendApiKey = isset($settings['resend_api_key']) ? $settings['resend_api_key'] : '';
    
    if (!$resendApiKey) {
        http_response_code(500);
        echo json_encode(["error" => "Resend API key is not configured in system settings."]);
        exit;
    }
    
    // Call Resend API
    $url = 'https://api.resend.com/emails';
    $payload = json_encode([
        'from' => 'Sparkles Apartments <onboarding@resend.dev>',
        'to' => [$to],
        'subject' => $subject,
        'html' => $html
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $resendApiKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    http_response_code($httpCode);
    echo $response;
    exit;
}
else {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: " . $route]);
    exit;
}
