#!/bin/bash

# AMD64 플랫폼 강제 설정
export DOCKER_DEFAULT_PLATFORM=linux/amd64

echo "Cleaning up previous containers..."
docker-compose down

echo "Starting services with AMD64 images..."
docker-compose up -d

echo "Checking service status..."
sleep 10
docker-compose ps

echo "Showing logs (press Ctrl+C to exit)..."
docker-compose logs -f 