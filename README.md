# TruckView - Risk-Aware Logistics Route Planning

TruckView is a risk-aware logistics route planning application built for truck journeys.

It combines real road-based routing with historical accident data, weather, sunlight, road conditions and rest planning to help users understand the risks along a shipment route before the journey begins.

---

## 🚚 Why TruckView?

Traditional route planning mainly answers:

> **How do I get there?**

TruckView adds:

> **What should I know about the journey before I start?**

For truck journeys, conditions can change across different parts of a route and depending on the time of travel. TruckView brings these factors together in a single trip view.

---

## 🚀 Features

### 📍 Smart Location Search

- Search locations by name with autocomplete
- Select a starting point and destination without entering coordinates manually
- Automatically use the selected locations for route planning

### 🛣️ Real Road-Based Routing

- **TomTom Routing API** for road-based routing
- Routes follow actual roads, highways and streets
- Traffic information where available
- Real driving distance and duration
- Traffic delay information
- Interactive route visualization using Mapbox

### ⚠️ Route Risk Analysis

TruckView combines multiple risk signals into an overall journey risk score:

- Historical accident data
- Weather conditions
- Sunlight and glare
- Night driving
- Road conditions

Risk is evaluated both for the **overall journey** and for **individual sections of the route**.

### 📊 Section-Level Risk

Each route section can expose the information contributing to its risk.

Users can inspect:

- Combined section risk
- Historical accident information
- Weather at the planned travel time
- Sunlight and glare conditions
- Night or low-light conditions
- Road-related risk signals

This makes it easier to understand where conditions change along the journey.

### 🌦️ Weather at Travel Time

TruckView uses the planned departure time when evaluating weather conditions.

The trip view can include:

- Temperature
- Rain conditions
- Wind
- Weather risk

### ☀️ Sunlight & Glare Analysis

TruckView considers sunlight conditions along the route to identify potential glare-related risk.

It evaluates conditions such as:

- Daylight
- Sun position
- Glare conditions
- Low-light or night conditions

### 🚨 Historical Accident Data

TruckView uses historical road accident data as one of the inputs to route risk analysis.

> **Note:** Accident indicators represent historical recorded data and do not represent live incidents.

### 💤 Rest Break Planning

TruckView includes a planned rest break based on the expected journey duration.

The trip view provides:

- Number of planned breaks
- Break duration
- Approximate break timing
- Expected arrival time

### 🕒 Journey Overview

The journey summary brings the main information together:

- Total distance
- Driving time
- Traffic delay
- Overall risk score
- Historical accident count
- Major risk factors
- Planned rest break
- Expected arrival

---

## 🔄 How It Works

```text
Start Location
      +
Destination
      +
Departure Time
      │
      ▼
TruckView Backend
      │
      ├───────────────┐
      ▼               ▼
TomTom Routing     Open-Meteo
      │             Weather
      │               │
      └───────┬───────┘
              ▼
      Risk Analysis
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
 Accidents  Sunlight  Road /
            & Night   Weather
              │
              ▼
       Overall Risk Score
              │
      ┌───────┼──────────┐
      ▼       ▼          ▼
    Route   Sections   Rest Plan
     Map      Risk      + ETA
```

---

## ☁️ AWS Integration

AWS is used as a core part of the TruckView backend deployment.

### Amazon API Gateway

API Gateway exposes the backend API used by the TruckView frontend.

### AWS Lambda

Lambda runs the backend route processing and risk analysis logic in a serverless environment.

### AWS Architecture

```text
TruckView Frontend
       │
       ▼
Amazon API Gateway
       │
       ▼
AWS Lambda
       │
       ├── TomTom Routing API
       ├── Open-Meteo Weather API
       ├── Historical Accident Dataset
       └── Sunlight & Risk Analysis
```

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Mapbox GL

### Backend

- Python
- FastAPI
- AWS API Gateway
- AWS Lambda

### APIs & Data

- **TomTom Routing API** - road routing and traffic data
- **Open-Meteo** - weather data
- **Mapbox** - map visualization and location search
- **Historical Indian road accident dataset** - accident risk analysis

---

## 📁 Project Structure

```text
wemakedevs-aws-hackathon-2026/
│
├── backend/
│   ├── services/
│   │   ├── ...                         # Route, accident, weather,
│   │   │                                # sunlight and risk services
│   │
│   ├── lambda_handler.py               # AWS Lambda entry point
│   ├── main.py                          # FastAPI application
│   ├── requirements.txt                # Local/backend dependencies
│   ├── requirements-lambda.txt        # Lambda deployment dependencies
│   │
│   ├── test_accident_data.py
│   ├── test_accident_matching.py
│   ├── test_accident_service.py
│   ├── test_rest_planner.py
│   ├── test_sunlight.py
│   └── test_bedrock.py                 # Remove if Bedrock is not used
│
├── data/
│   └── raw/
│       └── sehaj1104_accidents/
│           └── indian_roads_dataset.csv
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── LocationInput.tsx
│   │   │   └── RouteMap.tsx
│   │   │
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

## 🔐 Environment Variables

### Backend

Create:

```text
backend/.env
```

Example template:

```env
TOMTOM_API_KEY=your_tomtom_api_key
AWS_REGION=your_aws_region
```

Add any other variables required by the current backend.

For the repository, keep only:

```text
backend/.env.example
```

with placeholder values.

### Frontend

Create:

```text
frontend/.env.local
```

Example:

```env
VITE_API_BASE_URL=your_backend_api_url
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

Keep the real `.env.local` file out of GitHub.

For the repository, keep:

```text
frontend/.env.example
```

with placeholder values.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/abdullahlko/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Set up the backend

Create a Python virtual environment:

```bash
cd backend
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file:

```text
backend/.env
```

and add the required configuration.

### 3. Start the backend

```bash
python main.py
```

### 4. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
.env.local
```

and add:

```env
VITE_API_BASE_URL=your_backend_api_url
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### 5. Start the frontend

```bash
npm run dev
```

---

## 🌐 Deployment

### Frontend

The frontend is deployed using **Vercel**.

### Backend

The backend is deployed using:

- Amazon API Gateway
- AWS Lambda

The frontend connects to the deployed backend through:

```env
VITE_API_BASE_URL
```

---

## 🔌 API Endpoints

### Location Search

```http
GET /api/locations/search?query=<location>
```

Returns matching locations for autocomplete.

### Route Planning

```http
POST /api/route
```

Accepts trip details including:

```json
{
  "from": {},
  "to": {},
  "departure": ""
}
```

Returns route information, journey metrics, risk information, rest planning and itinerary data.

### Health Check

```http
GET /health
```

Returns the backend health status.

---

## 📖 Example Journey

A user can enter:

```text
From:       Lucknow
To:         Delhi
Departure:  Selected date and time
```

TruckView then calculates the route and presents:

```text
Route
  ↓
Distance + Driving Time
  ↓
Traffic Delay
  ↓
Overall Risk Score
  ↓
Accident History
  ↓
Weather
  ↓
Sunlight & Glare
  ↓
Night Driving
  ↓
Road Conditions
  ↓
Section-Level Risk
  ↓
Rest Break Plan
  ↓
Expected Arrival
```

---

## 🎯 Hackathon

Built for **WeMakeDevs × AWS First Commit 2026**, part of the **Bharat Builds Tour**.

The project was created during the hackathon to address a real-world logistics problem using AWS.

### Submission

- Public GitHub repository
- YouTube demo video
- Project writeup
- AWS-backed deployment

---

## 🤖 AI Tools Used

AI-assisted development tools used during the project:

- ChatGPT
- Add any other AI tools actually used

AI tools were used for development assistance, debugging, implementation support and documentation.

---

## 📚 What I Learned

Building TruckView provided hands-on experience with:

- AWS API Gateway
- AWS Lambda
- Serverless backend deployment
- React and TypeScript
- Map-based application development
- External routing API integration
- Weather data integration
- Historical data processing
- Route-level risk analysis
- Section-level risk visualization
- Full-stack deployment

---

## 🔮 Future Enhancements

The next version of TruckView can expand the current risk-aware planning system with:

- **Amazon Bedrock** for AI-powered route explanations
- AI-generated contextual safety insights
- Alternative route comparison based on risk
- Historical traffic pattern analysis
- Real-time incident integration
- More advanced weather risk analysis
- Driver-focused mobile experience
- Fleet and logistics platform integrations

---

## 👤 Author

**Abdullah Ansari**

B.Tech CSE  
Integral University, Lucknow

GitHub: https://github.com/abdullahlko  
LinkedIn: https://www.linkedin.com/in/abdullahlko/

---

## 📄 License

This project was created for the **WeMakeDevs × AWS First Commit 2026** hackathon.


---

**Built with React, FastAPI and AWS to make truck journey planning more risk-aware.** 🚚