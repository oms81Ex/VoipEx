#!/bin/bash
set -e

SERVICES=(user-service auth-service call-service signaling-service api-gateway media-service)

for service in "${SERVICES[@]}"; do
  echo "==== Testing $service ===="
  cd $service
  npm install
  npm test
  cd ..
done

echo "🎉 All service tests completed!" 