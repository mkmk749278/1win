#!/usr/bin/env bash
set -euo pipefail

curl --fail --silent http://127.0.0.1:3001/health | grep '"ok":true'
