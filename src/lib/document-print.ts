import { companySettingsService, customersService, quotesService, ordersService } from "@/services";

type DocKind = "orcamento" | "pedido";

type DocItem = {
  ordem: number;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  preco_unitario: number;
  desconto: number;
  total: number;
};

type DocData = {
  kind: DocKind;
  numero: string;
  status: string;
  data_emissao: string;
  data_validade?: string | null;
  prazo_entrega?: string | null;
  condicoes_pagamento?: string | null;
  observacoes?: string | null;
  assinatura_nome?: string | null;
  assinatura_cargo?: string | null;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  customer_id: string;
  items: DocItem[];
  quote_numero?: string | null; // for pedido
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function fetchCompany() {
  return companySettingsService.getAny();
}

async function fetchCustomer(id: string) {
  return customersService.getById(id);
}

function buildAddress(o: Record<string, unknown> | null) {
  if (!o) return "";
  const parts = [
    [o.endereco, o.numero].filter(Boolean).join(", "),
    o.complemento,
    o.bairro,
    [o.cidade, o.uf].filter(Boolean).join(" - "),
    o.cep ? `CEP ${o.cep}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function renderHTML(data: DocData, company: any, customer: any) {
  const primary = company?.cor_primaria || "#00AEEF";
  const title = data.kind === "orcamento" ? "ORÇAMENTO" : "PEDIDO";
  const companyName = company?.nome_fantasia || company?.razao_social || "Sua Empresa";
  const companyLine2 = company?.razao_social && company?.nome_fantasia
    ? company.razao_social
    : "";
  const companyContact = [
    company?.telefone,
    company?.whatsapp && `WhatsApp: ${company.whatsapp}`,
    company?.email,
    company?.site,
  ].filter(Boolean).join(" · ");
  const companyDocs = [
    company?.cnpj && `CNPJ ${company.cnpj}`,
    company?.inscricao_estadual && `IE ${company.inscricao_estadual}`,
    company?.inscricao_municipal && `IM ${company.inscricao_municipal}`,
  ].filter(Boolean).join(" · ");

  const customerName = customer?.nome ?? "—";
  const customerDoc = customer?.cpf_cnpj ? `${customer.tipo === "pj" ? "CNPJ" : "CPF"}: ${customer.cpf_cnpj}` : "";
  const customerContact = [customer?.telefone, customer?.whatsapp, customer?.email].filter(Boolean).join(" · ");

  const itemsRows = data.items
    .sort((a, b) => a.ordem - b.ordem)
    .map(
      (it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(it.descricao)}</td>
        <td class="c">${Number(it.quantidade)} ${esc(it.unidade || "")}</td>
        <td class="r">${fmtBRL(Number(it.preco_unitario))}</td>
        <td class="r">${fmtBRL(Number(it.desconto))}</td>
        <td class="r">${fmtBRL(Number(it.total))}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title} ${esc(data.numero)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1E1E1E; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 36px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 4px solid ${primary}; padding-bottom: 16px; }
  .brand { display: flex; gap: 16px; align-items: center; }
  .brand img { max-height: 72px; max-width: 180px; object-fit: contain; }
  .brand .name { font-size: 20px; font-weight: 700; }
  .brand .sub { font-size: 11px; color: #555; }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 22px; letter-spacing: 2px; color: ${primary}; }
  .doc-title .num { font-size: 18px; font-weight: 700; }
  .doc-title .meta { font-size: 11px; color: #555; margin-top: 4px; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; background: ${primary}; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 14px; }
  .card h3 { margin: 0 0 6px 0; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .card .val { font-size: 13px; }
  .card .val strong { display: block; margin-bottom: 2px; font-size: 14px; }
  .card .sub { font-size: 11px; color: #555; margin-top: 3px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  table.items thead th { background: #1E1E1E; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.items tbody td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  table.items tbody tr:nth-child(even) td { background: #fafafa; }
  table.items .c { text-align: center; }
  table.items .r { text-align: right; }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; font-size: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.total { border-top: 2px solid ${primary}; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; color: ${primary}; }
  .terms { margin-top: 24px; }
  .terms h3 { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 1px; margin: 12px 0 4px; }
  .terms p { margin: 0; font-size: 12px; white-space: pre-wrap; }
  .signature { margin: 56px auto 0; width: 320px; text-align: center; }
  .signature-line { border-top: 1px solid #1E1E1E; margin-bottom: 6px; }
  .signature-name { font-size: 12px; font-weight: 600; }
  .signature-role { font-size: 11px; color: #555; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 10px; color: #666; text-align: center; white-space: pre-wrap; }
  .actions { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
  .actions button { background: ${primary}; color: #fff; border: 0; padding: 8px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .actions button.secondary { background: #1E1E1E; }
  @media print {
    .actions { display: none; }
    .page { padding: 0; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button class="secondary" onclick="window.close()">Fechar</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${company?.logo_url ? `<img src="${esc(company.logo_url)}" alt="logo" />` : ""}
        <div>
          <div class="name">${esc(companyName)}</div>
          ${companyLine2 ? `<div class="sub">${esc(companyLine2)}</div>` : ""}
          ${companyDocs ? `<div class="sub">${esc(companyDocs)}</div>` : ""}
          <div class="sub">${esc(buildAddress(company))}</div>
          ${companyContact ? `<div class="sub">${esc(companyContact)}</div>` : ""}
        </div>
      </div>
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="num">Nº ${esc(data.numero)}</div>
        <div class="meta">Emissão: ${fmtDate(data.data_emissao)}</div>
        ${data.kind === "orcamento" ? `<div class="meta">Validade: ${fmtDate(data.data_validade)}</div>` : ""}
        ${data.quote_numero ? `<div class="meta">Orçamento: ${esc(data.quote_numero)}</div>` : ""}
        <div class="status">${esc(data.status)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Cliente</h3>
        <div class="val"><strong>${esc(customerName)}</strong></div>
        ${customerDoc ? `<div class="sub">${esc(customerDoc)}</div>` : ""}
        ${customer?.contato_nome ? `<div class="sub">Contato: ${esc(customer.contato_nome)}</div>` : ""}
        ${customerContact ? `<div class="sub">${esc(customerContact)}</div>` : ""}
        <div class="sub">${esc(buildAddress(customer))}</div>
      </div>
      <div class="card">
        <h3>Condições</h3>
        <div class="val"><strong>Prazo de entrega</strong>${esc(data.prazo_entrega || "—")}</div>
        <div class="sub"><strong>Pagamento:</strong> ${esc(data.condicoes_pagamento || "—")}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Descrição</th>
          <th class="c" style="width:90px">Qtd</th>
          <th class="r" style="width:110px">Unitário</th>
          <th class="r" style="width:100px">Desconto</th>
          <th class="r" style="width:120px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888">Sem itens</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${fmtBRL(data.subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>- ${fmtBRL(data.desconto)}</span></div>
      <div class="row"><span>Acréscimo</span><span>+ ${fmtBRL(data.acrescimo)}</span></div>
      <div class="row total"><span>TOTAL</span><span>${fmtBRL(data.total)}</span></div>
    </div>

    ${data.observacoes ? `<div class="terms"><h3>Observações</h3><p>${esc(data.observacoes)}</p></div>` : ""}

    ${
      data.assinatura_nome || data.assinatura_cargo
        ? `<div class="signature">
             <div class="signature-line"></div>
             <div class="signature-name">${esc(data.assinatura_nome || "")}</div>
             ${data.assinatura_cargo ? `<div class="signature-role">${esc(data.assinatura_cargo)}</div>` : ""}
           </div>`
        : ""
    }

    <div class="footer">${esc(company?.texto_rodape_pdf || `${companyName} · Documento gerado em ${new Date().toLocaleString("pt-BR")}`)}</div>
  </div>
</body>
</html>`;
}

async function openDoc(data: DocData, autoPrint: boolean) {
  const [company, customer] = await Promise.all([fetchCompany(), fetchCustomer(data.customer_id)]);
  const html = renderHTML(data, company, customer);
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    alert("Permita popups para gerar o documento.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  if (autoPrint) {
    // wait for images to load
    win.onload = () => setTimeout(() => win.print(), 300);
  }
}

export async function printQuote(quoteId: string, autoPrint = true) {
  const q = await quotesService.getById(quoteId);
  const items = await quotesService.listItems(quoteId);
  await openDoc(
    {
      kind: "orcamento",
      numero: q.numero,
      status: q.status,
      data_emissao: q.data_emissao,
      data_validade: q.data_validade,
      prazo_entrega: q.prazo_entrega,
      condicoes_pagamento: q.condicoes_pagamento,
      observacoes: q.observacoes,
      assinatura_nome: (q as any).assinatura_nome ?? null,
      assinatura_cargo: (q as any).assinatura_cargo ?? null,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      acrescimo: Number(q.acrescimo),
      total: Number(q.total),
      customer_id: q.customer_id,
      items: items as DocItem[],
    },
    autoPrint,
  );
}

export async function printOrder(orderId: string, autoPrint = true) {
  const o = await ordersService.getByIdWithQuote(orderId);
  const items = await ordersService.listItems(orderId);
  await openDoc(
    {
      kind: "pedido",
      numero: o.numero,
      status: o.status,
      data_emissao: o.data_emissao,
      prazo_entrega: o.prazo_entrega,
      condicoes_pagamento: o.condicoes_pagamento,
      observacoes: o.observacoes,
      assinatura_nome: (o as any).assinatura_nome ?? null,
      assinatura_cargo: (o as any).assinatura_cargo ?? null,
      subtotal: Number(o.subtotal),
      desconto: Number(o.desconto),
      acrescimo: Number(o.acrescimo),
      total: Number(o.total),
      customer_id: o.customer_id,
      items: items as DocItem[],
      quote_numero: o.quotes?.numero ?? null,
    },
    autoPrint,
  );
}
