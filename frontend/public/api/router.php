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
    $from = isset($postData['from']) ? $postData['from'] : 'booking@sparklesapartments.ng';
    
    if (!$to || !$subject || !$html) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields (to, subject, html)"]);
        exit;
    }
    
    // Set up standard HTML email headers for cPanel mail server
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
    $headers .= "From: Sparkles Apartments <" . $from . ">" . "\r\n";
    $headers .= "Reply-To: " . $from . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Send email using local MTA
    $success = mail($to, $subject, $html, $headers);
    
    if ($success) {
        http_response_code(200);
        echo json_encode(["success" => true, "id" => "cpanel_mail_" . uniqid()]);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(["error" => "PHP mail() execution failed on cPanel server."]);
        exit;
    }
}
else if ($route === 'contact/submit') {
    // Get POST data
    $input = file_get_contents('php://input');
    $postData = json_decode($input, true);
    
    $name = isset($postData['name']) ? $postData['name'] : '';
    $email = isset($postData['email']) ? $postData['email'] : '';
    $subject = isset($postData['subject']) ? $postData['subject'] : '';
    $message = isset($postData['message']) ? $postData['message'] : '';
    
    if (!$name || !$email || !$subject || !$message) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required contact form fields."]);
        exit;
    }
    
    // 1. Send the contact message details TO contact@sparklesapartments.ng
    $toAdmin = 'contact@sparklesapartments.ng';
    $subjectAdmin = 'New Contact Form Submission: ' . $subject;
    
    $htmlAdmin = "
        <div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; border-radius: 8px;\">
            <h2 style=\"color: #d97706; margin-top: 0;\">New message from contact form</h2>
            <p><strong>Name:</strong> {$name}</p>
            <p><strong>Email:</strong> {$email}</p>
            <p><strong>Subject:</strong> {$subject}</p>
            <div style=\"margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #d97706;\">
                <strong>Message:</strong><br/>
                " . nl2br(htmlspecialchars($message)) . "
            </div>
        </div>
    ";
    
    $headersAdmin = "MIME-Version: 1.0" . "\r\n";
    $headersAdmin .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
    $headersAdmin .= "From: Sparkles Contact Form <contact@sparklesapartments.ng>" . "\r\n";
    $headersAdmin .= "Reply-To: {$name} <{$email}>" . "\r\n";
    
    $adminSent = mail($toAdmin, $subjectAdmin, $htmlAdmin, $headersAdmin);
    
    // 2. Send an AUTO-RESPONDER to the guest's email address
    $subjectGuest = 'Message Received: Sparkles Apartments';
    
    $htmlGuest = "
        <div style=\"font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px;\">
            <div style=\"text-align: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;\">
                <h2 style=\"color: #000; margin: 0; font-size: 20px; font-weight: bold;\">SPARKLES APARTMENTS</h2>
                <span style=\"font-size: 11px; color: #9ca3af; text-transform: uppercase;\">Premium Luxury Shortlets</span>
            </div>
            <p>Dear {$name},</p>
            <p>Thank you for reaching out to Sparkles Apartments. We have received your inquiry regarding <strong>\"{$subject}\"</strong>.</p>
            <p>Our dedicated team is reviewing your message and will get back to you within 24 hours.</p>
            <p>If your request is urgent, please do not hesitate to contact us directly via phone.</p>
            <p style=\"margin-top: 25px;\">Warm regards,</p>
            <p style=\"font-weight: bold; color: #d97706; margin: 0;\">Sparkles Guest Support Team</p>
            <div style=\"margin-top: 30px; padding-top: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 11px; color: #9ca3af;\">
                <p style=\"margin: 0;\">Phones: 08033214684, 08062332639 | Email: contact@sparklesapartments.ng</p>
                <p style=\"margin: 5px 0 0 0;\">Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja</p>
            </div>
        </div>
    ";
    
    $headersGuest = "MIME-Version: 1.0" . "\r\n";
    $headersGuest .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
    $headersGuest .= "From: Sparkles Apartments <contact@sparklesapartments.ng>" . "\r\n";
    $headersGuest .= "Reply-To: contact@sparklesapartments.ng" . "\r\n";
    
    $guestSent = mail($email, $subjectGuest, $htmlGuest, $headersGuest);
    
    if ($adminSent && $guestSent) {
        echo json_encode(["success" => true]);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to deliver contact message or auto-responder."]);
        exit;
    }
}
else {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: " . $route]);
    exit;
}
