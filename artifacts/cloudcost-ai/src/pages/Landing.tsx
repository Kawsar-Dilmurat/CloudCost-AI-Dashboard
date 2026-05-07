import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, ArrowRight, BarChart2, ShieldAlert, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 text-sm font-medium tracking-wide">
            <Activity className="w-4 h-4" />
            <span>AWS Optimization Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Detect cloud waste.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Recover your budget.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            The Bloomberg terminal for your AWS bill. Instantly identify unattached volumes, idle instances, and security risks. Stop guessing, start optimizing.
          </p>

          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 group">
              Start Analysis
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Demo Mode badge */}
          <div className="mt-6 inline-flex items-start gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-left max-w-lg">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-slate-300">Demo Mode — </span>
              <span className="text-xs text-slate-400">
                Uses sample AWS-style data or uploaded CSV inventories. Real AWS Cost Explorer and CloudWatch integrations are planned future improvements.
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-6 text-left"
        >
          <div className="p-6 rounded-2xl bg-card border border-card-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">1. Load Data</h3>
            <p className="text-muted-foreground text-sm">Seed sample AWS-style resources or upload your own CSV inventory.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-card-border">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">2. Analyze</h3>
            <p className="text-muted-foreground text-sm">Identify idle instances, unattached volumes, and over-provisioned databases.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-card-border">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">3. Review Savings</h3>
            <p className="text-muted-foreground text-sm">See itemized savings estimates, Cloud Health Score, and executive recommendations.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-card-border">
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">4. Generate Report</h3>
            <p className="text-muted-foreground text-sm">Export an executive-ready Markdown report for your team or GitHub documentation.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
