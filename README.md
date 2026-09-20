# TruckView - Risk-Aware Logistics Route Planning

TruckView is a risk-aware long-haul truck trip planning system that combines real road routing with weather, sunlight, historical accident data and other route factors to help users understand a journey before it begins.

---

## 🚚 Why TruckView?

Traditional route planning mainly answers:

> **How do I get there?**

For a long-haul truck journey, that is only part of the planning problem.

TruckView also helps answer:

> **What should I know about the journey before I start?**

A planned journey can involve changing weather, sunlight and glare, historical accident exposure, night conditions and different road risks across different sections of the route.

TruckView brings this information together in one trip-planning experience.

---

## 🚀 What TruckView Does

A user enters:

- Starting location
- Destination
- Departure date and time

TruckView then:

1. Calculates the road route
2. Breaks the journey into route sections
3. Enriches those sections with relevant data
4. Calculates route-level and section-level risk
5. Plans a rest break
6. Calculates the expected arrival time
7. Presents everything in one journey view

---

## ✨ Features

### 📍 Location Search

- Search locations by name
- Autocomplete suggestions
- Select real locations without entering coordinates manually

### 🛣️ Real Road Routing

- TomTom road routing
- Actual roads, highways and streets
- Traffic information where available
- Driving distance and duration
- Traffic delay
- Map-based route visualization

### ⚠️ Route Risk Analysis

TruckView combines multiple risk signals:

- Historical accident data
- Weather
- Sun glare
- Night driving
- Road conditions

Risk is calculated for both the **overall journey** and individual **route sections**.

### 📊 Risk by Section

The journey can be explored section by section to understand where conditions change.

Users can inspect:

- Section risk
- Historical accident information
- Weather at the planned travel time
- Sunlight and glare
- Night conditions
- Combined risk factors

### 🌦️ Weather

Weather information is evaluated using the planned travel time and can include:

- Temperature
- Precipitation
- Wind
- Weather risk

### ☀️ Sunlight & Glare

TruckView evaluates sunlight conditions along the route, including:

- Daylight
- Sun position
- Glare conditions
- Low-light and night conditions

### 🚨 Historical Accident Data

Historical accident information is incorporated into the route risk analysis.

> Accident indicators represent recorded historical road data and are not live incident reports.

### 💤 Rest Planning

TruckView includes a planned rest break based on the journey information.

The journey view shows:

- Planned break count
- Break duration
- Break timing
- Expected arrival

### 🧭 Route Itinerary

The itinerary combines navigation with route intelligence.

For relevant route steps, users can inspect contextual information such as:

- Weather
- Historical accidents
- Sunlight and glare
- Combined risk

This keeps navigation useful while making the underlying route analysis visible.

---

## 🔄 How It Works

```text
Origin + Destination + Departure Time
                  │
                  ▼
          Route Calculation
                  │
                  ▼
          Route Segmentation
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    Weather    Sunlight   Accident Data
       │          │          │
       └──────────┼──────────┘
                  ▼
            Risk Analysis
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   Route-Level Risk    Section-Level Risk
        │                   │
        └─────────┬─────────┘
                  ▼
             Rest Planning
                  │
                  ▼
          Expected Arrival
                  │
                  ▼
          TruckView Journey
```

---

## ☁️ AWS Architecture

TruckView uses a serverless AWS architecture for the deployed application.

```text
                         User
                           │
                           ▼
                ┌─────────────────────┐
                │ AWS Amplify Hosting │
                │ React + Vite        │
                └──────────┬──────────┘
                           │ HTTPS
                           ▼
                ┌─────────────────────┐
                │ Amazon API Gateway  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │     AWS Lambda      │
                │      FastAPI        │
                │                     │
                │  Route Processing   │
                │  Risk Analysis     │
                │  Accident Matching │
                │  Sunlight Analysis │
                │  Rest Planning     │
                └──────┬─────┬────────┘
                       │     │
              ┌────────┘     └─────────┐
              ▼                        ▼
        TomTom Routing            Open-Meteo
        Route + Traffic             Weather

                 Historical Accident Data
```

### AWS Services Used

**AWS Amplify Hosting**

Hosts the React + Vite frontend and automatically builds and deploys updates from the GitHub `main` branch.

**Amazon API Gateway**

Provides the HTTPS API used by the frontend to communicate with the backend.

**AWS Lambda**

Runs the FastAPI backend and handles route processing, route segmentation, risk analysis, accident matching, sunlight analysis and rest planning.

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
- AWS Lambda
- Amazon API Gateway

### External Services

- **TomTom Routing API** for road routing and traffic data
- **Open-Meteo** for weather data
- **Mapbox** for map visualization and location search

### Data

- Historical Indian road accident dataset

---

## 📁 Project Structure

```text
wemakedevs-aws-hackathon-2026/
│
├── backend/
│   ├── services/
│   │   ├── ...                    # Route, risk and data services
│   │
│   ├── lambda_handler.py         # AWS Lambda entry point
│   ├── main.py                   # FastAPI application
│   ├── requirements.txt          # Backend dependencies
│   ├── requirements-lambda.txt   # Lambda deployment dependencies
│   │
│   ├── test_accident_data.py
│   ├── test_accident_matching.py
│   ├── test_accident_service.py
│   ├── test_rest_planner.py
│   └── test_sunlight.py
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

### Files kept local

The following should not be committed:

```text
backend/.env
backend/venv/
backend/__pycache__/
frontend/.env
frontend/.env.local
frontend/node_modules/
frontend/dist/
```

Use `.env.example` files to document required variables without exposing credentials.

---

## 🔐 Environment Variables

### Backend

Create:

```text
backend/.env
```

Example:

```env
TOMTOM_API_KEY=your_tomtom_api_key
AWS_REGION=your_aws_region
```

Add any other variables required by the backend.

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

Never commit real credentials or secret values to GitHub.

---

## 🚀 Run Locally

### Backend

Create and activate a virtual environment:

```bash
cd backend
python -m venv venv
```

On Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python main.py
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints

### Location Search

```http
GET /api/locations/search?query=<location>
```

Returns location suggestions for the search interface.

### Route Planning

```http
POST /api/route
```

Accepts trip information including origin, destination, coordinates and departure time.

Returns:

- Route information
- Distance
- Duration
- Traffic delay
- Route sections
- Navigation instructions
- Overall risk
- Section-level risk
- Rest plan
- Expected arrival

### Health Check

```http
GET /health
```

Returns the backend health status.

---

## 📖 Example

A user can plan a journey such as:

```text
From:       Lucknow
To:         Delhi
Departure:  Selected date and time
```

TruckView then provides:

```text
Route
 ↓
Distance + Driving Time
 ↓
Traffic Delay
 ↓
Overall Risk
 ↓
Risk Factors
 ↓
Risk by Section
 ↓
Weather + Sunlight + Accident Context
 ↓
Rest Plan
 ↓
Expected Arrival
```

---

## 🎯 WeMakeDevs × AWS First Commit 2026

TruckView was built for **WeMakeDevs × AWS First Commit 2026**, part of the **Bharat Builds Tour**.

The project focuses on a real logistics problem and uses AWS cloud services as part of its production architecture.

---

## 🤖 AI Tools Used

- ChatGPT

AI tools were used for development assistance, debugging, implementation support and documentation.

---

## 📚 What I Learned

Building TruckView gave me hands-on experience with:

- AWS Lambda
- Amazon API Gateway
- AWS Amplify Hosting
- Serverless deployment
- React and TypeScript
- FastAPI
- External API integration
- Route segmentation
- Risk analysis
- Map-based application development

---

## 🔮 Future Enhancements

- **Amazon Bedrock** for natural-language explanations of structured route-risk results
- Alternative route comparison based on risk
- Real-time incident data
- Historical traffic patterns
- More advanced weather analysis
- Driver-focused mobile experience
- Fleet and logistics platform integrations

The planned Bedrock integration would act as an explanation layer over the existing structured route intelligence rather than replacing the underlying calculations.

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

Third-party libraries, APIs, datasets and assets remain subject to their respective licenses and terms.

---

**Built with React, FastAPI and AWS to make truck journey planning more risk-aware.** 🚚