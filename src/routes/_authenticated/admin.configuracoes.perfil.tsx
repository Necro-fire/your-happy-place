import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import { fetchMyProfile } from "@/hooks/use-profile-status";
import { uploadTenantAsset, friendlyStorageError } from "@/lib/settings-io";
import { InlineLoader, InlineError } from "@/components/admin/InlineStates";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile, staleTime: 60_000 });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!q.isSuccess) return;
    const p: any = q.data ?? {};
    setNome(p.nome ?? "");
    setEmail(p.email ?? "");
    setTelefone(p.telefone ?? "");
    setAvatarUrl(p.avatar_url ?? "");
    // Auto-preenche com dados do provedor (Google/email) se estiverem vazios.
    if (!p.nome || !p.email) {
      supabase.auth.getUser().then(({ data }) => {
        const u = data?.user;
        if (!u) return;
        const meta = (u.user_metadata ?? {}) as any;
        setNome((v) => v || meta.full_name || meta.name || v);
        setEmail((v) => v || u.email || v);
        setAvatarUrl((v) => v || meta.avatar_url || meta.picture || v);
      });
    }
  }, [q.isSuccess, q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) throw new Error("Sessão expirada.");
      if (!nome.trim()) throw new Error("Informe seu nome completo.");
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido.");
      if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) throw new Error("Telefone inválido.");
      const { error } = await (supabase.from("profiles") as any)
        .update({ nome: nome.trim(), email: email.trim(), telefone, avatar_url: avatarUrl })
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Dados pessoais atualizados");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
  });

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const { publicUrl } = await uploadTenantAsset("avatars", "avatar", file, ext);
      setAvatarUrl(publicUrl);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) await (supabase.from("profiles") as any).update({ avatar_url: publicUrl }).eq("user_id", uid);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(friendlyStorageError(e));
    } finally {
      setUploading(false);
    }
  }

  async function changePassword() {
    if (pwd.length < 8) { toast.error("A senha precisa ter ao menos 8 caracteres."); return; }
    if (pwd !== pwd2) { toast.error("As senhas não conferem."); return; }
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Senha alterada com sucesso");
      setPwd(""); setPwd2("");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível alterar a senha.");
    } finally {
      setChangingPwd(false);
    }
  }

  if (q.isLoading) return <InlineLoader label="Carregando seu perfil..." />;
  if (q.error) return <InlineError error={q.error as Error} onRetry={() => q.refetch()} />;

  const criadoEm = (q.data as any)?.created_at ? new Date((q.data as any).created_at).toLocaleString("pt-BR") : "—";
  const atualizadoEm = (q.data as any)?.updated_at ? new Date((q.data as any).updated_at).toLocaleString("pt-BR") : "—";

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Foto de perfil</h2>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Aparece no seu painel e nos registros do sistema.</p>
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-border bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {avatarUrl ? "Substituir" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.currentTarget.value = ""; }}
              />
            </label>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl("")}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Dados da conta</h2>
          <p className="text-xs text-muted-foreground">Suas informações pessoais. São diferentes dos dados comerciais da empresa.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Label>E-mail da conta *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            <p className="mt-1 text-[11px] text-muted-foreground">Usado para login e recuperação de senha.</p>
          </div>
          <div>
            <Label>Telefone pessoal *</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              maxLength={15}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">Conta criada em</Label>
            <Input value={criadoEm} readOnly disabled />
          </div>
          <div>
            <Label className="text-muted-foreground">Última atualização</Label>
            <Input value={atualizadoEm} readOnly disabled />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar dados pessoais"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Alterar senha</h2>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Mínimo 8 caracteres. Use uma senha exclusiva para o sistema.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nova senha</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={changePassword} disabled={changingPwd || !pwd}>
            {changingPwd ? "Alterando..." : "Alterar senha"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
