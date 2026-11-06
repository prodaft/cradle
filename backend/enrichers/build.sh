#!/usr/bin/env bash
# Build all enricher container images.
#
# Usage:
#   ./build.sh                          # build all with default prefix
#   IMAGE_PREFIX=myregistry/enricher ./build.sh
#   ./build.sh dns virustotal           # build specific enrichers only
#
# Images are tagged as:
#   <IMAGE_PREFIX>/<enricher_name>:latest
#
# The Dockerfiles expect to be built from the enrichers/ root directory
# so that the shared _base/ module is available as a build context.

set -euo pipefail

IMAGE_PREFIX="${IMAGE_PREFIX:-cradle/enricher}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ALL_ENRICHERS=(dns virustotal abuseipdb circl_pdns misp mwdb opencti urlscan)

if [ "$#" -gt 0 ]; then
    ENRICHERS=("$@")
else
    ENRICHERS=("${ALL_ENRICHERS[@]}")
fi

for enricher in "${ENRICHERS[@]}"; do
    image="${IMAGE_PREFIX}/${enricher}enricher"
    echo "==> Building ${image} ..."
    docker build \
        --file "${SCRIPT_DIR}/${enricher}/Dockerfile" \
        --tag "${image}:latest" \
        "${SCRIPT_DIR}"
    echo "    Built ${image}:latest"
done

echo ""
echo "Done. Built ${#ENRICHERS[@]} image(s)."
