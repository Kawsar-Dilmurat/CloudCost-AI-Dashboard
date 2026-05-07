import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboard,
  useSeedResources,
  useAnalyzeResources,
  getGetDashboardQueryKey,
  getGetResourcesQueryKey,
  getGetReportsQueryKey,
  getGetRecommendationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { Database, TrendingDown, AlertTriangle, ShieldAlert, Server, Play, RefreshCw, Percent, Info } from "lucide-react";
import CsvUpload from "@/components/CsvUpload";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, CartesianGrid,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

// Color maps for resource types and issue types
const TYPE_COLORS: Record<string, string> = {
  EC2: "#38bdf8",   // sky-400
  RDS: "#a78bfa",   // violet-400
  S3:  "#34d399",   // emerald-400
  EBS: "#fb923c",   // orange-400
};

const ISSUE_COLORS: Record<string, string> = {
  "Underutilized EC2 Instance":   "#38bdf8",
  "Oversized RDS Instance":       "#a78bfa",
  "Missing S3 Lifecycle Policy":  "#34d399",
  "Unattached EBS Volume":        "#fb923c",
  "Public SSH Exposure (Port 22)":"#f87171",
  "Missing CloudWatch Alarms":    "#facc15",
};

function fmt(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(222 47% 11%)",
  border: "1px solid hsl(217 33% 22%)",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: 13,
};

const AXIS_STYLE = { fill: "#94a3b8", fontSize: 12 };

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: dashboard, isLoading } = useGetDashboard();
  const seedMutation = useSeedResources();
  const analyzeMutation = useAnalyzeResources();
  const [isSeedPending, setIsSeedPending] = useState(false);
  const [isAnalyzePending, setIsAnalyzePending] = useState(false);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecommendationsQueryKey() });
  }

  function handleSeed() {
    setIsSeedPending(true);
    seedMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast({ title: "Resources seeded", description: result.message });
        invalidateAll();
        setIsSeedPending(false);
      },
      onError: () => {
        toast({ title: "Seed failed", description: "Could not seed resources.", variant: "destructive" });
        setIsSeedPending(false);
      },
    });
  }

  function handleAnalyze() {
    setIsAnalyzePending(true);
    analyzeMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast({ title: "Analysis complete", description: result.message });
        invalidateAll();
        setIsAnalyzePending(false);
      },
      onError: () => {
        toast({ title: "Analysis failed", description: "Could not run analysis. Seed resources first.", variant: "destructive" });
        setIsAnalyzePending(false);
      },
    });
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 text-xs font-medium">
                <Info className="w-3 h-3" />
                Demo Mode
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Overview of your cloud cost optimization.{" "}
              <span className="text-xs text-slate-500">Uses sample AWS-style data or uploaded CSV. Real AWS integration is a planned future improvement.</span>
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSeed}
              disabled={isSeedPending}
              data-testid="button-seed-resources"
            >
              {isSeedPending
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Database className="w-4 h-4 mr-2" />}
              Seed Resources
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzePending}
              data-testid="button-run-analysis"
            >
              {isAnalyzePending
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Play className="w-4 h-4 mr-2" />}
              Run Analysis
            </Button>
          </div>
        </header>

        {/* CSV Upload panel — always visible */}
        <CsvUpload />

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-card border border-border" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Skeleton className="h-96 rounded-xl bg-card border border-border" />
              <Skeleton className="h-96 rounded-xl bg-card border border-border" />
            </div>
          </>
        ) : !dashboard || dashboard.resourceCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card border border-border rounded-xl">
            <Database className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Click "Seed Resources" then "Run Analysis" to populate your dashboard with sample AWS cost data.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSeed} disabled={isSeedPending} data-testid="button-seed-empty">
                <Database className="w-4 h-4 mr-2" />
                Seed Resources
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzePending} data-testid="button-analyze-empty">
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="card-total-cost">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Monthly Cost</CardTitle>
                  <Database className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{fmt(dashboard.totalMonthlyCost)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{dashboard.resourceCount} resources</div>
                </CardContent>
              </Card>

              <Card data-testid="card-estimated-waste">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Monthly Waste</CardTitle>
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{fmt(dashboard.estimatedWaste)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Reclaimable spend</div>
                </CardContent>
              </Card>

              <Card data-testid="card-potential-savings">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Potential Savings</CardTitle>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-400">{dashboard.potentialSavingsPct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">of monthly bill</div>
                </CardContent>
              </Card>

              <Card data-testid="card-resources-analyzed">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Resources Analyzed</CardTitle>
                  <Server className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboard.resourceCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">EC2, RDS, S3, EBS</div>
                </CardContent>
              </Card>

              <Card data-testid="card-high-priority">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">High Priority Issues</CardTitle>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-400">{dashboard.highPriorityIssues}</div>
                  <div className="text-xs text-muted-foreground mt-1">Critical + High</div>
                </CardContent>
              </Card>

              <Card data-testid="card-security-warnings">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Security Warnings</CardTitle>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-400">{dashboard.securityWarnings}</div>
                  <div className="text-xs text-muted-foreground mt-1">Require immediate action</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost by Resource Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Resource Type</CardTitle>
                  <CardDescription>Monthly spend distribution across AWS service types</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.costByType} margin={{ top: 10, right: 16, left: 16, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 18%)" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={AXIS_STYLE}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={AXIS_STYLE}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                        width={56}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(217 33% 17%)" }}
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number) => [`${fmt(value)}`, "Monthly Cost"]}
                      />
                      <Legend
                        formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>}
                      />
                      <Bar dataKey="totalCost" name="Monthly Cost" radius={[4, 4, 0, 0]} maxBarSize={56}>
                        {dashboard.costByType.map((entry) => (
                          <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#64748b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Manual legend since each bar is a different type */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                    {dashboard.costByType.map((entry) => (
                      <div key={entry.type} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[entry.type] ?? "#64748b" }} />
                        <span className="text-xs text-slate-400">{entry.type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Savings by Issue Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Savings by Issue Type</CardTitle>
                  <CardDescription>Potential monthly savings per optimization category</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={dashboard.savingsByIssue.filter(d => d.totalSavings > 0)}
                      margin={{ top: 10, right: 24, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 18%)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={AXIS_STYLE}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        dataKey="issue"
                        type="category"
                        tick={{ ...AXIS_STYLE, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={160}
                        tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 21) + "…" : v}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(217 33% 17%)" }}
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number) => [`${fmt(value)}`, "Potential Savings"]}
                        labelFormatter={(label: string) => label}
                      />
                      <Bar dataKey="totalSavings" name="Potential Savings" radius={[0, 4, 4, 0]} maxBarSize={32}>
                        {dashboard.savingsByIssue.filter(d => d.totalSavings > 0).map((entry) => (
                          <Cell key={entry.issue} fill={ISSUE_COLORS[entry.issue] ?? "#64748b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                    {dashboard.savingsByIssue.filter(d => d.totalSavings > 0).map((entry) => (
                      <div key={entry.issue} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ISSUE_COLORS[entry.issue] ?? "#64748b" }} />
                        <span className="text-xs text-slate-400">{entry.issue}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Optimization Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Top Optimization Opportunities</CardTitle>
                <CardDescription>Highest-impact actions sorted by estimated monthly savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.topOpportunities.map((resource) => (
                    <div
                      key={resource.id}
                      data-testid={`card-opportunity-${resource.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <span className="truncate">{resource.name}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-sm font-mono"
                            style={{
                              backgroundColor: `${TYPE_COLORS[resource.type] ?? "#64748b"}22`,
                              color: TYPE_COLORS[resource.type] ?? "#94a3b8",
                            }}
                          >
                            {resource.type}
                          </span>
                          <PriorityBadge priority={resource.priority} />
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          {resource.issue}
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="font-bold text-emerald-400 text-lg">
                          +{fmt(resource.estimatedSavings ?? 0)}/mo
                        </div>
                        <div className="text-xs text-muted-foreground">{resource.region}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return null;
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-red-500/15", text: "text-red-400" },
    high:     { bg: "bg-amber-500/15", text: "text-amber-400" },
    medium:   { bg: "bg-blue-500/15", text: "text-blue-400" },
    low:      { bg: "bg-slate-500/15", text: "text-slate-400" },
  };
  const style = map[priority] ?? { bg: "bg-slate-500/15", text: "text-slate-400" };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm ${style.bg} ${style.text}`}>
      {priority}
    </span>
  );
}
