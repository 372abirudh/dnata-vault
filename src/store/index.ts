import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bag, DispatchInfo, Grn, GrnLine, HistoryEvent, Order, OrderItem, PickOpt, PodInfo, PutawayRow, SigData } from '../data/types';
import { ME, BINS, CATALOG, FACILITIES, PACKS, STAFF, STOCK, WT, byCode, facCode, pkgs, seedGrns, seedOrders, staffById } from '../data/seed';
import { aed, dateLong, hm, MONTHS, nowLong, nowShort, plural } from '../data/format';
import { sumExp } from '../logic/grn';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export type ToastTone = 'success' | 'warning' | 'error' | 'info';
export type Picker = { title: string; opts: PickOpt<any>[]; cur: any; onPick: (v: any) => void } | null;
export type ScanReq = { title: string; hint?: string; onCode: (code: string) => void } | null;
export type DateReq = { title: string; mode: 'date' | 'datetime'; value: Date; onPick: (d: Date) => void } | null;

export type GrnSheet = 'create' | 'verify' | 'vhr' | 'putaway' | 'doc' | 'assign';
export type TaskKind = 'pick' | 'pack' | 'pod' | 'dispatch';

// ─── Verify wizard draft (4 steps) ──────────────────────
export type VerifyLine = {
  mode: 'individual' | 'package'; pieces: string; packages: string; packType: string; lot: string; weight: string;
  l: string; w: string; h: string; origin: string; seal: string; barPrefix: string; barFrom: string; barTo: string; bars: string[]; label: boolean;
};
export type VerifyDraft = { supplier: string; driver: string; cc: string; mobile: string; vehicle: string; arrived: Date; lines: VerifyLine[] };
export const lineReceived = (l: VerifyLine) =>
  l.mode === 'package' ? (parseInt(l.packages, 10) || 0) * (PACKS[l.packType] || 0) : parseInt(l.pieces, 10) || 0;
export const newVerifyDraft = (g: Grn): VerifyDraft => ({
  supplier: "Brink's Global Services", driver: 'Ali Rahmani', cc: '+971', mobile: '52 330 1188', vehicle: 'DXB K 77310', arrived: new Date(2026, 8, 21, 9, 20),
  lines: g.lines.map((l, i) => ({
    mode: 'individual', pieces: String(l.exp), packages: '', packType: 'Pack Of 10', lot: `LOT-${4300 + i}`, weight: (l.exp * l.unitWt).toFixed(3),
    l: '30', w: '20', h: '15', origin: 'Switzerland', seal: `SL-${771600 + i}`, barPrefix: 'CH-', barFrom: String(1001 + i * 100),
    barTo: String(1000 + i * 100 + l.exp), bars: [], label: true,
  })),
});

// ─── GRN create draft ───────────────────────────────────
export type GrnDraftLine = { item: string; pack: string; qty: string };
export type GrnDraft = {
  customer: string; txType: string; facility: string; inbound: string; mode: string; vaultType: string; po: string; date: Date;
  files: string[]; desc: string; lines: GrnDraftLine[];
};
export const newGrnDraft = (): GrnDraft => ({
  customer: 'CT-0101', txType: 'Contractual', facility: 'DXB Vault North', inbound: 'Local', mode: 'Counter', vaultType: 'Actual Vault',
  po: 'PO-88452', date: new Date(2026, 9, 7), files: [], desc: "1kg 999.9 bars from Brink's Global Services",
  lines: [{ item: 'BUL-9999-1KG', pack: 'Bar', qty: '10' }],
});
export const grnDraftGate = (c: GrnDraft) => {
  if (!c.customer) return 'Select the customer.';
  if (!c.facility) return 'Select the receiving facility.';
  if (!c.po.trim()) return 'PO number is required.';
  for (let i = 0; i < c.lines.length; i++) {
    if (!c.lines[i].item) return `Choose the item for line ${i + 1}.`;
    if (!c.lines[i].pack) return `Choose the pack type for line ${i + 1}.`;
    if (!(parseInt(c.lines[i].qty, 10) > 0)) return `Enter the expected quantity for line ${i + 1}.`;
  }
  return null;
};

// ─── Order create draft ─────────────────────────────────
export type CrLine = { item: string; qty: number; alloc: 'FIFO' | 'Manual'; bars: string[] };
export type OrderDraft = {
  orderType: string; customer: string; facility: string; account: string; source: string; file: string; method: string; request: string;
  recipient: string; eid: string; awb: string; payment: string; date: string; addr1: string; addr2: string; emirate: string; contact: string; lines: CrLine[];
};
export const newOrderDraft = (): OrderDraft => ({
  orderType: 'Local', customer: 'CT-0101', facility: 'DWC Logistics Vault', account: 'Emirates NBD Treasury', source: 'Dnata system', file: '',
  method: 'Auto by value', request: 'Release', recipient: 'Khalid Al Nuaimi', eid: '784-1985-3348120-7', awb: '176-44829310', payment: 'Account',
  date: '2026-10-08', addr1: 'Emirates NBD HQ, Baniyas Road', addr2: 'Deira · Floor 12', emirate: 'Dubai', contact: '+971 50 618 2290',
  lines: [{ item: 'BUL-9999-1KG', qty: 2, alloc: 'FIFO', bars: [] }],
});
export const crTotal = (c: OrderDraft) => c.lines.reduce((s, l) => s + (byCode(l.item)?.price ?? 0) * l.qty, 0);
export const resolvedMethod = (c: OrderDraft) => (c.method !== 'Auto by value' ? c.method : crTotal(c) < 50000 ? 'Courier' : 'Armoured vehicle');

// ─── Pick / pack task drafts ────────────────────────────
export type PbRow = { p: number | null; qty: number; bars?: string[] | null };
export type PickDraft = { sel: number; rows: PbRow[][] };
export type PackDraft = { sel: number; items: { bags: Bag[] }[] };

export const fifoDraft = (o: Order): PickDraft => ({
  sel: 0,
  rows: o.items.map((it) => {
    const ps = pkgs(it.code);
    const r: PbRow[] = [];
    if (it.preBars && it.preBars.length) {
      ps.forEach((pk, p) => { const b = pk.bars.filter((x) => it.preBars!.includes(x)); if (b.length) r.push({ p, qty: b.length, bars: b }); });
      return r;
    }
    let need = it.qty;
    for (let p = 0; p < ps.length && need > 0; p++) { const q = Math.min(need, ps[p].inPack); r.push({ p, qty: q }); need -= q; }
    return r;
  }),
});
export const packDraft = (o: Order): PackDraft => ({
  sel: 0,
  items: o.items.map((it, i) => ({ bags: [{ qty: String(it.qty), s1: 'SL-' + (882140 + i * 10), s2: 'TB-' + (5510 + i * 10), pid: o.no + '-L' + (i + 1) + '-B1' }] })),
});
/** The bars a pick row resolves to: its chosen bars that still belong to the package, topped up from the package in order. */
export const effBars = (r: PbRow, pk: { bars: string[] } | null) => {
  if (!pk) return [];
  const e = (r.bars || []).filter((b) => pk.bars.includes(b)).slice(0, r.qty);
  pk.bars.forEach((b) => { if (e.length < r.qty && !e.includes(b)) e.push(b); });
  return e;
};
export const pickedCount = (pb: PickDraft, i: number) => (pb.rows[i] || []).reduce((a, r) => a + (r.p == null ? 0 : r.qty), 0);

export const customersOf = (grns: Grn[], orders: Order[]) => {
  const out = [{ id: 'CT-0101', name: 'Emirates NBD Treasury' }, { id: 'CT-0102', name: 'Mashreq Bullion Desk' }];
  [...grns, ...orders].forEach((x) => { if (!out.some((c) => c.id === x.custId)) out.push({ id: x.custId, name: x.customer }); });
  return out;
};

type State = {
  // data
  grns: Grn[];
  orders: Order[];

  // shell
  section: 'receipts' | 'orders';
  page: 'home' | 'putaway';
  q: string;
  homeSearch: boolean;
  createMenu: boolean;
  acct: boolean;
  notif: boolean;
  toast: { msg: string; tone: ToastTone; id: number } | null;
  picker: Picker;
  scan: ScanReq;
  date: DateReq;

  // receipts
  grnTab: string;
  grnActive: string | null;
  recTab: string;
  grnSheet: GrnSheet | null;
  sheetNo: string;
  docKind: 'vhr' | 'labels';
  closeOpen: boolean;
  paDetail: string | null;
  paTab: string;
  paFac: string;
  paStatus: string;
  paFilter: boolean;

  // orders
  orderTab: string;
  dFilter: string;
  orderActive: string | null;
  oTab: string;
  task: TaskKind | null;
  taskNo: string;
  orderCreate: boolean;
  allocNo: string | null;
  podDoc: string | null;
  barsOpen: Record<string, boolean>;
};

type Actions = {
  set: (p: Partial<State>) => void;
  /** Restores the sample receipts and orders. */
  resetData: () => void;
  flash: (msg: string, tone?: ToastTone) => void;
  openPicker: <T>(title: string, opts: PickOpt<T>[], cur: T | null | undefined, onPick: (v: T) => void) => void;
  openScan: (title: string, onCode: (code: string) => void, hint?: string) => void;
  openDate: (title: string, mode: 'date' | 'datetime', value: Date, onPick: (d: Date) => void) => void;
  setSection: (k: 'receipts' | 'orders') => void;

  // receipts
  openGrn: (no: string) => void;
  runGrn: (no: string) => void;
  closeGrnSheet: () => void;
  createGrn: (c: GrnDraft) => string;
  assignGrn: (no: string, staffId: string, remarks: string) => void;
  verifyGrn: (no: string, vf: VerifyDraft) => string;
  signGrn: (no: string, approverId: string, sig?: SigData) => string;
  putawayDraft: (g: Grn) => PutawayRow[];
  putawayGrn: (no: string, rows: PutawayRow[]) => string;
  closeGrn: (no: string) => void;

  // orders
  openOrder: (no: string) => void;
  runOrder: (no: string) => void;
  patchOrder: (no: string, fn: (o: Order) => void) => void;
  createOrder: (c: OrderDraft) => void;
  allocate: (no: string, picker: string, note: string) => void;
  completePick: (no: string, pb: PickDraft) => void;
  completePack: (no: string, pg: PackDraft) => void;
  completePod: (no: string, pod: PodInfo) => void;
  completeDispatch: (no: string, dp: DispatchInfo) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastId = 0;
const WARN = /first\.|outside|must|required|invalid|cannot|can’t|can't|missing|not in the/i;

const log = (o: { history: HistoryEvent[] }, t: string, d = '', k?: string, long = false) => {
  o.history = o.history.concat([{ k, t, a: ME, ts: long ? nowLong() : nowShort(), d }]);
};

export const useStore = create<State & Actions>()(persist((set, get) => ({
  grns: seedGrns(),
  orders: seedOrders(),
  resetData: () => set({ grns: seedGrns(), orders: seedOrders(), grnActive: null, orderActive: null, paDetail: null }),

  section: 'receipts', page: 'home', q: '', homeSearch: false, createMenu: false, acct: false, notif: false,
  toast: null, picker: null, scan: null, date: null,

  grnTab: 'All', grnActive: null, recTab: 'overview', grnSheet: null, sheetNo: '', docKind: 'vhr', closeOpen: false,
  paDetail: null, paTab: 'storage', paFac: 'All', paStatus: 'All', paFilter: false,

  orderTab: 'All', dFilter: '', orderActive: null, oTab: 'overview', task: null, taskNo: '', orderCreate: false,
  allocNo: null, podDoc: null, barsOpen: {},

  set: (p) => set(p),
  flash: (msg, tone) => {
    clearTimeout(toastTimer);
    set({ toast: { msg, tone: tone ?? (WARN.test(msg) ? 'warning' : 'success'), id: ++toastId } });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  openPicker: (title, opts, cur, onPick) => set({ picker: { title, opts, cur, onPick } }),
  openScan: (title, onCode, hint) => set({ scan: { title, onCode, hint } }),
  openDate: (title, mode, value, onPick) => set({ date: { title, mode, value, onPick } }),
  setSection: (k) => set({ section: k }),

  // ─── Receipts ───────────────────────────────────────
  openGrn: (no) => set({ grnActive: no, recTab: 'overview' }),
  runGrn: (no) => {
    const g = get().grns.find((x) => x.no === no);
    if (!g) return;
    const sheet = ({ Draft: 'assign', 'Staff Assigned': 'verify', 'Verified GRN': 'vhr', Signed: 'putaway' } as Record<string, GrnSheet>)[g.status];
    if (sheet) set({ grnSheet: sheet, sheetNo: no });
    else if (g.status === 'Put Away Raised') set({ closeOpen: true, sheetNo: no });
  },
  closeGrnSheet: () => set({ grnSheet: null }),

  createGrn: (c) => {
    const { grns, orders } = get();
    const n = Math.max(0, ...grns.map((x) => parseInt(x.no.slice(4), 10))) + 1;
    const no = 'GRN-' + String(n).padStart(4, '0');
    const cust = customersOf(grns, orders).find((x) => x.id === c.customer)!;
    const ts = nowLong();
    const lines: GrnLine[] = c.lines.map((l, i) => {
      const it = byCode(l.item)!;
      return { code: it.code, name: it.name, pack: l.pack, exp: parseInt(l.qty, 10) || 0, unitWt: it.unitWt, pkgId: `PKG-${no.slice(4)}-${i + 1}`,
        received: null, mode: null, packType: '', packages: '', lot: '', weight: '', l: '', w: '', h: '', origin: '', seal: '', bars: [] };
    });
    const g: Grn = {
      no, customer: cust.name, custId: cust.id, po: c.po.toUpperCase(), facility: c.facility, status: 'Draft', txType: c.txType, inbound: c.inbound,
      receiptMode: c.mode, vaultType: c.vaultType, expected: dateLong(c.date), createdBy: 'Omar Farooq', createdTime: ts, updated: ts,
      attachments: c.files.length, vault: '—', bin: '—', assignee: '—', assigneeCode: '—', assigneeRole: '—', remarks: c.desc.trim() || '—',
      filed: c.files.map((f) => ({ name: f, meta: `${ts} · attachment` })), lines,
      history: [{ k: 'create', t: 'GRN created', a: ME, ts, d: `${plural(lines.length, 'line')} · ${lines.reduce((a, l) => a + l.exp, 0)} pieces expected` }],
    };
    set({ grns: [g, ...grns], grnTab: 'All' });
    return no;
  },

  assignGrn: (no, staffId, remarks) => {
    const st = staffById(staffId)!;
    const rem = remarks.trim() || '—';
    patchGrn(no, (g) => {
      Object.assign(g, { status: 'Staff Assigned', assignee: st.name, assigneeCode: st.id, assigneeRole: st.role, remarks: rem });
      g.history.push({ k: 'assign', t: 'Staff assigned', a: 'Rashid Al Marri · Vault Supervisor', ts: nowLong(), d: `${st.name} (${st.id}) · ${st.role} — ${rem}` });
    });
  },

  verifyGrn: (no, vf) => {
    const g0 = get().grns.find((x) => x.no === no)!;
    const exp = sumExp(g0), rec = vf.lines.reduce((a, l) => a + lineReceived(l), 0);
    patchGrn(no, (g) => {
      g.lines.forEach((l, i) => {
        const v = vf.lines[i];
        Object.assign(l, { received: lineReceived(v), mode: v.mode, packType: v.mode === 'package' ? v.packType : '', packages: v.packages, lot: v.lot,
          weight: v.weight, l: v.l, w: v.w, h: v.h, origin: v.origin, seal: v.seal, bars: [...v.bars] });
      });
      const a = vf.arrived;
      g.status = 'Verified GRN';
      g.handover = { supplier: vf.supplier, driver: vf.driver, mobile: `${vf.cc} ${vf.mobile}`, vehicle: vf.vehicle, arrived: `${dateLong(a)} · ${hm(a)}` };
      g.history.push({ k: 'verify', t: 'Goods verified', a: ME, ts: nowLong(),
        d: `${rec} of ${exp} pieces received · ${g.lines.filter((l) => l.seal).length} of ${g.lines.length} packages sealed` });
    });
    return `Verified — ${rec} of ${exp} pieces received.`;
  },

  signGrn: (no, approverId, sig) => {
    const st = staffById(approverId);
    const doc = `VHR-${no.slice(4)}.pdf`;
    patchGrn(no, (g) => {
      const ts = nowLong();
      g.status = 'Signed';
      g.signature = { approver: st?.name ?? '—', signedAt: ts, doc, sig };
      g.filed.push({ name: doc, meta: `${ts} · 214 KB` });
      g.history.push({ k: 'sign', t: 'Vault handover report signed', a: ME, ts, d: `Approved by ${st?.name ?? '—'} · ${doc}` });
    });
    return `Custody accepted — ${doc} filed.`;
  },

  putawayDraft: (g) => {
    const vs = FACILITIES[g.facility] ?? [''];
    let k = 0;
    return g.lines.map((l) => {
      const n = l.mode === 'package' ? Math.max(1, Math.min(999, parseInt(l.packages, 10) || 1)) : 1;
      const per = Math.ceil(l.bars.length / n);
      const pk = Array.from({ length: n }, (_, j) => ({
        no: `${l.pkgId}-${String(j + 1).padStart(2, '0')}`, bin: BINS[k++ % BINS.length], bars: l.bars.slice(j * per, (j + 1) * per),
      }));
      return { pkg: l.name, pkgId: l.pkgId, account: 'Customer main', facility: g.facility, vault: vs[0], pkgs: pk };
    });
  },

  putawayGrn: (no, rows) => {
    const code = 'PA-00' + (43 + get().grns.filter((g) => g.putaway).length - 2);
    patchGrn(no, (g) => {
      const ts = nowLong();
      const binOf = (r: PutawayRow) => [...new Set(r.pkgs.map((p) => p.bin))].join(', ');
      g.status = 'Closed';
      g.putaway = { code, status: rows.every((r) => r.account && r.facility && r.vault && r.pkgs.every((p) => p.bin)) ? 'Vault Assigned' : 'Pending', ts, rows: clone(rows) };
      g.vault = rows[0].vault;
      g.bin = binOf(rows[0]);
      g.filed.push({ name: `${code}-allocation.pdf`, meta: `${ts} · 96 KB` });
      g.history.push(
        { k: 'putaway', t: 'Put away raised', a: ME, ts, d: `${plural(rows.length, 'package')} · ${rows.map((r) => `${r.vault} / ${binOf(r)}`).join(' · ')}` },
        { k: 'close', t: 'GRN closed', a: 'System · auto-close after put away', ts, d: 'All packages binned — record locked.' },
      );
    });
    return `${code} raised · ${plural(rows.length, 'package')} binned · GRN closed.`;
  },

  closeGrn: (no) => patchGrn(no, (g) => {
    g.status = 'Closed';
    g.history.push({ k: 'close', t: 'GRN closed', a: 'Dana Al Suwaidi · Compliance Auditor', ts: nowLong(), d: '' });
  }),

  // ─── Orders ─────────────────────────────────────────
  openOrder: (no) => set({ orderActive: no, oTab: 'overview' }),
  runOrder: (no) => {
    const o = get().orders.find((x) => x.no === no);
    if (!o) return;
    const s = o.status;
    if (s === 'Pending') set({ allocNo: no });
    else if (s === 'Allocated' || s === 'Picked') {
      if (s === 'Allocated' && !o.items.every((i) => i.picked)) get().patchOrder(no, (x) => log(x, 'Picking started'));
      set({ task: s === 'Picked' || o.items.every((i) => i.picked) ? 'pack' : 'pick', taskNo: no });
    } else if (s === 'Ready for dispatch') set({ task: 'dispatch', taskNo: no });
    else if (s === 'Dispatched') set({ task: 'pod', taskNo: no });
  },
  patchOrder: (no, fn) => set((s) => ({ orders: s.orders.map((o) => { if (o.no !== no) return o; const x = clone(o); fn(x); return x; }) })),

  createOrder: (c) => {
    const { orders, grns } = get();
    const no = 'ORD-' + (Math.max(...orders.map((x) => parseInt(x.no.slice(4), 10))) + 1);
    const cust = customersOf(grns, orders).find((x) => x.id === c.customer)!;
    const recipient = c.recipient || cust.name;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.date);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
    const items: OrderItem[] = c.lines.map((l) => {
      const it = byCode(l.item)!;
      const st = STOCK[l.item] || [['DXB · Vault B', 0]];
      const src = (st.find((v) => v[0].split(' · ')[0] === facCode(c.facility)) || st[0])[0];
      return { name: it.name, code: it.code, qty: l.qty, unit: it.unit, bin: it.bin, picked: false, src, alloc: l.alloc, preBars: l.alloc === 'Manual' ? [...l.bars] : null };
    });
    const total = crTotal(c);
    const value = total >= 1e6 ? 'AED ' + (total / 1e6).toFixed(1) + 'M' : 'AED ' + Math.round(total / 1000) + 'K';
    const ord: Order = {
      no, customer: cust.name, custId: cust.id, status: 'Pending', value, pack: null, dispatch: null,
      dest: [c.addr1, c.addr2, c.emirate].filter(Boolean).join(', ') || c.emirate,
      facility: c.facility || (items[0].src!.indexOf('DWC') === 0 ? 'DWC Logistics Vault' : 'DXB Vault North'),
      type: c.request + ' · ' + c.orderType,
      release: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items,
      extra: { account: c.account, source: c.source, method: resolvedMethod(c), recipient, eid: c.eid, awb: c.awb, payment: c.payment, contact: c.contact },
      history: [{ t: 'Order created', a: ME, ts: nowShort(), d: plural(items.length, 'line') + ' · ' + aed(total) }],
    };
    set({ orders: [ord, ...orders], orderCreate: false, orderTab: 'All' });
    get().flash(no + ' created as pending.');
  },

  allocate: (no, picker, note) => {
    get().patchOrder(no, (x) => { x.status = 'Allocated'; x.picker = picker; log(x, 'Allocated to picker', picker + (note ? ' · ' + note : '')); });
    set({ allocNo: null });
    get().flash(no + ' allocated to ' + picker + '.');
  },

  completePick: (no, pb) => {
    const o = get().orders.find((x) => x.no === no)!;
    get().patchOrder(no, (x) => {
      x.items = x.items.map((it, i) => ({ ...it, picked: true, bars: (pb.rows[i] || []).reduce<string[]>((a, r) => (r.p == null ? a : a.concat(effBars(r, pkgs(it.code)[r.p]))), []) }));
      x.status = 'Picked';
      log(x, 'Items picked', plural(x.items.length, 'line') + ' · ' + x.items.reduce((a, i) => a + i.qty, 0) + ' units');
    });
    set({ task: null });
    get().flash('All ' + o.items.length + ' lines picked. Order moved to Picked.');
  },

  completePack: (no, pg) => {
    const o = get().orders.find((x) => x.no === no)!;
    const bags: Bag[] = pg.items.flatMap((g, i) => g.bags.map((b) => ({ item: o.items[i].name, ...b })));
    const wt = o.items.reduce((a, it) => a + (WT[it.code] || 1) * it.qty, 0);
    const pack = { count: String(bags.length), weight: wt.toFixed(2), seal: bags.map((b) => b.s1).join(', '), notes: '', bags };
    get().patchOrder(no, (x) => { x.status = 'Ready for dispatch'; x.pack = pack; log(x, 'Packed into bags', plural(bags.length, 'bag') + ' · ' + pack.seal); });
    set({ task: null });
    get().flash('Packed into ' + plural(bags.length, 'bag') + '.');
  },

  completePod: (no, pod) => {
    const p = { ...pod, at: nowShort() };
    get().patchOrder(no, (x) => { x.status = 'Delivered'; x.pod = p; log(x, 'Delivered', 'Received by ' + p.recipient + ' · EID ' + p.eid); });
    set({ task: null });
    get().flash('Delivery confirmed. Order closed.');
  },

  completeDispatch: (no, dp) => {
    const d2: DispatchInfo = { ...dp, carrier: dp.cCo || dp.hTo || dp.method, vehicle: dp.hVehicle || dp.hTruck || '—' };
    get().patchOrder(no, (x) => {
      x.status = 'Dispatched';
      x.dispatch = d2;
      x.extra = { ...x.extra, recipient: dp.recipient, method: dp.method === 'VIT' ? 'VIT armored' : dp.method };
      log(x, 'Dispatched', dp.method + ' · ' + dp.staff + (dp.comments ? ' · ' + dp.comments : ''));
    });
    set({ task: null });
    get().flash(no + ' dispatched.');
  },
}), {
  // Receipts and orders are saved on the device after every change; screen state is not.
  name: 'dnata-vault-data',
  version: 1,
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (s) => ({ grns: s.grns, orders: s.orders }),
}));

function patchGrn(no: string, fn: (g: Grn) => void) {
  useStore.setState((s) => ({
    grns: s.grns.map((g) => { if (g.no !== no) return g; const x = clone(g); fn(x); x.updated = nowLong(); return x; }),
  }));
}

export { CATALOG, STAFF };
