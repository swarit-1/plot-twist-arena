# Deployment Guide

Production deployment instructions for PlotTwist Arena.

## Architecture Overview

```
┌─────────────┐
│   Cloudflare│ (CDN + DDoS)
│   / Nginx   │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│          Load Balancer (ALB/GCP LB)         │
└──┬────────────┬─────────────┬───────────────┘
   │            │             │
   │            │             │
┌──▼─────┐  ┌──▼─────┐   ┌──▼──────────┐
│Frontend│  │Backend │   │Model Server │
│(Static)│  │(Node)  │   │  (Python)   │
└────────┘  └───┬────┘   └──────┬──────┘
                │                │
          ┌─────▼─────┐    ┌────▼─────┐
          │PostgreSQL │    │  Redis   │
          └───────────┘    └──────────┘
```

## Deployment Options

### Option 1: Docker Compose (Simple)

Best for: Development, small production

```bash
# 1. Clone repository
git clone https://github.com/your-org/plot-twist-arena
cd plot-twist-arena

# 2. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with production values

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check health
curl http://localhost:3001/health
curl http://localhost:8001/health
```

### Option 2: Kubernetes (Scalable)

Best for: Large-scale production

See `k8s/` directory for manifests.

```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/
```

### Option 3: Serverless (Cost-effective)

Best for: Low-traffic, variable load

- **Frontend**: Vercel/Netlify
- **Backend**: AWS Lambda/Google Cloud Run
- **Model Server**: AWS SageMaker/GCP Vertex AI

## Service-by-Service Deployment

### Frontend (Static Site)

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Netlify

```bash
# Build
cd frontend
npm run build

# Deploy dist/ folder via Netlify UI or CLI
netlify deploy --prod --dir=dist
```

#### S3 + CloudFront

```bash
# Build
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Backend (Node.js)

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd backend
eb init

# Deploy
eb create plottwist-backend-prod
eb deploy
```

#### Google Cloud Run

```bash
# Build and push
cd backend
gcloud builds submit --tag gcr.io/PROJECT_ID/plottwist-backend

# Deploy
gcloud run deploy plottwist-backend \
  --image gcr.io/PROJECT_ID/plottwist-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku

```bash
cd backend

# Create app
heroku create plottwist-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Deploy
git push heroku main
```

### Model Server (Python)

#### AWS SageMaker

```python
# deploy_sagemaker.py
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

model = HuggingFaceModel(
    model_data="s3://your-bucket/models/model.tar.gz",
    role="arn:aws:iam::ACCOUNT:role/SageMakerRole",
    transformers_version="4.37",
    pytorch_version="2.2",
    py_version="py310",
)

predictor = model.deploy(
    instance_type="ml.g4dn.xlarge",  # GPU instance
    initial_instance_count=1,
)
```

#### GCP Vertex AI

```bash
# Upload model
gsutil cp -r models/fine_tuned_model gs://your-bucket/models/

# Deploy
gcloud ai endpoints create --display-name=plottwist-model

gcloud ai models upload \
  --region=us-central1 \
  --display-name=plottwist-model \
  --container-image-uri=gcr.io/PROJECT_ID/model-server
```

#### Modal (Serverless GPU)

```python
# modal_deploy.py
import modal

stub = modal.Stub("plottwist-model")

@stub.function(
    gpu="T4",
    image=modal.Image.debian_slim().pip_install_from_requirements("requirements.txt"),
    mounts=[modal.Mount.from_local_dir("models", remote_path="/models")]
)
def predict(story_setup: str):
    # Load model and predict
    pass

@stub.webhook(method="POST")
def predict_webhook(data: dict):
    return predict.call(data["story_setup"])
```

### Database (PostgreSQL)

#### Managed Services

**AWS RDS**:
```bash
aws rds create-db-instance \
  --db-instance-identifier plottwist-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username plottwist \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

**GCP Cloud SQL**:
```bash
gcloud sql instances create plottwist-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

**Supabase** (easiest):
- Sign up at supabase.com
- Create project
- Copy connection string to `backend/.env`

### Redis (Cache)

**AWS ElastiCache**:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id plottwist-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

**Redis Cloud** (easiest):
- Sign up at redis.com
- Create free database
- Copy connection string to `.env`

## Environment Variables

### Production .env Files

**backend/.env**:
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/plottwist
REDIS_URL=redis://host:6379
MODEL_SERVER_URL=https://model-server.yourapp.com
JWT_SECRET=your-secret-key-min-32-chars
```

**model-server/.env**:
```bash
MODEL_PATH=/app/models/fine_tuned_model
REDIS_URL=redis://host:6379
DEVICE=cuda
```

**frontend/.env**:
```bash
VITE_API_URL=https://api.yourapp.com
```

## SSL/TLS

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourapp.com -d www.yourapp.com
```

### Cloudflare (Easiest)

1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL (Flexible or Full)

## Monitoring

### Health Checks

Configure uptime monitoring:

**UptimeRobot** (free):
- Monitor: `https://api.yourapp.com/health`
- Monitor: `https://model-server.yourapp.com/health`
- Alert via email/Slack

### Logging

**AWS CloudWatch**:
```bash
# Install CloudWatch agent
# Configure log groups for each service
```

**GCP Cloud Logging**:
```bash
# Automatically enabled for Cloud Run
# View logs in console
```

### Metrics

**Prometheus + Grafana**:
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - 9090:9090

  grafana:
    image: grafana/grafana
    ports:
      - 3000:3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Scaling

### Horizontal Scaling

**Backend**:
- Run 3-5 instances behind load balancer
- Use sticky sessions for WebSocket

**Model Server**:
- Run 2-3 instances with GPU
- Use round-robin load balancing

**Database**:
- Enable read replicas
- Connection pooling (PgBouncer)

### Auto-scaling

**Kubernetes HPA**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Cost Estimation

### Small Deployment (~1000 daily users)

- **Frontend** (Vercel): $0/month (free tier)
- **Backend** (Cloud Run): ~$10/month
- **Model Server** (Cloud Run CPU): ~$30/month
- **Database** (Supabase): $0/month (free tier)
- **Redis** (Redis Cloud): $0/month (free tier)

**Total**: ~$40/month

### Medium Deployment (~10,000 daily users)

- **Frontend** (Vercel Pro): $20/month
- **Backend** (2x Cloud Run instances): ~$50/month
- **Model Server** (T4 GPU): ~$200/month
- **Database** (Cloud SQL): ~$25/month
- **Redis** (ElastiCache): ~$15/month

**Total**: ~$310/month

### Large Deployment (~100,000 daily users)

- **Frontend** (CDN): ~$50/month
- **Backend** (5x instances): ~$200/month
- **Model Server** (3x GPU): ~$600/month
- **Database** (RDS with replicas): ~$100/month
- **Redis** (ElastiCache cluster): ~$50/month
- **Monitoring**: ~$20/month

**Total**: ~$1,020/month

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set secure headers (Helmet.js)
- [ ] Enable CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Rate limiting on API endpoints
- [ ] Input validation and sanitization
- [ ] Regular dependency updates
- [ ] Enable WAF (Cloudflare, AWS WAF)
- [ ] Backup database daily

## Backup & Recovery

### Database Backups

```bash
# Automated daily backups
# AWS RDS: Enable automatic backups (7-35 days retention)

# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20251207.sql
```

### Model Backups

```bash
# Upload to S3
aws s3 sync models/ s3://your-backup-bucket/models/

# Version tracking
git tag v1.0-model
git push --tags
```

## Troubleshooting

### High Latency

1. Enable Redis caching
2. Add CDN for frontend
3. Use database read replicas
4. Optimize model inference (quantization)

### Out of Memory

1. Increase instance size
2. Enable memory-efficient mode in model
3. Add swap space
4. Reduce batch size

### Database Connection Errors

1. Check connection pool size
2. Use PgBouncer for pooling
3. Increase max_connections in PostgreSQL

## Support

For deployment issues:
- GitHub Issues: https://github.com/your-org/plot-twist-arena/issues
- Discord: https://discord.gg/your-server
- Email: support@yourapp.com
