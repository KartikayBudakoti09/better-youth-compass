# Azure Deployment Guide (Static Web Apps + Azure Functions)

You can deploy this in 2 common ways:
1) **Static Web Apps (SWA)** (recommended for hackathons)
2) Separate **Function App + Static website hosting**

---

## Option A: Static Web Apps (Recommended)

### A1) Create resources in Azure
1. Create a Resource Group (e.g., `better-youth-rg`)
2. Create / confirm:
   - Azure OpenAI resource (note: endpoint, key, deployment name)
   - Azure Databricks workspace + SQL Warehouse (note: host, warehouse_id, PAT)

### A2) Create Static Web App
In Azure Portal:
1. Create **Static Web App**
2. Deployment method:
   - **GitHub** is easiest (Azure will build+deploy automatically)
   - If you don’t want GitHub, use the SWA CLI (below)

Set these build settings:
- App location: `web`
- API location: `api`
- Output location: `dist`

### A3) Configure environment variables (App settings)
In Static Web App → Configuration, set:

Databricks:
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_WAREHOUSE_ID`
- `DATABRICKS_CATALOG=Hackathon2`
- `DATABRICKS_SCHEMA=amer`

Azure OpenAI:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION=2024-04-01-preview`

### A4) Deploy

#### If using GitHub (recommended)
- Push this repo to GitHub
- Link it in SWA creation
- Azure will run builds automatically

#### If using SWA CLI (no GitHub)
1. Install SWA CLI:
   ```bash
   npm i -g @azure/static-web-apps-cli
   ```
2. Login to Azure:
   ```bash
   az login
   ```
3. Deploy (from repo root):
   ```bash
   swa deploy --app-location web --api-location api --output-location dist
   ```

---

## Option B: Separate Function App + Web hosting

### B1) Create Function App
- Runtime: Node 20
- Deploy the `api/` folder

### B2) Add the same environment variables to the Function App
(see A3 above)

### B3) Host frontend
- Azure Static Web Apps (frontend-only), or
- Azure Storage static website

Set `web` to call your Function App URL by setting:
- `web/.env.production` -> `VITE_API_BASE=https://<your-function-app>.azurewebsites.net`

Then rebuild frontend:
```bash
cd web
npm run build
```
Upload `web/dist` to your static host.

---

## Post-deploy validation
- Open your site
- Test:
  - `/api/meta/tables`
  - `/api/meta/describe?table=attendance`
  - Student AI Tutor page
