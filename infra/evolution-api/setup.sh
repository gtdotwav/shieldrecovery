#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Evolution API — Setup Script
# Run on a fresh Ubuntu 22.04+ VPS
# ============================================

DOMAIN="${1:-evo.pagrecovery.com}"
EMAIL="${2:-admin@pagrecovery.com}"

echo "=== Evolution API Setup ==="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# 1. Update system
echo "[1/6] Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Docker
if ! command -v docker &>/dev/null; then
    echo "[2/6] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "[2/6] Docker already installed."
fi

# 3. Install Docker Compose plugin
if ! docker compose version &>/dev/null; then
    echo "[3/6] Installing Docker Compose..."
    apt-get install -y -qq docker-compose-plugin
else
    echo "[3/6] Docker Compose already installed."
fi

# 4. Create .env from example if not exists
if [ ! -f .env ]; then
    echo "[4/6] Creating .env from example..."
    API_KEY=$(openssl rand -hex 32)
    cp .env.example .env
    sed -i "s|your-strong-api-key-here|${API_KEY}|g" .env
    sed -i "s|https://evo.pagrecovery.com|https://${DOMAIN}|g" .env
    echo ""
    echo ">>> API KEY GERADA: ${API_KEY}"
    echo ">>> Guarde essa chave! Ela vai nas env vars do Vercel."
    echo ""
else
    echo "[4/6] .env already exists, skipping."
fi

# 5. Get SSL certificate (first time — nginx not running yet)
echo "[5/6] Getting SSL certificate..."

# Temporarily start a simple server for ACME challenge
docker run -d --name certbot-standalone \
    -p 80:80 \
    -v certbot_certs:/etc/letsencrypt \
    -v certbot_www:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" 2>/dev/null || true

# Wait for certbot
docker wait certbot-standalone 2>/dev/null || true
docker rm certbot-standalone 2>/dev/null || true

# 6. Start everything
echo "[6/6] Starting Evolution API..."
docker compose up -d

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Evolution API: https://${DOMAIN}"
echo ""
echo "Next steps:"
echo "  1. Copy the API_KEY printed above"
echo "  2. Set these env vars in Vercel (Shield Recovery):"
echo ""

# Read the API key from .env
source .env
echo "     WHATSAPP_API_BASE_URL=https://${DOMAIN}"
echo "     WHATSAPP_ACCESS_TOKEN=${AUTHENTICATION_API_KEY}"
echo ""
echo "  3. In the Shield admin panel (/connect), set:"
echo "     - Provider: Evolution API (web_api)"
echo "     - URL: https://${DOMAIN}"
echo "     - Access Token: (the API key above)"
echo ""
echo "  4. Test: curl https://${DOMAIN}/instance/fetchInstances -H 'apikey: ${AUTHENTICATION_API_KEY}'"
echo ""
