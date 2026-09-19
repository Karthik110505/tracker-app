# Cloud Backend Deployment Guide

Deploying the GATE Tracker Express API to a public HTTPS server allows the Android mobile application to synchronize seamlessly from anywhere in the world, even when your computer is completely switched off.

---

## Option 1: Free 1-Click Deployment on Render (Recommended)

Render offers free Node.js Web Services with automatic SSL/HTTPS.

### Steps:
1. Push your repository to your private GitHub (or GitLab).
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** $\rightarrow$ **Blueprint** (or **Web Service**).
3. Connect your repository. Render will automatically detect [`server/render.yaml`](./render.yaml).
4. In the Environment Variables settings, configure:
   * `MONGODB_URI`: Your Atlas connection string (e.g. `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   * `JWT_SECRET`: Any random secure string (e.g. `generate-a-strong-random-secret-key`)
5. Click **Deploy Web Service**.
6. Render will assign you a live HTTPS URL, for example:
   ```text
   https://gate-tracker-api.onrender.com
   ```
7. Enter this URL in your Android mobile app settings under **API Server Settings** (`https://gate-tracker-api.onrender.com/api`).

---

## Option 2: 1-Command Deployment on Vercel

```bash
cd server
npx vercel
```
* Follow the prompts.
* In the Vercel project settings, add the `MONGODB_URI` environment variable.
* Your API will be live instantly with HTTPS (e.g. `https://gate-tracker-api.vercel.app/api`).

---

## Option 3: Docker Deployment (Railway / Fly.io / VPS)

Using the included [`Dockerfile`](./Dockerfile):
```bash
docker build -t gate-tracker-api server/
docker run -p 5000:5000 --env-file server/.env gate-tracker-api
```
