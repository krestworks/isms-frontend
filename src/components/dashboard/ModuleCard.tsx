import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  stats: { label: string; value: string }[];
  colorVar: string;
  index: number;
}

export function ModuleCard({ title, description, icon: Icon, href, stats, colorVar, index }: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={href}
        className="group block bg-card rounded-xl border border-border p-5 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `hsl(var(${colorVar}) / 0.12)` }}
          >
            <Icon className="h-5 w-5" style={{ color: `hsl(var(${colorVar}))` }} />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
