import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { SECTIONS } from "@/components/admin/settings/SettingsShell";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/")({
  component: ConfigHome,
});

function ConfigHome() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {SECTIONS.map((s) => (
        <Link key={s.slug} to={`/admin/configuracoes/${s.slug}`}>
          <Card className="group h-full p-4 transition-colors hover:border-primary hover:bg-muted/40">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium">{s.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
