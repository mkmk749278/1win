#!/usr/bin/env bash
set -euo pipefail

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2
