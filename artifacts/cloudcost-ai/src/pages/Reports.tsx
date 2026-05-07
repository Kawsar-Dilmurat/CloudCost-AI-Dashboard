import { useState } from "react";
import { format } from "date-fns";
import { useGetReports, useGetReport, useGetRecommendations, getGetReportQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Eye, TrendingDown, AlertTriangle, Copy, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Optimized</Badge>;
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
    medium:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
    low:      "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${map[priority] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
      {priority}
    </Badge>
  );
}

// Compute health score from resources (same formula as backend)
function computeHealthScore(resources: { priority: string | null | undefined; estimatedSavings: number | null | undefined; monthlyCost: number }[]): number {
  if (resources.length === 0) return 100;
  const criticalCount = resources.filter(r => r.priority === "critical").length;
  const highCount     = resources.filter(r => r.priority === "high").length;
  const mediumCount   = resources.filter(r => r.priority === "medium").length;
  const lowCount      = resources.filter(r => r.priority === "low").length;
  const totalCost     = resources.reduce((s, r) => s + r.monthlyCost, 0);
  const totalSavings  = resources.reduce((s, r) => s + (r.estimatedSavings ?? 0), 0);
  const savingsPct    = totalCost > 0 ? (totalSavings / totalCost) * 100 : 0;

  let penalty = 0;
  penalty += criticalCount * 5;
  penalty += highCount * 4;
  penalty += mediumCount * 2;
  penalty += lowCount * 1;
  if (savingsPct > 40)       penalty += 20;
  else if (savingsPct > 25)  penalty += 15;
  else if (savingsPct >= 10) penalty += 10;
  else                       penalty += 5;

  return Math.max(15, Math.min(100, 100 - penalty));
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "Critical";
}

type ReportDetail = NonNullable<ReturnType<typeof useGetReport>["data"]>;

// ---------------------------------------------------------------------------
// Markdown builder — plain ASCII-safe output for VS Code / GitHub / Windows
// ---------------------------------------------------------------------------
function buildMarkdown(
  report: ReportDetail,
  recommendations: { technicalPlan?: string[] } | undefined,
): string {
  const date      = format(new Date(report.createdAt), "MMMM d, yyyy 'at' HH:mm");
  const resources = report.resources;
  const flagged   = resources.filter(r => r.issue);
  const totalCost = report.totalMonthlyCost;
  const waste     = report.estimatedWaste;
  const savings   = report.potentialSavings;
  const pct       = totalCost > 0 ? ((savings / totalCost) * 100).toFixed(1) : "0.0";
  const score     = computeHealthScore(resources);
  const status    = scoreLabel(score);

  // Cost by type
  const costByType: Record<string, number> = {};
  for (const r of resources) {
    costByType[r.type] = (costByType[r.type] ?? 0) + r.monthlyCost;
  }

  // Savings by issue — keyed exactly as the issue string (already correctly cased)
  const savingsByIssue: Record<string, number> = {};
  for (const r of flagged) {
    if (r.issue) savingsByIssue[r.issue] = (savingsByIssue[r.issue] ?? 0) + (r.estimatedSavings ?? 0);
  }

  // Top issue — keep the original capitalization from the issue string
  const topIssueEntry = Object.entries(savingsByIssue).sort((a, b) => b[1] - a[1])[0];

  // Executive summary — use the issue name as-is (already correctly capitalized)
  const summary =
    `CloudCost AI analyzed ${resources.length} AWS resources with a total monthly spend of ${fmt(totalCost)}/mo. ` +
    `The analysis identified ${flagged.length} optimization ${flagged.length === 1 ? "opportunity" : "opportunities"} ` +
    `with an estimated ${fmt(savings)}/mo in potential savings, representing ${pct}% of the current monthly bill.` +
    (topIssueEntry ? ` The largest savings category is ${topIssueEntry[0]}.` : "") +
    ` Cloud Health Score: ${score}/100 (${status}).`;

  // Top 5 flagged resources sorted by savings desc — multi-line format
  const topFlagged = [...flagged]
    .sort((a, b) => (b.estimatedSavings ?? 0) - (a.estimatedSavings ?? 0))
    .slice(0, 5);

  const topOpportunityLines: string[] = [];
  topFlagged.forEach((r, i) => {
    topOpportunityLines.push(`${i + 1}. **${r.name}**`);
    topOpportunityLines.push(`   - Type: ${r.type}`);
    topOpportunityLines.push(`   - Issue: ${r.issue}`);
    topOpportunityLines.push(`   - Estimated Savings: +${fmt(r.estimatedSavings ?? 0)}/mo`);
    if (i < topFlagged.length - 1) topOpportunityLines.push("");
  });
  if (topFlagged.length === 0) {
    topOpportunityLines.push("No flagged resources in this report.");
  }

  // Technical action plan — use recommendations if available, numbered from 1
  const planSteps = recommendations?.technicalPlan ?? [];
  const technicalPlanLines: string[] = [];
  planSteps.forEach((step, i) => {
    technicalPlanLines.push(`${i + 1}. ${step}`);
  });
  // Always close with a re-run step if it isn't already the last step
  const rerunStep = "Re-run CloudCost AI after optimization changes and compare the new monthly cost, savings potential, and Cloud Health Score.";
  const lastStep  = planSteps[planSteps.length - 1] ?? "";
  if (!lastStep.toLowerCase().includes("re-run") && !lastStep.toLowerCase().includes("rerun")) {
    technicalPlanLines.push(`${planSteps.length + 1}. ${rerunStep}`);
  }
  if (technicalPlanLines.length === 0) {
    technicalPlanLines.push(`1. ${rerunStep}`);
  }

  const ISSUE_KEYS = [
    "Underutilized EC2 Instance",
    "Oversized RDS Instance",
    "Missing S3 Lifecycle Policy",
    "Unattached EBS Volume",
    "Public SSH Exposure (Port 22)",
    "Missing CloudWatch Alarms",
  ];

  const lines: string[] = [
    "# CloudCost AI Optimization Report",
    "",
    `Generated: ${date}`,
    "",
    "---",
    "",
    "## Executive Summary",
    "",
    summary,
    "",
    "---",
    "",
    "## Key Metrics",
    "",
    `- Total Monthly Cost: ${fmt(totalCost)}/mo`,
    `- Estimated Monthly Waste: ${fmt(waste)}/mo`,
    `- Potential Savings: +${fmt(savings)}/mo (${pct}%)`,
    `- Resources Analyzed: ${resources.length}`,
    `- Issues Found: ${flagged.length}`,
    `- Cloud Health Score: ${score}/100`,
    `- Overall Status: ${status}`,
    "",
    "---",
    "",
    "## Cost by Resource Type",
    "",
    ...["EC2", "RDS", "S3", "EBS"].map(t => `- ${t}: ${fmt(costByType[t] ?? 0)}/mo`),
    "",
    "---",
    "",
    "## Savings by Issue Type",
    "",
    ...ISSUE_KEYS.map(issue => `- ${issue}: +${fmt(savingsByIssue[issue] ?? 0)}/mo`),
    "",
    "---",
    "",
    "## Top Optimization Opportunities",
    "",
    ...topOpportunityLines,
    "",
    "---",
    "",
    "## Technical Action Plan",
    "",
    ...technicalPlanLines,
    "",
    "---",
    "",
    "## Notes",
    "",
    "This report was generated using deterministic cloud optimization rules. The current version supports sample data and uploaded CSV resource inventories. The application is designed to be AI-ready for future executive summary generation, while keeping cost and risk findings rule-based and explainable.",
    "",
  ];

  return lines.join("\n");
}

export default function Reports() {
  const { toast } = useToast();
  const { data: reports, isLoading } = useGetReports();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: reportDetail, isLoading: isReportDetailLoading } = useGetReport(
    selectedReportId as number,
    {
      query: {
        enabled: selectedReportId !== null,
        queryKey: getGetReportQueryKey(selectedReportId as number),
      },
    }
  );

  const { data: recommendations } = useGetRecommendations();

  function getMarkdown() {
    if (!reportDetail) return "";
    return buildMarkdown(reportDetail, recommendations);
  }

  function handleCopyReport() {
    const md = getMarkdown();
    if (!md) return;
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      toast({ title: "Copied", description: "Report copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadReport() {
    const md = getMarkdown();
    if (!md || !reportDetail) return;
    const dateStr = format(new Date(reportDetail.createdAt), "yyyy-MM-dd");
    const blob    = new Blob([md], { type: "text/markdown; charset=utf-8" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href        = url;
    a.download    = `cloudcost-ai-report-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Report downloaded as a .md file." });
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Analysis Reports</h1>
          <p className="text-muted-foreground mt-1">Historical log of your cloud cost analyses.</p>
        </header>

        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Est. Waste</TableHead>
                <TableHead className="text-right">Potential Savings</TableHead>
                <TableHead className="text-center">Issues</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !reports || reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="w-8 h-8 mb-2" />
                      <p>No historical reports found. Run an analysis to generate one.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} className="border-border hover:bg-muted/50 transition-colors" data-testid={`row-report-${report.id}`}>
                    <TableCell className="font-medium tabular-nums">
                      {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(report.totalMonthlyCost)}/mo
                    </TableCell>
                    <TableCell className="text-right text-red-400 font-medium tabular-nums">
                      {fmt(report.estimatedWaste)}/mo
                    </TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium tabular-nums">
                      +{fmt(report.potentialSavings)}/mo
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                        {report.issueCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedReportId(report.id); setCopied(false); }}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        data-testid={`button-view-report-${report.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Report Detail Modal */}
        <Dialog open={selectedReportId !== null} onOpenChange={(open) => !open && setSelectedReportId(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl">Analysis Report Details</DialogTitle>
              <DialogDescription>
                {reportDetail ? format(new Date(reportDetail.createdAt), "MMMM d, yyyy 'at' HH:mm:ss") : "Loading..."}
              </DialogDescription>
            </DialogHeader>

            {isReportDetailLoading || !reportDetail ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Summary metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                    <div className="text-xl font-bold tabular-nums">{fmt(reportDetail.totalMonthlyCost)}/mo</div>
                  </div>
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-400" /> Waste
                    </div>
                    <div className="text-xl font-bold text-red-400 tabular-nums">{fmt(reportDetail.estimatedWaste)}/mo</div>
                  </div>
                  <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Savings</div>
                    <div className="text-xl font-bold text-emerald-400 tabular-nums">+{fmt(reportDetail.potentialSavings)}/mo</div>
                  </div>
                  <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Issues
                    </div>
                    <div className="text-xl font-bold text-amber-400">{reportDetail.issueCount}</div>
                  </div>
                </div>

                {/* Flagged resources table */}
                <div>
                  <h3 className="text-lg font-bold mb-3 border-b border-border pb-2">Flagged Resources</h3>
                  <div className="border border-border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Resource</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Issue Identified</TableHead>
                          <TableHead className="text-right">Savings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportDetail.resources.filter(r => r.issue).map(resource => (
                          <TableRow key={resource.id}>
                            <TableCell className="font-medium">{resource.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">{resource.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <PriorityBadge priority={resource.priority} />
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{resource.issue}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-400 tabular-nums">
                              {resource.estimatedSavings && resource.estimatedSavings > 0
                                ? `+${fmt(resource.estimatedSavings)}/mo`
                                : <span className="text-muted-foreground font-normal">Risk</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {reportDetail.resources.filter(r => r.issue).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No issues flagged in this report.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Export section */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3">Export this report</p>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={handleCopyReport}
                      data-testid="button-copy-markdown"
                    >
                      {copied
                        ? <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Copied!</>
                        : <><Copy className="w-4 h-4 mr-2" /> Copy Report</>}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadReport}
                      data-testid="button-download-markdown"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report (.md)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exports as a Markdown (.md) technical report for GitHub, engineering documentation, and team sharing.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
