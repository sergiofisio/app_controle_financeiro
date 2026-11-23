import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export function ComingSoonPage({
  title,
  description,
  icon,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <EmptyState
        icon={icon}
        title={`${title} em breve`}
        description={description}
        phase={phase}
      />
    </div>
  );
}
