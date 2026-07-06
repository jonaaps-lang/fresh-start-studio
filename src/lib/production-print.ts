// -----------------------------------------------------------------------------
// Impressão da Ordem de Produção.
// Reutiliza companySettingsService para logotipo, cores e dados institucionais.
// QR Code e código de barras estão previstos no template (data-* placeholders)
// — as libs serão plugadas quando o Motor de Configuração habilitar.
// -----------------------------------------------------------------------------
import { companySettingsService, customersService, productionService } from "@/services";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export async function printProductionOrder(opId: string, autoPrint = true) {
  const [op, items, timeEntries, attachments, company] = await Promise.all([
    productionService.getById(opId),
    productionService.listItems(opId),
    productionService.listTimeEntries(opId),
    productionService.listAttachments(opId),
    companySettingsService.getAny(),
  ]);
  const customer = op.customer_id ? await customersService.getById(op.customer_id) : null;

  const primary = (company as { cor_primaria?: string })?.cor_primaria || "#00AEEF";
  const companyName =
    (company as { nome_fantasia?: string; razao_social?: string })?.nome_fantasia ||
    (company as { razao_social?: string })?.razao_social || "Empresa";
  const logo = (company as { logo_url?: string })?.logo_url;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>OP ${esc(op.numero)}</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color:#111; }
header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid ${primary}; padding-bottom: 12px; }
header .logo { max-height: 60px; }
header h1 { margin:0; color:${primary}; font-size:22px; letter-spacing:2px;}
.doc-num { font-size:14px; color:#555; }
section { margin-top: 18px; }
h2 { font-size:13px; text-transform:uppercase; letter-spacing:1px; color:${primary}; border-bottom:1px solid #eee; padding-bottom:4px; }
.grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
.grid div span { color:#666; }
table { width:100%; border-collapse:collapse; font-size:13px; margin-top:6px; }
th,td { border:1px solid #ddd; padding:6px 8px; text-align:left; }
th { background:#f8fafc; }
.badge { display:inline-block; padding:2px 8px; border-radius:12px; background:${primary}20; color:${primary}; font-size:11px; font-weight:600; text-transform:uppercase; }
.qr-slot, .barcode-slot { border:1px dashed #ccc; padding:8px; text-align:center; color:#999; font-size:11px; }
.footer { margin-top:32px; display:flex; justify-content:space-between; font-size:12px; color:#555; }
.sign { margin-top:60px; border-top:1px solid #333; padding-top:4px; width:260px; text-align:center; }
@media print { body { margin: 12mm; } .no-print { display:none; } }
</style></head><body>
<header>
  <div>
    ${logo ? `<img class="logo" src="${esc(logo)}" alt="logo"/>` : `<strong style="font-size:18px">${esc(companyName)}</strong>`}
    <div style="font-size:11px;color:#555;margin-top:4px">${esc(companyName)}</div>
  </div>
  <div style="text-align:right">
    <h1>ORDEM DE PRODUÇÃO</h1>
    <div class="doc-num">Nº <strong>${esc(op.numero)}</strong></div>
    <div class="doc-num">Emissão: ${fmtDate(op.created_at)}</div>
  </div>
</header>

<section>
  <div class="grid">
    <div><span>Cliente:</span> <strong>${esc(customer?.nome ?? op.customers?.nome ?? "—")}</strong></div>
    <div><span>Pedido:</span> ${esc(op.orders?.numero ?? "—")}</div>
    <div><span>Prioridade:</span> <span class="badge">${esc(op.prioridade)}</span></div>
    <div><span>Setor:</span> ${esc(op.setor ?? "—")}</div>
    <div><span>Prazo:</span> ${fmtDate(op.prazo_producao)}</div>
    <div><span>Previsão:</span> ${fmtDate(op.data_prevista)}</div>
  </div>
</section>

${op.descricao_servico ? `<section><h2>Descrição do serviço</h2><div style="font-size:13px;white-space:pre-wrap">${esc(op.descricao_servico)}</div></section>` : ""}

${items.length ? `<section><h2>Itens</h2>
<table><thead><tr><th>#</th><th>Descrição</th><th style="text-align:right">Qtd</th><th>Un.</th></tr></thead>
<tbody>${items.map((it) => `<tr><td>${it.ordem}</td><td>${esc(it.descricao)}</td><td style="text-align:right">${it.quantidade}</td><td>${esc(it.unidade ?? "")}</td></tr>`).join("")}</tbody></table></section>` : ""}

${attachments.length ? `<section><h2>Anexos</h2><ul style="font-size:12px;margin:4px 0;padding-left:16px">${attachments.map((a) => `<li>${esc(a.nome)}</li>`).join("")}</ul></section>` : ""}

${timeEntries.length ? `<section><h2>Apontamentos</h2>
<table><thead><tr><th>Quando</th><th>Tipo</th><th>Motivo</th><th>Observação</th></tr></thead>
<tbody>${timeEntries.slice(0, 20).map((t) => `<tr><td>${new Date(t.occurred_at).toLocaleString("pt-BR")}</td><td>${esc(t.tipo)}</td><td>${esc(t.motivo ?? "")}</td><td>${esc(t.observacao ?? "")}</td></tr>`).join("")}</tbody></table></section>` : ""}

${op.observacoes ? `<section><h2>Observações</h2><div style="font-size:13px;white-space:pre-wrap">${esc(op.observacoes)}</div></section>` : ""}

<section style="display:flex;gap:16px;align-items:flex-start">
  <div style="flex:1"><div class="sign">Responsável pela produção</div></div>
  <div style="width:120px" class="qr-slot" data-qr="${esc(op.id)}">QR Code<br/>(config)</div>
  <div style="width:180px" class="barcode-slot" data-barcode="${esc(op.numero)}">Código de barras<br/>(config)</div>
</section>

<div class="footer">
  <div>Gerado em ${new Date().toLocaleString("pt-BR")}</div>
  <div>${esc(companyName)}</div>
</div>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (autoPrint) setTimeout(() => w.print(), 400);
}
