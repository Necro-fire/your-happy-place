import { useState, useRef } from 'react';
import { useAccentColor, type AccentColor, accentColors } from '@/contexts/AccentColorContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check, Upload, Building2, User, Palette, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { accentColor, setAccentColor } = useAccentColor();
  const { settings, saveSettings, uploadLogo } = useCompanySettings();
  const { user } = useAuth();
  const colorEntries = Object.entries(accentColors) as [AccentColor, typeof accentColors[AccentColor]][];

  const [company, setCompany] = useState({
    nome_empresa: settings.nome_empresa,
    telefone_empresa: settings.telefone_empresa,
    email_empresa: settings.email_empresa,
    endereco_empresa: settings.endereco_empresa,
  });
  const [custoFixo, setCustoFixo] = useState(settings.custo_fixo_mensal);
  const [margem, setMargem] = useState(settings.margem_custo_percentual);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load avatar from profile
  useState(() => {
    if (user) {
      supabase.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    }
  });

  // Sync when settings load
  useState(() => {
    setCompany({
      nome_empresa: settings.nome_empresa,
      telefone_empresa: settings.telefone_empresa,
      email_empresa: settings.email_empresa,
      endereco_empresa: settings.endereco_empresa,
    });
    setCustoFixo(settings.custo_fixo_mensal);
    setMargem(settings.margem_custo_percentual);
  });

  const handleSaveCompany = async () => {
    setSaving(true);
    await saveSettings({ ...company, custo_fixo_mensal: custoFixo, margem_custo_percentual: margem });
    setSaving(false);
    toast.success('Configurações salvas.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadLogo(file);
    await saveSettings({ logo_url: url });
    toast.success('Logotipo atualizado.');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = data.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
    setAvatarUrl(url);
    toast.success('Foto de perfil atualizada.');
  };

  const inputStyle = "mt-1 bg-surface-2 border-0";
  const inputShadow = { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold tracking-tight uppercase">Configurações</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Personalize o sistema e configure sua empresa.</p>
      </div>

      {/* Profile Photo */}
      <motion.div className="surface-card rounded-lg p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Foto de Perfil</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden" style={inputShadow}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button size="sm" variant="outline" onClick={() => avatarInputRef.current?.click()} className="border-0 bg-surface-1" style={inputShadow}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />Alterar Foto
            </Button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP</p>
          </div>
        </div>
      </motion.div>

      {/* Company Settings */}
      <motion.div className="surface-card rounded-lg p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Configurações da Empresa</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Nome da Empresa</Label>
            <Input value={company.nome_empresa} onChange={e => setCompany(p => ({ ...p, nome_empresa: e.target.value }))} className={inputStyle} style={inputShadow} placeholder="Ex: TechAssist" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <Input value={company.telefone_empresa} onChange={e => setCompany(p => ({ ...p, telefone_empresa: e.target.value }))} className={inputStyle} style={inputShadow} placeholder="(11) 99999-0000" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={company.email_empresa} onChange={e => setCompany(p => ({ ...p, email_empresa: e.target.value }))} className={inputStyle} style={inputShadow} placeholder="contato@empresa.com" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <Input value={company.endereco_empresa} onChange={e => setCompany(p => ({ ...p, endereco_empresa: e.target.value }))} className={inputStyle} style={inputShadow} placeholder="Rua, número, cidade" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Logotipo</Label>
            <div className="flex items-center gap-3 mt-1">
              {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-md object-contain bg-surface-2" />}
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} className="border-0 bg-surface-1" style={inputShadow}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />{settings.logo_url ? 'Alterar Logo' : 'Upload Logo'}
              </Button>
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Financial Config */}
      <motion.div className="surface-card rounded-lg p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Configurações Financeiras</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Margem de Custo Operacional (%)</Label>
            <Input type="number" min={0} max={100} value={margem} onChange={e => setMargem(Number(e.target.value))} className={inputStyle} style={inputShadow} />
            <p className="text-xs text-muted-foreground mt-1">Percentual da receita usado como custo estimado.</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Custo Fixo Mensal (R$)</Label>
            <Input type="number" min={0} value={custoFixo} onChange={e => setCustoFixo(Number(e.target.value))} className={inputStyle} style={inputShadow} />
            <p className="text-xs text-muted-foreground mt-1">Aluguel, energia, internet, etc.</p>
          </div>
        </div>
      </motion.div>

      {/* Accent Color */}
      <motion.div className="surface-card rounded-lg p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Cor de Acento</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Escolha a cor secundária do sistema.</p>
        <div className="flex gap-3">
          {colorEntries.map(([key, color]) => (
            <button
              key={key}
              onClick={() => setAccentColor(key)}
              className={cn('w-10 h-10 rounded-md flex items-center justify-center transition-transform hover:scale-110', accentColor === key && 'ring-2 ring-offset-2 ring-offset-background')}
              style={{ backgroundColor: `hsl(${color.h}, ${color.s}, ${color.l})`, ...(accentColor === key ? { boxShadow: `0 0 0 2px hsl(${color.h}, ${color.s}, ${color.l})` } : {}) }}
              title={color.label}
            >
              {accentColor === key && <Check className="w-4 h-4 text-primary-foreground" strokeWidth={2} />}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveCompany} disabled={saving} className="accent-glow">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
