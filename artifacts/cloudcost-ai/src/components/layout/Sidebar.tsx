import { Link, useLocation } from "wouter";
import { LayoutDashboard, Server, ShieldAlert, FileText, Database, Play, Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  useSeedResources, 
  useAnalyzeResources,
  getGetDashboardQueryKey,
  getGetResourcesQueryKey,
  getGetReportsQueryKey,
  getGetRecommendationsQueryKey
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard",       href: "/dashboard",       icon: LayoutDashboard },
  { name: "Resources",       href: "/resources",       icon: Server },
  { name: "Recommendations", href: "/recommendations", icon: ShieldAlert },
  { name: "Reports",         href: "/reports",         icon: FileText },
  { name: "Architecture",    href: "/architecture",    icon: Network },
];

export function Sidebar() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const seedMutation = useSeedResources({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
      }
    }
  });

  const analyzeMutation = useAnalyzeResources({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecommendationsQueryKey() });
      }
    }
  });

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-6">
        <Link href="/" className="font-bold text-xl text-primary tracking-tight">CloudCost AI</Link>
      </div>
      
      <nav className="px-4 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="text-xs font-medium text-sidebar-foreground/50 px-2 uppercase tracking-wider">
          Actions
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          data-testid="button-seed-data"
        >
          <Database className="w-4 h-4 mr-2" />
          Seed Data
        </Button>
        <Button 
          size="sm" 
          className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          data-testid="button-run-analysis"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>
    </div>
  );
}
