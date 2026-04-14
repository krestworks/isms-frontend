import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface ModulePageShellProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export function ModulePageShell({ title, description, icon: Icon, children }: ModulePageShellProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children || (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Module under development. Full CRUD, inventory, sales, and reporting coming soon.</p>
        </div>
      )}
    </motion.div>
  );
}
