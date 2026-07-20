import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
};

export function ComingSoonPage({ title, description, icon: Icon, features }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Recurso em desenvolvimento</p>
        </div>
        <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
          <Sparkles className="h-3.5 w-3.5" /> Em breve
        </Badge>
      </div>

      <Card className="relative overflow-hidden border-dashed p-6 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold md:text-2xl">Estamos preparando algo especial</h2>
            <p className="text-muted-foreground">{description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="border-primary/30">Em desenvolvimento</Badge>
              <Badge variant="outline">Próximas atualizações</Badge>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 md:h-52 md:w-52">
              <Icon className="h-20 w-20 text-primary md:h-24 md:w-24" />
              <Sparkles className="absolute right-4 top-4 h-6 w-6 text-primary/70" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="text-lg font-semibold">Recursos planejados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira o que estamos construindo para este módulo.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-lg border bg-card/50 p-3 text-sm"
            >
              <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
