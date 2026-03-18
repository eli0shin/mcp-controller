#!/bin/bash
set -euo pipefail

REPO="eli0shin/mcp-controller"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="mcp-controller"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in
  darwin) OS="darwin" ;;
  linux) OS="linux" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

ARTIFACT="${BINARY_NAME}-${OS}-${ARCH}"

echo "Detected: ${OS}-${ARCH}"
echo "Installing to: ${INSTALL_DIR}/${BINARY_NAME}"

mkdir -p "$INSTALL_DIR"

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ARTIFACT}"
echo "Downloading from: ${DOWNLOAD_URL}"

curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

echo "Installed ${BINARY_NAME} to ${INSTALL_DIR}/${BINARY_NAME}"

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  echo "Add this to your shell profile to use ${BINARY_NAME}:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi
