import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/usuarios")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Usuários e Permissões</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie a equipe do seu estabelecimento e defina o que cada papel pode acessar.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link to="/admin/usuarios">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">Equipe</div>
              <div className="text-xs text-muted-foreground">Criar, bloquear e atribuir papéis</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
        <Link to="/admin/usuarios">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Shield className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">Permissões por papel</div>
              <div className="text-xs text-muted-foreground">Ver e editar acesso por módulo</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Perfis disponíveis: Proprietário, Administrador, Gerente, Caixa, Garçom, Cozinha, Produção, Estoque, Financeiro, Operador.</p>
      <div className="mt-4">
        <Button asChild><Link to="/admin/usuarios">Abrir gestão de usuários</Link></Button>
      </div>
    </Card>
  ),
});
