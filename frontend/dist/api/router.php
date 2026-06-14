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

// Helper to decode Base64 logo and save as a physical file
function get_and_optimize_logo($settings) {
    $logo_base64 = isset($settings['contact_logo']) ? $settings['contact_logo'] : '';
    if (empty($logo_base64)) {
        return '';
    }
    
    // Check if it is a base64 image
    if (preg_match('/^data:image\/(\w+);base64,(.+)$/i', $logo_base64, $matches)) {
        $type = $matches[1]; // png, jpeg, webp, etc.
        $data = base64_decode($matches[2]);
        
        $filename = 'logo.' . $type;
        $filepath = dirname(__DIR__) . '/' . $filename;
        
        // Write the file if it doesn't exist or is different size
        if (!file_exists($filepath) || filesize($filepath) !== strlen($data)) {
            @file_put_contents($filepath, $data);
        }
        
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'gittest.sparklesapartments.ng';
        
        return $protocol . $host . '/' . $filename;
    }
    
    return $logo_base64;
}


// Custom SMTP client using standard secure PHP stream sockets
function send_smtp_email($to, $subject, $html, $from, $settings, $replyTo = null) {
    $host = isset($settings['smtp_host']) ? trim($settings['smtp_host']) : '';
    $port = isset($settings['smtp_port']) ? intval($settings['smtp_port']) : 25;
    $username = isset($settings['smtp_username']) ? trim($settings['smtp_username']) : '';
    $password = isset($settings['smtp_password']) ? trim($settings['smtp_password']) : '';
    $secure = isset($settings['smtp_secure']) ? trim(strtolower($settings['smtp_secure'])) : 'none';
    
    if (empty($host) || empty($username) || empty($password)) {
        throw new Exception("SMTP is enabled but Host, Username, or Password is not configured in settings.");
    }
    
    $connectionHost = $host;
    if ($secure === 'ssl') {
        $connectionHost = 'ssl://' . $host;
    }
    
    $socket = @fsockopen($connectionHost, $port, $errno, $errstr, 15);
    if (!$socket) {
        throw new Exception("Could not connect to SMTP host '$connectionHost' on port $port: $errstr ($errno)");
    }
    
    $readResponse = function($socket, $expectedCode) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') {
                break;
            }
        }
        $code = intval(substr($response, 0, 3));
        if ($code !== $expectedCode) {
            throw new Exception("SMTP protocol error: Expected $expectedCode, got $code. Response: " . trim($response));
        }
        return $response;
    };
    
    try {
        $readResponse($socket, 220);
        
        $helloHost = isset($_SERVER['SERVER_NAME']) && !empty($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
        fwrite($socket, "EHLO " . $helloHost . "\r\n");
        $readResponse($socket, 250);
        
        if ($secure === 'tls') {
            fwrite($socket, "STARTTLS\r\n");
            $readResponse($socket, 220);
            
            // Enable encryption on socket
            $crypto_method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT')) {
                $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
            }
            $cryptoSuccess = @stream_socket_enable_crypto($socket, true, $crypto_method);
            if (!$cryptoSuccess) {
                throw new Exception("Failed to upgrade SMTP connection using STARTTLS (stream_socket_enable_crypto failed).");
            }
            
            fwrite($socket, "EHLO " . $helloHost . "\r\n");
            $readResponse($socket, 250);
        }
        
        fwrite($socket, "AUTH LOGIN\r\n");
        $readResponse($socket, 334);
        
        fwrite($socket, base64_encode($username) . "\r\n");
        $readResponse($socket, 334);
        
        fwrite($socket, base64_encode($password) . "\r\n");
        $readResponse($socket, 235);
        
        // Envelope Sender MUST match the authenticated username to satisfy Exim local delivery authorization
        fwrite($socket, "MAIL FROM:<" . $username . ">\r\n");
        $readResponse($socket, 250);
        
        fwrite($socket, "RCPT TO:<" . $to . ">\r\n");
        $readResponse($socket, 250);
        
        fwrite($socket, "DATA\r\n");
        $readResponse($socket, 354);
        
        // Construct standard MIME headers
        $boundary = '----=' . md5(uniqid(rand(), true));
        
        $senderName = "Sparkles Apartments";
        if (strpos($from, 'contact@') !== false) {
            $senderName = "Sparkles Contact Form";
        } else if (strpos($from, 'info@') !== false) {
            $senderName = "Sparkles Info";
        }
        
        $headers = [];
        $headers[] = "From: " . $senderName . " <" . $from . ">";
        $headers[] = "Reply-To: " . ($replyTo ? $replyTo : $from);
        $headers[] = "To: <" . $to . ">";
        $headers[] = "Subject: " . $subject;
        $headers[] = "Date: " . date('r');
        $headers[] = "Message-ID: <" . uniqid('', true) . "@" . $host . ">";
        $headers[] = "X-Mailer: PHP/" . phpversion();
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: multipart/alternative; boundary=\"" . $boundary . "\"";
        
        $body = [];
        $body[] = "This is a multi-part message in MIME format.";
        $body[] = "--" . $boundary;
        $body[] = "Content-Type: text/plain; charset=\"UTF-8\"";
        $body[] = "Content-Transfer-Encoding: quoted-printable";
        $body[] = "";
        $body[] = quoted_printable_encode(strip_tags($html));
        $body[] = "";
        $body[] = "--" . $boundary;
        $body[] = "Content-Type: text/html; charset=\"UTF-8\"";
        $body[] = "Content-Transfer-Encoding: quoted-printable";
        $body[] = "";
        $body[] = quoted_printable_encode($html);
        $body[] = "";
        $body[] = "--" . $boundary . "--";
        
        $messageContent = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body);
        
        // Escape periods at start of lines for SMTP protocol compliance
        $messageContent = preg_replace('/^\./m', '..', $messageContent);
        
        fwrite($socket, $messageContent . "\r\n.\r\n");
        $readResponse($socket, 250);
        
        fwrite($socket, "QUIT\r\n");
        fclose($socket);
        return true;
    } catch (Exception $e) {
        @fclose($socket);
        throw $e;
    }
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
    
    // Fetch system settings to check for SMTP config
    $settings = get_supabase_settings();
    $smtpEnabled = isset($settings['smtp_enabled']) && ($settings['smtp_enabled'] === 'true' || $settings['smtp_enabled'] === true);
    
    // Optimize base64 image strings in HTML if they match the settings logo
    $logoUrl = get_and_optimize_logo($settings);
    if (!empty($logoUrl)) {
        if (isset($settings['contact_logo']) && !empty($settings['contact_logo'])) {
            $html = str_replace($settings['contact_logo'], $logoUrl, $html);
        }
        // Fallback: replace any inline base64 images
        $html = preg_replace('/src=["\']data:image\/[^;]+;base64,[^"\']+["\']/i', 'src="' . $logoUrl . '"', $html);
    }
    
    if ($smtpEnabled) {
        try {
            send_smtp_email($to, $subject, $html, $from, $settings);
            http_response_code(200);
            echo json_encode(["success" => true, "id" => "cpanel_smtp_" . uniqid()]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "SMTP Authentication failed: " . $e->getMessage()]);
            exit;
        }
    } else {
        // Fallback to standard HTML email headers for cPanel mail server via PHP mail()
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
        $headers .= "From: Sparkles Apartments <" . $from . ">" . "\r\n";
        $headers .= "Reply-To: " . $from . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        
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
    
    $settings = get_supabase_settings();
    $logoUrl = get_and_optimize_logo($settings);
    $logoHtml = !empty($logoUrl) ? '<img src="' . $logoUrl . '" alt="Sparkles Apartments" style="max-height: 50px; object-fit: contain; margin-bottom: 8px; border-radius: 4px;" /><br/>' : '';

    $systemTheme = isset($settings['system_theme']) ? $settings['system_theme'] : 'theme-luxe-gold';
    $themeColors = [
        'theme-slate-dark' => '#64748B',
        'theme-luxe-gold' => '#DF6853',
        'theme-emerald-green' => '#10B981',
        'theme-royal-blue' => '#3B82F6',
        'theme-sunset-orange' => '#F97316',
        'theme-rose-burgundy' => '#F43F5E',
        'theme-midnight-purple' => '#A855F7',
        'theme-ocean-teal' => '#14B8A6'
    ];
    $accentColor = isset($themeColors[$systemTheme]) ? $themeColors[$systemTheme] : '#DF6853';

    // 1. Send the contact message details TO contact@sparklesapartments.ng
    $toAdmin = 'contact@sparklesapartments.ng';
    $subjectAdmin = 'New Contact Form Submission: ' . $subject;
    
    $htmlAdmin = "
        <div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-top: 6px solid {$accentColor}; max-width: 600px; border-radius: 8px;\">
            <div style=\"text-align: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;\">
                {$logoHtml}
                <h2 style=\"color: #000; margin: 0; font-size: 20px; font-weight: bold;\">SPARKLES APARTMENTS</h2>
                <span style=\"font-size: 11px; color: {$accentColor}; text-transform: uppercase; font-weight: bold;\">Admin Submission Alert</span>
            </div>
            <p><strong>Name:</strong> {$name}</p>
            <p><strong>Email:</strong> {$email}</p>
            <p><strong>Subject:</strong> {$subject}</p>
            <div style=\"margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid {$accentColor};\">
                <strong>Message:</strong><br/>
                " . nl2br(htmlspecialchars($message)) . "
            </div>
        </div>
    ";
    
    // 2. Send an AUTO-RESPONDER to the guest's email address
    $subjectGuest = 'Message Received: Sparkles Apartments';
    
    $htmlGuest = "
        <div style=\"font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-top: 6px solid {$accentColor}; border-radius: 12px;\">
            <div style=\"text-align: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;\">
                {$logoHtml}
                <h2 style=\"color: #000; margin: 0; font-size: 20px; font-weight: bold;\">SPARKLES APARTMENTS</h2>
                <span style=\"font-size: 11px; color: {$accentColor}; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em;\">Premium Luxury Shortlets</span>
            </div>
            <p>Dear {$name},</p>
            <p>Thank you for reaching out to Sparkles Apartments. We have received your inquiry regarding <strong>\"{$subject}\"</strong>.</p>
            <p>Our dedicated team is reviewing your message and will get back to you within 24 hours.</p>
            <p>If your request is urgent, please do not hesitate to contact us directly via phone.</p>
            <p style=\"margin-top: 25px;\">Warm regards,</p>
            <p style=\"font-weight: bold; color: {$accentColor}; margin: 0;\">Sparkles Guest Support Team</p>
            <div style=\"margin-top: 30px; padding-top: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 11px; color: #9ca3af;\">
                <p style=\"margin: 0;\">Phones: 08033214684, 08062332639 | Email: contact@sparklesapartments.ng</p>
                <p style=\"margin: 5px 0 0 0;\">Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja</p>
            </div>
        </div>
    ";
    
    $smtpEnabled = isset($settings['smtp_enabled']) && ($settings['smtp_enabled'] === 'true' || $settings['smtp_enabled'] === true);
    
    if ($smtpEnabled) {
        try {
            // Send inquiry to admin
            $adminSent = send_smtp_email($toAdmin, $subjectAdmin, $htmlAdmin, 'contact@sparklesapartments.ng', $settings, "{$name} <{$email}>");
            
            // Send auto-responder to guest
            $guestSent = send_smtp_email($email, $subjectGuest, $htmlGuest, 'contact@sparklesapartments.ng', $settings);
            
            if ($adminSent && $guestSent) {
                echo json_encode(["success" => true]);
                exit;
            } else {
                throw new Exception("SMTP delivered failed silently.");
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "SMTP Authentication failed: " . $e->getMessage()]);
            exit;
        }
    } else {
        // Fallback to PHP mail()
        $headersAdmin = "MIME-Version: 1.0" . "\r\n";
        $headersAdmin .= "Content-Type: text/html; charset=UTF-8" . "\r\n";
        $headersAdmin .= "From: Sparkles Contact Form <contact@sparklesapartments.ng>" . "\r\n";
        $headersAdmin .= "Reply-To: {$name} <{$email}>" . "\r\n";
        
        $adminSent = mail($toAdmin, $subjectAdmin, $htmlAdmin, $headersAdmin);
        
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
            echo json_encode(["error" => "Failed to deliver contact message or auto-responder via mail()."]);
            exit;
        }
    }
}
else {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: " . $route]);
    exit;
}
