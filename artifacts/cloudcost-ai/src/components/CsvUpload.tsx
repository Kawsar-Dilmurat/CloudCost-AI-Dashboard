import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryKey,
  getGetResourcesQueryKey,
  getGetReportsQueryKey,
  getGetRecommendationsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle, CheckCircle2, Download, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample CSV content for the download helper
const SAMPLE_CSV = `name,type,region,environment,monthly_cost,cpu_usage,is_attached,has_lifecycle_policy,open_ports,public_ssh,has_cloudwatch_alarm,storage_gb
web-server-prod-01,EC2,us-east-1,production,320,8.5,,,22|80|443,true,false,50
api-server-prod-02,EC2,us-east-1,production,480,6.2,,,443,false,true,50
worker-staging-01,EC2,us-west-2,staging,160,3.1,,,443,false,false,30
postgres-main-prod,RDS,us-east-1,production,450,12.3,,,5432,false,false,200
mysql-analytics-prod,RDS,us-east-1,production,380,8.7,,,3306,false,false,200
assets-cdn-prod,S3,us-east-1,production,85,,,false,,,true,500
backups-archive-prod,S3,us-west-2,production,120,,,false,,,false,1000
vol-web-server-01,EBS,us-east-1,production,35,,false,,,false,false,100
vol-old-test-env,EBS,us-west-2,development,28,,false,,,false,false,80
`;

const COLUMN_DOCS = [
  { name: "name",                 required: true,  desc: "Unique resource identifier (e.g. web-server-prod-01)" },
  { name: "type",                 required: true,  desc: "EC2 | RDS | S3 | EBS" },
  { name: "region",               required: true,  desc: "AWS region (e.g. us-east-1)" },
  { name: "environment",          required: true,  desc: "production | staging | development" },
  { name: "monthly_cost",         required: true,  desc: "Monthly cost in USD (e.g. 320 or 320.50)" },
  { name: "cpu_usage",            required: false, desc: "Average CPU % (e.g. 8.5) — EC2 and RDS only" },
  { name: "is_attached",          required: false, desc: "true / false — EBS only" },
  { name: "has_lifecycle_policy", required: false, desc: "true / false — S3 only" },
  { name: "open_ports",           required: false, desc: "Pipe or comma separated ports (e.g. 22|80|443)" },
  { name: "public_ssh",           required: false, desc: "true / false — marks port 22 exposed to public" },
  { name: "has_cloudwatch_alarm", required: false, desc: "true / false" },
  { name: "storage_gb",           required: false, desc: "Storage size in GB (informational)" },
];

interface CsvUploadProps {
  /** Compact variant — just the button, no explanatory card */
  compact?: boolean;
}

export default function CsvUpload({ compact }: CsvUploadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showFormatModal, setShowFormatModal] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(null);
  }

  function clearFile() {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/resources/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed. Please check your CSV and try again.");
        setIsUploading(false);
        return;
      }

      setUploadSuccess(data.message);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Invalidate all queries so the UI reflects the new data
      queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecommendationsQueryKey() });

      toast({ title: "CSV uploaded", description: data.message });
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cloudcost-ai-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (compact) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          data-testid="button-upload-csv-compact"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {/* When a file is chosen in compact mode, show it */}
        {selectedFile && (
          <SelectedFileBanner
            file={selectedFile}
            isUploading={isUploading}
            onUpload={handleUpload}
            onClear={clearFile}
          />
        )}
        {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />}
        {uploadSuccess && <SuccessBanner message={uploadSuccess} onDismiss={() => setUploadSuccess(null)} />}
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload CSV Resource Inventory
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Import your own AWS resource list to replace the sample data.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFormatModal(true)}
              data-testid="button-csv-format"
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              View format
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadSampleCsv}
              data-testid="button-download-sample-csv"
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Sample CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <label
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            data-testid="label-file-picker"
          >
            <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {selectedFile ? selectedFile.name : "Choose a .csv file..."}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-csv-file"
            />
          </label>

          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                data-testid="button-upload-submit"
              >
                {isUploading
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
              </Button>
              <Button variant="ghost" size="icon" onClick={clearFile} data-testid="button-csv-clear">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />}

        {uploadSuccess && (
          <SuccessBanner
            message={`${uploadSuccess} Run Analysis to detect issues and generate savings estimates.`}
            onDismiss={() => setUploadSuccess(null)}
          />
        )}
      </div>

      {/* CSV Format Modal */}
      <Dialog open={showFormatModal} onOpenChange={setShowFormatModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>CSV Format Reference</DialogTitle>
            <DialogDescription>
              Accepted column headers and their expected values.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Column</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Required</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {COLUMN_DOCS.map((col) => (
                    <tr key={col.name} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs text-primary">{col.name}</td>
                      <td className="px-3 py-2">
                        {col.required
                          ? <span className="text-red-400 text-xs font-semibold">Required</span>
                          : <span className="text-muted-foreground text-xs">Optional</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Example row</p>
              <pre className="text-xs bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto text-slate-300 leading-relaxed">
{`name,type,region,environment,monthly_cost,cpu_usage,...
web-server-prod-01,EC2,us-east-1,production,320,8.5,...`}
              </pre>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SelectedFileBanner({ file, isUploading, onUpload, onClear }: {
  file: File; isUploading: boolean; onUpload: () => void; onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm mt-1">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate text-muted-foreground">{file.name}</span>
      <Button size="sm" onClick={onUpload} disabled={isUploading}>
        {isUploading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <pre className="flex-1 text-red-300 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-emerald-300 leading-relaxed">{message}</p>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
