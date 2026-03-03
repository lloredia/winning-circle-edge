# Running on Raspberry Pi

The stack runs on Raspberry Pi 4/5 (2GB+ RAM recommended). The dashboard auto-detects when you're on the same network — access it at `http://YOUR_PI_IP:8080` and it will talk to the API at `http://YOUR_PI_IP:3001`.

## Quick Setup

### 1. Prepare the Pi

```bash
# Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group to take effect
```

### 2. Copy the project

```bash
# Option A: Clone or copy from your Mac
scp -r winning-circle-edge pi@raspberrypi.local:~/

# Option B: SSH in and clone
ssh pi@raspberrypi.local
git clone <your-repo-url> winning-circle-edge
cd winning-circle-edge
```

### 3. Configure

```bash
cd ~/winning-circle-edge
cp .env.example .env
nano .env   # Add your API keys
```

### 4. Build and run

```bash
# Use the Pi-specific compose file
docker compose -f docker-compose.yml -f docker-compose.raspberrypi.yml up -d --build
```

First build may take 10–20 minutes (frontend builds on Pi). Subsequent starts are fast.

### 5. Access

- **From the Pi**: http://localhost:8080
- **From your phone/other devices**: http://YOUR_PI_IP:8080  
  (Find IP with `hostname -I`)

### 6. Auto-start on boot

```bash
./scripts/install-autostart.sh
```

Edit the script to use the Pi compose file, or add an alias:

```bash
# Add to ~/.bashrc or create a wrapper
alias docker-up='docker compose -f docker-compose.yml -f docker-compose.raspberrypi.yml up -d'
```

## Pi 3 (32-bit) or older

If you have a Pi 3:

1. Edit `docker-compose.raspberrypi.yml` and change `platform: linux/arm64` to `platform: linux/arm/v7`
2. Ensure you have at least 1GB free RAM; the frontend build may need swap

## Expose to the internet (optional)

To access from outside your home network:

1. **Cloudflare Tunnel** (recommended): Install `cloudflared` on the Pi and tunnel port 8080
2. **Port forwarding**: Forward your router's port 80/443 to the Pi's 8080 (less secure)

Set `DASHBOARD_URL` in `.env` to your public URL for Telegram links.
