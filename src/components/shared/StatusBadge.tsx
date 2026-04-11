import { Badge } from "@/components/ui/badge";

type Variant = "default" | "secondary" | "destructive" | "outline";

const statusMap: Record<string, { label: string; variant: Variant }> = {
  active: { label: "Active", variant: "default" },
  operational: { label: "Operational", variant: "default" },
  full: { label: "Full", variant: "default" },
  available: { label: "Available", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  on_duty: { label: "On Duty", variant: "default" },
  normal: { label: "Normal", variant: "secondary" },
  partial: { label: "Partial", variant: "secondary" },
  pending: { label: "Pending", variant: "secondary" },
  off_duty: { label: "Off Duty", variant: "secondary" },
  low: { label: "Low", variant: "destructive" },
  critical: { label: "Critical", variant: "destructive" },
  empty: { label: "Empty", variant: "destructive" },
  damaged: { label: "Damaged", variant: "destructive" },
  inactive: { label: "Inactive", variant: "outline" },
  maintenance: { label: "Maintenance", variant: "outline" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  on_leave: { label: "On Leave", variant: "outline" },
  over: { label: "Over", variant: "destructive" },
  under: { label: "Under", variant: "destructive" },
  matched: { label: "Matched", variant: "default" },
  waiting: { label: "Waiting", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  confirmed: { label: "Confirmed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  processing: { label: "Processing", variant: "secondary" },
  invoiced: { label: "Invoiced", variant: "default" },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = statusMap[status] || { label: status, variant: "outline" as Variant };
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}
