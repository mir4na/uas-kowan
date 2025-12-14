# Quick Start Guide

## Langkah Cepat Deploy Lokal dengan Docker

### 1. Build Image
```bash
cd /home/mirananightfall/project/kowan-uas/circle-calculator
docker build -t circle-calculator:latest .
```

### 2. Jalankan dengan Docker Compose

Buat file `docker-compose.yml`:
```bash
cat > docker-compose.yml << 'EOF'
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mirana"]
      interval: 5s
      timeout: 5s
      retries: 5

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
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
EOF
```

### 3. Start Services
```bash
docker-compose up -d
```

### 4. Akses Aplikasi
Buka browser: http://localhost:3000

### 5. Stop Services
```bash
docker-compose down
```

## Langkah Deploy ke Kubernetes (minikube)

### 1. Start minikube
```bash
minikube start
```

### 2. Build dan Load Image
```bash
docker build -t circle-calculator:latest .
minikube image load circle-calculator:latest
```

### 3. Deploy Menggunakan Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Akses Aplikasi
```bash
minikube service circle-calculator-service
```

## Cara Menggunakan Aplikasi

### Registrasi (Pertama Kali)
1. Masukkan username
2. Klik "Register with Passkey"
3. Ikuti prompt browser untuk membuat passkey
4. Selesai! Anda akan langsung masuk ke aplikasi

### Login (Setelah Registrasi)
1. Masukkan username yang sama
2. Klik "Login with Passkey"
3. Verifikasi dengan passkey (fingerprint/face/PIN)
4. Selesai!

### Menghitung Lingkaran
1. Masukkan nilai radius
2. Klik "Calculate"
3. Lihat hasil luas dan keliling

## Troubleshooting

### Error: Cannot connect to database
```bash
docker logs postgres
```
Pastikan PostgreSQL sudah running

### Error: Passkey not working
Pastikan Anda mengakses via HTTPS atau localhost (WebAuthn requirement)

### Error: Image not found di Kubernetes
```bash
kubectl describe pod POD_NAME
```
Pastikan image sudah di-load ke minikube

## Next Steps untuk AWS Deployment

1. Push image ke Docker Hub atau AWS ECR
2. Update image di `k8s/app-deployment.yaml`
3. Update RP_ID dan ORIGIN di `k8s/configmap.yaml` dengan domain EC2
4. Deploy ke Kubernetes cluster di EC2

Lihat DEPLOYMENT.md untuk panduan lengkap.
