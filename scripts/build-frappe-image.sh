#!/usr/bin/env bash
# build-frappe-image.sh — Build the custom Frappe image with ecosystem apps
#
# Usage:
#   ./scripts/build-frappe-image.sh          Build and tag the image
#   ./scripts/build-frappe-image.sh --push   Build, tag, and (future) push to registry
#
# The image is tagged as:
#   sparkmojo/frappe-custom:v16.10.1            (latest build)
#   sparkmojo/frappe-custom:v16.10.1-YYYYMMDD   (date-stamped)

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="sparkmojo/frappe-custom"
IMAGE_TAG="v16.10.1"
DATE_TAG="${IMAGE_TAG}-$(date +%Y%m%d)"
PUSH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      PUSH=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--push]"
      exit 1
      ;;
  esac
done

echo ""
echo "=== Building custom Frappe image ==="
echo "  Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  Date tag: ${IMAGE_NAME}:${DATE_TAG}"
echo ""

docker build \
  -f "${REPO_ROOT}/Dockerfile.frappe" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:${DATE_TAG}" \
  "${REPO_ROOT}"

echo ""
echo "=== Build complete ==="
IMAGE_ID=$(docker images --no-trunc -q "${IMAGE_NAME}:${IMAGE_TAG}" | head -1)
IMAGE_SIZE=$(docker images --format "{{.Size}}" "${IMAGE_NAME}:${IMAGE_TAG}" | head -1)
echo "  Image ID: ${IMAGE_ID}"
echo "  Size: ${IMAGE_SIZE}"
echo "  Tags:"
echo "    ${IMAGE_NAME}:${IMAGE_TAG}"
echo "    ${IMAGE_NAME}:${DATE_TAG}"

if [ "$PUSH" = true ]; then
  echo ""
  echo "  --push flag detected, but registry push is not yet configured."
  echo "  Future: docker push ${IMAGE_NAME}:${IMAGE_TAG}"
  echo "  Future: docker push ${IMAGE_NAME}:${DATE_TAG}"
  echo "  For now, transfer the image to the VPS with:"
  echo "    docker save ${IMAGE_NAME}:${IMAGE_TAG} | ssh sparkmojo docker load"
fi

echo ""
