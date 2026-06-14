<?php
header("Content-Type: text/plain");
echo "Recursive search for clean.php under /home/sparkle7/public_html/:\n";

function find_clean_php($dir) {
    if (!is_dir($dir)) return;
    
    // Avoid scanning massive directories like wp-admin or wp-includes to prevent timeout
    $exclude = ['wp-admin', 'wp-includes', '.git', 'node_modules'];
    
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            if (in_array($file, $exclude)) continue;
            find_clean_php($path);
        } else if ($file === 'clean.php') {
            echo "\nFOUND: $path\n";
            echo "----------------------------------------\n";
            echo file_get_contents($path) . "\n";
            echo "----------------------------------------\n";
        }
    }
}

find_clean_php('/home/sparkle7/public_html');
echo "\nSearch complete.\n";
