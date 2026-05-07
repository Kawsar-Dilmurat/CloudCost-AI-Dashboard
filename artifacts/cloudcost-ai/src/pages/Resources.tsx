import { useState } from "react";
import { useGetResources } from "@workspace/api-client-react";
import type { GetResourcesType, GetResourcesPriority } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Database, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import CsvUpload from "@/components/CsvUpload";

type Resource = NonNullable<ReturnType<typeof useGetResources>["data"]>[number];

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

// Returns resource-type-specific detail explanations
function getResourceDetail(resource: Resource) {
  const issue = resource.issue ?? "";

  if (issue === "Underutilized EC2 Instance") return {
    whyFlagged: "Average CPU usage is below the 10% threshold, indicating the instance is significantly over-provisioned for its current workload.",
    action: "Right-size the instance, stop it during off-hours, or validate whether it can be terminated.",
    risk: "For production workloads, verify traffic patterns and dependencies before making changes.",
  };
  if (issue === "Oversized RDS Instance") return {
    whyFlagged: "CPU utilization is below 15% while monthly cost is above $100, indicating the database instance class is larger than necessary.",
    action: "Review instance class and consider downsizing during a maintenance window.",
    risk: "Validate performance requirements, backup schedules, and maintenance windows before resizing.",
  };
  if (issue === "Unattached EBS Volume") return {
    whyFlagged: "The volume is not attached to any EC2 instance but is still generating monthly storage charges.",
    action: "Create a snapshot if needed, then delete the unattached volume.",
    risk: "Confirm the volume is not needed for rollback or recovery before deletion.",
  };
  if (issue === "Missing S3 Lifecycle Policy") return {
    whyFlagged: "The bucket has no lifecycle policy and may be storing old objects in expensive storage classes indefinitely.",
    action: "Add lifecycle rules to transition older objects to S3 Standard-IA or Glacier.",
    risk: "Confirm retention and compliance requirements before enabling archival or expiration rules.",
  };
  if (issue === "Public SSH Exposure (Port 22)") return {
    whyFlagged: "Port 22 is open to the public internet (0.0.0.0/0), exposing the instance to brute-force and unauthorized access attempts.",
    action: "Restrict SSH access to trusted IP ranges or use AWS Systems Manager Session Manager.",
    risk: "Changing access rules may impact administrators who currently rely on SSH. Coordinate with your operations team.",
  };
  if (issue === "Missing CloudWatch Alarms") return {
    whyFlagged: "Production resource does not have CloudWatch alarms configured, creating a monitoring blind spot.",
    action: "Add CloudWatch alarms for CPU, memory (if available), storage, and error rates.",
    risk: "Alarms should be tuned carefully to avoid alert fatigue. Start with generous thresholds and tighten over time.",
  };
  return {
    whyFlagged: "This resource was flagged during analysis.",
    action: resource.recommendation ?? "Review and address the flagged issue.",
    risk: "Review the resource carefully before making changes.",
  };
}

function ResourceDetailModal({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  if (!resource) return null;
  const detail = getResourceDetail(resource);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {resource.name}
            <span className="text-sm font-normal text-muted-foreground font-mono">{resource.type}</span>
          </DialogTitle>
          <DialogDescription>
            {resource.region} &middot; {resource.environment}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricTile label="Monthly Cost" value={fmt(resource.monthlyCost)} />
            {resource.cpuUsage != null && (
              <MetricTile label="CPU Usage" value={`${resource.cpuUsage.toFixed(1)}%`} />
            )}
            {resource.isAttached !== null && resource.isAttached !== undefined && (
              <MetricTile label="Volume Status" value={resource.isAttached ? "Attached" : "Unattached"} />
            )}
            {resource.hasLifecyclePolicy !== null && resource.hasLifecyclePolicy !== undefined && (
              <MetricTile label="Lifecycle Policy" value={resource.hasLifecyclePolicy ? "Yes" : "No"} />
            )}
            {resource.hasCloudwatchAlarms !== null && resource.hasCloudwatchAlarms !== undefined && (
              <MetricTile label="CloudWatch Alarms" value={resource.hasCloudwatchAlarms ? "Configured" : "Missing"} />
            )}
            {resource.port22Open !== null && resource.port22Open !== undefined && (
              <MetricTile label="Port 22" value={resource.port22Open ? "Open to 0.0.0.0/0" : "Restricted"} danger={resource.port22Open} />
            )}
            {resource.estimatedSavings != null && resource.estimatedSavings > 0 && (
              <MetricTile label="Est. Monthly Savings" value={`+${fmt(resource.estimatedSavings)}/mo`} savings />
            )}
          </div>

          {/* Issue */}
          {resource.issue && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-semibold text-sm">Issue Detected</h3>
                <PriorityBadge priority={resource.priority} />
              </div>
              <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3">
                <section>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Why Flagged</div>
                  <p className="text-sm leading-relaxed">{detail.whyFlagged}</p>
                </section>
                <section>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Recommended Action</div>
                  <p className="text-sm leading-relaxed">{detail.action}</p>
                </section>
                <section className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed text-amber-300">{detail.risk}</p>
                </section>
              </div>
            </div>
          )}

          {!resource.issue && (
            <div className="flex items-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">No issues detected. This resource is optimized.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricTile({ label, value, danger, savings }: { label: string; value: string; danger?: boolean; savings?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${danger ? "text-red-400" : savings ? "text-emerald-400" : ""}`}>{value}</div>
    </div>
  );
}

export default function Resources() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<GetResourcesType | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<GetResourcesPriority | undefined>();
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const { data: resources, isLoading } = useGetResources({
    search: search || undefined,
    type: typeFilter,
    priority: priorityFilter,
  });

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="text-muted-foreground mt-1">Detailed inventory of analyzed AWS resources. Click any row to view details.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by resource name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {([undefined, "EC2", "RDS", "S3", "EBS"] as const).map((t) => (
              <Button
                key={String(t)}
                variant={typeFilter === t && !priorityFilter ? "default" : "outline"}
                onClick={() => { setTypeFilter(t); setPriorityFilter(undefined); }}
                size="sm"
                data-testid={`button-filter-${t ?? "all"}`}
              >
                {t ?? "All"}
              </Button>
            ))}
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              variant={priorityFilter === "critical" ? "default" : "outline"}
              onClick={() => { setPriorityFilter("critical"); setTypeFilter(undefined); }}
              size="sm"
              data-testid="button-filter-security"
            >
              <ShieldAlert className="w-3 h-3 mr-1" />
              Security
            </Button>
            <Button
              variant={priorityFilter === "high" ? "default" : "outline"}
              onClick={() => { setPriorityFilter("high"); setTypeFilter(undefined); }}
              size="sm"
              data-testid="button-filter-high"
            >
              High Priority
            </Button>
          </div>
        </div>

        {/* CSV Upload — compact variant above table */}
        <CsvUpload compact />

        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region / Env</TableHead>
                <TableHead className="text-right">Monthly Cost</TableHead>
                <TableHead>Usage / Status</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="text-right">Est. Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !resources || resources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Database className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-lg font-medium">No resources found</p>
                      <p className="text-sm text-muted-foreground">Adjust filters or seed and run analysis.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((resource) => (
                  <TableRow
                    key={resource.id}
                    className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedResource(resource)}
                    data-testid={`row-resource-${resource.id}`}
                  >
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{resource.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{resource.region}</div>
                      <div className="text-xs text-muted-foreground capitalize">{resource.environment}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmt(resource.monthlyCost)}
                    </TableCell>
                    <TableCell>
                      {resource.cpuUsage != null && (
                        <div className={`text-sm ${resource.cpuUsage < 10 ? "text-amber-400" : ""}`}>
                          {resource.cpuUsage.toFixed(1)}% CPU
                        </div>
                      )}
                      {resource.isAttached === false && (
                        <div className="text-sm text-red-400">Unattached</div>
                      )}
                      {resource.isAttached === true && (
                        <div className="text-sm text-emerald-400">Attached</div>
                      )}
                      {resource.port22Open === true && (
                        <div className="text-sm text-red-400 font-semibold">Port 22 Open</div>
                      )}
                      {resource.hasLifecyclePolicy === false && (
                        <div className="text-sm text-amber-400">No Lifecycle Policy</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {resource.issue ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium leading-snug">{resource.issue}</div>
                          <PriorityBadge priority={resource.priority} />
                        </div>
                      ) : (
                        <PriorityBadge priority={null} />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {resource.estimatedSavings && resource.estimatedSavings > 0 ? (
                        <span className="text-emerald-400 font-bold">+{fmt(resource.estimatedSavings)}/mo</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedResource && (
        <ResourceDetailModal resource={selectedResource} onClose={() => setSelectedResource(null)} />
      )}
    </AppLayout>
  );
}
