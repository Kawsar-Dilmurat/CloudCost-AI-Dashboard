import { Router, type IRouter } from "express";
import multer from "multer";
import { db, resourcesTable, reportResourcesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import {
  GetResourcesQueryParams,
  GetResourcesResponse,
  SeedResourcesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Multer: in-memory storage for CSV uploads (max 5 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted"));
    }
  },
});

// Seed data: 17 sample AWS-style resources across EC2, RDS, S3, EBS
const SEED_RESOURCES = [
  // EC2 instances
  { name: "web-server-prod-01",  type: "EC2" as const, region: "us-east-1",  environment: "production"   as const, monthlyCost: "320.00", cpuUsage: "8.5",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: true  },
  { name: "api-server-prod-02",  type: "EC2" as const, region: "us-east-1",  environment: "production"   as const, monthlyCost: "480.00", cpuUsage: "6.2",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: true,  port22Open: false },
  { name: "worker-staging-01",   type: "EC2" as const, region: "us-west-2",  environment: "staging"      as const, monthlyCost: "160.00", cpuUsage: "3.1",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: false },
  { name: "batch-processor-dev", type: "EC2" as const, region: "eu-west-1",  environment: "development"  as const, monthlyCost: "90.00",  cpuUsage: "4.8",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: true  },
  { name: "ml-training-prod-03", type: "EC2" as const, region: "us-east-2",  environment: "production"   as const, monthlyCost: "720.00", cpuUsage: "9.1",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: false },
  // RDS databases
  { name: "postgres-main-prod",    type: "RDS" as const, region: "us-east-1", environment: "production" as const, monthlyCost: "450.00", cpuUsage: "12.3", isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: true,  port22Open: null },
  { name: "mysql-analytics-prod",  type: "RDS" as const, region: "us-east-1", environment: "production" as const, monthlyCost: "380.00", cpuUsage: "8.7",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: null },
  { name: "postgres-staging-db",   type: "RDS" as const, region: "us-west-2", environment: "staging"    as const, monthlyCost: "210.00", cpuUsage: "5.2",  isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: null },
  { name: "aurora-reporting-prod", type: "RDS" as const, region: "us-east-2", environment: "production" as const, monthlyCost: "680.00", cpuUsage: "11.4", isAttached: null, hasLifecyclePolicy: null, hasCloudwatchAlarms: false, port22Open: null },
  // S3 buckets
  { name: "assets-cdn-prod",      type: "S3" as const, region: "us-east-1", environment: "production" as const, monthlyCost: "85.00",  cpuUsage: null, isAttached: null, hasLifecyclePolicy: false, hasCloudwatchAlarms: null, port22Open: null },
  { name: "backups-archive-prod", type: "S3" as const, region: "us-west-2", environment: "production" as const, monthlyCost: "120.00", cpuUsage: null, isAttached: null, hasLifecyclePolicy: false, hasCloudwatchAlarms: null, port22Open: null },
  { name: "logs-storage-staging", type: "S3" as const, region: "us-east-1", environment: "staging"    as const, monthlyCost: "45.00",  cpuUsage: null, isAttached: null, hasLifecyclePolicy: false, hasCloudwatchAlarms: null, port22Open: null },
  { name: "ml-datasets-prod",     type: "S3" as const, region: "us-east-2", environment: "production" as const, monthlyCost: "200.00", cpuUsage: null, isAttached: null, hasLifecyclePolicy: true,  hasCloudwatchAlarms: null, port22Open: null },
  // EBS volumes
  { name: "vol-web-server-01",   type: "EBS" as const, region: "us-east-1", environment: "production"  as const, monthlyCost: "35.00", cpuUsage: null, isAttached: false, hasLifecyclePolicy: null, hasCloudwatchAlarms: null, port22Open: null },
  { name: "vol-old-test-env",    type: "EBS" as const, region: "us-west-2", environment: "development" as const, monthlyCost: "28.00", cpuUsage: null, isAttached: false, hasLifecyclePolicy: null, hasCloudwatchAlarms: null, port22Open: null },
  { name: "vol-db-data-prod",    type: "EBS" as const, region: "us-east-1", environment: "production"  as const, monthlyCost: "95.00", cpuUsage: null, isAttached: true,  hasLifecyclePolicy: null, hasCloudwatchAlarms: null, port22Open: null },
  { name: "vol-scratch-staging", type: "EBS" as const, region: "eu-west-1", environment: "staging"     as const, monthlyCost: "18.00", cpuUsage: null, isAttached: false, hasLifecyclePolicy: null, hasCloudwatchAlarms: null, port22Open: null },
];

// --- CSV helpers ---

// Parse a boolean string (true/false/yes/no/1/0) → boolean | null
function parseBool(val: string | undefined): boolean | null {
  if (val === undefined || val.trim() === "") return null;
  const v = val.trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return null;
}

// Parse a numeric string → number | null
function parseNum(val: string | undefined): number | null {
  if (val === undefined || val.trim() === "") return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

// Parse a CSV row respecting double-quoted fields
function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

// Detect if port 22 appears in an open-ports string (pipe or comma separated)
function detectPort22(openPortsStr: string | undefined): boolean {
  if (!openPortsStr || openPortsStr.trim() === "") return false;
  const ports = openPortsStr.split(/[|,]/).map(p => p.trim());
  return ports.includes("22");
}

// Required CSV columns
const REQUIRED_HEADERS = ["name", "type", "region", "environment", "monthly_cost"];
const VALID_TYPES = ["EC2", "RDS", "S3", "EBS"] as const;
const VALID_ENVS  = ["production", "staging", "development"] as const;

// --- Routes ---

// GET /resources — list resources with optional filters
router.get("/resources", async (req, res): Promise<void> => {
  const parsed = GetResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, priority, search } = parsed.data;
  const filters: SQL[] = [];

  if (type)     filters.push(eq(resourcesTable.type,     type     as "EC2" | "RDS" | "S3" | "EBS"));
  if (priority) filters.push(eq(resourcesTable.priority, priority as "critical" | "high" | "medium" | "low"));
  if (search)   filters.push(ilike(resourcesTable.name, `%${search}%`));

  const resources = filters.length > 0
    ? await db.select().from(resourcesTable).where(and(...filters)).orderBy(resourcesTable.createdAt)
    : await db.select().from(resourcesTable).orderBy(resourcesTable.createdAt);

  const formatted = resources.map((r) => ({
    ...r,
    monthlyCost:      Number(r.monthlyCost),
    cpuUsage:         r.cpuUsage         != null ? Number(r.cpuUsage)         : null,
    estimatedSavings: r.estimatedSavings != null ? Number(r.estimatedSavings) : null,
  }));

  res.json(GetResourcesResponse.parse(formatted));
});

// POST /resources/seed — clear and insert sample data
router.post("/resources/seed", async (req, res): Promise<void> => {
  await db.delete(reportResourcesTable);
  await db.delete(resourcesTable);
  const inserted = await db.insert(resourcesTable).values(SEED_RESOURCES).returning();
  req.log.info({ count: inserted.length }, "Resources seeded");
  res.json(SeedResourcesResponse.parse({
    message: `Successfully seeded ${inserted.length} sample AWS resources`,
    count: inserted.length,
  }));
});

// POST /resources/upload-csv — parse and import CSV file
router.post(
  "/resources/upload-csv",
  upload.single("file"),
  async (req, res): Promise<void> => {
    // Multer validation errors are caught below
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Please attach a CSV file as form-data field 'file'." });
      return;
    }

    const text = req.file.buffer.toString("utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n").filter(l => l.trim() !== "");

    if (lines.length < 2) {
      res.status(400).json({ error: "CSV file is empty or contains only a header row." });
      return;
    }

    // Parse and normalise headers
    const rawHeaders = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));

    // Check for required headers
    const missingHeaders = REQUIRED_HEADERS.filter(h => !rawHeaders.includes(h));
    if (missingHeaders.length > 0) {
      res.status(400).json({
        error: `Missing required CSV columns: ${missingHeaders.join(", ")}. Expected headers: ${REQUIRED_HEADERS.join(", ")}`,
      });
      return;
    }

    // Helper to get a cell value by header name
    const col = (row: string[], header: string): string | undefined => {
      const idx = rawHeaders.indexOf(header);
      return idx >= 0 ? row[idx]?.trim() : undefined;
    };

    const toInsert: typeof SEED_RESOURCES = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // 1-indexed, row 1 = header
      const cells = parseCsvRow(lines[i]);

      const name   = col(cells, "name");
      const typeRaw = col(cells, "type")?.toUpperCase();
      const region  = col(cells, "region");
      const envRaw  = col(cells, "environment")?.toLowerCase();
      const costStr = col(cells, "monthly_cost");

      // Validate required fields
      if (!name) { errors.push(`Row ${rowNum}: 'name' is required.`); continue; }
      if (!region) { errors.push(`Row ${rowNum}: 'region' is required.`); continue; }
      if (!typeRaw || !VALID_TYPES.includes(typeRaw as typeof VALID_TYPES[number])) {
        errors.push(`Row ${rowNum}: invalid 'type' "${typeRaw ?? ""}". Must be one of: ${VALID_TYPES.join(", ")}.`);
        continue;
      }
      if (!envRaw || !VALID_ENVS.includes(envRaw as typeof VALID_ENVS[number])) {
        errors.push(`Row ${rowNum}: invalid 'environment' "${envRaw ?? ""}". Must be one of: ${VALID_ENVS.join(", ")}.`);
        continue;
      }
      const cost = parseNum(costStr);
      if (cost === null || isNaN(cost)) {
        errors.push(`Row ${rowNum}: 'monthly_cost' must be a valid number (got "${costStr ?? ""}").`);
        continue;
      }

      // Optional fields
      const cpuUsage         = parseNum(col(cells, "cpu_usage"));
      const isAttached       = parseBool(col(cells, "is_attached"));
      const hasLifecycle     = parseBool(col(cells, "has_lifecycle_policy"));
      const hasAlarms        = parseBool(col(cells, "has_cloudwatch_alarm") ?? col(cells, "has_cloudwatch_alarms"));
      const publicSsh        = parseBool(col(cells, "public_ssh"));
      const openPortsStr     = col(cells, "open_ports");
      // port22Open = explicit public_ssh field OR port 22 present in open_ports
      const port22Open       = publicSsh === true ? true : detectPort22(openPortsStr) ? true : (publicSsh === false ? false : null);

      toInsert.push({
        name,
        type:                typeRaw  as typeof VALID_TYPES[number],
        region,
        environment:         envRaw   as typeof VALID_ENVS[number],
        monthlyCost:         cost.toFixed(2),
        cpuUsage:            cpuUsage !== null ? String(cpuUsage) : null,
        isAttached:          isAttached,
        hasLifecyclePolicy:  hasLifecycle,
        hasCloudwatchAlarms: hasAlarms,
        port22Open:          port22Open,
      });
    }

    // Return validation errors before touching the DB
    if (errors.length > 0) {
      res.status(400).json({ error: `CSV validation failed:\n${errors.join("\n")}` });
      return;
    }

    if (toInsert.length === 0) {
      res.status(400).json({ error: "No valid data rows found in the CSV." });
      return;
    }

    // Clear existing resources (delete report_resources first to satisfy FK constraint)
    await db.delete(reportResourcesTable);
    await db.delete(resourcesTable);
    const inserted = await db.insert(resourcesTable).values(toInsert).returning();

    req.log.info({ count: inserted.length }, "CSV resources imported");

    res.json({
      message: `CSV uploaded successfully. ${inserted.length} resource${inserted.length !== 1 ? "s" : ""} imported.`,
      count: inserted.length,
    });
  }
);

export default router;
