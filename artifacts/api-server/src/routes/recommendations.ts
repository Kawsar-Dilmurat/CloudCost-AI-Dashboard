import { Router, type IRouter } from "express";
import { db, resourcesTable, reportsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetRecommendationsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /recommendations — rule-based AI recommendations (ready for OpenAI integration)
router.get("/recommendations", async (req, res): Promise<void> => {
  const resources = await db.select().from(resourcesTable);
  const [latestReport] = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt)).limit(1);

  const analyzedResources = resources.filter(r => r.isAnalyzed);

  const totalCost = resources.reduce((sum, r) => sum + Number(r.monthlyCost), 0);
  const totalSavings = analyzedResources.reduce((sum, r) => sum + (r.estimatedSavings != null ? Number(r.estimatedSavings) : 0), 0);
  const issueCount = analyzedResources.filter(r => r.issue).length;
  const criticalCount = analyzedResources.filter(r => r.priority === "critical").length;
  const highCount = analyzedResources.filter(r => r.priority === "high").length;
  const mediumCount = analyzedResources.filter(r => r.priority === "medium").length;
  const lowCount = analyzedResources.filter(r => r.priority === "low").length;
  const securityCount = analyzedResources.filter(r => r.issue === "Public SSH Exposure (Port 22)").length;

  // Compute Cloud Health Score (0-100)
  // Only compute if resources have been analyzed
  let healthScore: number;
  if (analyzedResources.length === 0) {
    healthScore = 100; // No data yet — not penalized
  } else {
    const savingsPct = totalCost > 0 ? (totalSavings / totalCost) * 100 : 0;

    // Deduct points for each issue severity
    let penalty = 0;
    penalty += criticalCount * 5;
    penalty += highCount * 4;
    penalty += mediumCount * 2;
    penalty += lowCount * 1;

    // Additional penalty based on savings percentage (waste ratio)
    if (savingsPct > 40) penalty += 20;
    else if (savingsPct > 25) penalty += 15;
    else if (savingsPct >= 10) penalty += 10;
    else penalty += 5;

    healthScore = Math.max(15, Math.min(100, 100 - penalty));
  }

  const healthLabel =
    healthScore >= 80 ? "Healthy" :
    healthScore >= 60 ? "Good" :
    healthScore >= 40 ? "Needs Attention" :
    "Critical";

  // Generate rule-based top actions — sorted by savings desc, security issues always surface first
  const actionMap: Record<string, { count: number; savings: number; effort: string; priorityRank: number }> = {};

  for (const r of analyzedResources) {
    if (!r.issue) continue;
    if (!actionMap[r.issue]) {
      actionMap[r.issue] = {
        count: 0,
        savings: 0,
        effort: effortMap[r.issue] ?? "Medium",
        priorityRank: priorityRankMap[r.issue] ?? 5,
      };
    }
    actionMap[r.issue].count++;
    actionMap[r.issue].savings += r.estimatedSavings != null ? Number(r.estimatedSavings) : 0;
  }

  // Sort: security issues first (priorityRank=0), then by savings descending
  const topActions = Object.entries(actionMap)
    .sort((a, b) => {
      if (a[1].priorityRank !== b[1].priorityRank) return a[1].priorityRank - b[1].priorityRank;
      return b[1].savings - a[1].savings;
    })
    .slice(0, 3)
    .map(([issue, data]) => ({
      title: issue,
      description: getActionDescription(issue, data.count, data.savings),
      savings: Math.round(data.savings * 100) / 100,
      priority: getPriorityForIssue(issue),
      effort: data.effort,
    }));

  const savingsPct = totalCost > 0 ? ((totalSavings / totalCost) * 100) : 0;
  const savingsPctStr = savingsPct.toFixed(1);

  // Professional executive summary
  const topIssueEntry = Object.entries(actionMap).sort((a, b) => b[1].savings - a[1].savings)[0];
  const topIssueLabel = topIssueEntry ? topIssueEntry[0] : null;
  const firstAction = topActions[0];

  const summary = analyzedResources.length === 0
    ? "No analysis has been run yet. Click 'Run Analysis' to generate recommendations."
    : `CloudCost AI analyzed ${resources.length} AWS resources with a total monthly spend of ${fmt(totalCost)}/mo. The analysis identified ${issueCount} optimization ${issueCount === 1 ? "opportunity" : "opportunities"} with an estimated ${fmt(totalSavings)}/mo in potential savings, representing ${savingsPctStr}% of the current monthly bill.${topIssueLabel ? ` The largest savings category is ${topIssueLabel.toLowerCase()}.` : ""}${firstAction ? ` The recommended first action is: ${getFirstActionSummary(firstAction.title)}.` : ""}${criticalCount > 0 ? ` ${criticalCount} critical security ${criticalCount > 1 ? "issues require" : "issue requires"} immediate attention.` : " No critical security issues detected."}`;

  // Generate business impact and technical plan based on findings
  const businessImpact = generateBusinessImpact(totalSavings, savingsPctStr, totalCost, criticalCount, securityCount);
  const technicalPlan = generateTechnicalPlan(analyzedResources);

  res.json(GetRecommendationsResponse.parse({
    healthScore,
    healthLabel,
    summary,
    topActions,
    estimatedMonthlySavings: Math.round(totalSavings * 100) / 100,
    businessImpact,
    technicalPlan,
    lastAnalyzed: latestReport ? latestReport.createdAt.toISOString() : null,
  }));
});

// Format dollar amounts consistently: $4,116.00
function fmt(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const effortMap: Record<string, string> = {
  "Underutilized EC2 Instance": "Medium",
  "Oversized RDS Instance": "Medium",
  "Unattached EBS Volume": "Low",
  "Missing S3 Lifecycle Policy": "Low",
  "Public SSH Exposure (Port 22)": "Low",
  "Missing CloudWatch Alarms": "Low",
};

// Lower rank = shown first (security always surfaces to top)
const priorityRankMap: Record<string, number> = {
  "Public SSH Exposure (Port 22)": 0,
  "Underutilized EC2 Instance": 1,
  "Oversized RDS Instance": 2,
  "Unattached EBS Volume": 3,
  "Missing S3 Lifecycle Policy": 4,
  "Missing CloudWatch Alarms": 5,
};

function getActionDescription(issue: string, count: number, savings: number): string {
  const s = savings > 0 ? ` Estimated savings: ${fmt(savings)}/mo.` : "";
  switch (issue) {
    case "Underutilized EC2 Instance":
      return `${count} EC2 instance${count > 1 ? "s are" : " is"} running at very low CPU utilization (below 10%). Right-sizing or terminating these instances would reduce compute costs significantly.${s}`;
    case "Oversized RDS Instance":
      return `${count} RDS instance${count > 1 ? "s are" : " is"} significantly oversized relative to their CPU usage. Downgrading to smaller instance types would reduce database costs.${s}`;
    case "Unattached EBS Volume":
      return `${count} EBS volume${count > 1 ? "s are" : " is"} not attached to any EC2 instance and accruing charges with no business value. Delete or snapshot these volumes.${s}`;
    case "Missing S3 Lifecycle Policy":
      return `${count} S3 bucket${count > 1 ? "s are" : " is"} missing lifecycle policies. Adding tiered storage rules would automatically reduce storage costs over time.${s}`;
    case "Public SSH Exposure (Port 22)":
      return `${count} resource${count > 1 ? "s have" : " has"} port 22 open to 0.0.0.0/0. This is a critical security risk. Restrict SSH access immediately using security groups or a VPN/bastion host.`;
    case "Missing CloudWatch Alarms":
      return `${count} production resource${count > 1 ? "s are" : " is"} running without CloudWatch monitoring. Without alarms, failures may go undetected for extended periods.`;
    default:
      return `${count} resource${count > 1 ? "s" : ""} affected.${s}`;
  }
}

function getFirstActionSummary(issue: string): string {
  switch (issue) {
    case "Underutilized EC2 Instance": return "validate low-utilization compute workloads and right-size or stop unused instances after confirming production dependencies";
    case "Oversized RDS Instance": return "review RDS instance sizing and schedule a maintenance window to downsize to the appropriate instance class";
    case "Unattached EBS Volume": return "audit and delete unattached EBS volumes — snapshot any that may be needed before deletion";
    case "Missing S3 Lifecycle Policy": return "add S3 lifecycle policies to transition cold objects to cheaper storage tiers automatically";
    case "Public SSH Exposure (Port 22)": return "immediately restrict port 22 access to trusted IP ranges or migrate to AWS Systems Manager Session Manager";
    case "Missing CloudWatch Alarms": return "configure CloudWatch alarms for all production resources with SNS notification routing";
    default: return "review and address flagged optimization opportunities";
  }
}

function getPriorityForIssue(issue: string): string {
  if (issue === "Public SSH Exposure (Port 22)") return "critical";
  if (issue === "Underutilized EC2 Instance" || issue === "Oversized RDS Instance") return "high";
  return "medium";
}

function generateBusinessImpact(savings: number, savingsPct: string, totalCost: number, criticalCount: number, securityCount: number): string {
  const parts: string[] = [];
  if (savings > 0) {
    parts.push(`Implementing these recommendations could reduce your AWS bill by ${fmt(savings)}/mo (${fmt(savings * 12)}/yr), representing a ${savingsPct}% reduction from the current ${fmt(totalCost)}/mo spend.`);
  }
  if (securityCount > 0) {
    parts.push(`${securityCount} critical security ${securityCount > 1 ? "vulnerabilities" : "vulnerability"} detected — public SSH exposure creates significant risk of unauthorized access, data breach, and potential compliance violations.`);
  }
  if (criticalCount === 0 && savings === 0) {
    parts.push("Your cloud infrastructure is well-optimized. Continue monitoring for configuration drift as your workloads evolve.");
  }
  return parts.join(" ") || "Run an analysis to generate a business impact assessment.";
}

function generateTechnicalPlan(resources: (typeof resourcesTable.$inferSelect)[]): string[] {
  const plan: string[] = [];
  const issues = new Set(resources.map(r => r.issue).filter(Boolean));

  // Steps are assigned sequential numbers based on the order they appear
  if (issues.has("Public SSH Exposure (Port 22)")) {
    plan.push("[Immediate] Update EC2 security groups to remove 0.0.0.0/0 from port 22. Implement a bastion host or configure AWS Systems Manager Session Manager for SSH-less access.");
  }
  if (issues.has("Underutilized EC2 Instance")) {
    plan.push("[Week 1] Review underutilized EC2 instances using AWS Compute Optimizer. Identify right-size targets and consider Reserved Instances or Savings Plans for committed workloads.");
  }
  if (issues.has("Oversized RDS Instance")) {
    plan.push("[Week 1-2] Evaluate RDS instance sizing with AWS Performance Insights. Schedule a maintenance window to downsize to the next smaller instance class.");
  }
  if (issues.has("Unattached EBS Volume")) {
    plan.push("[Week 2] Audit unattached EBS volumes. Create snapshots for volumes that may be needed, then delete the rest. Automate future detection with an AWS Config rule.");
  }
  if (issues.has("Missing S3 Lifecycle Policy")) {
    plan.push("[Week 2-3] Apply S3 lifecycle policies: transition objects older than 30 days to S3-IA, and objects older than 90 days to S3 Glacier. Set expiration rules for temporary data.");
  }
  if (issues.has("Missing CloudWatch Alarms")) {
    plan.push("[Week 3] Configure CloudWatch alarms for all production resources: CPU >80%, disk >85%, memory >80%. Route alerts to SNS with on-call escalation policies.");
  }

  if (plan.length === 0) {
    plan.push("Run an analysis to generate a step-by-step technical action plan.");
  }

  return plan;
}

export default router;
