import React, { forwardRef } from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { statusLabels, type OrderStatus } from '@/lib/mock-data';
import { decodeProblema } from '@/lib/checklist-utils';

type ServiceOrder = Tables<'service_orders'>;

interface PrintOrderProps {
  order: ServiceOrder;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
  };
}

const defaultCompany = {
  name: 'TechAssist — Assistência Técnica',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
};

export const PrintOrderView = forwardRef<HTMLDivElement, PrintOrderProps>(
  ({ order, companyInfo = defaultCompany }, ref) => {
    const statusLabel = statusLabels[order.status as OrderStatus] || order.status;
    const today = new Date().toLocaleDateString('pt-BR');
    const valor = Number(order.valor);
    const custosPecas = 0;
    const desconto = 0;
    const total = valor + custosPecas - desconto;
    const decoded = decodeProblema(order.problema);

    return (
      <div ref={ref} className="print-page bg-background text-foreground">
        <div className="max-w-[210mm] mx-auto p-8 space-y-6 text-sm" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

          {/* === HEADER === */}
          <div className="print-section print-header flex justify-between items-start border-b-2 border-foreground pb-4">
            <div className="flex items-start gap-3">
              {companyInfo.logo_url && (
                <img src={companyInfo.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded-md" />
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight">{companyInfo.name}</h1>
                {companyInfo.address && <p className="text-xs text-muted-foreground mt-1">{companyInfo.address}</p>}
                <p className="text-xs text-muted-foreground">
                  {companyInfo.phone && `Tel: ${companyInfo.phone}`}
                  {companyInfo.phone && companyInfo.email && ' · '}
                  {companyInfo.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Data de emissão: {today}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="section-title mb-1">Ordem de Serviço</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{order.codigo}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {statusLabel}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entrada: {new Date(order.data_entrada).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* === CLIENT INFO === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Informações do Cliente</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <Field label="Nome" value={order.cliente} />
              <Field label="Telefone" value={order.telefone} />
            </div>
          </div>

          {/* === DEVICE INFO === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Informações do Aparelho</h2>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
              <Field label="Tipo" value={order.aparelho} />
              <Field label="Marca" value={order.marca} />
              <Field label="Modelo" value={order.modelo} />
            </div>
          </div>

          {/* === CHECKLIST PROBLEMS === */}
          {decoded.checklist.length > 0 && (
            <div className="print-section">
              <h2 className="section-title mb-3 pb-1 border-b border-border">Problemas Identificados</h2>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1.5">
                {decoded.checklist.map((problem) => (
                  <div key={problem} className="flex items-center gap-2 text-sm">
                    <span className="text-primary font-bold">☑</span>
                    <span>{problem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === PROBLEM === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Problema Relatado pelo Cliente</h2>
            <div className="surface-elevated rounded-md p-3 min-h-[60px] text-sm">
              {decoded.freeText || 'Nenhum problema informado.'}
            </div>
          </div>

          {/* === DIAGNOSIS === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Diagnóstico Técnico</h2>
            <div className="surface-elevated rounded-md p-3 min-h-[50px] text-sm">
              <span className="text-xs text-muted-foreground block mb-1">Análise / Causa do problema:</span>
              {order.observacoes || '—'}
            </div>
          </div>

          {/* === MAINTENANCE CONTROL === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Controle da Manutenção</h2>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
              <Field label="Técnico Responsável" value={order.tecnico} />
              <Field label="Hora de Início" value={order.hora_inicio || '—'} />
              <Field label="Hora de Finalização" value={order.hora_final || '—'} />
              <Field label="Status Final" value={statusLabel} />
            </div>
          </div>

          {/* === FINANCIAL === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Resumo Financeiro</h2>
            <div className="surface-elevated rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <FinRow label="Valor do Serviço" value={valor} />
                  <FinRow label="Valor de Peças" value={custosPecas} />
                  <FinRow label="Desconto" value={-desconto} />
                  <tr className="border-t-2 border-foreground/20">
                    <td className="px-3 py-2 font-semibold">Valor Total</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-lg">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* === TERMS === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Termos e Condições</h2>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>A assistência técnica não se responsabiliza por aparelhos que já apresentem sinais de violação ou danos internos anteriores.</li>
              <li>Equipamentos não retirados após 90 (noventa) dias poderão ser descartados conforme legislação vigente.</li>
              <li>A garantia do serviço cobre exclusivamente o reparo realizado, conforme descrito nesta ordem.</li>
              <li>Problemas não relacionados ao serviço executado não estão cobertos pela garantia.</li>
              <li>A retirada do equipamento deve ser feita mediante apresentação deste documento ou documento de identidade.</li>
            </ol>
          </div>

          {/* === WARRANTY === */}
          <div className="print-section">
            <h2 className="section-title mb-3 pb-1 border-b border-border">Garantia do Serviço</h2>
            <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
              <p><strong className="text-foreground">Prazo:</strong> 90 (noventa) dias a partir da data de conclusão do serviço.</p>
              <p><strong className="text-foreground">Condições:</strong> A garantia é válida somente para o serviço descrito nesta ordem de serviço.</p>
              <p><strong className="text-foreground">Situações que anulam a garantia:</strong> Mau uso, queda, contato com líquidos, tentativa de reparo por terceiros, violação de lacre.</p>
            </div>
          </div>

          {/* === SIGNATURES === */}
          <div className="print-section mt-12">
            <div className="grid grid-cols-2 gap-16">
              <div className="text-center">
                <div className="border-t border-foreground mt-16 pt-2">
                  <p className="text-xs font-medium">Assinatura do Cliente</p>
                  <p className="text-xs text-muted-foreground">{order.cliente}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-foreground mt-16 pt-2">
                  <p className="text-xs font-medium">Assinatura do Técnico</p>
                  <p className="text-xs text-muted-foreground">{order.tecnico || '—'}</p>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">Data: ____/____/________</p>
          </div>

          {/* === FOOTER === */}
          <div className="print-section border-t border-border pt-4 mt-8 text-center">
            <p className="text-xs text-muted-foreground italic">"Obrigado por confiar em nossa assistência técnica."</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{companyInfo.name}</p>
            {(companyInfo.phone || companyInfo.email) && (
              <p className="text-xs text-muted-foreground">
                {companyInfo.phone && `Tel: ${companyInfo.phone}`}
                {companyInfo.phone && companyInfo.email && ' · '}
                {companyInfo.email}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

PrintOrderView.displayName = 'PrintOrderView';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}:</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function FinRow({ label, value }: { label: string; value: number }) {
  return (
    <tr className="border-b border-border/50">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">
        {value < 0 ? '- ' : ''}R$ {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  );
}
