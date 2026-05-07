import { useGetRecommendations } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldAlert, CheckCircle2, Zap, Clock, Info } from "lucide-react";
import { format } from "date-fns";

function fmt(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-red-500/15",   text: "text-red-400" },
    high:     { bg: "bg-amber-500/15", text: "text-amber-400" },
    medium:   { bg: "bg-blue-500/15",  text: "text-blue-400" },
    low:      { bg: "bg-slate-500/15", text: "text-slate-400" },
  };
  const style = map[priority] ?? { bg: "bg-slate-500/15", text: "text-slate-400" };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm ${style.bg} ${style.text}`}>
      {priority} priority
    </span>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#34d399" :
    score >= 60 ? "#facc15" :
    score >= 40 ? "#fb923c" :
    "#f87171";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="hsl(217 33% 18%)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="45"
            fill="transparent"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <h3 className="text-xl font-bold mt-3" style={{ color }}>{label}</h3>
      <p className="text-sm text-muted-foreground mt-1">Cloud Health Score</p>
    </div>
  );
}

export default function Recommendations() {
  const { data: recommendations, isLoading } = useGetRecommendations();

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Executive Recommendations</h1>
          <p className="text-muted-foreground mt-1">
            Executive action plan generated from rule-based cloud optimization analysis, designed for future AI integration.
          </p>
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted/30 border border-border max-w-2xl">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cost findings are calculated using deterministic optimization rules. The summary layer is AI-ready for future OpenAI integration.
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        ) : !recommendations ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card border border-border rounded-xl">
            <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Recommendations Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Run an analysis from the dashboard to generate optimization recommendations.
            </p>
          </div>
        ) : (
          <>
            {/* Health Score + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Overall Cloud Health
                  </CardTitle>
                  {recommendations.lastAnalyzed && (
                    <CardDescription>
                      Last analyzed: {format(new Date(recommendations.lastAnalyzed), "MMM d, yyyy 'at' HH:mm")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base leading-relaxed">
                    {recommendations.summary}
                  </p>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                      Business Impact
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {recommendations.businessImpact}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col items-center justify-center text-center p-6">
                <ScoreRing
                  score={recommendations.healthScore}
                  label={recommendations.healthLabel}
                />
                <div className="mt-6 w-full pt-6 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-1">Estimated Monthly Savings</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    +{fmt(recommendations.estimatedMonthlySavings)}/mo
                  </div>
                </div>
              </Card>
            </div>

            {/* Top Action Items */}
            <div>
              <h2 className="text-2xl font-bold pb-4 border-b border-border mb-6">Top Action Items</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {recommendations.topActions.map((action, idx) => (
                  <Card
                    key={idx}
                    className="flex flex-col border-border hover:border-primary/40 transition-colors"
                    data-testid={`card-action-${idx}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <PriorityBadge priority={action.priority} />
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                          <Clock className="w-3 h-3" />
                          {action.effort} Effort
                        </span>
                      </div>
                      <CardTitle className="text-base leading-snug">{action.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                        {action.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-sm font-medium text-muted-foreground">Est. Savings</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {action.savings > 0 ? `+${fmt(action.savings)}/mo` : "Security Risk"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Technical Action Plan */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Technical Action Plan
                </CardTitle>
                <CardDescription>Step-by-step instructions for your engineering team</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {recommendations.technicalPlan.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex items-start gap-2 flex-1">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{step}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
