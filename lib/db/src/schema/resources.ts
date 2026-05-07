import { pgTable, serial, text, numeric, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceTypeEnum = pgEnum("resource_type", ["EC2", "RDS", "S3", "EBS"]);
export const environmentEnum = pgEnum("environment", ["production", "staging", "development"]);
export const priorityEnum = pgEnum("priority", ["critical", "high", "medium", "low"]);

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: resourceTypeEnum("type").notNull(),
  region: text("region").notNull(),
  environment: environmentEnum("environment").notNull(),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }).notNull(),
  cpuUsage: numeric("cpu_usage", { precision: 5, scale: 2 }),
  isAttached: boolean("is_attached"),
  hasLifecyclePolicy: boolean("has_lifecycle_policy"),
  hasCloudwatchAlarms: boolean("has_cloudwatch_alarms"),
  port22Open: boolean("port_22_open"),
  issue: text("issue"),
  priority: priorityEnum("priority"),
  recommendation: text("recommendation"),
  estimatedSavings: numeric("estimated_savings", { precision: 10, scale: 2 }),
  isAnalyzed: boolean("is_analyzed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({ id: true, createdAt: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  totalMonthlyCost: numeric("total_monthly_cost", { precision: 10, scale: 2 }).notNull(),
  estimatedWaste: numeric("estimated_waste", { precision: 10, scale: 2 }).notNull(),
  potentialSavings: numeric("potential_savings", { precision: 10, scale: 2 }).notNull(),
  issueCount: integer("issue_count").notNull(),
  resourceCount: integer("resource_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;

export const reportResourcesTable = pgTable("report_resources", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reportsTable.id),
  resourceId: integer("resource_id").notNull().references(() => resourcesTable.id),
});
