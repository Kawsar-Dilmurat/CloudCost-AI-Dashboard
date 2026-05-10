# CloudCost AI

CloudCost AI is a full-stack dashboard for reviewing AWS-style resource inventories and estimating cloud cost waste. It uses rule-based checks to flag idle compute, oversized databases, unattached storage, missing lifecycle policies, and basic security or reliability risks.

> **Sample Data & CSV Mode** — > This version works with sample data and uploaded CSV inventories. Live AWS API integrations are listed as future improvements.
---

## Why I Built This

Many small engineering teams run AWS infrastructure without actively monitoring cost waste — underutilized EC2 instances, oversized RDS databases, unattached EBS volumes, S3 buckets without lifecycle policies, or production resources left without monitoring alarms. These issues are individually small but collectively expensive and risky.

CloudCost AI demonstrates how a backend rule engine, structured data modeling, and a business-facing dashboard can work together to make cloud costs visible and actionable — without requiring direct AWS API access to show the concept.

---

## Key Features

- AWS-style resource inventory dashboard (EC2, RDS, S3, EBS)
- Sample data seeding for quick project demonstration
- CSV upload for custom resource inventories
- Rule-based optimization engine with deterministic findings
- EC2 underutilization detection (CPU < 10%)
- RDS oversizing detection (CPU < 15% + cost > $100/mo)
- Unattached EBS volume detection
- S3 lifecycle policy gap detection
- Public SSH exposure warnings (port 22 open)
- Production reliability risk detection (missing CloudWatch alarms)
- Cloud Health Score (0–100)
- Executive recommendations page with business impact
- Historical analysis reports
- Report export — "Copy Report" to clipboard or "Download Report (.md)"
- Architecture page explaining the system design

---

## Tech Stack

**Frontend**
- React 18 with TypeScript
- Tailwind CSS (dark SaaS dashboard theme)
- Recharts (bar charts, legends)
- Wouter (client-side routing)
- TanStack Query (server state)
- Framer Motion (entrance animations)
- Lucide React (icons)

**Backend**
- Node.js with Express 5
- TypeScript
- PostgreSQL (via Drizzle ORM)
- Multer (CSV file upload)
- Pino (structured JSON logging)
- Zod (input/output validation)

**API Design**
- RESTful JSON API
- OpenAPI 3.1 specification
- Generated React Query hooks (Orval)
- Generated Zod schemas

**Analysis**
- Deterministic rule-based optimization engine
- AI-ready summary layer (designed for future OpenAI integration)

---

## Architecture

```
React Dashboard (Vite)
      |  REST API calls
      v
Express API Server (/api)
      |
      v
Drizzle ORM
      |
      v
PostgreSQL Database
      |
      v
Rule-Based Optimization Engine
      |
      v
Dashboard Metrics / Recommendations / Reports / Markdown Export
```

The in-app Architecture page (`/architecture`) provides a full visual breakdown of each layer, the REST API endpoints, optimization rules, and the CSV upload data flow.

---

## Analysis Rules

| Rule | Condition | Finding | Savings |
|------|-----------|---------|---------|
| EC2 Underutilization | CPU avg < 10% | Underutilized EC2 Instance | 50% of monthly cost |
| RDS Oversizing | CPU < 15% AND cost > $100/mo | Oversized RDS Instance | 35% of monthly cost |
| EBS Unattached | `is_attached = false` | Unattached EBS Volume | 100% of monthly cost |
| S3 No Lifecycle Policy | `has_lifecycle_policy = false` | Missing S3 Lifecycle Policy | 25% of monthly cost |
| Public SSH Exposure | Port 22 open or `public_ssh = true` | Public SSH Exposure (Critical) | $0 — security risk |
| Missing Alarms | Production resource, no CloudWatch alarms | Missing CloudWatch Alarms | $0 — reliability risk |

---

## CSV Upload Format

To import your own resource inventory, upload a CSV with these columns:

| Column | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Resource name (e.g. `web-server-prod-01`) |
| `type` | Yes | `EC2`, `RDS`, `S3`, or `EBS` |
| `region` | Yes | AWS region (e.g. `us-east-1`) |
| `environment` | Yes | `production`, `staging`, or `development` |
| `monthly_cost` | Yes | Monthly cost in USD |
| `cpu_usage` | No | Average CPU % — EC2 and RDS only |
| `is_attached` | No | `true` / `false` — EBS only |
| `has_lifecycle_policy` | No | `true` / `false` — S3 only |
| `open_ports` | No | Pipe or comma separated ports (e.g. `22\|80\|443`) |
| `public_ssh` | No | `true` / `false` |
| `has_cloudwatch_alarm` | No | `true` / `false` |
| `storage_gb` | No | Storage size in GB (informational) |

Download a sample CSV from the "Sample CSV" button on the Dashboard or Resources page.

---

## How to Run Locally

This project is designed to run on a local development machine using Node.js, pnpm, and PostgreSQL.

The codebase is organized as a pnpm monorepo with separate workspaces for the React frontend, Express API server, and shared database schema.

### Prerequisites

Install the following tools before running the project:

- Node.js 18+
- pnpm
- PostgreSQL

### Install dependencies

```bash
pnpm install
```

### Configure environment variables

Create the required local environment variables for the API server, including a PostgreSQL connection string.

Example:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/cloudcost_ai
```

### Set up the database

```bash
pnpm --filter @workspace/db run push
```

### Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

### Start the frontend

Open a second terminal and run:

```bash
pnpm --filter @workspace/cloudcost-ai run dev
```

Then open the frontend development URL shown in the terminal.

---
## Screenshots

### Dashboard
<img src="Screenshots/Dashboard_1.png" alt="CloudCost AI Dashboard" width="900">
<img src="Screenshots/Dashboard_2.png" alt="CloudCost AI Dashboard" width="900">


### Resource Analyzer
<img src="Screenshots/Resources.png" alt="CloudCost AI Resources" width="900">


### Executive Recommendations
<img src="Screenshots/Recommendations_1.png" alt="CloudCost AI Recommendations 1" width="900">

<img src="Screenshots/Recommendations_2.png" alt="CloudCost AI Recommendations 2" width="900">


### Report Export
<img src="Screenshots/Reports_1.png" alt="CloudCost AI Reports 1" width="900">
<img src="Screenshots/Reports_2.png" alt="CloudCost AI Reports 2" width="900">

### Architecture
<img src="Screenshots/Architecture.png" alt="CloudCost AI Architecture" width="900">
<img src="Screenshots/Architecture_2.png" alt="CloudCost AI Architecture 2" width="900">
---

## Demo Workflow

1. **Load sample data** — click "Seed Resources" on the Dashboard to populate sample AWS-style resources
   *Or* upload your own CSV via "Upload CSV"
2. **Run analysis** — click "Run Analysis" to apply all optimization rules
3. **Review the dashboard** — cost breakdown charts, waste metrics, Cloud Health Score
4. **Inspect resources** — click any row on the Resources page for a detailed finding view
5. **Review recommendations** — the Recommendations page shows an executive action plan with step-by-step technical instructions
6. **Export a report** — open any report and use "Copy Report" or "Download Report (.md)"

---

## Demo Checklist

- Load sample data
- Upload CSV resource inventory
- Run analysis
- Review dashboard metrics
- Inspect resource details
- Open executive recommendations
- View historical reports
- Copy report
- Download report (.md)

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resources` | List resources (filterable by type, priority, search) |
| `POST` | `/api/resources/seed` | Seed sample AWS-style resources |
| `POST` | `/api/resources/upload-csv` | Import resources from a CSV file |
| `POST` | `/api/analyze` | Run optimization analysis on all resources |
| `GET` | `/api/dashboard` | Aggregated dashboard metrics |
| `GET` | `/api/recommendations` | Executive recommendations and action plan |
| `GET` | `/api/reports` | List historical analysis reports |
| `GET` | `/api/reports/:id` | Report detail with resource breakdown |

---

## What This Project Demonstrates

- **Cloud cost optimization thinking** — practical knowledge of AWS waste patterns
- **Backend API design** — OpenAPI-first, contract-driven development
- **CSV parsing and validation** — user-friendly error messages, row-level validation
- **Data modeling** — normalized schema across resources and reports
- **Rule-based analysis engine** — deterministic, explainable findings
- **Dashboard UI development** — data-dense, dark SaaS aesthetic
- **Report generation** — historical reports with copy and download export
- **Business-friendly technical communication** — executive summaries alongside technical action plans
- **Type safety** — end-to-end TypeScript, Zod validation, generated API hooks


---

## Future Improvements

- **Real AWS Cost Explorer integration** — pull live cost data via AWS SDK
- **CloudWatch metrics integration** — actual CPU and memory utilization data
- **AWS Compute Optimizer integration** — right-sizing recommendations from AWS
- **Authentication** — user accounts and team workspaces
- **Multi-account support** — analyze multiple AWS accounts in one dashboard
- **Scheduled reports** — weekly Slack/email digest of cost drift
- **OpenAI-powered summaries** — replace rule-based summaries with GPT-4 analysis
- **Savings tracking** — track which recommendations were actioned and measure actual savings

---

## Notes

This project uses sample data and uploaded CSV files — it does not connect to real AWS APIs. The optimization findings are generated by a deterministic rule engine, not machine learning. The recommendations layer is designed to be drop-in compatible with an OpenAI API call when that integration is added.
