/** A captured finger signature: SVG path data in the pad's own coordinate space. */
export type SigData = { w: number; h: number; paths: string[] };

export type HistoryEvent = { k?: string; t: string; a: string; ts: string; d: string };
export type FiledDoc = { name: string; meta: string };

// ─── Goods receipts (inbound) ───────────────────────────

export type GrnLine = {
  code: string; name: string; pack: string; exp: number; unitWt: number; pkgId: string;
  received: number | null; mode: 'individual' | 'package' | null;
  packType: string; packages: string; lot: string; weight: string; l: string; w: string; h: string;
  origin: string; seal: string; bars: string[];
};

export type Handover = { supplier: string; driver: string; mobile: string; vehicle: string; arrived: string };
export type SignatureInfo = { approver: string; signedAt: string; doc: string; sig?: SigData };
export type PaPackage = { no: string; bin: string; bars: string[] };
export type PutawayRow = { pkg: string; pkgId: string; account: string; facility: string; vault: string; pkgs: PaPackage[] };
export type Putaway = { code: string; status: string; ts: string; rows: PutawayRow[] };

export type GrnStatus = 'Draft' | 'Staff Assigned' | 'Verified GRN' | 'Signed' | 'Put Away Raised' | 'Closed';

export type Grn = {
  no: string; customer: string; custId: string; po: string; facility: string; status: GrnStatus;
  txType: string; inbound: string; receiptMode: string; vaultType: string; expected: string;
  createdBy: string; createdTime: string; updated: string; attachments: number;
  vault: string; bin: string; assignee: string; assigneeCode: string; assigneeRole: string; remarks: string;
  handover?: Handover; signature?: SignatureInfo; putaway?: Putaway;
  filed: FiledDoc[]; lines: GrnLine[]; history: HistoryEvent[];
};

// ─── Orders (outbound) ──────────────────────────────────

export type OrderStatus = 'Pending' | 'Allocated' | 'Picked' | 'Ready for dispatch' | 'Dispatched' | 'Delivered' | 'Cancelled';

export type OrderItem = {
  name: string; code: string; qty: number; unit: string; bin: string; picked: boolean;
  bars?: string[]; src?: string; alloc?: string; preBars?: string[] | null;
};
export type Bag = { item?: string; qty: string; s1: string; s2: string; pid: string };
export type OrderPack = { count: string; weight: string; seal: string; notes: string; bags?: Bag[] };

/** Dispatch form values (recipient, delivery, handover, courier, driver, signature). */
export type DispatchInfo = {
  recipient?: string; rPhone?: string; rEid?: string; method?: string; staff?: string; exp?: string; disp?: string; pod?: string;
  payment?: string; dPhone?: string; file?: string; address?: string; hVehicle?: string; hTo?: string; hTruck?: string; hPhone?: string;
  cNum?: string; cCo?: string; cEid?: string; driver?: string; drPhone?: string; comments?: string; signedBy?: string;
  sig?: boolean; sigImg?: SigData; carrier?: string; vehicle?: string;
};
export type PodInfo = { recipient: string; eid: string; phone: string; photo: string; sig: boolean; at?: string; sigImg?: SigData };
export type OrderExtra = { account?: string; source?: string; method?: string; recipient?: string; eid?: string; awb?: string; payment?: string; contact?: string };
export type OrderDoc = { name: string; icon: string; ts: string };
export type Billable = { t: string; by: string; ts: string };

export type Order = {
  no: string; customer: string; custId: string; status: OrderStatus; dest: string; release: string; value: string;
  facility: string; type: string; picker?: string; items: OrderItem[];
  pack: OrderPack | null; dispatch: DispatchInfo | null; pod?: PodInfo; extra?: OrderExtra;
  history: HistoryEvent[]; docs?: OrderDoc[]; billable?: Billable[];
};

/** A stock package in the vault (for FIFO / manual bar allocation). */
export type StockPackage = { date: string; ts: number; id: string; fac: string; vault: string; inPack: number; bars: string[] };

export type PickOpt<T = string> = { v: T; label: string; sub?: string };
