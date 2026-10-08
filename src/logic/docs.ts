import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Grn, Order, SigData } from '../data/types';
import { byCode, WT } from '../data/seed';
import { aed } from '../data/format';
import { sumExp, sumRec } from './grn';
import { deliveryOf, createdOf, valueOf } from './orders';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const sigSvg = (s?: SigData) =>
  s ? `<svg viewBox="0 0 ${s.w} ${s.h}" preserveAspectRatio="xMidYMax meet" style="width:100%;height:52px">${s.paths.map((d) => `<path d="${d}" stroke="#171A21" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>` : '';
const page = (title: string, body: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:A4;margin:14mm}body{font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;color:#171A21;margin:0;font-size:12px}
.brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #171A21;padding-bottom:12px}
.logo{font-weight:800;font-size:22px;color:#0090CB;letter-spacing:-.5px}.muted{color:#6A7280}h1{font-size:18px;margin:16px 0 8px}
table{width:100%;border-collapse:collapse;margin-top:8px}td,th{text-align:left;padding:6px 4px;border-bottom:1px solid #EEF0F4;vertical-align:top}th{color:#6A7280;font-weight:500}
.kv td:first-child{color:#6A7280;width:40%}.sig{display:flex;gap:24px;margin-top:28px}.sig>div{flex:1;border-top:1px solid #171A21;padding-top:6px}
.bar{height:40px;margin-top:24px;background:repeating-linear-gradient(90deg,#171A21 0 2px,transparent 2px 5px,#171A21 5px 6px,transparent 6px 10px,#171A21 10px 13px,transparent 13px 15px)}
.mono{font-family:Menlo,monospace;letter-spacing:.14em;text-align:center}.label{border:1px solid #DDE1E7;border-radius:10px;padding:12px;margin-top:12px;page-break-inside:avoid}
</style></head><body>${body}</body></html>`;

export function grnDocHtml(g: Grn, kind: 'vhr' | 'labels') {
  const no = kind === 'labels' ? `${g.no}-LBL` : `VHR-${g.no.slice(4)}`;
  const title = kind === 'labels' ? 'Package labels' : 'Valuable handling receipt';
  const head = `<div class="brand"><div><div class="logo">dnata</div><div class="muted">Valuable cargo vault, Dubai</div></div><div style="text-align:right"><b>${esc(no)}</b><div class="muted">${esc(g.updated)}</div></div></div><h1>${title}</h1>`;
  if (kind === 'labels') {
    return page(no, head + g.lines.map((l) => `<div class="label"><div class="muted">Package label</div><b>${esc(l.name)}</b><div class="bar"></div><div class="mono">${esc(l.pkgId)}</div>
      <table><tr><th>Lot</th><th>Weight</th><th>Seal</th></tr><tr><td>${esc(l.lot || '—')}</td><td>${l.weight ? esc(l.weight) + ' kg' : '—'}</td><td>${esc(l.seal || '—')}</td></tr></table></div>`).join(''));
  }
  const kv: [string, string][] = [['GRN', g.no], ['Customer', g.customer], ['Customer ID', g.custId], ['PO number', g.po], ['Facility', g.facility],
    ['Vault / bin', g.vault === '—' ? '—' : `${g.vault} · ${g.bin}`], ['Supplier', g.handover?.supplier ?? '—'], ['Vehicle', g.handover?.vehicle ?? '—'], ['Pieces received', `${sumRec(g)} of ${sumExp(g)}`]];
  return page(no, head + `<table class="kv">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <h1 style="font-size:14px">Line detail</h1><table><tr><th>Item</th><th>Detail</th><th>Qty</th></tr>${g.lines.map((l) => `<tr><td>${esc(l.name)}</td><td class="muted">${esc([l.code, l.lot, l.seal, l.bars.join(' / ')].filter(Boolean).join(' · '))}</td><td>${l.received ?? l.exp} ${esc(l.pack)}</td></tr>`).join('')}</table>
    <div class="sig"><div>${sigSvg(g.signature?.sig)}Released by<div class="muted">${esc(g.signature?.approver ?? '')}</div></div><div>Received by<div class="muted">${esc(g.handover?.driver ?? '')}</div></div></div>
    <div class="bar"></div><div class="mono">${esc(no)}</div>`);
}

export function podHtml(d: Order) {
  const p = d.pod, dsp = d.dispatch ?? {}, x = d.extra ?? {};
  const f: [string, string][] = [['Order', d.no], ['Customer', d.customer], ['Recipient', p?.recipient || dsp.recipient || x.recipient || '—'], ['Delivery', deliveryOf(d)],
    ['Created', createdOf(d)], ['Value', valueOf(d)], ['AWB', x.awb || dsp.cNum || '—'], ['Handover', dsp.hTo || dsp.carrier || '—']];
  const items = d.items.map((it) => { const c = byCode(it.code); return `<tr><td>${esc(it.name.split(' · ')[0])}</td><td>${it.qty}</td><td>${Math.round((WT[it.code] || 0) * it.qty * 1000) / 1000} kg</td><td>${c ? aed(c.price * it.qty) : '—'}</td></tr>`; }).join('');
  return page(`POD ${d.no}`, `<div class="brand"><div><div class="logo">dnata</div><div class="muted">dnata valuable cargo · Vault operations</div></div><div style="text-align:right"><b>${esc(d.status)}</b><div class="muted">${esc(p?.at ?? '')}</div></div></div>
    <h1>Proof of delivery</h1><table class="kv">${f.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <h1 style="font-size:14px">Items delivered</h1><table><tr><th>Item</th><th>Qty</th><th>Weight</th><th>Value</th></tr>${items}<tr><td colspan="3"><b>Declared value</b></td><td><b>${esc(valueOf(d))}</b></td></tr></table>
    <div class="sig"><div>${sigSvg(dsp.sigImg)}Released by (dnata)<div class="muted">${esc(dsp.signedBy || dsp.staff || '')}</div></div><div>${sigSvg(p?.sigImg)}Received by (recipient)<div class="muted">${esc(p?.recipient || dsp.recipient || '')}</div></div></div>`);
}

/** Opens the system print dialog (AirPrint / Android print service). */
export async function printHtml(html: string) {
  await Print.printAsync({ html });
}

/** Renders a PDF and opens the system share sheet. */
export async function shareHtml(html: string, name: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
}
