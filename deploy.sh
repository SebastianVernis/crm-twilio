#!/bin/bash

# Deployment Configuration
REMOTE_HOST="access-5018020518.webspace-host.com"
REMOTE_USER="a951193"
REMOTE_PASSWORD="Svernis1"
REMOTE_PORT="22"
REMOTE_PATH="/homepages/24/d4299087580/htdocs/Apps/crm.sebastianvernis.com"
LOCAL_PATH="/home/user/workspace"

echo "🚀 Starting CRM Twilio Deployment..."

# Create deployment directory
mkdir -p deployment
cd deployment

# Clean previous deployment files
rm -rf crm-twilio-deploy
mkdir crm-twilio-deploy

echo "📦 Preparing deployment package..."

# Copy application files (excluding unnecessary files)
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='logs' \
          --exclude='*.log' \
          --exclude='deployment' \
          --exclude='.env.example' \
          --exclude='README*.md' \
          --exclude='.vercelignore' \
          --exclude='vercel.json' \
          ../. crm-twilio-deploy/

echo "✅ Deployment package prepared"

# Create remote setup script
cat > crm-twilio-deploy/remote-setup.sh << 'EOF'
#!/bin/bash

echo "🔧 Setting up CRM Twilio application on remote server..."

# Update system packages
sudo apt-get update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Navigate to application directory
cd /homepages/24/d4299087580/htdocs/Apps/crm.sebastianvernis.com

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Set proper permissions
chmod +x backend/server.js
chmod +x remote-setup.sh

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'crm-twilio',
    script: 'backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOFPM2

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ CRM Twilio application deployed and started successfully!"
echo "🌐 Application should be running on port 3001"
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs crm-twilio"

EOF

chmod +x crm-twilio-deploy/remote-setup.sh

echo "📤 Uploading files to remote server..."

# Create SFTP batch file
cat > sftp_commands.txt << EOF
cd /homepages/24/d4299087580/htdocs/Apps/crm.sebastianvernis.com
put -r crm-twilio-deploy/* .
quit
EOF

# Upload files using SFTP
sshpass -p "$REMOTE_PASSWORD" sftp -o StrictHostKeyChecking=no -P $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST < sftp_commands.txt

if [ $? -eq 0 ]; then
    echo "✅ Files uploaded successfully!"
    
    echo "🔧 Running remote setup..."
    # Execute remote setup script
    sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST "cd /homepages/24/d4299087580/htdocs/Apps/crm.sebastianvernis.com && chmod +x remote-setup.sh && ./remote-setup.sh"
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment completed successfully!"
        echo "🌐 Your CRM Twilio application is now running on:"
        echo "   http://$REMOTE_HOST:3001"
        echo ""
        echo "📋 Useful commands:"
        echo "   SSH into server: ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST"
        echo "   Check PM2 status: pm2 status"
        echo "   View logs: pm2 logs crm-twilio"
        echo "   Restart app: pm2 restart crm-twilio"
    else
        echo "❌ Remote setup failed!"
        exit 1
    fi
else
    echo "❌ File upload failed!"
    exit 1
fi

# Cleanup
rm -f sftp_commands.txt

echo "🧹 Deployment process completed!"
