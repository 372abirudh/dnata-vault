import type { Grn, GrnLine, HistoryEvent, Order, OrderItem, PutawayRow, StockPackage } from './types';
import { MONTHS } from './format';

export const ME = 'Omar Farooq · Vault Officer';

// ─── Master data ────────────────────────────────────────

export const FACILITIES: Record<string, string[]> = {
  'DXB Vault North': ['Vault N-1', 'Vault N-2', 'Vault N-3'],
  'DWC Logistics Vault': ['Vault D-1', 'Vault D-2'],
  'Sharjah Annex': ['Vault S-1'],
  DAFZA: ['Vault F-1', 'Vault F-2'],
};
export const ORDER_FACILITIES = ['DXB Vault North', 'DWC Logistics Vault', 'Sharjah Annex'];

export type Staff = { id: string; name: string; role: string };
export const STAFF: Staff[] = [
  { id: 'EMP-2041', name: 'Rashid Al Marri', role: 'Vault Supervisor' },
  { id: 'EMP-2088', name: 'Leena Haddad', role: 'Intake Clerk' },
  { id: 'EMP-2110', name: 'Omar Farooq', role: 'Vault Officer' },
  { id: 'EMP-2152', name: 'Priya Nair', role: 'Cold-chain Officer' },
  { id: 'EMP-2199', name: 'Dana Al Suwaidi', role: 'Compliance Auditor' },
];
export const staffById = (id: string) => STAFF.find((s) => s.id === id);

export const PICKERS = ['Michael Williams', 'Omar Farooq', 'Priya Nair', 'Leena Haddad', 'Rashid Al Mansoori'];
export const SUPPLIERS = ["Brink's Global Services", 'Transguard Cash', 'Malca-Amit UAE', 'G4S Secure Logistics'];
export const BINS = ['A-01-04', 'A-04-17', 'B-02-09', 'C-01-01', 'D-03-12'];
export const PACKS: Record<string, number> = { 'Pack Of 50': 50, 'Pack Of 25': 25, 'Pack Of 10': 10, 'Pack Of 5': 5 };
export const ACCOUNTS = ['Customer main', 'Customer sub', 'Treasury'];
export const ORIGINS = ['Switzerland', 'United Arab Emirates', 'South Africa', 'India', 'United Kingdom'];
export const PACK_TYPES = ['Bar', 'Set', 'Box', 'Pouch', 'Case'];

// ─── Catalog & stock ────────────────────────────────────

export type CatalogItem = { code: string; name: string; unit: string; bin: string; price: number; pack: string; unitWt: number };
export const CATALOG: CatalogItem[] = [
  { code: 'BUL-9999-1KG', name: 'Gold Bar 1kg · 999.9 fine', unit: 'bars', bin: 'A-01-04', price: 290000, pack: 'Bar', unitWt: 1 },
  { code: 'BUL-9999-100G', name: 'Gold Bar 100g', unit: 'bars', bin: 'A-04-17', price: 29500, pack: 'Bar', unitWt: 0.1 },
  { code: 'COIN-SET-22K', name: 'Gold Coin Set · 22K (12pc)', unit: 'sets', bin: 'B-02-09', price: 36000, pack: 'Set', unitWt: 0.412 },
  { code: 'AG-999-5KG', name: 'Silver Bar 5kg', unit: 'bars', bin: 'C-01-01', price: 18500, pack: 'Bar', unitWt: 5 },
];
export const byCode = (c: string) => CATALOG.find((x) => x.code === c);
export const SHORT: Record<string, string> = { 'BUL-9999-1KG': 'Gold Bar 1kg', 'BUL-9999-100G': 'Gold Bar 100g', 'COIN-SET-22K': 'Coin Set 22K', 'AG-999-5KG': 'Silver Bar 5kg' };
export const WT: Record<string, number> = { 'BUL-9999-1KG': 1, 'BUL-9999-100G': 0.1, 'COIN-SET-22K': 0.412, 'AG-999-5KG': 5 };

/** Stock per item: [location, units]. */
export const STOCK: Record<string, [string, number][]> = {
  'BUL-9999-1KG': [['DWC · Vault D', 8], ['DXB · Vault B', 11]],
  'BUL-9999-100G': [['DXB · Vault B', 40]],
  'COIN-SET-22K': [['DWC · Vault D', 14]],
  'AG-999-5KG': [['DXB · Vault B', 6]],
};

export const facCode = (f: string) => (/^DWC/.test(f || '') ? 'DWC' : /^DXB/.test(f || '') ? 'DXB' : 'SHJ');
export const availAt = (code: string, f: string) =>
  (STOCK[code] || []).filter((v) => v[0].split(' · ')[0] === facCode(f)).reduce((s, v) => s + v[1], 0);

const pkCache: Record<string, StockPackage[]> = {};
/** Packages in stock for an item, oldest first (deterministic sample data, same algorithm as the prototype). */
export function pkgs(code: string): StockPackage[] {
  if (pkCache[code]) return pkCache[code];
  const size = ({ 'BUL-9999-1KG': 4, 'BUL-9999-100G': 10, 'COIN-SET-22K': 2, 'AG-999-5KG': 2 } as Record<string, number>)[code] || 4;
  const pre = ({ 'BUL-9999-1KG': 'ENT', 'BUL-9999-100G': 'EGH', 'COIN-SET-22K': 'CSK', 'AG-999-5KG': 'SLV' } as Record<string, string>)[code] || 'BAR';
  const base = new Date(2026, 1, 3).getTime();
  const seed = code.length * 7;
  const out: StockPackage[] = [];
  let k = 0, bar = 88001 + seed * 10;
  (STOCK[code] || [['DXB · Vault B', 8]]).forEach(([loc, n]) => {
    const fac = loc.split(' · ')[0];
    const vault = loc.split(' · ')[1] + ' — Bullion';
    for (let left = n; left > 0; left -= size) {
      const inPack = Math.min(size, left);
      const d = new Date(base + (k * 19 + seed) * 864e5);
      const bars: string[] = [];
      for (let b = 0; b < inPack; b++) bars.push(pre + '-' + bar++);
      out.push({
        date: String(d.getDate()).padStart(2, '0') + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear(), ts: d.getTime(),
        id: '49689940000' + String(88001 + seed * 3 + k).padStart(7, '0'), fac, vault, inPack, bars,
      });
      k++;
    }
  });
  out.sort((a, b) => a.ts - b.ts);
  pkCache[code] = out;
  return out;
}
export const pkgsAt = (code: string, f: string) => (code ? pkgs(code).filter((p) => p.fac === facCode(f)) : []);
export const defaultBars = (code: string, n: number, f: string) => {
  const out: string[] = [];
  pkgsAt(code, f).forEach((p) => p.bars.forEach((b) => { if (out.length < n) out.push(b); }));
  return out;
};

// ─── Sample goods receipts ──────────────────────────────

const ev = (k: string, t: string, a: string, ts: string, d = ''): HistoryEvent => ({ k, t, a, ts, d });

const line = (code: string, name: string, pack: string, exp: number, unitWt: number, pkgId: string): GrnLine => ({
  code, name, pack, exp, unitWt, pkgId, received: null, mode: null, packType: '', packages: '', lot: '', weight: '',
  l: '', w: '', h: '', origin: '', seal: '', bars: [],
});
const lines = (no: string, a: number, b: number) => [
  line('BUL-9999-1KG', 'Gold Bar 1kg · 999.9 fine', 'Bar', a, 1, `PKG-${no.slice(4)}-1`),
  line('COIN-SET-22K', 'Gold Coin Set · 22K (12pc)', 'Set', b, 0.412, `PKG-${no.slice(4)}-2`),
];
const cap = (l: GrnLine, v: Partial<GrnLine>) => Object.assign(l, { packType: '', packages: '' }, v);
const paRow = (pkg: string, pkgId: string, account: string, facility: string, vault: string, bin: string): PutawayRow =>
  ({ pkg, pkgId, account, facility, vault, pkgs: [{ no: `${pkgId}-01`, bin, bars: [] }] });

const grn = (g: Partial<Grn> & Pick<Grn, 'no' | 'customer' | 'custId' | 'po' | 'facility' | 'status' | 'lines' | 'history'>): Grn => ({
  txType: 'Contractual', inbound: 'Local', receiptMode: 'Counter', vaultType: 'Actual Vault', expected: '24 Sep 2026',
  createdBy: 'Leena Haddad', createdTime: '21 Sep 2026 · 08:12', updated: '21 Sep 2026 · 08:12', attachments: 2,
  vault: '—', bin: '—', assignee: '—', assigneeCode: '—', assigneeRole: '—', remarks: '—', filed: [], ...g,
});

export function seedGrns(): Grn[] {
  const g1 = grn({ no: 'GRN-0121', customer: 'Emirates Gold DMCC', custId: 'CT-0014', po: 'PO-88431', facility: 'DXB Vault North', status: 'Draft',
    lines: lines('GRN-0121', 25, 8), history: [ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '21 Sep 2026 · 08:12')] });

  const g2 = grn({ no: 'GRN-0120', customer: 'Al Fardan Exchange', custId: 'CT-0031', po: 'PO-88425', facility: 'DXB Vault North', status: 'Staff Assigned',
    inbound: 'Import', receiptMode: 'Airside', assignee: 'Omar Farooq', assigneeCode: 'EMP-2110', assigneeRole: 'Vault Officer',
    remarks: 'Airside pickup — dual custody required at gate.', lines: lines('GRN-0120', 40, 6), updated: '21 Sep 2026 · 08:40', history: [
      ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '21 Sep 2026 · 08:05'),
      ev('assign', 'Staff assigned', 'Rashid Al Marri · Vault Supervisor', '21 Sep 2026 · 08:40', 'Omar Farooq (EMP-2110) · Vault Officer — Airside pickup, dual custody required at gate.'),
    ] });

  const l3 = lines('GRN-0119', 30, 10);
  cap(l3[0], { received: 30, mode: 'individual', lot: 'LOT-4471', weight: '30.000', l: '32', w: '18', h: '14', origin: 'Switzerland', seal: 'SL-772041', bars: ['CH-0001', 'CH-0002', 'CH-0003'] });
  cap(l3[1], { received: 10, mode: 'package', packages: '2', packType: 'Pack Of 5', lot: 'LOT-4472', weight: '4.120', l: '24', w: '16', h: '9', origin: 'United Arab Emirates', seal: 'SL-772042', bars: ['AE-0410'] });
  const g3 = grn({ no: 'GRN-0119', customer: 'Damas Jewellery LLC', custId: 'CT-0052', po: 'PO-88410', facility: 'DWC Logistics Vault', status: 'Verified GRN',
    expected: '21 Sep 2026', assignee: 'Leena Haddad', assigneeCode: 'EMP-2088', assigneeRole: 'Intake Clerk', remarks: 'Counter intake, customer rep present.',
    updated: '21 Sep 2026 · 10:05', lines: l3,
    handover: { supplier: 'Malca-Amit UAE', driver: 'Samir Haddad', mobile: '+971 50 441 9022', vehicle: 'DXB A 41827', arrived: '21 Sep 2026 · 09:20' },
    history: [
      ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '20 Sep 2026 · 16:40'),
      ev('assign', 'Staff assigned', 'Rashid Al Marri · Vault Supervisor', '20 Sep 2026 · 17:02', 'Leena Haddad (EMP-2088) · Intake Clerk — Counter intake, customer rep present.'),
      ev('verify', 'Goods verified', 'Leena Haddad · Intake Clerk', '21 Sep 2026 · 10:05', '40 of 40 pieces received · 2 of 2 packages sealed'),
    ] });

  const l4 = lines('GRN-0118', 20, 5);
  cap(l4[0], { received: 20, mode: 'individual', lot: 'LOT-4402', weight: '20.000', l: '30', w: '18', h: '12', origin: 'South Africa', seal: 'SL-771880', bars: ['ZA-1180', 'ZA-1181'] });
  cap(l4[1], { received: 5, mode: 'package', packages: '1', packType: 'Pack Of 5', lot: 'LOT-4403', weight: '2.060', l: '20', w: '14', h: '8', origin: 'United Arab Emirates', seal: 'SL-771881', bars: ['AE-0388'] });
  const g4 = grn({ no: 'GRN-0118', customer: 'Standard Chartered Bank', custId: 'CUS-0107', po: 'PO-88394', facility: 'DXB Vault North', status: 'Signed',
    expected: '20 Sep 2026', assignee: 'Omar Farooq', assigneeCode: 'EMP-2110', assigneeRole: 'Vault Officer', remarks: 'Bank account — dual key A+B on release.',
    updated: '20 Sep 2026 · 10:32', lines: l4,
    handover: { supplier: "Brink's Global Services", driver: 'Yusuf Kareem', mobile: '+971 55 208 7714', vehicle: 'DXB J 22904', arrived: '20 Sep 2026 · 08:55' },
    signature: { approver: 'Rashid Al Marri', signedAt: '20 Sep 2026 · 10:32', doc: 'VHR-0118.pdf' },
    filed: [{ name: 'VHR-0118.pdf', meta: '20 Sep 2026 · 10:32 · 214 KB' }],
    history: [
      ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '19 Sep 2026 · 15:10'),
      ev('assign', 'Staff assigned', 'Rashid Al Marri · Vault Supervisor', '19 Sep 2026 · 15:35', 'Omar Farooq (EMP-2110) · Vault Officer — Bank account, dual key A+B on release.'),
      ev('verify', 'Goods verified', 'Omar Farooq · Vault Officer', '20 Sep 2026 · 09:48', '25 of 25 pieces received · 2 of 2 packages sealed'),
      ev('sign', 'Vault handover report signed', 'Rashid Al Marri · Vault Supervisor', '20 Sep 2026 · 10:32', 'Approved by Rashid Al Marri · VHR-0118.pdf'),
    ] });

  const l5 = lines('GRN-0117', 12, 4);
  cap(l5[0], { received: 12, mode: 'individual', lot: 'LOT-4360', weight: '12.000', l: '26', w: '16', h: '10', origin: 'Switzerland', seal: 'SL-771702', bars: ['CH-0912', 'CH-0913'] });
  cap(l5[1], { received: 4, mode: 'individual', lot: 'LOT-4361', weight: '1.648', l: '18', w: '12', h: '7', origin: 'India', seal: 'SL-771703', bars: ['IN-0220'] });
  const g5 = grn({ no: 'GRN-0117', customer: 'Mubarak Gems Trading', custId: 'CT-0077', po: 'PO-88377', facility: 'Sharjah Annex', status: 'Closed',
    expected: '19 Sep 2026', inbound: 'Re-export', vault: 'Vault S-1', bin: 'A-04-17', assignee: 'Dana Al Suwaidi', assigneeCode: 'EMP-2199',
    assigneeRole: 'Compliance Auditor', remarks: 'Re-export consignment, customs seal intact.', updated: '19 Sep 2026 · 11:15', lines: l5,
    handover: { supplier: 'Transguard Cash', driver: 'Ali Rahmani', mobile: '+971 52 330 1188', vehicle: 'SHJ B 10442', arrived: '19 Sep 2026 · 07:40' },
    signature: { approver: 'Dana Al Suwaidi', signedAt: '19 Sep 2026 · 09:58', doc: 'VHR-0117.pdf' },
    putaway: { code: 'PA-0042', status: 'Vault Assigned', ts: '19 Sep 2026 · 11:15', rows: [
      paRow('Gold Bar 1kg · 999.9 fine', 'PKG-0117-1', 'Customer main', 'Sharjah Annex', 'Vault S-1', 'A-04-17'),
      paRow('Gold Coin Set · 22K (12pc)', 'PKG-0117-2', 'Customer sub', 'Sharjah Annex', 'Vault S-1', 'B-02-09'),
    ] },
    filed: [{ name: 'VHR-0117.pdf', meta: '19 Sep 2026 · 09:58 · 208 KB' }, { name: 'PA-0042-allocation.pdf', meta: '19 Sep 2026 · 11:15 · 96 KB' }],
    history: [
      ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '18 Sep 2026 · 14:22'),
      ev('assign', 'Staff assigned', 'Rashid Al Marri · Vault Supervisor', '18 Sep 2026 · 14:50', 'Dana Al Suwaidi (EMP-2199) · Compliance Auditor — Re-export consignment, customs seal intact.'),
      ev('verify', 'Goods verified', 'Dana Al Suwaidi · Compliance Auditor', '19 Sep 2026 · 09:10', '16 of 16 pieces received · 2 of 2 packages sealed'),
      ev('sign', 'Vault handover report signed', 'Dana Al Suwaidi · Compliance Auditor', '19 Sep 2026 · 09:58', 'Approved by Dana Al Suwaidi · VHR-0117.pdf'),
      ev('putaway', 'Put away raised', 'Omar Farooq · Vault Officer', '19 Sep 2026 · 11:15', '2 packages · Vault S-1 / A-04-17 · Vault S-1 / B-02-09'),
    ] });

  const l6 = lines('GRN-0116', 18, 3);
  cap(l6[0], { received: 18, mode: 'individual', lot: 'LOT-4288', weight: '18.000', l: '30', w: '20', h: '15', origin: 'United Kingdom', seal: 'SL-771540', bars: ['UK-0044', 'UK-0045'] });
  cap(l6[1], { received: 3, mode: 'individual', lot: 'LOT-4289', weight: '1.236', l: '16', w: '12', h: '6', origin: 'United Arab Emirates', seal: 'SL-771541', bars: ['AE-0301'] });
  const g6 = grn({ no: 'GRN-0116', customer: 'PharmaLogix FZE', custId: 'CT-0090', po: 'PO-88350', facility: 'DWC Logistics Vault', status: 'Closed',
    expected: '17 Sep 2026', txType: 'Ad-hoc', vault: 'Vault D-2', bin: 'C-01-01', assignee: 'Priya Nair', assigneeCode: 'EMP-2152',
    assigneeRole: 'Cold-chain Officer', remarks: 'Cold chain 2–8 °C, logger attached.', updated: '17 Sep 2026 · 12:40', lines: l6,
    handover: { supplier: 'G4S Secure Logistics', driver: 'Noor Abbas', mobile: '+971 56 771 2245', vehicle: 'DXB K 77310', arrived: '17 Sep 2026 · 06:30' },
    signature: { approver: 'Priya Nair', signedAt: '17 Sep 2026 · 08:44', doc: 'VHR-0116.pdf' },
    putaway: { code: 'PA-0041', status: 'Vault Assigned', ts: '17 Sep 2026 · 10:02', rows: [
      paRow('Gold Bar 1kg · 999.9 fine', 'PKG-0116-1', 'Customer main', 'DWC Logistics Vault', 'Vault D-2', 'C-01-01'),
      paRow('Gold Coin Set · 22K (12pc)', 'PKG-0116-2', 'Treasury', 'DWC Logistics Vault', 'Vault D-2', 'D-03-12'),
    ] },
    filed: [{ name: 'VHR-0116.pdf', meta: '17 Sep 2026 · 08:44 · 201 KB' }, { name: 'PA-0041-allocation.pdf', meta: '17 Sep 2026 · 10:02 · 92 KB' }],
    history: [
      ev('create', 'GRN created', 'Leena Haddad · Intake Clerk', '16 Sep 2026 · 11:05'),
      ev('assign', 'Staff assigned', 'Rashid Al Marri · Vault Supervisor', '16 Sep 2026 · 11:30', 'Priya Nair (EMP-2152) · Cold-chain Officer — Cold chain 2–8 °C, logger attached.'),
      ev('verify', 'Goods verified', 'Priya Nair · Cold-chain Officer', '17 Sep 2026 · 07:55', '21 of 21 pieces received · 2 of 2 packages sealed'),
      ev('sign', 'Vault handover report signed', 'Priya Nair · Cold-chain Officer', '17 Sep 2026 · 08:44', 'Approved by Priya Nair · VHR-0116.pdf'),
      ev('putaway', 'Put away raised', 'Priya Nair · Cold-chain Officer', '17 Sep 2026 · 10:02', '2 packages · Vault D-2 / C-01-01 · Vault D-2 / D-03-12'),
      ev('close', 'GRN closed', 'Dana Al Suwaidi · Compliance Auditor', '17 Sep 2026 · 12:40'),
    ] });

  return [g1, g2, g3, g4, g5, g6];
}

// ─── Sample orders ──────────────────────────────────────

const I = (name: string, code: string, qty: number, unit: string, bin: string, picked = false): OrderItem => ({ name, code, qty, unit, bin, picked });
const O = (o: Partial<Order> & Pick<Order, 'no' | 'customer' | 'custId' | 'status' | 'dest' | 'release' | 'value' | 'items' | 'history'>): Order =>
  ({ pack: null, dispatch: null, facility: 'DXB Vault North', type: 'Release to customer', ...o });
const oe = (t: string, a: string, ts: string, d = ''): HistoryEvent => ({ t, a, ts, d });

export function seedOrders(): Order[] {
  const g1 = 'Gold Bar 1kg · 999.9 fine', cs = 'Gold Coin Set · 22K (12pc)';
  const lh = 'Leena Haddad · Intake Clerk', ra = 'Rashid Al Marri · Vault Supervisor', of = 'Omar Farooq · Vault Officer', pn = 'Priya Nair · Cold-chain Officer';
  return [
    O({ no: 'ORD-2208', customer: 'Emirates Gold DMCC', custId: 'CT-0014', status: 'Pending', dest: 'Gold Souk, Deira', release: '25 Sep 2026', value: 'AED 4.1M',
      items: [I(g1, 'BUL-9999-1KG', 12, 'bars', 'A-01-04'), I(cs, 'COIN-SET-22K', 4, 'sets', 'B-02-09')], history: [oe('Order created', lh, '24 Sep · 08:10')] }),
    O({ no: 'ORD-2207', customer: 'Al Fardan Exchange', custId: 'CT-0031', status: 'Allocated', dest: 'DXB Terminal 3 · Airside', release: '24 Sep 2026', value: 'AED 2.6M', type: 'Export',
      items: [I(g1, 'BUL-9999-1KG', 8, 'bars', 'A-04-17'), I('Silver Bar 5kg', 'AG-999-5KG', 6, 'bars', 'C-01-01'), I(cs, 'COIN-SET-22K', 2, 'sets', 'B-02-09')],
      history: [oe('Order created', lh, '23 Sep · 15:20'), oe('Order approved', ra, '23 Sep · 16:05', 'Dual approval A+B')] }),
    O({ no: 'ORD-2206', customer: 'Damas Jewellery LLC', custId: 'CT-0052', status: 'Picked', dest: 'Dubai Mall, Level 1', release: '24 Sep 2026', value: 'AED 980K', facility: 'DWC Logistics Vault',
      items: [I(cs, 'COIN-SET-22K', 6, 'sets', 'D-03-12'), I('Gold Bar 100g', 'BUL-9999-100G', 20, 'bars', 'A-01-04')],
      history: [oe('Order created', lh, '23 Sep · 10:02'), oe('Order approved', ra, '23 Sep · 11:30'), oe('Picking started', of, '24 Sep · 07:45')] }),
    O({ no: 'ORD-2205', customer: 'Standard Chartered Bank', custId: 'CUS-0107', status: 'Ready for dispatch', dest: 'DIFC Branch Vault', release: '24 Sep 2026', value: 'AED 6.8M',
      items: [I(g1, 'BUL-9999-1KG', 20, 'bars', 'A-04-17', true)],
      pack: { count: '2', weight: '20.840', seal: 'SL-882104', notes: 'Tamper-evident bag, dual-signed' },
      history: [oe('Order created', lh, '22 Sep · 14:00'), oe('Order approved', ra, '22 Sep · 15:10'), oe('Items picked', of, '24 Sep · 07:20', '1 line · 20 bars'),
        oe('Consignment packed', of, '24 Sep · 08:05', '2 packages · 20.840 kg · SL-882104')] }),
    O({ no: 'ORD-2204', customer: 'Mubarak Gems Trading', custId: 'CT-0077', status: 'Dispatched', dest: 'Sharjah Free Zone', release: '23 Sep 2026', value: 'AED 1.2M', facility: 'Sharjah Annex',
      items: [I(g1, 'BUL-9999-1KG', 5, 'bars', 'A-04-17', true)],
      pack: { count: '1', weight: '5.210', seal: 'SL-882077', notes: '' }, dispatch: { carrier: 'Transguard Cash', driver: 'Ali Rahmani', vehicle: 'SHJ B 10442' },
      history: [oe('Order created', lh, '22 Sep · 09:00'), oe('Order approved', 'Dana Al Suwaidi · Compliance Auditor', '22 Sep · 10:15'), oe('Items picked', of, '23 Sep · 08:00'),
        oe('Consignment packed', of, '23 Sep · 08:40'), oe('Dispatched', of, '23 Sep · 09:30', 'Transguard Cash · SHJ B 10442')] }),
    O({ no: 'ORD-2203', customer: 'PharmaLogix FZE', custId: 'CT-0090', status: 'Delivered', dest: 'JAFZA South', release: '21 Sep 2026', value: 'AED 310K', facility: 'DWC Logistics Vault',
      items: [I(cs, 'COIN-SET-22K', 3, 'sets', 'D-03-12', true)],
      pack: { count: '1', weight: '1.236', seal: 'SL-881990', notes: '' }, dispatch: { carrier: 'G4S Secure Logistics', driver: 'Noor Abbas', vehicle: 'DXB K 77310' },
      history: [oe('Order created', lh, '20 Sep · 11:00'), oe('Order approved', ra, '20 Sep · 12:00'), oe('Items picked', pn, '21 Sep · 07:10'),
        oe('Consignment packed', pn, '21 Sep · 07:50'), oe('Dispatched', pn, '21 Sep · 08:30', 'G4S Secure Logistics · DXB K 77310'),
        oe('Delivered', 'Noor Abbas · Driver', '21 Sep · 10:05', 'Receiver signed at JAFZA South')] }),
    O({ no: 'ORD-2201', customer: 'Kanz Jewels LLC', custId: 'CT-0120', status: 'Cancelled', dest: 'Gold Souk, Deira', release: '25 Sep 2026', value: 'AED 4.1M',
      items: [I(g1, 'BUL-9999-1KG', 12, 'bars', 'A-01-04'), I(cs, 'COIN-SET-22K', 4, 'sets', 'B-02-09')], history: [oe('Order created', lh, '24 Sep · 08:10')] }),
  ];
}
