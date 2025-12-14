#!/bin/bash

set -e

echo "Building Docker image..."
docker build -t circle-calculator:latest .

echo "Loading image to minikube..."
minikube image load circle-calculator:latest

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml

echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=60s

echo "Deploying application..."
kubectl apply -f k8s/app-deployment.yaml

echo "Waiting for application to be ready..."
kubectl wait --for=condition=ready pod -l app=circle-calculator --timeout=60s

echo ""
echo "Deployment completed!"
echo ""
echo "To access the application, run:"
echo "  minikube service circle-calculator-service"
echo ""
echo "Or use port-forward:"
echo "  kubectl port-forward service/circle-calculator-service 3000:80"
echo ""
echo "Check status:"
echo "  kubectl get pods"
echo "  kubectl get services"
