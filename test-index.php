<?php
// Simple test file to check if PHP is working
echo "<!DOCTYPE html>";
echo "<html><head><title>CRM Test</title></head><body>";
echo "<h1>CRM Application Test</h1>";
echo "<p>Server is working. PHP Version: " . phpversion() . "</p>";
echo "<p>Current directory: " . getcwd() . "</p>";
echo "<p>Files in directory:</p><ul>";
$files = scandir('.');
foreach($files as $file) {
    if($file != '.' && $file != '..') {
        echo "<li>$file</li>";
    }
}
echo "</ul>";
echo "<p><a href='index.html'>Go to CRM Application</a></p>";
echo "</body></html>";
?>
