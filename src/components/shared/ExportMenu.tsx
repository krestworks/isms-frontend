import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToCsv, exportToPdf, ExportColumn } from "@/lib/exportData";
import { useBranding } from "@/data/brandingStore";
import { useSession } from "@/data/sessionStore";

interface ExportMenuProps<T> {
  /** Base filename, without extension — the extension is added per format. */
  filename: string;
  /** PDF document title (CSV has no title, just the header row). */
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  /** Shown on the PDF under the title, e.g. "1 Jun – 30 Jun 2026 · Status: Paid" — state the active filter so the file is self-describing. */
  subtitle?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

/** The one export control every module should use — offers CSV or PDF for
 * the exact rows/columns passed in (already filtered by the caller). */
export function ExportMenu<T>({ filename, title, rows, columns, subtitle, size = "sm", disabled }: ExportMenuProps<T>) {
  const empty = disabled || rows.length === 0;
  const branding = useBranding();
  const { activeLocation } = useSession();

  const pdfBranding = branding ? {
    name: branding.name, logo: branding.logo, tagline: branding.tagline,
    address: branding.address, contactEmail: branding.contactEmail, contactPhone: branding.contactPhone,
    stationName: activeLocation !== "All Locations" ? activeLocation : undefined,
  } : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className={size === "sm" ? "h-8" : undefined} disabled={empty}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToCsv(filename, rows, columns)}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPdf(filename, title, rows, columns, { subtitle, branding: pdfBranding })}>
          <FileText className="h-3.5 w-3.5 mr-2" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
