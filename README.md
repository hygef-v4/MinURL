# MinURL — High-speed, Beautiful & Minimal URL Shortener

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Live Demo](https://img.shields.io/badge/Demo-Live%20App-FF5722?style=for-the-badge&logo=vercel&logoColor=white)](https://minurl-app.vercel.app)

**MinURL** is a fast, lightweight, and modern URL shortener web application. It features a stunning glassmorphism user interface and is built using **FastAPI (Python)** for the backend, **Next.js (TypeScript) + CSS** for the frontend, and **Supabase** for the database and authentication.

🔗 **Live Demo**: [https://minurl-app.vercel.app](https://minurl-app.vercel.app)

---

## ✨ Features

- 🚀 **Blazing Fast Redirection:** Shortens URLs using a Base62 encoding algorithm mapped to PostgreSQL auto-increment IDs for O(1) primary key lookups.
- 🎨 **Glassmorphism Design:** Beautiful dark-mode user interface with smooth animations powered by Framer Motion.
- ✍️ **Custom Alias Support:** Users can define their own personalized short code links (e.g., `ytb`, `my-link`) with length and character validation.
- 🛡️ **Safe Browsing Integration:** Built-in URL safety checker using Google Safe Browsing API and a local domain blacklist to block malware and phishing links.
- ⏳ **Rate Limiting:** Protects the shortening endpoint from abuse using `slowapi` rate limiter (limit of 10 requests per minute per IP address).
- 📊 **Advanced Analytics:** Real-time click tracking, gathering referrers, locations (country/city), browsers, and devices used by the visitors.
- 🔐 **Authentication & History:** Integrates Supabase Auth (Sign In / Sign Up).
  - *Guests:* Shortening history is saved locally in `LocalStorage` (up to 10 URLs).
  - *Members:* History is synced directly with the Supabase database (displays the 20 most recent links).
- 📷 **Custom QR Code Generator:** Instantly generate and customize high-quality QR codes for your short links, with support for image downloads.
- 📱 **Fully Responsive:** Optimizes seamlessly for desktop, tablet, and mobile displays.

---

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, high-performance web framework for Python.
- **Supabase Client**: Client library for connecting to PostgreSQL database and Supabase Auth.
- **Uvicorn**: Lightweight ASGI web server for Python applications.
- **Pydantic**: Fast data validation and serialization.
- **SlowAPI**: Rate limiting extension for FastAPI.
- **Pytest**: Framework for writing testing code.

### Frontend
- **Next.js 14 (App Router)** & **React 18**
- **TypeScript**: Typed JavaScript for robust development.
- **Vanilla CSS**: Styled using CSS custom properties (variables) for smooth themes and modern gradients.
- **Framer Motion**: Production-ready animation library for React.
- **Lucide React**: Clean, lightweight icon kit.

---

## 📂 Project Structure

```text
MinURL/
├── api/
│   └── index.py            # Entrypoint for deploying FastAPI to Vercel Serverless Functions
├── app/
│   ├── auth.py             # User authentication and API key verification
│   ├── config.py           # Configuration management and environment variables
│   ├── database.py         # Supabase Client initialization
│   ├── main.py             # FastAPI app setup, exception handlers, and CORS middleware
│   ├── rate_limiter.py     # SlowAPI rate limiting configuration setup
│   ├── routes.py           # API endpoints (shorten, redirect, analytics, history)
│   ├── safe_browsing.py    # URL safety checker (Google API + local blacklist)
│   ├── schemas.py          # Pydantic schemas (Request/Response validation models)
│   └── utils.py            # Base62 encoding/decoding helper functions
├── docs/
│   └── api_reference.md    # Detailed API documentation and database SQL schema setup
├── frontend/
│   ├── app/                # Next.js App Router (Pages, Layouts)
│   ├── components/         # Reusable React UI components (Form, QR Panel, Auth Modal, etc.)
│   ├── lib/                # API fetch helpers, Auth Context, and Supabase client
│   └── public/             # Static files (Icons, logos)
├── tests/
│   └── test_api.py         # Pytest test cases for the backend APIs
├── requirements.txt        # Core Python package dependencies
├── requirement.txt         # Full dependencies lock file
├── vercel.json             # Vercel rewrite configuration for routing requests
└── .env                    # Backend environment variables
```

---

## ⚙️ Local Setup Guide

### 1. Database Setup
Please refer to the [Database & API Reference](file:///f:/code/git/MinURL/docs/api_reference.md#2-database-setup-supabase) guide to initialize the `urls` and `clicks` tables, along with security policies in your Supabase database.

### 2. Backend Setup (FastAPI)
Open your terminal at the project root directory and follow these steps:

1. **Create and activate a Python virtual environment:**
   ```bash
   # Windows (Powershell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   Create a `.env` file at the root of the project and supply your keys:
   ```env
   SUPABASE_URL=https://<your-supabase-project>.supabase.co
   SUPABASE_KEY=<your-supabase-anon-key>
   BASE_DOMAIN=http://localhost:8000
   SAFE_BROWSING_API_KEY=<your-google-safe-browsing-api-key>
   ```

4. **Run the Backend server:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *Backend server running at: [http://localhost:8000](http://localhost:8000)*
   *Swagger UI interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)*

---

## 🧪 Testing

MinURL includes automated tests for the FastAPI backend APIs using `pytest`.

To run the backend tests:
1. Ensure your virtual environment is activated:
   ```bash
   # Windows (Powershell)
   .venv\Scripts\Activate.ps1

   # Linux/macOS
   source .venv/bin/activate
   ```
2. Execute pytest via Python module:
   ```bash
   python -m pytest
   ```
This will automatically discover and run all test scenarios within the `tests/` directory (such as endpoint responses, formatting validations, and mock testing).

---

### 3. Frontend Setup (Next.js)
Open a new terminal session and navigate to the `frontend` folder:

1. **Install npm packages:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure frontend environment variables:**
   Create a `.env.local` file inside the `frontend` folder:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

3. **Run the Next.js development server:**
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)*

---

## 🚀 Deployment Guide (Vercel)

MinURL is configured for quick deployment on the **Vercel** platform.

### Deploy Backend FastAPI
When pushing your repository to GitHub and importing it into Vercel, Vercel will automatically detect `api/index.py` and route serverless requests to it according to `vercel.json`.

Make sure to set the following **Environment Variables** in the Vercel Project Settings:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `BASE_DOMAIN` *(Set to the live URL of your deployed application)*
- `SAFE_BROWSING_API_KEY`

### Deploy Frontend Next.js
You can deploy the `frontend/` directory as a separate Vercel application. Set the **Root Directory** settings to `frontend` and add these environment variables:
- `NEXT_PUBLIC_API_URL` *(Set to your deployed Backend FastAPI URL)*
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📖 Additional Reading
To learn more about the database indexes, exact API status codes, and JSON response models, refer to the [API Reference document](file:///f:/code/git/MinURL/docs/api_reference.md).
