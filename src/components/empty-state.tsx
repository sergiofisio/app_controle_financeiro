import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase?: number;
}) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <Icon className="size-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {phase ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Disponível a partir da Fase {phase}. Nenhum dado fictício é
            exibido aqui.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
