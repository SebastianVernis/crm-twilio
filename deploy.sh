#!/bin/bash

# Deployment script for CRM-TWILIO application
echo "Preparing deployment files..."

# Create deployment directory
mkdir -p deployment

# Copy frontend files
cp -r frontend/* deployment/

# Copy backend files
mkdir -p deployment/api
cp -r backend/* deployment/api/

# Create .htaccess for proper routing
cat > deployment/.htaccess << 'EOF'
RewriteEngine On

# Handle API requests
RewriteRule ^api/(.*)$ api/$1 [L]

# Handle frontend routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]

# Security headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
EOF

echo "Deployment files prepared in ./deployment directory"
echo "Upload the contents of ./deployment to your web server"
