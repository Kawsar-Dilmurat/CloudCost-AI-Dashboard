import { Router, type IRouter } from "express";
import { db, reportsTable, resourcesTable, reportResourcesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetReportsResponse, GetReportParams, GetReportResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /reports — list all historical analysis reports
router.get("/reports", async (req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));

  const formatted = reports.map(r => ({
    ...r,
    totalMonthlyCost: Number(r.totalMonthlyCost),
    estimatedWaste: Number(r.estimatedWaste),
    potentialSavings: Number(r.potentialSavings),
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(GetReportsResponse.parse(formatted));
});

// GET /reports/:id — get a specific report with its resources
router.get("/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetReportParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, parsed.data.id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  // Fetch resources associated with this report
  const reportResourceLinks = await db
    .select()
    .from(reportResourcesTable)
    .where(eq(reportResourcesTable.reportId, report.id));

  const resourceIds = reportResourceLinks.map(r => r.resourceId);
  const resources = resourceIds.length > 0
    ? await db.select().from(resourcesTable).where(
        eq(resourcesTable.id, resourceIds[0])
      )
    : [];

  // Fetch all resources for this report (proper multi-id query)
  let allResources: (typeof resourcesTable.$inferSelect)[] = [];
  if (resourceIds.length > 0) {
    allResources = await db.select().from(resourcesTable);
    allResources = allResources.filter(r => resourceIds.includes(r.id));
  }

  const formattedResources = allResources.map(r => ({
    ...r,
    monthlyCost: Number(r.monthlyCost),
    cpuUsage: r.cpuUsage != null ? Number(r.cpuUsage) : null,
    estimatedSavings: r.estimatedSavings != null ? Number(r.estimatedSavings) : null,
  }));

  res.json(GetReportResponse.parse({
    ...report,
    totalMonthlyCost: Number(report.totalMonthlyCost),
    estimatedWaste: Number(report.estimatedWaste),
    potentialSavings: Number(report.potentialSavings),
    createdAt: report.createdAt.toISOString(),
    resources: formattedResources,
  }));
});

export default router;
