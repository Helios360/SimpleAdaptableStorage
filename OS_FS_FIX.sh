#!/bin/bash

# Totally made with AI lol i'm not responsible for this


# See what kernel you *have installed* vs *running*
uname -r
pacman -Q | grep -E '^(linux($|-)|linux-lts|linux-zen)'

# Make sure you have a standard kernel installed (pick ONE of these)
sudo pacman -Syu linux          # mainline Arch kernel
# or:
# sudo pacman -Syu linux-lts    # LTS kernel (often safer)


# !!! After install/upgrade, reboot into that kernel !!!
# systemctl reboot

# =====================================================================================

# Confirm overlayfs is present now
cat /proc/filesystems | grep -w overlay || true
sudo modprobe overlay && echo "overlay loaded"

# Switch Docker back to overlay2
sudo jq '. + {"storage-driver":"overlay2"}' /etc/docker/daemon.json 2>/dev/null \
  | sudo tee /etc/docker/daemon.json >/dev/null || \
  printf '%s\n' '{ "storage-driver": "overlay2" }' | sudo tee /etc/docker/daemon.json

sudo systemctl restart docker
sudo docker info | sed -n '1,80p' | grep -i 'storage driver'

echo overlay | sudo tee /etc/modules-load.d/overlay.conf
