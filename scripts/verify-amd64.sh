#!/bin/bash

echo "Verifying AMD64 architecture for all containers..."

for container in $(docker ps --format "{{.Names}}" | grep voip); do
    echo -n "Checking $container: "
    arch=$(docker inspect $container | grep -i architecture | awk -F'"' '{print $4}' | head -1)
    if [ "$arch" = "amd64" ]; then
        echo "✓ AMD64"
    else
        echo "✗ $arch (NOT AMD64)"
    fi
done

echo -e "\nAll containers should show AMD64 architecture." 