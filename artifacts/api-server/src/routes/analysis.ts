import { Router, type IRouter } from "express";
import { db, resourcesTable, reportsTable, reportResourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AnalyzeResourcesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Analysis rules applied to resources
function analyzeResource(resource: typeof resourcesTable.$inferSelect): {
  issue: string | null;
  priority: "critical" | "high" | "medium" | "low" | null;
  recommendation: string | null;
  estimatedSavings: number;
} {
  const cost = Number(resource.monthlyCost);
  const cpu = resource.cpuUsage != null ? Number(resource.cpuUsage) : null;

  // EC2: underutilized if CPU < 10%
  if (resource.type === "EC2" && cpu !== null && cpu < 10) {
    return {
      issue: "Underutilized EC2 Instance",
      priority: "high",
      recommendation: `Right-size or terminate ${resource.name}. CPU usage is only ${cpu.toFixed(1)}%. Consider switching to a smaller instance type or using auto-scaling.`,
      estimatedSavings: cost * 0.5,
    };
  }

  // RDS: oversized if CPU < 15% and cost > $100
  if (resource.type === "RDS" && cpu !== null && cpu < 15 && cost > 100) {
    return {
      issue: "Oversized RDS Instance",
      priority: "high",
      recommendation: `Downsize ${resource.name}. CPU usage is ${cpu.toFixed(1)}% — the instance class is much larger than needed. Consider moving to a smaller instance type.`,
      estimatedSavings: cost * 0.35,
    };
  }

  // EBS: unattached volume — 100% savings
  if (resource.type === "EBS" && resource.isAttached === false) {
    return {
      issue: "Unattached EBS Volume",
      priority: "medium",
      recommendation: `Delete or snapshot ${resource.name}. This volume is not attached to any instance and is accruing charges with no business value.`,
      estimatedSavings: cost,
    };
  }

  // S3: no lifecycle policy
  if (resource.type === "S3" && resource.hasLifecyclePolicy === false) {
    return {
      issue: "Missing S3 Lifecycle Policy",
      priority: "low",
      recommendation: `Add a lifecycle policy to ${resource.name} to transition old objects to cheaper storage tiers (Glacier) and expire stale data.`,
      estimatedSavings: cost * 0.25,
    };
  }

  // Security: port 22 open to 0.0.0.0/0
  if (resource.port22Open === true) {
    return {
      issue: "Public SSH Exposure (Port 22)",
      priority: "critical",
      recommendation: `Immediately restrict SSH access on ${resource.name}. Port 22 is open to 0.0.0.0/0. Use a bastion host or VPN instead.`,
      estimatedSavings: 0,
    };
  }

  // Reliability: production resources without CloudWatch alarms
  if (resource.environment === "production" && resource.hasCloudwatchAlarms === false) {
    return {
      issue: "Missing CloudWatch Alarms",
      priority: "medium",
      recommendation: `Set up CloudWatch alarms for ${resource.name}. Production resources without monitoring pose a reliability risk.`,
      estimatedSavings: 0,
    };
  }

  return { issue: null, priority: null, recommendation: null, estimatedSavings: 0 };
}

// POST /analyze — run cost analysis on all resources and save a report
router.post("/analyze", async (req, res): Promise<void> => {
  const resources = await db.select().from(resourcesTable);

  if (resources.length === 0) {
    res.status(400).json({ error: "No resources found. Please seed resources first." });
    return;
  }

  let totalWaste = 0;
  let issuesFound = 0;

  // Apply analysis rules to each resource and update in DB
  for (const resource of resources) {
    const analysis = analyzeResource(resource);

    if (analysis.issue) {
      issuesFound++;
      totalWaste += analysis.estimatedSavings;
    }

    await db.update(resourcesTable)
      .set({
        issue: analysis.issue,
        priority: analysis.priority,
        recommendation: analysis.recommendation,
        estimatedSavings: analysis.estimatedSavings > 0 ? analysis.estimatedSavings.toFixed(2) : null,
        isAnalyzed: true,
      })
      .where(eq(resourcesTable.id, resource.id));
  }

  const totalCost = resources.reduce((sum, r) => sum + Number(r.monthlyCost), 0);

  // Save the analysis as a report in the DB
  const [report] = await db.insert(reportsTable).values({
    totalMonthlyCost: totalCost.toFixed(2),
    estimatedWaste: totalWaste.toFixed(2),
    potentialSavings: totalWaste.toFixed(2),
    issueCount: issuesFound,
    resourceCount: resources.length,
  }).returning();

  // Link all resources to this report
  const updatedResources = await db.select().from(resourcesTable);
  for (const resource of updatedResources) {
    await db.insert(reportResourcesTable).values({
      reportId: report.id,
      resourceId: resource.id,
    });
  }

  req.log.info({ issuesFound, totalWaste, reportId: report.id }, "Analysis complete");

  res.json(AnalyzeResourcesResponse.parse({
    message: `Analysis complete. Found ${issuesFound} issues with $${totalWaste.toFixed(2)} in potential monthly savings.`,
    issuesFound,
    totalSavings: totalWaste,
    reportId: report.id,
  }));
});

export default router;
