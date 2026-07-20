\# 🪸 Coral Reef Bleaching Prediction Dashboard



An interactive full-stack dashboard for exploring historical coral reef bleaching data, monitoring live ocean conditions, and estimating bleaching risk using machine learning.



The project combines \*\*historical environmental datasets\*\*, \*\*live NOAA satellite data\*\*, \*\*interactive visualizations\*\*, and an \*\*ML-powered prediction system\*\* to make coral reef health data easier to explore and understand.



\---



\## ✨ Features



\* 📊 \*\*Interactive Data Visualizations\*\*

&#x20; Explore historical coral bleaching trends across years, countries, and ocean regions through dynamic charts.



\* 🗺️ \*\*Interactive Reef Map\*\*

&#x20; Visualize coral reef observations and geographic patterns on an interactive Leaflet-based map.



\* 🛰️ \*\*Live NOAA Data\*\*

&#x20; Fetches near-real-time ocean conditions from NOAA ERDDAP for five major reef regions:



&#x20; \* Great Barrier Reef

&#x20; \* Coral Triangle

&#x20; \* Caribbean

&#x20; \* Red Sea

&#x20; \* Indian Ocean



\* 🤖 \*\*ML-Based Bleaching Risk Prediction\*\*

&#x20; Predict coral bleaching risk using environmental variables such as:



&#x20; \* Sea Surface Temperature

&#x20; \* Sea Surface Temperature Anomaly (SSTA)

&#x20; \* Degree Heating Weeks (DHW)

&#x20; \* Turbidity

&#x20; \* Cyclone Frequency

&#x20; \* Wind Speed

&#x20; \* Reef Depth

&#x20; \* Climatic SST



\* 🧪 \*\*Scenario Simulation\*\*

&#x20; Experiment with environmental conditions and observe how changes may affect predicted coral bleaching risk.



\* 📍 \*\*Location-Aware Experience\*\*

&#x20; Detects the user's approximate location and automatically identifies the nearest monitored reef zone.



\* 💬 \*\*AI Reef Assistant\*\*

&#x20; An integrated AI assistant powered through OpenRouter that answers coral reef and bleaching-related questions.



\* 📝 \*\*Feedback System\*\*

&#x20; Collects user feedback and sentiment through a Supabase-powered feedback form.



\* 🌓 \*\*Light \& Dark Themes\*\*

&#x20; Responsive interface with support for both light and dark modes.



\---



\## 📸 Screenshots



\### Dashboard



!\[Dashboard](public/screenshots/hero.png)



\### Interactive Map



!\[Interactive Reef Map](public/screenshots/map.png)



\### Data Visualizations



!\[Data Visualizations](public/screenshots/graphs.png)



\### Bleaching Risk Prediction



!\[Prediction](public/screenshots/prediction.png)



\### Prediction Analysis



!\[Prediction Chart](public/screenshots/prediction-chart.png)



\### AI Reef Assistant



!\[AI Reef Assistant](public/screenshots/chatbox.png)



\### Feedback



!\[Feedback Section](public/screenshots/feedback.png)



\---



\## 🛠️ Tech Stack



\### Frontend



\* React 18

\* Vite

\* Tailwind CSS

\* Recharts

\* Leaflet

\* React Leaflet

\* Lucide React



\### Backend



\* Python

\* FastAPI

\* Uvicorn

\* HTTPX



\### Machine Learning



\* Scikit-learn ecosystem

\* Pre-trained coral bleaching prediction model

\* Feature scaling and preprocessing



\### Data \& Services



\* NOAA ERDDAP

\* Historical Coral Reef Dataset

\* Supabase

\* OpenRouter API

\* IP Geolocation APIs



\### Deployment



\* Vercel — Frontend

\* Render — FastAPI Backend



\---



\## 🏗️ Project Architecture



```text

coral-reef-dashboard/

│

├── backend/

│   ├── model\_files/

│   │   ├── coral\_model.pkl

│   │   ├── features.pkl

│   │   └── scaler.pkl

│   ├── main.py

│   ├── model.py

│   ├── predict.py

│   ├── simulate.py

│   ├── test\_predict.py

│   └── requirements.txt

│

├── data/

│   └── final\_coral\_reef\_data.csv

│

├── public/

│   ├── data/

│   └── screenshots/

│

├── src/

│   ├── components/

│   ├── constants/

│   ├── hooks/

│   ├── lib/

│   ├── utils/

│   ├── App.jsx

│   ├── index.css

│   └── main.jsx

│

├── .env.example

├── package.json

├── render.yaml

├── tailwind.config.js

├── vercel.json

└── vite.config.js

```



\---



\## 🚀 Getting Started



\### Prerequisites



Make sure you have installed:



\* Node.js

\* npm

\* Python 3.11+

\* pip



\---



\### 1. Clone the Repository



```bash

git clone <your-repository-url>

cd coral-reef-dashboard

```



\### 2. Install Frontend Dependencies



```bash

npm install

```



\### 3. Configure Environment Variables



Copy the example environment file:



```bash

cp .env.example .env

```



On Windows:



```bash

copy .env.example .env

```



Configure the required variables:



```env

VITE\_OPENROUTER\_API\_KEY=your\_openrouter\_api\_key

VITE\_API\_URL=http://localhost:8000



VITE\_IPGEO\_KEY=your\_ipgeolocation\_api\_key



VITE\_SUPABASE\_URL=your\_supabase\_project\_url

VITE\_SUPABASE\_ANON\_KEY=your\_supabase\_anon\_key

```



> Never commit your `.env` file or expose private/service-role credentials in the frontend.



\### 4. Start the Frontend



```bash

npm run dev

```



The frontend will typically be available at:



```text

http://localhost:5173

```



\---



\## 🐍 Running the Backend



Navigate to the backend directory:



```bash

cd backend

```



Create a virtual environment:



```bash

python -m venv venv

```



Activate it.



Windows:



```bash

venv\\Scripts\\activate

```



macOS/Linux:



```bash

source venv/bin/activate

```



Install dependencies:



```bash

pip install -r requirements.txt

```



Start the FastAPI server:



```bash

uvicorn main:app --reload --port 8000

```



The API will be available at:



```text

http://localhost:8000

```



FastAPI's interactive API documentation can be accessed at:



```text

http://localhost:8000/docs

```



\---



\## 🧠 Bleaching Risk Prediction



The prediction system uses a trained machine-learning model to estimate coral bleaching risk from environmental conditions.



Users can adjust environmental parameters through the dashboard and submit them to the FastAPI backend. The backend preprocesses the inputs using the stored scaler and feature configuration before generating a risk prediction.



The dashboard presents the resulting risk category along with prediction probabilities and visual analysis.



> \*\*Note:\*\* Predictions are intended for educational and exploratory purposes. They should not be treated as a substitute for official scientific monitoring or professional environmental assessment.



\---



\## 🛰️ Live Ocean Monitoring



The backend retrieves ocean data from NOAA ERDDAP for selected coral reef regions.



Monitored parameters include:



\* Sea Surface Temperature (SST)

\* Sea Surface Temperature Anomaly (SSTA)

\* Degree Heating Weeks (DHW)

\* Bleaching Alert Area (BAA)



To reduce unnecessary external API requests, live data is cached temporarily by the backend.



The system also handles unavailable observations gracefully when NOAA data cannot be retrieved for a particular region.



\---



\## 📊 Historical Data Analysis



The dashboard uses historical coral reef data to visualize patterns such as:



\* Bleaching trends over time

\* Ocean-wise bleaching statistics

\* Country-level observations

\* Temperature vs. bleaching relationships

\* SST anomaly vs. bleaching relationships

\* Geographic distribution of observations



These visualizations are designed to complement the live monitoring and prediction features.



\---



\## 💬 AI Reef Assistant



The built-in Reef Assistant provides contextual answers about topics including:



\* Coral bleaching

\* Sea surface temperature

\* SST anomalies

\* Degree Heating Weeks

\* Ocean acidification

\* Climate change impacts

\* Reef conservation

\* Dashboard risk predictions



The assistant is intentionally scoped to coral reef and dashboard-related topics.



\---



\## ⚠️ Limitations



\* Live environmental data depends on the availability of external NOAA services.

\* Geolocation accuracy varies depending on the available location provider.

\* Machine-learning predictions depend on the quality and characteristics of the training data.

\* The monitored reef zones represent broad geographic regions rather than every individual coral reef.

\* AI-generated responses may contain inaccuracies and should not be considered authoritative scientific advice.



\---



\## 🔒 Security Note



API keys and credentials should be stored using environment variables and must never be committed to the repository.



For production applications, sensitive AI API calls should ideally be proxied through a secure backend rather than exposing API credentials directly in client-side code.



\---



\## 🌍 Purpose



Coral reefs are highly sensitive to environmental stress, particularly prolonged increases in ocean temperature.



This project explores how modern web technologies, environmental datasets, live satellite observations, and machine learning can be combined into a single platform for visualizing and understanding coral bleaching risk.



The dashboard is primarily intended as an \*\*educational, analytical, and demonstration project\*\*.



\---



\## 👨‍💻 Author



\*\*Suryadeep Banerjee\*\*



Built as a project exploring full-stack development, environmental data visualization, API integration, and machine learning.



\---



\## 📄 License



This project is intended for educational and research purposes.



Please ensure that any third-party datasets, APIs, and services used by the project are used in accordance with their respective licenses and terms of service.



