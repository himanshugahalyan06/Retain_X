# 🛡️ RetainX AI

> **Cost-Sensitive Customer Churn Prediction & Retention Decision Intelligence System**
> ML-powered churn prediction with SHAP explainability, optimized threshold tuning, and a full-stack web interface.cd

---

## ⚡ Quick Start — Project Run Karne ke Steps

> **Do terminals chahiye** — ek backend ke liye, ek frontend ke liye.

---

### 🔧 Pehli Baar Setup (Sirf Ek Baar)

```bash
# Step 1 — Python dependencies install karo
pip install -r requirements.txt

# Step 2 — churnguard package ko editable mode mein install karo
pip install -e .

# Step 3 — Frontend dependencies install karo
cd frontend
npm install
cd ..
```

---

### 🖥️ Terminal 1 — Backend Start Karo

```bash
# Project root se chalao (CHURN_GUARD/)
PYTHONPATH=src uvicorn api.main:app --reload --port 8000
```

✅ Backend: **http://localhost:8000**
✅ API Docs: **http://localhost:8000/docs**

---

### 🌐 Terminal 2 — Frontend Start Karo

```bash
# Project root se chalao (CHURN_GUARD/)
cd frontend
npm run dev
```

✅ Website: **http://localhost:5173**

---

## steps to run this project

1. pip install -r requirements.txt
2. pip install -e .
3. cd frontend && npm install
   ──────────────────────────────
   Terminal 1 → PYTHONPATH=src uvicorn api.main:app --reload --port 8000
   Terminal 2 → cd frontend && npm run dev
   ──────────────────────────────
   Browser → http://localhost:5173

### 🎯 Browser mein kholo

| Page         | Link                            |
| ------------ | ------------------------------- |
| 🏠 Home      | http://localhost:5173/          |
| 🔮 Predict   | http://localhost:5173/predict   |
| 📊 Dashboard | http://localhost:5173/dashboard |
| 📋 History   | http://localhost:5173/history   |

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup &amp; Installation](#-setup--installation)
- [Running the Project](#-running-the-project)
- [API Endpoints](#-api-endpoints)
- [Website Pages](#-website-pages)
- [ML Model Details](#-ml-model-details)
- [What Was NOT Changed](#-what-was-not-changed)

---

## 🔍 Project Overview

RetainX AI predicts which telecom customers are likely to churn, with a business-first approach:

- **Cost-sensitive training** — penalizes missing a churner more than a false alarm
- **Threshold tuning** — optimal decision threshold tuned to minimize total business cost
- **SHAP explainability** — every prediction explained by feature contributions
- **Production API** — FastAPI backend with SQLite logging and real-time metrics
- **Full-stack website** — multi-page React app with prediction form, analytics dashboard, and session history

---

## 🧰 Tech Stack

| Layer               | Technology                        |
| ------------------- | --------------------------------- |
| ML Model            | Random Forest + scikit-learn      |
| Explainability      | SHAP                              |
| Experiment Tracking | MLflow                            |
| Backend API         | FastAPI + Uvicorn                 |
| Database            | SQLite (SQLAlchemy ORM)           |
| Frontend            | React 19 + Vite + Tailwind CSS v4 |
| Charts              | Recharts                          |
| Routing             | React Router v6                   |
| HTTP Client         | Axios                             |

---

## 📁 Project Structure

```
CHURN_GUARD/
├── api/                        # FastAPI backend
│   ├── main.py                 # App entry point, CORS config
│   ├── schemas.py              # Pydantic request/response models
│   ├── dependencies.py
│   └── routes/
│       ├── predict.py          # POST /predict
│       ├── explain.py          # POST /explain (SHAP)
│       ├── metrics.py          # GET /metrics
│       └── health.py           # GET /health
├── src/churnguard/             # Core ML package
│   ├── data/                   # Data loading & cleaning
│   ├── features/               # Feature engineering
│   ├── preprocessing/          # sklearn Pipeline
│   ├── models/                 # Training + Predictor class
│   ├── explainability/         # SHAP explainer
│   ├── database/               # SQLAlchemy models & session
│   └── monitoring/             # Drift detection
├── artifacts/
│   ├── model/random_forest.joblib      # ✅ Trained model (DO NOT DELETE)
│   ├── threshold/best_threshold.json   # ✅ Optimal threshold (DO NOT DELETE)
│   └── encoder/                        # ✅ Fitted encoder
├── frontend/                   # React website
│   ├── src/
│   │   ├── App.jsx             # Router + Context wrapper
│   │   ├── pages/
│   │   │   ├── HomePage.jsx    # Landing page
│   │   │   ├── PredictPage.jsx # Multi-step prediction form
│   │   │   ├── DashboardPage.jsx # Metrics & analytics
│   │   │   └── HistoryPage.jsx   # Session prediction history
│   │   ├── components/
│   │   │   └── Navbar.jsx      # Sticky navbar with API status
│   │   ├── context/
│   │   │   └── HistoryContext.jsx
│   │   └── lib/
│   │       └── api.js          # Axios base client
│   └── package.json
├── data/                       # Raw & processed data
├── notebooks/                  # EDA & model experimentation
├── tests/                      # pytest test suite
├── run.py                      # Quick backend launcher
├── setup.py                    # Install churnguard as local package
└── requirements.txt            # Python dependencies
```

---

## ✅ Prerequisites

Make sure you have these installed:

| Tool    | Version | Check Command         |
| ------- | ------- | --------------------- |
| Python  | 3.9+    | `python3 --version` |
| Node.js | 18+     | `node --version`    |
| npm     | 9+      | `npm --version`     |
| pip     | latest  | `pip --version`     |

---

## 🔧 Setup & Installation

### Step 1 — Clone / Navigate to the project

```bash
cd /Users/himanshugahalyan/Desktop/CHURN_GUARD
```

### Step 2 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Install the `churnguard` package in editable mode

> This makes the `src/churnguard` package importable from anywhere in the project.

```bash
pip install -e .
```

### Step 4 — Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

> That's it for setup. The trained model already exists in `artifacts/` — **no retraining needed**.

---

## 🚀 Running the Project

You need **two terminals** — one for the backend, one for the frontend.

---

### Terminal 1 — Start the Backend (FastAPI)

```bash
# From the project root: CHURN_GUARD/
PYTHONPATH=src uvicorn api.main:app --reload --port 8000
```

**Or use the shortcut script:**

```bash
python run.py
```

✅ Backend will start at: **http://localhost:8000**
✅ Interactive API docs: **http://localhost:8000/docs**

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Loaded model from local joblib successfully.
INFO:     ShapExplainer initialized.
INFO:     Application startup complete.
```

---

### Terminal 2 — Start the Frontend (React + Vite)

```bash
# From the project root: CHURN_GUARD/
cd frontend
npm run dev
```

✅ Website will start at: **http://localhost:5173**

---

### Both Running — Open the website

Go to **http://localhost:5173** in your browser.

| Page      | URL            | What it does                                 |
| --------- | -------------- | -------------------------------------------- |
| Home      | `/`          | Landing page with overview                   |
| Predict   | `/predict`   | 3-step form → churn risk score + SHAP chart |
| Dashboard | `/dashboard` | Live metrics from`/metrics` API            |
| History   | `/history`   | Session predictions table                    |

---

## 🌐 API Endpoints

Base URL: `http://localhost:8000`

| Method   | Endpoint     | Description                                           |
| -------- | ------------ | ----------------------------------------------------- |
| `GET`  | `/health`  | API status check                                      |
| `GET`  | `/metrics` | Total predictions, latency, churn distribution        |
| `POST` | `/predict` | Returns`probability`, `prediction`, `threshold` |
| `POST` | `/explain` | Returns SHAP feature contributions                    |
| `GET`  | `/docs`    | Interactive Swagger UI                                |

### Example — POST /predict

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "Male",
    "SeniorCitizen": 0,
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 12,
    "PhoneService": "Yes",
    "MultipleLines": "No",
    "InternetService": "Fiber optic",
    "OnlineSecurity": "No",
    "OnlineBackup": "Yes",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "Yes",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 70.35,
    "TotalCharges": 845.50
  }'
```

**Response:**

```json
{
  "prediction": 1,
  "probability": 0.84,
  "threshold": 0.1
}
```

---

## 🌐 Website Pages

### 🏠 Home Page (`/`)

- Hero section explaining RetainX
- Stats: AUC score, latency, cost reduction
- Feature cards and how-it-works steps
- CTA buttons linking to Predict and Dashboard

### 🔮 Predict Page (`/predict`)

**Step 1 — Personal Info:** Gender, Senior Citizen, Partner, Dependents, Tenure
**Step 2 — Services:** Phone, Internet, Online Security, Backup, Streaming, etc.
**Step 3 — Billing:** Contract type, Payment method, Monthly & Total charges

After submitting:

- **Circular gauge** showing churn probability %
- **Risk badge**: Low / Medium / High
- **SHAP bar chart** — red bars = increases risk, green = decreases risk
- **Input summary** of all entered values

### 📊 Dashboard Page (`/dashboard`)

- 4 stat cards: Total Predictions, Churn Rate, Avg Latency, Throughput
- **Donut chart** — Churn vs No-Churn distribution
- **Bar chart** — absolute count comparison
- Performance metrics table with status indicators
- Live API status indicator, auto-refreshes every 30 seconds

### 📋 History Page (`/history`)

- Table of all predictions made during the current browser session
- **Expandable rows** — click a row to see customer profile + top SHAP drivers
- **Search** by any customer attribute value
- **Filter** by risk level: All / High / Medium / Low
- Probability progress bars per row

> ⚠️ History is stored in-memory (React state). It resets on page refresh — no backend storage needed.

---

## 🤖 ML Model Details

| Property        | Value                                              |
| --------------- | -------------------------------------------------- |
| Algorithm       | Random Forest Classifier                           |
| Training data   | Telco Customer Churn dataset (7,043 records)       |
| Features        | 19 customer attributes                             |
| Preprocessing   | sklearn Pipeline (encoding + scaling)              |
| Class imbalance | Cost-sensitive class weights                       |
| Threshold       | Tuned to minimize`FN_cost × FN + FP_cost × FP` |
| Explainability  | SHAP TreeExplainer                                 |
| Serialization   | joblib                                             |
| Tracking        | MLflow (local)                                     |

**Artifacts location:**

```
artifacts/
├── model/random_forest.joblib      # Trained pipeline (preprocessor + model)
├── threshold/best_threshold.json   # Optimal decision threshold
└── encoder/                        # Fitted label encoder
```

**To retrain the model** (only if needed):

```bash
PYTHONPATH=src python -m churnguard.models.train
```

> ⚠️ This will overwrite the existing artifacts. The current model is already trained and production-ready.

---

## 🔒 What Was NOT Changed

When the frontend was rebuilt into a multi-page website, **the following were kept completely untouched:**

| File/Folder                                 | Status                                     |
| ------------------------------------------- | ------------------------------------------ |
| `artifacts/model/random_forest.joblib`    | ✅ Unchanged — same trained model         |
| `artifacts/threshold/best_threshold.json` | ✅ Unchanged — same threshold (0.1)       |
| `api/` — all routes                      | ✅ Unchanged — same endpoints             |
| `src/churnguard/` — all ML code          | ✅ Unchanged — training, prediction, SHAP |
| `requirements.txt`                        | ✅ Unchanged                               |
| `run.py`, `setup.py`                    | ✅ Unchanged                               |
| `data/`, `notebooks/`, `tests/`       | ✅ Unchanged                               |

**Only these frontend files were modified/created:**

```
frontend/index.html               ← SEO meta tags added
frontend/src/index.css            ← Design system CSS
frontend/src/main.jsx             ← Added BrowserRouter
frontend/src/App.jsx              ← Replaced with router + context
frontend/src/lib/api.js           ← NEW: centralized axios client
frontend/src/context/HistoryContext.jsx  ← NEW: session history
frontend/src/components/Navbar.jsx       ← NEW: sticky navbar
frontend/src/pages/HomePage.jsx          ← NEW: landing page
frontend/src/pages/PredictPage.jsx       ← NEW: multi-step prediction
frontend/src/pages/DashboardPage.jsx     ← NEW: analytics dashboard
frontend/src/pages/HistoryPage.jsx       ← NEW: history table
```

The old components (`PredictionForm.jsx`, `RiskExplanation.jsx`, `MonitoringDashboard.jsx`) were **superseded** by the new page components — all API call logic is identical.

---

## 🐛 Troubleshooting

**Backend won't start — `ModuleNotFoundError: No module named 'churnguard'`**

```bash
pip install -e .
```

**Backend won't start — model not found**

```bash
ls artifacts/model/   # Should show random_forest.joblib
```

**Frontend shows "API Offline"**

- Make sure the backend is running on port 8000
- Check: `curl http://localhost:8000/health`

**Port already in use**

```bash
# Kill port 8000
lsof -ti:8000 | xargs kill -9

# Kill port 5173
lsof -ti:5173 | xargs kill -9
```

---

*Built with ❤️ — RetainX AI v2.0*
