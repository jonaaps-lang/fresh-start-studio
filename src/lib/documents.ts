// -----------------------------------------------------------------------------
// Motor de Documentos (fachada única)
// -----------------------------------------------------------------------------
// Camada única responsável por abrir/imprimir qualquer documento do ERP.
// Todo módulo que precise gerar PDF/impressão/compartilhamento deve usar
// APENAS este arquivo — nunca `window.open` direto nem HTML solto.
//
// O motor:
//   - Recebe HTML já montado (cada módulo compõe seu template)
//   - Abre em nova janela, dispara impressão opcional
//   - Preserva ganchos futuros: WhatsApp, e-mail, QR Code, marca d'água
//
// Templates atuais (todos passam por este motor):
//   - printQuote / printOrder  → src/lib/document-print.ts
//   - printProductionOrder     → src/lib/production-print.ts
//   - printFinanceTitle        → abaixo
//
// Motor de Configuração alimenta cabeçalho/rodapé/assinatura via
// company_settings + app_settings.documentos.
// -----------------------------------------------------------------------------

import { companySettingsService, financeService } from "@/services";

export type DocumentOpenOptions = {
  title?: string;
  autoPrint?: boolean;
  windowFeatures?: string;
};

export function openDocument(html: string, opts: DocumentOpenOptions = {}) {
  const win = window.open("", "_blank", opts.windowFeatures ?? "width=900,height=1000");
  if (!win) {
    alert("Permita popups para gerar o documento.");
    return null;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  if (opts.title) win.document.title = opts.title;
  if (opts.autoPrint) {
    win.onload = () => setTimeout(() => win.print(), 300);
  }
  return win;
}

// -----------------------------------------------------------------------------
// Helpers compartilhados (usados pelos templates)
// -----------------------------------------------------------------------------
export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// -----------------------------------------------------------------------------
// Template: Recibo de Título Financeiro
// -----------------------------------------------------------------------------
export async function printFinanceTitle(titleId: string, autoPrint = true) {
  const [company, title, installments, payments] = await Promise.all([
    companySettingsService.getAny(),
    financeService.getTitle(titleId),
    financeService.listInstallments(titleId),
    financeService.listPayments(titleId),
  ]);

  const primary = (company as { cor_primaria?: string } | null)?.cor_primaria || "#00AEEF";
  const cn = (company as { nome_fantasia?: string; razao_social?: string } | null);
  const companyName = cn?.nome_fantasia || cn?.razao_social || "Sua Empresa";
  const kindLabel = title.tipo === "receivable" ? "CONTA A RECEBER" : "CONTA A PAGAR";
  const parte = title.customers?.nome ?? title.suppliers?.razao_social ?? "—";

  const rows = installments
    .map((p) => {
      const pago = Number(p.valor) - Number(p.saldo);
      const status = p.saldo <= 0 ? "Quitada" : pago > 0 ? "Parcial" : "Aberta";
      return `<tr>
        <td class="c">${p.numero_parcela}</td>
        <td class="c">${fmtDate(p.vencimento)}</td>
        <td class="r">${fmtBRL(p.valor)}</td>
        <td class="r">${fmtBRL(pago)}</td>
        <td class="r">${fmtBRL(p.saldo)}</td>
        <td class="c">${status}</td>
      </tr>`;
    })
    .join("");

  const paysRows = payments.length
    ? payments
        .map(
          (p) => `<tr>
      <td>${fmtDate(p.data_pagamento)}</td>
      <td>${esc(p.forma_pagamento || "—")}</td>
      <td class="r">${fmtBRL(p.valor)}</td>
      <td>${esc(p.observacao || "")}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="c" style="color:#888;padding:16px">Nenhum pagamento registrado</td></tr>`;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>${kindLabel} ${esc(title.numero)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1E1E1E; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 36px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:4px solid ${primary}; padding-bottom:14px; }
  .brand .name { font-size: 20px; font-weight: 700; }
  .doc-title h1 { margin:0; font-size:20px; letter-spacing:2px; color:${primary}; }
  .doc-title .num { font-size:16px; font-weight:700; }
  .doc-title .meta { font-size:11px; color:#555; margin-top:2px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:18px; }
  .card { border:1px solid #e5e5e5; border-radius:6px; padding:12px 14px; font-size:12px; }
  .card h3 { margin:0 0 4px; font-size:10px; text-transform:uppercase; color:#666; letter-spacing:1px; }
  table { width:100%; border-collapse:collapse; margin-top:16px; font-size:12px; }
  th { background:#1E1E1E; color:#fff; text-align:left; padding:8px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
  td { padding:8px 10px; border-bottom:1px solid #eee; }
  tr:nth-child(even) td { background:#fafafa; }
  .c { text-align:center; } .r { text-align:right; }
  .totals { margin:16px 0 0 auto; width:320px; font-size:12px; }
  .totals .row { display:flex; justify-content:space-between; padding:4px 0; }
  .totals .row.total { border-top:2px solid ${primary}; margin-top:6px; padding-top:8px; font-size:16px; font-weight:700; color:${primary}; }
  .footer { margin-top:28px; padding-top:12px; border-top:1px solid #e5e5e5; font-size:10px; color:#666; text-align:center; }
  .actions { position:fixed; top:12px; right:12px; display:flex; gap:8px; }
  .actions button { background:${primary}; color:#fff; border:0; padding:8px 14px; border-radius:4px; font-size:12px; cursor:pointer; }
  .actions button.secondary { background:#1E1E1E; }
  @media print { .actions { display:none; } .page { padding:0; } @page { margin:12mm; } }
</style></head><body>
  <div class="actions">
    <button onclick="window.print()">Imprimir / PDF</button>
    <button class="secondary" onclick="window.close()">Fechar</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="name">${esc(companyName)}</div>
        <div style="font-size:11px;color:#555">${esc((cn as { cnpj?: string } | null)?.cnpj || "")}</div>
      </div>
      <div class="doc-title" style="text-align:right">
        <h1>${kindLabel}</h1>
        <div class="num">Nº ${esc(title.numero)}</div>
        <div class="meta">Emissão: ${fmtDate(title.data_emissao)}</div>
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <h3>${title.tipo === "receivable" ? "Cliente" : "Fornecedor"}</h3>
        <div><strong>${esc(parte)}</strong></div>
        ${title.orders?.numero ? `<div>Pedido: ${esc(title.orders.numero)}</div>` : ""}
        ${title.finance_categories?.nome ? `<div>Categoria: ${esc(title.finance_categories.nome)}</div>` : ""}
      </div>
      <div class="card">
        <h3>Resumo</h3>
        <div>Valor total: <strong>${fmtBRL(title.valor_total)}</strong></div>
        <div>Saldo aberto: <strong>${fmtBRL(title.saldo)}</strong></div>
        ${title.descricao ? `<div style="margin-top:4px">${esc(title.descricao)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead><tr>
        <th class="c" style="width:40px">#</th>
        <th class="c">Vencimento</th>
        <th class="r">Valor</th>
        <th class="r">Pago</th>
        <th class="r">Saldo</th>
        <th class="c">Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <h3 style="margin-top:24px;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:1px">Pagamentos</h3>
    <table>
      <thead><tr>
        <th>Data</th><th>Forma</th><th class="r">Valor</th><th>Observação</th>
      </tr></thead>
      <tbody>${paysRows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Valor</span><span>${fmtBRL(title.valor_total)}</span></div>
      <div class="row"><span>Pago</span><span>${fmtBRL(Number(title.valor_total) - Number(title.saldo))}</span></div>
      <div class="row total"><span>SALDO</span><span>${fmtBRL(title.saldo)}</span></div>
    </div>

    ${title.observacoes ? `<div style="margin-top:20px;font-size:12px;white-space:pre-wrap"><strong>Observações:</strong> ${esc(title.observacoes)}</div>` : ""}

    <div class="footer">${esc(companyName)} · Documento gerado em ${new Date().toLocaleString("pt-BR")}</div>
  </div>
</body></html>`;

  openDocument(html, { title: `${kindLabel} ${title.numero}`, autoPrint });
}
