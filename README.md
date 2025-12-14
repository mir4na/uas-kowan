# Circle Calculator dengan Passkey Authentication

Aplikasi web untuk menghitung luas dan keliling lingkaran dengan autentikasi passwordless menggunakan passkey (WebAuthn/FIDO2).

## Fitur

- Autentikasi passwordless dengan Passkey
- Kalkulator lingkaran (luas dan keliling)
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Deployment: Docker + Kubernetes

## Prerequisites

- Node.js 20+
- PostgreSQL
- Docker
- Kubernetes (minikube atau cluster lainnya)

## Setup Lokal

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database PostgreSQL

Pastikan PostgreSQL sudah running dan buat database:

```sql
CREATE DATABASE circle_calculator;
```

Credentials default:
- Username: mirana
- Password: ambasing

### 3. Jalankan Aplikasi

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

Aplikasi akan berjalan di http://localhost:3000

## Docker Build

### Build Docker Image

```bash
docker build -t circle-calculator:latest .
```

### Run dengan Docker Compose (opsional)

Buat file `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: circle_calculator
      POSTGRES_USER: mirana
      POSTGRES_PASSWORD: ambasing
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: circle-calculator:latest
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: circle_calculator
      DB_USER: mirana
      DB_PASSWORD: ambasing
      PORT: 3000
      RP_NAME: Circle Calculator
      RP_ID: localhost
      ORIGIN: http://localhost:3000
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Jalankan:
```bash
docker-compose up
```

## Complete Setup Guide - Docker + Kubernetes + Ngrok (untuk Passkey)

### Kenapa Perlu HTTPS untuk Passkey?
Passkey (WebAuthn) **hanya bekerja di HTTPS** atau localhost. Karena deployment di Kubernetes perlu diakses dari luar, kita gunakan **ngrok** untuk mendapatkan HTTPS gratis.

### Step-by-Step Setup dari Awal

#### 1. Install Prerequisites

Pastikan sudah terinstall:
```bash
# Docker
docker --version

# Minikube
minikube version

# kubectl
kubectl version --client

# ngrok
ngrok version

# Node.js (untuk development)
node --version
```

#### 2. Setup ngrok

Daftar dan dapatkan authtoken dari [ngrok.com](https://ngrok.com):
```bash
# Konfigurasi authtoken ngrok
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

#### 3. Start Minikube Cluster

```bash
# Delete cluster lama jika ada
minikube delete

# Start cluster baru
minikube start --driver=docker

# Verifikasi cluster running
minikube status
kubectl cluster-info
```

#### 4. Build Docker Image di Minikube

**Penting**: Build image di dalam Minikube environment agar tidak perlu push ke registry.

```bash
# Set Docker environment ke Minikube
eval $(minikube docker-env)

# Build image
docker build -t mirananightfall/circle-calculator:latest .

# Verifikasi image
docker images | grep circle-calculator
```

#### 5. Update Kubernetes ConfigMap dengan ngrok Domain

**CATATAN**: Langkah ini akan kita update setelah mendapatkan ngrok URL.

Edit file `k8s/configmap.yaml` (untuk sementara biarkan dulu):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: circle-calculator-config
data:
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "circle_calculator"
  PORT: "3000"
  RP_NAME: "Circle Calculator"
  RP_ID: "YOUR_NGROK_DOMAIN"  # akan diisi nanti
  ORIGIN: "https://YOUR_NGROK_DOMAIN"  # akan diisi nanti
```

#### 6. Deploy ke Kubernetes

```bash
# Deploy secret (database credentials)
kubectl apply -f k8s/secret.yaml

# Deploy ConfigMap (sementara dengan placeholder)
kubectl apply -f k8s/configmap.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres-deployment.yaml

# Tunggu PostgreSQL siap
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# Deploy aplikasi
kubectl apply -f k8s/app-deployment.yaml

# Cek status pods
kubectl get pods
```

Output yang diharapkan:
```
NAME                                 READY   STATUS    RESTARTS   AGE
circle-calculator-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
circle-calculator-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
postgres-xxxxxxxx-xxxxx              1/1     Running   0          2m
```

#### 7. Setup Port Forwarding

```bash
# Port forward service ke localhost
kubectl port-forward svc/circle-calculator-service 8080:80 &
```

#### 8. Start ngrok Tunnel

```bash
# Start ngrok untuk expose aplikasi via HTTPS
ngrok http 8080 > /tmp/ngrok.log 2>&1 &

# Tunggu 5 detik
sleep 5

# Dapatkan ngrok public URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4
```

Contoh output:
```
https://abc-def-ghi.ngrok-free.dev
```

**Catat URL ini!** Ini adalah domain ngrok Anda.

#### 9. Update ConfigMap dengan ngrok Domain

Edit `k8s/configmap.yaml` dengan domain ngrok yang didapat:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: circle-calculator-config
data:
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "circle_calculator"
  PORT: "3000"
  RP_NAME: "Circle Calculator"
  RP_ID: "abc-def-ghi.ngrok-free.dev"  # ganti dengan domain ngrok Anda
  ORIGIN: "https://abc-def-ghi.ngrok-free.dev"  # ganti dengan domain ngrok Anda
```

Apply ConfigMap yang sudah diupdate:
```bash
kubectl apply -f k8s/configmap.yaml
```

#### 10. Restart Application Pods

Agar environment variable ter-load ulang:
```bash
# Delete pods, akan otomatis dibuat ulang oleh Deployment
kubectl delete pod -l app=circle-calculator

# Tunggu pods baru siap
kubectl wait --for=condition=ready pod -l app=circle-calculator --timeout=120s

# Cek logs
kubectl logs -l app=circle-calculator --tail=10
```

Output yang diharapkan:
```
Database initialized
Server running on port 3000
```

#### 11. Verifikasi Environment Variables

```bash
# Cek environment variable di pod
kubectl get pods -l app=circle-calculator -o jsonpath='{.items[0].metadata.name}' | xargs -I {} kubectl exec {} -- env | grep -E "RP_ID|ORIGIN"
```

Output:
```
RP_ID=abc-def-ghi.ngrok-free.dev
ORIGIN=https://abc-def-ghi.ngrok-free.dev
```

#### 12. Test Akses Aplikasi

```bash
# Test via ngrok URL
curl -s https://YOUR_NGROK_DOMAIN | head -20
```

Jika berhasil, akan muncul HTML aplikasi.

#### 13. Akses Aplikasi dan Test Passkey

Buka browser dan akses:
```
https://YOUR_NGROK_DOMAIN
```

**Test Passkey:**
1. Masukkan username (contoh: `testuser`)
2. Klik **"Register with Passkey"**
3. Ikuti prompt browser untuk membuat passkey
4. Setelah berhasil, coba login dengan passkey
5. Test kalkulator dengan memasukkan radius

### Troubleshooting

#### Pods CrashLoopBackOff
```bash
# Lihat logs error
kubectl logs -l app=circle-calculator

# Biasanya karena PostgreSQL belum ready, tunggu dan restart:
kubectl delete pod -l app=circle-calculator
```

#### Error "RP ID is invalid"
Pastikan:
1. ConfigMap sudah diupdate dengan domain ngrok yang benar
2. Pods sudah di-restart setelah update ConfigMap
3. Akses aplikasi menggunakan URL ngrok (bukan IP atau localhost)

#### ngrok Tunnel Mati
```bash
# Restart ngrok
pkill ngrok
ngrok http 8080 > /tmp/ngrok.log 2>&1 &
```

#### Port Forward Mati
```bash
# Restart port forward
pkill -f "port-forward"
kubectl port-forward svc/circle-calculator-service 8080:80 &
```

### Monitoring & Logs

```bash
# Lihat semua pods
kubectl get pods

# Lihat logs real-time
kubectl logs -f -l app=circle-calculator

# Lihat logs PostgreSQL
kubectl logs -l app=postgres

# Describe pod untuk detail
kubectl describe pod POD_NAME

# Lihat events
kubectl get events --sort-by='.lastTimestamp'
```

### Clean Up

```bash
# Delete semua resources
kubectl delete -f k8s/

# Stop ngrok
pkill ngrok

# Stop port-forward
pkill -f "port-forward"

# Stop Minikube
minikube stop

# Delete Minikube cluster (optional)
minikube delete
```

## Kubernetes Deployment (Simple - tanpa ngrok)

### 1. Build dan Load Image ke Kubernetes

Untuk minikube:
```bash
docker build -t circle-calculator:latest .
minikube image load circle-calculator:latest
```

### 2. Deploy ke Kubernetes

```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/app-deployment.yaml
```

### 3. Akses Aplikasi

Untuk minikube:
```bash
minikube service circle-calculator-service
```

Atau gunakan port-forward:
```bash
kubectl port-forward service/circle-calculator-service 3000:80
```

### 4. Cek Status Deployment

```bash
kubectl get pods
kubectl get services
kubectl logs -f deployment/circle-calculator
```

## Deployment ke AWS Academy EC2

### 1. Push Image ke Container Registry

Option 1 - Docker Hub:
```bash
docker tag circle-calculator:latest yourusername/circle-calculator:latest
docker push yourusername/circle-calculator:latest
```

Option 2 - AWS ECR:
```bash
aws ecr create-repository --repository-name circle-calculator
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI
docker tag circle-calculator:latest YOUR_ECR_URI/circle-calculator:latest
docker push YOUR_ECR_URI/circle-calculator:latest
```

### 2. Update Kubernetes Manifests

Edit `k8s/app-deployment.yaml` dan ubah image:
```yaml
image: yourusername/circle-calculator:latest
```

### 3. Deploy ke Kubernetes di EC2

```bash
kubectl apply -f k8s/
```

## Cara Menggunakan

1. Buka browser dan akses aplikasi
2. Masukkan username
3. Klik "Register with Passkey" untuk registrasi pertama kali
4. Ikuti prompt browser untuk membuat passkey (biometric/security key)
5. Setelah berhasil, masukkan radius lingkaran
6. Klik "Calculate" untuk melihat hasil luas dan keliling

## Teknologi

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Auth**: SimpleWebAuthn (WebAuthn/FIDO2)
- **Database**: PostgreSQL
- **Container**: Docker
- **Orchestration**: Kubernetes
