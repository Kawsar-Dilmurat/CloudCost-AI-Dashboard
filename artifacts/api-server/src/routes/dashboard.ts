import { Router, type IRouter } from "express";
import { db, resourcesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /dashboard — aggregate summary data for the dashboard
router.get("/dashboard", async (req, res): Promise<void> => {
  const resources = await db.select().from(resourcesTable);

  const totalMonthlyCost = resources.reduce((sum, r) => sum + Number(r.monthlyCost), 0);
  const estimatedWaste = resources.reduce((sum, r) => sum + (r.estimatedSavings != null ? Number(r.estimatedSavings) : 0), 0);
  const potentialSavingsPct = totalMonthlyCost > 0 ? (estimatedWaste / totalMonthlyCost) * 100 : 0;

  const highPriorityIssues = resources.filter(r => r.priority === "critical" || r.priority === "high").length;
  const securityWarnings = resources.filter(r => r.issue === "Public SSH Exposure (Port 22)").length;

  // Cost breakdown by resource type
  const costByTypeMap: Record<string, { totalCost: number; count: number }> = {};
  for (const r of resources) {
    if (!costByTypeMap[r.type]) costByTypeMap[r.type] = { totalCost: 0, count: 0 };
    costByTypeMap[r.type].totalCost += Number(r.monthlyCost);
    costByTypeMap[r.type].count++;
  }
  const costByType = Object.entries(costByTypeMap).map(([type, data]) => ({
    type,
    totalCost: Math.round(data.totalCost * 100) / 100,
    count: data.count,
  }));

  // Savings by issue type
  const savingsByIssueMap: Record<string, { totalSavings: number; count: number }> = {};
  for (const r of resources) {
    if (!r.issue) continue;
    if (!savingsByIssueMap[r.issue]) savingsByIssueMap[r.issue] = { totalSavings: 0, count: 0 };
    savingsByIssueMap[r.issue].totalSavings += r.estimatedSavings != null ? Number(r.estimatedSavings) : 0;
    savingsByIssueMap[r.issue].count++;
  }
  const savingsByIssue = Object.entries(savingsByIssueMap).map(([issue, data]) => ({
    issue,
    totalSavings: Math.round(data.totalSavings * 100) / 100,
    count: data.count,
  }));

  // Top 5 optimization opportunities by estimated savings
  const topOpportunities = resources
    .filter(r => r.issue && r.estimatedSavings != null)
    .sort((a, b) => Number(b.estimatedSavings) - Number(a.estimatedSavings))
    .slice(0, 5)
    .map(r => ({
      ...r,
      monthlyCost: Number(r.monthlyCost),
      cpuUsage: r.cpuUsage != null ? Number(r.cpuUsage) : null,
      estimatedSavings: r.estimatedSavings != null ? Number(r.estimatedSavings) : null,
    }));

  res.json(GetDashboardResponse.parse({
    totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    estimatedWaste: Math.round(estimatedWaste * 100) / 100,
    potentialSavingsPct: Math.round(potentialSavingsPct * 10) / 10,
    resourceCount: resources.length,
    highPriorityIssues,
    securityWarnings,
    costByType,
    savingsByIssue,
    topOpportunities,
  }));
});

export default router;
