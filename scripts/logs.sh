#!/bin/bash

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "📋 Available services:"
    echo "  - api-gateway"
    echo "  - auth-service"
    echo "  - user-service"
    echo "  - call-service"
    echo "  - signaling-service"
    echo "  - media-service"
    echo "  - mongodb"
    echo "  - redis"
    echo "  - kurento"
    echo ""
    echo "Usage: ./scripts/logs.sh [service-name]"
    echo "   or: docker-compose logs -f (for all services)"
else
    docker-compose logs -f $SERVICE
fi
