import React, { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, fifoDraft, packDraft, effBars, pickedCount, PickDraft, PackDraft } from '../../store';
import type { DispatchInfo, Order, PodInfo } from '../../data/types';
import { C, R, font, mono, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Box, Button, IconButton, SelectField, Stepper, StatusChip, TextField, Txt } from '../../components/ds';
import { BarTableHead, CardHeader, DoneFooter, ItemsProgress, LockedField, SelectRow, SheetFooter, SheetHeader } from '../../components/vault';
import { Sheet } from '../../components/overlay';
import { SignaturePad, SignaturePadHandle } from '../../components/art';
import { PICKERS, pkgs } from '../../data/seed';
import { dateLong, fromIso, hm, iso, plural } from '../../data/format';
import { deliveryOf } from '../../logic/orders';
import { FileRow } from './create';

const T = {
  pick: ['Pick bars', 'Packages are pre-filled from facility and vault stock, oldest first (FIFO). Change the date to pick from a different package.', 'Confirm pick', 'scan-barcode'],
  pack: ['Pack bars', 'Select an item, set how many bags it goes into, then split its quantity and seal each bag.', 'Mark packed', 'package'],
  pod: ['Proof of delivery', 'Verify the recipient against their Emirates ID and capture their signature.', 'Confirm delivery', 'shield-check'],
  dispatch: ['Dispatch order', 'Record recipient, delivery, handover and courier details, then sign to release custody.', 'Dispatch', 'truck'],
} as const;

/** The +971 fields show the country code as a prefix, so keep only the local part. */
const local = (p: string) => p.replace(/^\+971\s*/, '');

const initPod = (o: Order): PodInfo => {
  const x = o.extra ?? {}, d = o.dispatch ?? {};
  return { recipient: d.recipient || x.recipient || o.customer, eid: d.rEid || x.eid || '784-1985-3348120-7', phone: d.rPhone ? '+971 ' + d.rPhone : x.contact || '+971 50 618 2290', photo: '', sig: false };
};
const initDispatch = (o: Order): DispatchInfo => {
  const x = o.extra ?? {};
  const rd = fromIsoRelease(o.release);
  return {
    recipient: x.recipient && x.recipient !== o.customer ? x.recipient : 'Khalid Al Nuaimi', rPhone: '50 618 2290', rEid: x.eid || '784-1985-3348120-7', method: 'VIT',
    staff: o.picker || 'Omar Farooq', exp: iso(rd ?? new Date()), disp: iso(new Date()), pod: '', payment: x.payment || 'Account', dPhone: local(x.contact || '4 218 6600'),
    file: '', address: o.dest, hVehicle: 'DXB 44821', hTo: 'Transguard Cash', hTruck: 'TRK-2208', hPhone: '52 330 1188', cNum: 'AWB 176-44829310',
    cCo: "Brink's Global Services", cEid: '784-1990-6612044-1', driver: 'Ali Rahmani', drPhone: '56 771 2245', comments: 'Handled under dual custody',
    signedBy: o.picker || 'Omar Farooq', sig: false,
  };
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fromIsoRelease(s: string) {
  const m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(s.trim());
  return m && MONTHS.includes(m[2]) ? new Date(+m[3], MONTHS.indexOf(m[2]), +m[1]) : null;
}
const showDate = (s?: string) => { const d = fromIso(s ?? ''); return d ? dateLong(d) : ''; };

function taskGate(task: keyof typeof T, o: Order, pb: PickDraft, pg: PackDraft, pod: PodInfo, dp: DispatchInfo) {
  if (task === 'pick') { const left = o.items.filter((it, i) => pickedCount(pb, i) < it.qty).length; return left ? `${plural(left, 'item')} still to pick.` : null; }
  if (task === 'pack') {
    for (let i = 0; i < o.items.length; i++) {
      const it = o.items[i], b = pg.items[i].bags, sum = b.reduce((a, x) => a + (parseInt(x.qty, 10) || 0), 0), nm = it.name.split(' · ')[0];
      if (sum !== it.qty) return `${nm}: assign ${it.qty} across bags (${sum} set).`;
      if (b.some((x) => (parseInt(x.qty, 10) || 0) < 1)) return `${nm}: every bag needs at least 1.`;
      if (b.some((x) => !x.s1.trim())) return `${nm}: Seal 1 is required on every bag.`;
    }
    return null;
  }
  if (task === 'pod') {
    if (!pod.eid.trim()) return 'Emirates ID is required.';
    if (!pod.photo) return 'Add a photo of the Emirates ID.';
    if (!pod.sig) return 'Recipient signature is required.';
    return null;
  }
  if (!dp.recipient?.trim()) return 'Recipient name is required.';
  if (!dp.method) return 'Select the delivery method.';
  if (!dp.staff) return 'Select the delivering staff.';
  if (!dp.disp) return 'Dispatch date is required.';
  if (!dp.sig) return 'Signature is required.';
  if (!dp.signedBy) return 'Select who signed.';
  return null;
}

export function TaskSheet() {
  const s = useStore();
  const task = s.task!;
  const o = s.orders.find((x) => x.no === s.taskNo)!;
  const [pb, setPb] = useState<PickDraft>(() => fifoDraft(o));
  const [edit, setEdit] = useState<{ j: number; draft: string[] } | null>(null);
  const [pg, setPg] = useState<PackDraft>(() => packDraft(o));
  const [pgView, setPgView] = useState(false);
  const [pod, setPod] = useState<PodInfo>(() => initPod(o));
  const [dp, setDp] = useState<DispatchInfo>(() => initDispatch(o));
  const podPad = useRef<SignaturePadHandle>(null), dpPad = useRef<SignaturePadHandle>(null);
  const close = () => s.set({ task: null });

  const gate = taskGate(task, o, pb, pg, pod, dp);
  const [title, sub, cta, icon] = T[task];
  const nBags = pg.items.reduce((a, g) => a + g.bags.length, 0);
  const allPicked = o.items.every((it, i) => pickedCount(pb, i) >= it.qty);
  const allPacked = !taskGate('pack', o, pb, pg, pod, dp);
  const note = gate ?? (task === 'pod' ? `POD is mandatory on ${deliveryOf(o)} deliveries.` : task === 'pack' && allPacked ? 'All items packed and sealed — confirm to move the order to Ready for dispatch'
    : task === 'pick' && allPicked ? 'All items picked — confirm to move the order to Picked' : '');
  const tone = gate ? 'warning' : task === 'pod' ? 'neutral' : 'success';

  const doTask = () => {
    if (gate) return;
    if (task === 'pick') s.completePick(o.no, pb);
    else if (task === 'pack') s.completePack(o.no, pg);
    else if (task === 'pod') s.completePod(o.no, { ...pod, sigImg: podPad.current?.data() });
    else s.completeDispatch(o.no, { ...dp, sigImg: dpPad.current?.data() });
  };

  return (
    <>
      <Sheet
        onClose={close} z={40} bodyBg={C.bgApp} bodyStyle={{ paddingBottom: 20 }}
        header={<SheetHeader title={title} subtitle={`${o.no} · ${o.customer}`} icon={icon} description={sub} onClose={close} />}
        footer={
          <SheetFooter note={note} noteTone={tone} primaryLabel={task === 'pack' ? `${cta} (${plural(nBags, 'bag')})` : cta} primaryIcon={task === 'pack' ? 'package' : 'check'}
            blocked={!!gate} onCancel={close} onPrimary={doTask} />
        }
      >
        {task === 'pick' ? <Pick o={o} pb={pb} setPb={setPb} onEdit={setEdit} /> : null}
        {task === 'pack' ? <Pack o={o} pg={pg} setPg={setPg} onView={() => setPgView(true)} /> : null}
        {task === 'pod' ? <Pod pod={pod} setPod={setPod} pad={podPad} /> : null}
        {task === 'dispatch' ? <Dispatch dp={dp} setDp={setDp} pad={dpPad} /> : null}
      </Sheet>
      {task === 'pick' && edit ? <PickBarsEditor o={o} pb={pb} edit={edit} setEdit={setEdit} onSave={(bars) => { setPb((p) => ({ ...p, rows: p.rows.map((r, i) => (i === p.sel ? r.map((x, j) => (j === edit.j ? { ...x, bars } : x)) : r)) })); setEdit(null); }} /> : null}
      {task === 'pack' && pgView ? <PackBarsView o={o} pg={pg} onClose={() => setPgView(false)} /> : null}
    </>
  );
}

// ─── Pick ───────────────────────────────────────────────

function Pick({ o, pb, setPb, onEdit }: { o: Order; pb: PickDraft; setPb: React.Dispatch<React.SetStateAction<PickDraft>>; onEdit: (e: { j: number; draft: string[] }) => void }) {
  const s = useStore();
  const tot = o.items.length, done = o.items.filter((it, i) => pickedCount(pb, i) >= it.qty).length;
  const it = o.items[pb.sel], ps = pkgs(it.code), rows = pb.rows[pb.sel] || [], got = pickedCount(pb, pb.sel), full = got >= it.qty;
  const used = rows.map((r) => r.p);
  const upRows = (fn: (rows: PickDraft['rows'][number]) => PickDraft['rows'][number]) => setPb((p) => ({ ...p, rows: p.rows.map((r, i) => (i === p.sel ? fn(r.map((x) => ({ ...x }))) : r)) }));
  return (
    <>
      <Box>
        <ItemsProgress title="Items" done={`${done}/${tot} picked`} pct={Math.round((done / tot) * 100)} />
        {o.items.map((x, i) => {
          const g = pickedCount(pb, i), n = (pb.rows[i] || []).filter((r) => r.p != null).length;
          return <SelectRow key={i} name={x.name.split(' · ')[0]} sub={`${Math.min(g, x.qty)} of ${x.qty} · ${plural(n, 'package')}`} selected={i === pb.sel} done={g >= x.qty} onPress={() => setPb((p) => ({ ...p, sel: i }))} />;
        })}
      </Box>
      <Box>
        <CardHeader icon="package" title={it.name.split(' · ')[0]} subtitle={`${it.code} · Order quantity ${it.qty} · ${ps.length} packages in stock`}
          status={full ? 'Fully picked' : `${Math.min(got, it.qty)} of ${it.qty} picked`} statusTone={full ? 'info' : 'warning'} />
        {rows.map((r, j) => {
          const pk = r.p == null ? null : ps[r.p];
          const eff = effBars(r, pk);
          return (
            <View key={j} style={{ padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt style={[font(600, 12, 16), { flex: 1, color: C.text2 }]}>Package {j + 1}</Txt>
                <IconButton icon="x" label="Remove package" variant="neutral" size="sm" onPress={() => upRows((rr) => rr.filter((_, k) => k !== j))} />
              </View>
              <SelectField label="Date" required placeholder="Select package" value={pk ? pk.date : ''}
                onPress={() => s.openPicker('Package date',
                  ps.map((x, k) => ({ v: k, label: `${x.date} · ${x.fac}`, sub: `${x.id} · ${x.inPack} in pack${k === 0 ? ' · oldest' : ''}` })).filter((x) => x.v === r.p || !used.includes(x.v)),
                  r.p, (v: number) => upRows((rr) => rr.map((x, k) => (k === j ? { p: v, bars: null, qty: Math.max(1, Math.min(x.qty, ps[v].inPack)) } : x))))} />
              <LockedField label="Package ID" value={pk ? pk.id : '—'} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <LockedField grow label="Facility" value={pk ? pk.fac : '—'} />
                <LockedField grow label="Vault" value={pk ? pk.vault : '—'} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <LockedField grow label="Item in pack" value={pk ? String(pk.inPack) : '—'} />
                <View style={{ flex: 1 }}>
                  <TextField label="Order qty" required keyboardType="number-pad" value={String(r.qty)}
                    onChangeText={(t) => { const v = parseInt(t.replace(/[^0-9]/g, ''), 10); upRows((rr) => rr.map((x, k) => (k === j ? { ...x, qty: isNaN(v) ? 1 : Math.max(1, Math.min(v, pk ? pk.inPack : 1)) } : x))); }} />
                </View>
              </View>
              {pk ? (
                <View style={{ gap: 6 }}>
                  <Txt style={font(500, 12, 16)}>Bar numbers</Txt>
                  <Button variant="secondary" size="md" fullWidth leadingIcon="list" onPress={() => onEdit({ j, draft: eff.slice() })}>{`View / Update (${eff.length})`}</Button>
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }}>
          <Button variant="outline" size="md" fullWidth leadingIcon="plus"
            onPress={() => upRows((rr) => { const u = rr.map((r) => r.p); const nx = ps.findIndex((_, k) => !u.includes(k)); const need = Math.max(1, it.qty - got); return [...rr, { p: nx < 0 ? null : nx, qty: nx < 0 ? 1 : Math.min(need, ps[nx].inPack) }]; })}>
            Add package
          </Button>
        </View>
      </Box>
    </>
  );
}

function PickBarsEditor({ o, pb, edit, setEdit, onSave }: { o: Order; pb: PickDraft; edit: { j: number; draft: string[] }; setEdit: (e: { j: number; draft: string[] } | null) => void; onSave: (bars: string[]) => void }) {
  const s = useStore();
  const it = o.items[pb.sel], ps = pkgs(it.code), er = pb.rows[pb.sel][edit.j];
  if (!er || er.p == null) return null;
  const pk = ps[er.p], dr = edit.draft;
  const close = () => setEdit(null);
  return (
    <Sheet
      onClose={close} z={48} bodyBg={C.bgApp}
      header={<SheetHeader title={`${it.name.split(' · ')[0]} · Qty ${er.qty}`} subtitle={`Package ${pk.id} · ${pk.fac} · ${pk.vault}`} icon="scan-barcode" onClose={close} />}
      footer={<SheetFooter note="Each bar number must be unique" noteTone="neutral" primaryLabel="Update" primaryIcon="check" onCancel={close} onPrimary={() => onSave(dr.slice())} />}
    >
      <Box>
        <BarTableHead count={plural(dr.length, 'bar')} />
        {dr.map((b, k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: k ? 1 : 0, borderTopColor: C.hairline }}>
            <Txt style={[font(500, 13, 18), tabular, { width: 20, color: C.text2 }]}>{k + 1}</Txt>
            <Pressable
              onPress={() => s.openPicker(`Bar number ${k + 1}`, pk.bars.filter((x) => x === b || !dr.includes(x)).map((x) => ({ v: x, label: x })), b, (v: string) => setEdit({ ...edit, draft: dr.map((y, m) => (m === k ? v : y)) }))}
              style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: C.borderDefault, borderRadius: 12, backgroundColor: pressed ? C.n50 : '#fff' }]}
            >
              <Txt style={[mono(14, 20), { flex: 1 }]} lines={1}>{b}</Txt>
              <Icon name="chevron-down" size={18} color={C.n400} />
            </Pressable>
          </View>
        ))}
      </Box>
    </Sheet>
  );
}

// ─── Pack ───────────────────────────────────────────────

const packedBars = (it: Order['items'][number]) => (it.bars && it.bars.length ? it.bars : pkgs(it.code).flatMap((p) => p.bars).slice(0, it.qty));

function Pack({ o, pg, setPg, onView }: { o: Order; pg: PackDraft; setPg: React.Dispatch<React.SetStateAction<PackDraft>>; onView: () => void }) {
  const tot = pg.items.reduce((a, g) => a + g.bags.length, 0), sealed = pg.items.reduce((a, g) => a + g.bags.filter((b) => b.s1.trim()).length, 0);
  const it = o.items[pg.sel], g = pg.items[pg.sel], sum = g.bags.reduce((a, x) => a + (parseInt(x.qty, 10) || 0), 0), ok = sum === it.qty;
  const bars = packedBars(it), unit = it.unit || 'bars';
  const itemDone = (i: number) => { const b = pg.items[i].bags; return b.reduce((a, x) => a + (parseInt(x.qty, 10) || 0), 0) === o.items[i].qty && b.every((x) => x.s1.trim()); };
  const setBag = (j: number, k: 'qty' | 's1' | 's2' | 'pid', v: string) =>
    setPg((p) => ({ ...p, items: p.items.map((x, i) => (i === p.sel ? { bags: x.bags.map((b, m) => (m === j ? { ...b, [k]: k === 'qty' ? v.replace(/[^0-9]/g, '') : v.toUpperCase() } : b)) } : x)) }));
  const setN = (n0: number) => {
    const n = Math.max(1, Math.min(20, it.qty, n0));
    setPg((p) => {
      const cur = p.items[p.sel].bags, base = Math.floor(it.qty / n), rem = it.qty % n;
      const bags = Array.from({ length: n }, (_, j) => ({
        qty: String(base + (j < rem ? 1 : 0)), s1: cur[j] ? cur[j].s1 : 'SL-' + (882140 + p.sel * 10 + j), s2: cur[j] ? cur[j].s2 : 'TB-' + (5510 + p.sel * 10 + j), pid: `${o.no}-L${p.sel + 1}-B${j + 1}`,
      }));
      return { ...p, items: p.items.map((x, i) => (i === p.sel ? { bags } : x)) };
    });
  };
  let cum = 0;
  return (
    <>
      <Box>
        <ItemsProgress title="Items" done={`${sealed}/${tot} bags sealed`} pct={Math.round((sealed / Math.max(1, tot)) * 100)} />
        {o.items.map((x, i) => (
          <SelectRow key={i} name={x.name.split(' · ')[0]} sub={`Qty ${x.qty} · ${plural(pg.items[i].bags.length, 'bag')}`} selected={i === pg.sel} done={itemDone(i)} onPress={() => setPg((p) => ({ ...p, sel: i }))} />
        ))}
      </Box>
      <Box>
        <CardHeader icon="package" title={it.name.split(' · ')[0]} subtitle={`${it.code} · Qty ${it.qty} · ${bars.length} ${unit} picked`} status={ok ? 'Quantity assigned' : `${sum} of ${it.qty} assigned`} statusTone={ok ? 'info' : 'warning'} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
          <Icon name="scan-barcode" size={18} color={C.n400} />
          <Txt style={[font(500, 13, 18), tabular, { flex: 1 }]}>{`Picked ${unit} (${bars.length})`}</Txt>
          <Button variant="secondary" size="sm" leadingIcon="eye" onPress={onView}>View bars</Button>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ flex: 1 }}>
            <Txt style={font(500, 14, 20)}>Number of bags <Txt style={{ color: C.errorText }}>*</Txt></Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>Quantity splits evenly across bags</Txt>
          </View>
          <Stepper size="sm" value={g.bags.length} min={1} max={Math.max(1, Math.min(20, it.qty))} onChange={setN} />
        </View>
        {g.bags.map((b, j) => {
          const q = parseInt(b.qty, 10) || 0, part = bars.slice(cum, cum + q);
          cum += q;
          const line = part.length ? (part.length === 1 ? part[0] : `${part[0]} – ${part[part.length - 1]} · ${part.length} ${unit}`) : 'No items assigned';
          return (
            <View key={j} style={{ padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: C.hairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={[font(600, 12, 16), { color: C.text2 }]}>Bag {j + 1}</Txt>
                  <Txt style={[mono(12, 16), { color: C.primary600, marginTop: 2 }]} lines={1}>{line}</Txt>
                </View>
                {b.s1.trim() ? <StatusChip tone="success" label="Sealed" size="sm" /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><TextField label="Seal 1" required placeholder="SL-000000" value={b.s1} onChangeText={(v) => setBag(j, 's1', v)} autoCapitalize="characters" /></View>
                <View style={{ flex: 1 }}><TextField label="Seal 2" placeholder="SL-000000" value={b.s2} onChangeText={(v) => setBag(j, 's2', v)} autoCapitalize="characters" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><TextField label="No of quantity" required keyboardType="number-pad" value={b.qty} onChangeText={(v) => setBag(j, 'qty', v)} /></View>
                <View style={{ flex: 2 }}><TextField label="Packing ID / AWB" value={b.pid} onChangeText={(v) => setBag(j, 'pid', v)} autoCapitalize="characters" /></View>
              </View>
            </View>
          );
        })}
      </Box>
    </>
  );
}

function PackBarsView({ o, pg, onClose }: { o: Order; pg: PackDraft; onClose: () => void }) {
  const it = o.items[pg.sel], bars = packedBars(it), unit = it.unit || 'bars';
  return (
    <Sheet
      onClose={onClose} z={48} bodyBg={C.bgApp} form={false}
      header={<SheetHeader title={`${it.name.split(' · ')[0]} · Qty ${it.qty}`} subtitle={`${it.code} · ${bars.length} ${unit} from Pick bars`} icon="scan-barcode" onClose={onClose} />}
      footer={<DoneFooter onPress={onClose} />}
    >
      <Box>
        <BarTableHead count={`${bars.length} ${unit}`} />
        {bars.map((b, k) => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderTopWidth: k ? 1 : 0, borderTopColor: C.hairline }}>
            <Txt style={[font(500, 13, 18), tabular, { width: 20, color: C.text2 }]}>{k + 1}</Txt>
            <Txt style={[mono(14, 20), { flex: 1 }]}>{b}</Txt>
            <StatusChip tone="success" label="Picked" size="sm" />
          </View>
        ))}
        {!bars.length ? <Txt style={[font(400, 13, 18), { color: C.text2, textAlign: 'center', paddingVertical: 20 }]}>No bars recorded for this item.</Txt> : null}
      </Box>
    </Sheet>
  );
}

// ─── Proof of delivery ──────────────────────────────────

function Pod({ pod, setPod, pad }: { pod: PodInfo; setPod: React.Dispatch<React.SetStateAction<PodInfo>>; pad: React.RefObject<SignaturePadHandle | null> }) {
  const flash = useStore((s) => s.flash);
  const take = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return flash(camera ? 'Camera access is required to photograph the Emirates ID.' : 'Photo library access is required.', 'warning');
    const r = camera ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    // Camera shots come back with a random UUID file name, so label them by capture time instead.
    if (!r.canceled) setPod((p) => ({ ...p, photo: (!camera && r.assets[0].fileName) || `Emirates ID photo · ${hm(new Date())}` }));
  };
  const choose = () => Alert.alert('Emirates ID photo', 'Photograph the recipient\'s Emirates ID, or choose an existing photo.', [{ text: 'Take photo', onPress: () => take(true) }, { text: 'Choose from library', onPress: () => take(false) }, { text: 'Cancel', style: 'cancel' }]);
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderSubtle, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, gap: 14 }}>
      <TextField leadingIcon="user" label="Recipient name (from order)" required value={pod.recipient} disabled />
      <TextField leadingIcon="id-card" label="Emirates ID" required placeholder="784-XXXX-XXXXXXX-X" keyboardType="numbers-and-punctuation" value={pod.eid} onChangeText={(v) => setPod((p) => ({ ...p, eid: v }))} />
      <TextField leadingIcon="phone" label="Emergency / contact number" keyboardType="phone-pad" placeholder="+971 50 000 0000" value={pod.phone} onChangeText={(v) => setPod((p) => ({ ...p, phone: v }))} />
      <View style={{ gap: 6 }}>
        <Txt style={[font(500, 12, 16), { paddingHorizontal: 2 }]}>Emirates ID photo <Txt style={{ color: C.errorText }}>*</Txt></Txt>
        <Pressable onPress={choose} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary200, borderRadius: 14 }, pressed && { opacity: 0.7 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.primary50, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={20} color={C.primary600} /></View>
          <Txt style={[font(400, 14, 20), { flex: 1, color: pod.photo ? C.text : C.text3 }]} lines={1}>{pod.photo || 'Take or upload a photo'}</Txt>
          <Txt style={[font(500, 12, 16), { color: C.primary600 }]}>{pod.photo ? 'Replace' : 'Browse'}</Txt>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          <Txt style={font(500, 12, 16)}>Recipient signature <Txt style={{ color: C.errorText }}>*</Txt></Txt>
          <Pressable onPress={() => pad.current?.clear()} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.primary50 }, pressed && { opacity: 0.6 }]}>
            <Icon name="rotate-ccw" size={14} color={C.primary600} />
            <Txt style={[font(500, 12, 16), { color: C.primary600 }]}>Clear</Txt>
          </Pressable>
        </View>
        <SignaturePad ref={pad} onChange={(v) => setPod((p) => ({ ...p, sig: v }))} style={{ height: 180, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary200, borderRadius: 14, backgroundColor: C.primary25 }}>
          {!pod.sig ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="signature" size={28} color={C.primary400} />
              <Txt style={[font(400, 12, 16), { color: C.text2 }]}>Sign above with your finger</Txt>
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 28, height: 1, backgroundColor: C.primary200 }} />
        </SignaturePad>
      </View>
    </View>
  );
}

// ─── Dispatch ───────────────────────────────────────────

function Dispatch({ dp, setDp, pad }: { dp: DispatchInfo; setDp: React.Dispatch<React.SetStateAction<DispatchInfo>>; pad: React.RefObject<SignaturePadHandle | null> }) {
  const s = useStore();
  const on = (k: keyof DispatchInfo) => (v: string) => setDp((d) => ({ ...d, [k]: v }));
  const pick = (k: keyof DispatchInfo, title: string, opts: string[]) => () => s.openPicker(title, opts.map((v) => ({ v, label: v })), dp[k] as string, on(k));
  const date = (k: 'exp' | 'disp', title: string) => () => s.openDate(title, 'date', fromIso(dp[k] ?? '') ?? new Date(), (d) => on(k)(iso(d)));
  const podAt = fromIso(dp.pod ?? '');
  const file = async () => { const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false }); if (!r.canceled) on('file')(r.assets[0].name); };
  const card = (icon: string, title: string, body: React.ReactNode) => (
    <Box>
      <CardHeader icon={icon} title={title} />
      <View style={{ padding: 14, gap: 12 }}>{body}</View>
    </Box>
  );
  const row = (a: React.ReactNode, b: React.ReactNode) => (
    <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}>{a}</View><View style={{ flex: 1 }}>{b}</View></View>
  );
  return (
    <>
      {card('user', 'Recipient information', <>
        <TextField label="Recipient name" required placeholder="Full name" value={dp.recipient ?? ''} onChangeText={on('recipient')} autoCapitalize="words" />
        <TextField label="Emergency contact" placeholder="50 000 0000" keyboardType="phone-pad" prefix="+971" value={dp.rPhone ?? ''} onChangeText={on('rPhone')} />
        <TextField label="Emirates ID" placeholder="784-XXXX-XXXXXXX-X" keyboardType="numbers-and-punctuation" value={dp.rEid ?? ''} onChangeText={on('rEid')} />
      </>)}
      {card('truck', 'Delivery information', <>
        <SelectField label="Delivery method" required placeholder="Select method" value={dp.method ?? ''} onPress={pick('method', 'Delivery method', ['VIT', 'Courier', 'Customer collection'])} />
        <SelectField label="Delivered by staff ID" required placeholder="Select staff" value={dp.staff ?? ''} onPress={pick('staff', 'Delivered by staff ID', PICKERS)} />
        {row(
          <TextField label="Expected delivery" value={showDate(dp.exp)} readOnly trailingIcon="calendar" onPress={date('exp', 'Expected delivery')} />,
          <TextField label="Dispatch date" required value={showDate(dp.disp)} readOnly trailingIcon="calendar" onPress={date('disp', 'Dispatch date')} />,
        )}
        {row(
          <TextField label="POD at" placeholder="Select" value={podAt ? `${podAt.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][podAt.getMonth()]} · ${hm(podAt)}` : ''} readOnly trailingIcon="calendar"
            onPress={() => s.openDate('POD at', 'datetime', podAt ?? new Date(), (d) => on('pod')(d.toISOString()))} />,
          <SelectField label="Payment type" placeholder="Select" value={dp.payment ?? ''} onPress={pick('payment', 'Payment type', ['Account', 'Cash', 'Card', 'Bank transfer'])} />,
        )}
        <TextField label="Delivery contact" placeholder="50 000 0000" keyboardType="phone-pad" prefix="+971" value={dp.dPhone ?? ''} onChangeText={on('dPhone')} />
        <View style={{ gap: 6 }}>
          <Txt style={font(500, 12, 16)}>POD files ID</Txt>
          <FileRow label={dp.file || 'Select file'} filled={!!dp.file} onPress={file} />
        </View>
        <TextField label="Delivery address" placeholder="Building, street, emirate" multiline rows={3} value={dp.address ?? ''} onChangeText={on('address')} />
      </>)}
      {card('hand', 'Handover details', <>
        <SelectField label="Handover vehicle ID" placeholder="Select vehicle" value={dp.hVehicle ?? ''} onPress={pick('hVehicle', 'Handover vehicle ID', ['DXB 44821', 'DXB 51290', 'SHJ 11873', 'AUH 70215'])} />
        {row(
          <TextField label="Handover to" placeholder="Team or person" value={dp.hTo ?? ''} onChangeText={on('hTo')} />,
          <TextField label="Handover truck" placeholder="Truck name" value={dp.hTruck ?? ''} onChangeText={on('hTruck')} />,
        )}
        <TextField label="Handover contact" placeholder="50 000 0000" keyboardType="phone-pad" prefix="+971" value={dp.hPhone ?? ''} onChangeText={on('hPhone')} />
      </>)}
      {card('package', 'Courier details', <>
        {row(
          <TextField label="Courier number" placeholder="CR-000000" value={dp.cNum ?? ''} onChangeText={on('cNum')} />,
          <TextField label="Courier company" placeholder="Company" value={dp.cCo ?? ''} onChangeText={on('cCo')} />,
        )}
        <TextField label="Courier EID" placeholder="784-XXXX-XXXXXXX-X" value={dp.cEid ?? ''} onChangeText={on('cEid')} />
      </>)}
      {card('id-card', 'Driver details', <>
        <TextField label="Driver name" placeholder="Full name as on gate pass" value={dp.driver ?? ''} onChangeText={on('driver')} autoCapitalize="words" />
        <TextField label="Driver contact" placeholder="50 000 0000" keyboardType="phone-pad" prefix="+971" value={dp.drPhone ?? ''} onChangeText={on('drPhone')} />
      </>)}
      {card('signature', 'Signature information', <>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}>
            <Txt style={[font(500, 12, 16), { flex: 1 }]}>Signature <Txt style={{ color: C.errorText }}>*</Txt></Txt>
            <Button variant="text" size="sm" leadingIcon="eraser" onPress={() => pad.current?.clear()}>Clear</Button>
          </View>
          <SignaturePad ref={pad} onChange={(v) => setDp((d) => ({ ...d, sig: v }))} style={{ height: 150, borderRadius: R.input, backgroundColor: C.field, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D5D9E0' }}>
            {!dp.sig ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="signature" size={24} color={C.n400} />
                <Txt style={[font(400, 12, 16), { color: C.text2 }]}>Sign here with your finger</Txt>
              </View>
            ) : null}
            <View style={{ position: 'absolute', left: 20, right: 20, bottom: 28, height: 1, backgroundColor: '#D5D9E0' }} />
          </SignaturePad>
        </View>
        <TextField label="Comments" placeholder="Seals verified at handover." multiline rows={3} value={dp.comments ?? ''} onChangeText={on('comments')} />
        <SelectField label="Signed by" required placeholder="Select staff" value={dp.signedBy ?? ''} onPress={pick('signedBy', 'Signed by', PICKERS)} />
      </>)}
    </>
  );
}
