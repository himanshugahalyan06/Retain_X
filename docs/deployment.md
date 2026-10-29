# 🚀 RetainX AI Deployment Guide

This guide provides step-by-step instructions for deploying the **RetainX AI** application in different environments, including containerized environments using Docker and cloud platforms (PaaS).

---

## 🏗️ Architecture Overview

RetainX AI consists of three main components:
1. **Frontend**: A React 19 application built with Vite and Tailwind CSS.
2. **Backend API**: A FastAPI application serving machine learning predictions, SHAP explainability charts, and performance metrics.
3. **Database**: SQLAlchemy-based SQLite (fallback/local) or PostgreSQL (production-ready).
4. **MLflow (Optional)**: Experiment tracking server.

```mermaid
graph TD
    Client[Web Browser] -->|HTTP/HTTPS| Frontend[Nginx / Vercel / Netlify]
    Client -->|API Requests| Backend[FastAPI / Uvicorn]
    Backend -->|Read/Write Metrics| DB[(PostgreSQL / SQLite)]
    Backend -->|Load Model & Explainer| Artifacts[(Model Artifacts .joblib)]
    Backend -->|Optional Logging| MLflow[MLflow Server]
```

---

## 🛠️ Environment Variables

Ensure the following environment variables are configured correctly during deployment:

### Backend (FastAPI)
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLAlchemy connection string (PostgreSQL or SQLite). | `sqlite:///churnguard.db` |
| `MLFLOW_TRACKING_URI` | Tracking URI for MLflow logging (optional). | None |
| `PORT` | Port for the backend API. | `8000` |

### Frontend (React + Vite)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | The public base URL of the FastAPI backend. | `http://localhost:8000` |

> **IMPORTANT**
> Since Vite compiles environment variables at build-time, you **must** supply `VITE_API_URL` before running `npm run build` or building the Docker container.

---

## 🐳 Option 1: Deploying with Docker Compose (Recommended for VPS)

Using Docker Compose is the easiest and most robust way to host the entire stack (Frontend, Backend, PostgreSQL, MLflow) on a Virtual Private Server (VPS) like **AWS EC2**, **DigitalOcean Droplet**, **Linode**, or **Hetzner**.

### Prerequisites
- Install **Docker** and **Docker Compose** on your server.
- Clone the repository to your server:
  ```bash
  git clone <your-repo-url> && cd CHURN_GUARD
  ```

### Step 1: Configure Environment Variables
Create a `.env` file in the root of the project to set the public URL of your backend:
```env
VITE_API_URL=http://your-server-ip:8000
```
*(Replace `your-server-ip` with the actual public IP address or domain name of your VPS).*

### Step 2: Start the Services
Run the following command from the project root:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```

This will automatically build and spin up the following containers:
- **`frontend`**: Serves the compiled React app on port `80`.
- **`api`**: Fast API server on port `8000`.
- **`postgres`**: Production-ready PostgreSQL database on port `5432`.
- **`mlflow`**: MLflow UI on port `5000`.

### Step 3: Access the Services
- **Website UI**: `http://your-server-ip`
- **FastAPI API Docs**: `http://your-server-ip:8000/docs`
- **MLflow Tracking**: `http://your-server-ip:5000`

---

## ☁️ Option 2: Serverless / PaaS Cloud Platforms

If you prefer managed services instead of managing virtual servers, you can split the deployment across different PaaS platforms:

### 1. Database (PostgreSQL)
Deploy a managed PostgreSQL database on one of the following:
- **Supabase** (Free Tier)
- **Neon Database** (Serverless Postgres)
- **Render PostgreSQL**

Copy the connection string (e.g., `postgresql://user:pass@host:port/db`) to use as `DATABASE_URL`.

---

### 2. Backend (FastAPI) on Render / Railway

You can deploy the backend directly from your GitHub repository:

#### Step-by-Step on Render:
1. Create a new **Web Service** on Render.
2. Link your GitHub repository.
3. Configure the service settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt && pip install -e .`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** tab, add:
   - `DATABASE_URL` = *Your PostgreSQL connection string*
   - `PYTHONPATH` = `src`
5. Click **Deploy**. Render will generate a URL like `https://churn-guard-api.onrender.com`.

---

### 3. Frontend (React) on Vercel / Netlify

Vercel and Netlify are excellent choices for hosting static React apps built with Vite.

#### Step-by-Step on Vercel:
1. Create a new project on Vercel and link your GitHub repository.
2. Set the configuration details:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following **Environment Variable**:
   - `VITE_API_URL` = *Your deployed FastAPI URL (e.g., `https://churn-guard-api.onrender.com`)*
4. Click **Deploy**. Vercel will deploy the frontend and provide a public URL (e.g., `https://churn-guard.vercel.app`).

> **TIP**
> Ensure there are no trailing slashes in your `VITE_API_URL` environment variable (e.g. use `https://api.domain.com` instead of `https://api.domain.com/`).

---

## 🔍 Post-Deployment Verification

Once deployed, make sure to check:
1. **Health Check**: Visit `https://your-api-domain.com/health` to confirm the backend is up.
2. **CORS Configuration**: The FastAPI backend contains:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
   This allows the frontend to communicate with it regardless of where the frontend is hosted.
3. **Database Tables**: On startup, FastAPI automatically runs `Base.metadata.create_all(bind=engine)`, which creates all necessary tables in your PostgreSQL database automatically. No manual migration scripts are needed.
