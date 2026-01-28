# Better Youth Compass (Hackathon Starter)

This repo contains:
- `api/` Azure Functions (Node/TypeScript) that:
  - Queries Azure Databricks SQL Warehouse via Statement Execution API
  - Calls Azure OpenAI for chat (student/mentor)
- `web/` React (Vite) frontend with 2 starter pages:
  - Mentor Dashboard (course trend chart)
  - Student AI Tutor (chat)

## Local prerequisites
- Node.js 20+
- VS Code
- Azure Functions Core Tools v4
- (Optional) Azure CLI for deployment

## 1) Run locally

### Backend (Azure Functions)
1. Open terminal:
   ```bash
   cd api
   npm install
   ```
2. Create `api/local.settings.json` from `api/local.settings.example.json`
   and fill in your Databricks + Azure OpenAI values.
3. Start:
   ```bash
   npm run build
   func start
   ```
4. Test endpoints:
   - http://localhost:7071/api/meta/tables
   - http://localhost:7071/api/meta/describe?table=program_enrollment
   - http://localhost:7071/api/chat  (POST)

### Frontend (React)
1. Open another terminal:
   ```bash
   cd web
   npm install
   npm run dev
   ```
2. Open the URL shown by Vite (usually http://localhost:5173)

By default, the frontend expects the API at the same origin (`/api/...`).
For local development, set:
- `web/.env.local` with `VITE_API_BASE=http://localhost:7071`

## 2) Azure deployment (recommended: Static Web Apps + Functions)
This is the simplest deployment for a hackathon:
- Frontend is hosted as a Static Web App
- Backend Functions are deployed alongside

High-level steps are in `AZURE_DEPLOYMENT.md`.

## Notes
- The SQL queries in `api/src/functions/courseTrends.ts` and `attendanceHeatmap.ts`
  assume column names like `program_id`, `student_id`, `enrollment_date`, etc.
  Use the meta endpoints to confirm your real column names and update the queries.
