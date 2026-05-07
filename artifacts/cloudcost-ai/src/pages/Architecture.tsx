import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Server, Database, Cpu, FileText, Cloud,
  ArrowDown, Code2, BarChart3, Upload, ShieldAlert,
} from "lucide-react";

const LAYERS = [
  {
    icon: Monitor,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    label: "Frontend",
    title: "React Dashboard",
    tech: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Recharts", "TanStack Query"],
    description:
      "Displays cloud cost metrics, resource inventory, charts, recommendations, and reports. Communicates with the backend exclusively through the REST API. Includes CSV upload, report export, and real-time query invalidation.",
  },
  {
    icon: Server,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    label: "Backend",
    title: "Express API Server",
    tech: ["Node.js", "Express 5", "TypeScript", "Multer", "Pino", "Zod"],
    description:
      "Provides REST API endpoints for resources, CSV upload, analysis, dashboard metrics, recommendations, and reports. Validates all inputs with Zod schemas generated from the OpenAPI spec. All routes are contract-first.",
  },
  {
    icon: Database,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    label: "Database",
    title: "PostgreSQL + Drizzle ORM",
    tech: ["PostgreSQL", "Drizzle ORM", "drizzle-zod", "Numeric types"],
    description:
      "Stores resources, analysis reports, findings, and historical results. Schema uses enums for resource type, environment, and priority. Report resources are stored in a join table to preserve the snapshot of each analysis run.",
  },
  {
    icon: Cpu,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    label: "Optimization Engine",
    title: "Rule-Based Analysis",
    tech: ["EC2 rules", "RDS rules", "S3 rules", "EBS rules", "SSH rules", "CloudWatch rules"],
    description:
      "Applies deterministic rules for EC2 underutilization (CPU < 10%), RDS oversizing (CPU < 15% + cost > $100/mo), unattached EBS volumes, missing S3 lifecycle policies, public SSH exposure, and missing CloudWatch alarms on production resources.",
  },
  {
    icon: FileText,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    label: "Report Export",
    title: "Markdown Report Generator",
    tech: ["Frontend-generated", "UTF-8 safe", "GitHub Markdown", "VS Code compatible"],
    description:
      "Generates copyable and downloadable Markdown reports using live report detail data. Includes executive summary, key metrics, cost breakdown, savings by issue, top opportunities, and a technical action plan. Compatible with GitHub, VS Code, and plain text editors.",
  },
  {
    icon: Cloud,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
    label: "Future Integration",
    title: "Real AWS APIs (Planned)",
    tech: ["AWS Cost Explorer", "CloudWatch Metrics", "Compute Optimizer", "OpenAI GPT-4"],
    description:
      "Designed to support future AWS Cost Explorer, CloudWatch, and Compute Optimizer integrations. The current analysis layer is rule-based and drop-in compatible with an OpenAI API call for AI-powered executive summaries.",
    future: true,
  },
];

const API_ENDPOINTS = [
  { method: "GET",  path: "/api/resources",            desc: "List resources with optional type / priority / search filters" },
  { method: "POST", path: "/api/resources/seed",        desc: "Clear existing data and seed sample AWS-style resources" },
  { method: "POST", path: "/api/resources/upload-csv",  desc: "Parse and import resources from an uploaded CSV file" },
  { method: "POST", path: "/api/analyze",               desc: "Run all optimization rules, flag issues, compute savings" },
  { method: "GET",  path: "/api/dashboard",             desc: "Aggregated metrics: total cost, waste, issue counts, charts" },
  { method: "GET",  path: "/api/recommendations",       desc: "Executive recommendations, health score, and action plan" },
  { method: "GET",  path: "/api/reports",               desc: "List historical analysis reports" },
  { method: "GET",  path: "/api/reports/:id",           desc: "Report detail with full resource breakdown and findings" },
];

const METHOD_COLORS: Record<string, string> = {
  GET:  "bg-sky-500/10 text-sky-400 border-sky-500/20",
  POST: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function Architecture() {
  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Architecture</h1>
          <p className="text-muted-foreground mt-1">
            How CloudCost AI is structured — from the React dashboard to the PostgreSQL database and rule-based optimization engine.
          </p>
        </header>

        {/* Stack diagram */}
        <div className="flex flex-col items-center gap-0">
          {LAYERS.map((layer, i) => {
            const Icon = layer.icon;
            return (
              <div key={layer.label} className="flex flex-col items-center w-full max-w-2xl">
                <div className={`w-full rounded-xl border ${layer.border} ${layer.bg} p-5 flex gap-4 items-start ${layer.future ? "opacity-60" : ""}`}>
                  <div className={`w-10 h-10 rounded-lg ${layer.bg} border ${layer.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${layer.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${layer.color}`}>{layer.label}</span>
                      {layer.future && (
                        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-500/30">Planned</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-base">{layer.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{layer.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {layer.tech.map(t => (
                        <span key={t} className={`text-[11px] px-2 py-0.5 rounded-md border font-mono ${layer.border} ${layer.bg} ${layer.color}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {i < LAYERS.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Analysis rules */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Optimization Rules
          </h2>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rule</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Condition</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Estimated Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { rule: "EC2 Underutilization",      cond: "CPU avg < 10%",                              savings: "50% of monthly cost" },
                    { rule: "RDS Oversizing",             cond: "CPU < 15% AND monthly cost > $100",          savings: "35% of monthly cost" },
                    { rule: "Unattached EBS Volume",      cond: "is_attached = false",                        savings: "100% of monthly cost" },
                    { rule: "Missing S3 Lifecycle Policy",cond: "has_lifecycle_policy = false",               savings: "25% of monthly cost" },
                    { rule: "Public SSH Exposure",        cond: "Port 22 open or public_ssh = true",          savings: "$0 — security risk" },
                    { rule: "Missing CloudWatch Alarms",  cond: "Production resource, alarms disabled",       savings: "$0 — reliability risk" },
                  ].map(row => (
                    <tr key={row.rule} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.rule}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">{row.cond}</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium text-xs hidden md:table-cell">{row.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* API reference */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-violet-400" />
            REST API Endpoints
          </h2>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Endpoint</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {API_ENDPOINTS.map(ep => (
                    <tr key={ep.path} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] font-mono ${METHOD_COLORS[ep.method]}`}>
                          {ep.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{ep.path}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Data flow */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            CSV Upload Flow
          </h2>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                From file picker to dashboard
              </CardTitle>
              <CardDescription>
                How a CSV file moves through the system and becomes a set of analyzed resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {[
                  "User selects a .csv file and clicks Upload in the Dashboard or Resources page.",
                  "Browser sends a multipart/form-data POST request to /api/resources/upload-csv.",
                  "Multer middleware receives the file in memory (no disk write). The CSV buffer is decoded to UTF-8.",
                  "The server parses headers, validates required columns (name, type, region, environment, monthly_cost), and converts booleans and numeric strings.",
                  "If any row fails validation, the server returns a 400 with row-level error messages. No data is written.",
                  "On success, the server deletes all existing resources and report_resources (FK constraint order), then inserts the new resources.",
                  "The frontend invalidates all queries. The user sees the new resources immediately and is prompted to run analysis.",
                  "After Run Analysis, rules are applied to the uploaded resources and a new report is created with findings and savings estimates.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
