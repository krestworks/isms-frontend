import { useState, useMemo, useEffect } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Pencil, Trash2, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface ExtraAction<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: FilterOption[];
  pageSize?: number;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  rowActions?: (item: T) => React.ReactNode;
  extraActions?: ExtraAction<T>[];
  /** Fires whenever the visible (search+filter+sort applied, pre-pagination) row set changes — use to drive "export what I see" instead of exporting the raw unfiltered data prop. */
  onFilteredChange?: (rows: T[]) => void;
  /** item.id values with a pending Tier-1/Tier-2 delete-approval request — row is highlighted and the delete action is replaced with a "pending" indicator. */
  pendingDeleteIds?: Set<string>;
}

/** Resolves dot-path keys ("employee.user.name") against nested objects; falls back to a flat lookup for plain keys. */
function getPath(obj: any, path: string): any {
  if (obj == null) return undefined;
  if (!path.includes(".")) return obj[path];
  return path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys = [],
  searchPlaceholder = "Search...",
  filters = [],
  pageSize = 10,
  loading = false,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  actions: actionsProp,
  rowActions,
  extraActions = [],
  onFilteredChange,
  pendingDeleteIds,
}: DataTableProps<T>) {
  const hasActions = !!(actionsProp || rowActions || onView || onEdit || onDelete || extraActions.length);
  const renderActions = (item: T) => {
    const isPendingDelete = !!(pendingDeleteIds && item?.id != null && pendingDeleteIds.has(item.id));
    return (
    <div className="flex items-center gap-1">
      {onView && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(item)}><Eye className="h-3.5 w-3.5" /></Button>}
      {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>}
      {extraActions.filter(a => !a.show || a.show(item)).map((a, i) => {
        const Icon = a.icon;
        return (
          <Button key={i} variant="ghost" size="sm" className="h-7 text-xs px-2" title={a.label} onClick={() => a.onClick(item)}>
            {Icon ? <Icon className="h-3.5 w-3.5 mr-1" /> : null}{a.label}
          </Button>
        );
      })}
      {onDelete && (
        isPendingDelete
          ? <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" disabled title="Deletion pending a second person's approval"><Clock className="h-3.5 w-3.5" /></Button>
          : <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
      )}
      {actionsProp?.(item)}
      {rowActions?.(item)}
    </div>
    );
  };
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = [...data];

    if (debouncedSearch && searchKeys.length > 0) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => String(getPath(item, key) ?? "").toLowerCase().includes(q))
      );
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== "__all__") {
        result = result.filter((item) => String(getPath(item, key)) === value);
      }
    });

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = getPath(a, sortKey);
        const bVal = getPath(b, sortKey);
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, debouncedSearch, searchKeys, activeFilters, sortKey, sortDir]);

  useEffect(() => { onFilteredChange?.(filtered); }, [filtered, onFilteredChange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeP = Math.min(page, totalPages);
  const paged = filtered.slice((safeP - 1) * pageSize, safeP * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 bg-muted/50 border-border text-sm"
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={activeFilters[f.key] || "__all__"}
            onValueChange={(v) => { setActiveFilters((p) => ({ ...p, [f.key]: v })); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-[160px] text-sm bg-muted/50">
              <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {f.label}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} record{filtered.length !== 1 && "s"}
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </TableHead>
              ))}
              {hasActions && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="text-center py-12 text-muted-foreground text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="text-center py-12 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item, i) => {
                const isPendingDelete = !!(pendingDeleteIds && item?.id != null && pendingDeleteIds.has(item.id));
                return (
                <TableRow
                  key={item.id ?? i}
                  className={`${onRowClick ? "cursor-pointer" : ""} ${isPendingDelete ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, ci) => (
                    <TableCell key={col.key} className="text-sm">
                      {ci === 0 && isPendingDelete && (
                        <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 align-middle">
                          <Clock className="h-2.5 w-2.5" />Pending Deletion
                        </span>
                      )}
                      {col.render ? col.render(item) : String(getPath(item, col.key) ?? "")}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {renderActions(item)}
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {safeP} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeP <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeP <= 1} onClick={() => setPage(safeP - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeP >= totalPages} onClick={() => setPage(safeP + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeP >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
