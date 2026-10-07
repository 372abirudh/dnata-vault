import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, newOrderDraft, crTotal, customersOf, OrderDraft, CrLine } from '../../store';
import { C, R, font, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Box, Button, Checkbox, Grid, IconButton, SelectField, TextField, Txt } from '../../components/ds';
import { CardHeader, LockedField, SheetFooter, SheetHeader } from '../../components/vault';
import { FooterBar, Sheet } from '../../components/overlay';
import { CATALOG, ORDER_FACILITIES, PICKERS, SHORT, availAt, byCode, defaultBars, facCode, pkgsAt } from '../../data/seed';
import { aed } from '../../data/format';

function crGate(c: OrderDraft) {
  if (!c.customer) return 'Select the customer.';
  if (!c.facility) return 'Select the facility.';
  if (!c.lines.length) return 'No lines added yet';
  for (let i = 0; i < c.lines.length; i++) {
    const l = c.lines[i];
    if (!l.item) return `Choose the item for line ${i + 1}.`;
    if (l.qty < 1) return `Line ${i + 1}: enter the order quantity.`;
    const av = availAt(l.item, c.facility);
    if (av < l.qty) return `Line ${i + 1}: only ${av} in stock at ${facCode(c.facility)}.`;
    if (l.alloc === 'Manual' && l.bars.length !== l.qty) return `Line ${i + 1}: select ${l.qty} ${l.qty === 1 ? 'bar' : 'bars'} (${l.bars.length} selected).`;
  }
  return null;
}

export function OrderCreateSheet() {
  const s = useStore();
  const [c, setC] = useState<OrderDraft>(newOrderDraft);
  const [bp, setBp] = useState<{ i: number; sel: string[]; q: string } | null>(null);
  const close = () => s.set({ orderCreate: false });
  const up = (p: Partial<OrderDraft>) => setC((x) => ({ ...x, ...p }));
  const upLine = (i: number, fn: (l: CrLine, c: OrderDraft) => CrLine) => setC((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? fn(l, x) : l)) }));
  const customers = customersOf(s.grns, s.orders);
  const gate = crGate(c);
  const total = crTotal(c);
  const summary = `${c.lines.length} ${c.lines.length === 1 ? 'line' : 'lines'} · ${aed(total)}`;
  const simple = (title: string, list: string[], key: keyof OrderDraft) => () => s.openPicker(title, list.map((v) => ({ v, label: v })), c[key] as string, (v) => up({ [key]: v } as never));

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
    if (!r.canceled) up({ file: r.assets[0].name });
  };

  return (
    <>
      <Sheet
        onClose={close} z={40} bodyBg={C.bgApp} bodyStyle={{ paddingBottom: 20 }}
        header={<SheetHeader title="New order" subtitle="Raise a dispatch against a customer account" icon="truck" onClose={close} />}
        footer={<SheetFooter note={gate ?? summary} noteTone={gate ? 'warning' : 'neutral'} primaryLabel="Submit" primaryIcon="check" blocked={!!gate} onCancel={close} onPrimary={() => { if (!gate) s.createOrder(c); }} />}
      >
        <Box padded style={{ gap: 12 }}>
          <SelectField label="Order type" required placeholder="Select type" value={c.orderType} onPress={simple('Order type', ['Local', 'Export', 'Transit'], 'orderType')} />
          <SelectField label="Customer name" required placeholder="Select customer" value={customers.find((x) => x.id === c.customer)?.name ?? ''}
            onPress={() => s.openPicker('Customer', customers.map((x) => ({ v: x.id, label: x.name, sub: x.id })), c.customer, (v) => up({ customer: v, account: customers.find((x) => x.id === v)!.name }))} />
          <SelectField label="Facility" required placeholder="Select facility" value={c.facility}
            onPress={() => s.openPicker('Facility', ORDER_FACILITIES.map((v) => ({ v, label: v, sub: facCode(v) })), c.facility, (v) =>
              setC((x) => ({ ...x, facility: v, lines: x.lines.map((l) => (l.alloc === 'Manual' ? { ...l, bars: defaultBars(l.item, l.qty, v) } : l)) })))} />
          <SelectField label="Source" placeholder="Select source" value={c.source} onPress={simple('Source', ['Dnata system', 'Counter', 'Vault', 'Airside'], 'source')} />
        </Box>
        <Box padded style={{ gap: 12 }}>
          <TextField label="Address line 1" placeholder="P.O Box, building" value={c.addr1} onChangeText={(v) => up({ addr1: v })} />
          <TextField label="Address line 2" placeholder="Street, area" value={c.addr2} onChangeText={(v) => up({ addr2: v })} />
          <View style={{ gap: 6 }}>
            <Txt style={font(500, 12, 16)}>Attachments</Txt>
            <FileRow label={c.file || 'Select file'} filled={!!c.file} onPress={pickFile} />
          </View>
        </Box>
        <Box>
          <CardHeader icon="package" title="Order items" subtitle="Select each item and the quantity to dispatch" />
          {c.lines.map((l, i) => {
            const it = byCode(l.item);
            const av = it ? availAt(l.item, c.facility) : 0;
            const lb = l.bars;
            return (
              <View key={i} style={{ padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt style={[font(600, 12, 16), { flex: 1, color: C.text2 }]}>Item {i + 1}</Txt>
                  <IconButton icon="x" label="Remove item" variant="neutral" size="sm" onPress={() => setC((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))} />
                </View>
                <SelectField label="Item name" required placeholder="Select item" value={it?.name ?? ''}
                  onPress={() => s.openPicker('Item', CATALOG.map((x) => ({ v: x.code, label: x.name, sub: `${availAt(x.code, c.facility)} at ${facCode(c.facility)} · ${aed(x.price)} each` })), l.item, (v) =>
                    upLine(i, (q, cc) => { const n = Math.min(q.qty, availAt(v, cc.facility)) || 1; return { item: v, qty: n, alloc: q.alloc, bars: q.alloc === 'Manual' ? defaultBars(v, n, cc.facility) : [] }; }))} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <LockedField grow label="In stock" value={it ? String(av) : '—'} />
                  <View style={{ flex: 1 }}>
                    <TextField label="Order qty" required keyboardType="number-pad" value={l.qty ? String(l.qty) : ''}
                      onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); upLine(i, (q) => { const qty = isNaN(n) ? 0 : it ? Math.min(n, av || 1) : n; return { ...q, qty, bars: q.bars.slice(0, qty) }; }); }} />
                  </View>
                </View>
                <SelectField label="Allocation type" required placeholder="Select type" value={l.alloc}
                  onPress={() => s.openPicker('Allocation type', [{ v: 'FIFO', label: 'FIFO', sub: 'Oldest packages first · bars assigned at pick' }, { v: 'Manual', label: 'Manual', sub: 'Choose the exact bars to release' }], l.alloc, (v: 'FIFO' | 'Manual') =>
                    upLine(i, (q, cc) => ({ ...q, alloc: v, bars: v === 'Manual' ? defaultBars(q.item, q.qty, cc.facility) : [] })))} />
                {l.alloc === 'Manual' ? (
                  <TextField label="Bars" required placeholder="Select bars" readOnly trailingIcon="chevron-down" suffix={`${lb.length}/${l.qty}`}
                    value={lb.length ? lb.slice(0, 2).join(', ') + (lb.length > 2 ? ` +${lb.length - 2}` : '') : ''}
                    helper={lb.length === l.qty ? 'All bars selected' : `Select ${l.qty - lb.length} more`}
                    onPress={() => (it ? setBp({ i, sel: [...lb], q: '' }) : s.flash('Choose the item first.'))} />
                ) : (
                  <LockedField label="Bars" value="Auto by package date" icon="calendar" />
                )}
              </View>
            );
          })}
          <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Button variant="outline" size="md" leadingIcon="plus" onPress={() => setC((x) => ({ ...x, lines: [...x.lines, { item: '', qty: 1, alloc: 'FIFO', bars: [] }] }))}>Add new</Button>
            <Txt style={[font(400, 13, 18), tabular, { flex: 1, textAlign: 'right', color: C.text2 }]}>{summary}</Txt>
          </View>
        </Box>
      </Sheet>
      {bp ? (
        <BarsPicker
          draft={c} bp={bp} setBp={setBp}
          onDone={(sel) => { upLine(bp.i, (q) => ({ ...q, bars: sel })); setBp(null); }}
        />
      ) : null}
    </>
  );
}

export function FileRow({ label, filled, onPress }: { label: string; filled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 16, paddingRight: 14, borderRadius: R.input, backgroundColor: pressed ? C.fieldPressed : C.field }]}>
      <Txt style={[font(400, 14, 20), { flex: 1, color: filled ? C.text : C.text3 }]} lines={1}>{label}</Txt>
      <Icon name="upload" size={18} color={C.n600} />
    </Pressable>
  );
}

// ─── Manual bar selection ───────────────────────────────

function BarsPicker({ draft, bp, setBp, onDone }: {
  draft: OrderDraft; bp: { i: number; sel: string[]; q: string }; setBp: (v: { i: number; sel: string[]; q: string } | null) => void; onDone: (sel: string[]) => void;
}) {
  const flash = useStore((s) => s.flash);
  const l = draft.lines[bp.i];
  const need = l.qty, sel = bp.sel, q = bp.q.trim().toLowerCase(), fc = facCode(draft.facility);
  const ps = pkgsAt(l.item, draft.facility);
  const set = (fn: (a: string[]) => string[]) => setBp({ ...bp, sel: fn(bp.sel.slice()) });
  const full = () => flash(`Order quantity is ${need} — clear a bar first.`);
  const groups = ps.filter((p) => !q || p.id.toLowerCase().includes(q) || p.bars.some((x) => x.toLowerCase().includes(q)));
  const np = ps.filter((p) => p.bars.some((x) => sel.includes(x))).length, ok = sel.length === need;
  const close = () => setBp(null);
  return (
    <Sheet
      onClose={close} z={60} bodyBg={C.bgApp} form={false}
      header={
        <>
          <SheetHeader title="Select bars" subtitle={`${SHORT[l.item] ?? ''} · ${need} ${need === 1 ? 'bar' : 'bars'} · ${fc}`} icon="scan-barcode" onClose={close} />
          <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 4, backgroundColor: C.bgApp, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingLeft: 20, paddingRight: 16, borderRadius: 999, backgroundColor: '#fff' }}>
              <TextInput value={bp.q} onChangeText={(v) => setBp({ ...bp, q: v })} placeholder="Search bar or package ID" placeholderTextColor={C.n500} autoCorrect={false} style={[font(400, 14, 20), { flex: 1, color: C.text, padding: 0 }]} />
              <Icon name="search" size={20} color={C.n500} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
              <Txt style={[font(400, 12, 16), { flex: 1, color: C.text2 }]}>Packages listed oldest first</Txt>
              <Button variant="text" size="sm" onPress={() => set(() => [])}>Clear</Button>
            </View>
          </View>
        </>
      }
      bodyStyle={{ paddingTop: 4, paddingBottom: 20 }}
      footer={
        <SheetFooter note={`${sel.length} of ${need} bars · ${np} ${np === 1 ? 'package' : 'packages'}`} noteTone={ok ? 'success' : 'warning'}
          cancelLabel="Reset to default" primaryLabel="Done" primaryIcon="check" blocked={!ok}
          onCancel={() => set(() => defaultBars(l.item, need, draft.facility))} onPrimary={() => ok && onDone(sel)} />
      }
    >
      {groups.map((p) => {
        const shown = q && !p.id.toLowerCase().includes(q) ? p.bars.filter((x) => x.toLowerCase().includes(q)) : p.bars;
        const n = p.bars.filter((x) => sel.includes(x)).length, all = n === p.bars.length;
        return (
          <Box key={p.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: n ? C.primary25 : '#F9FAFB', borderBottomWidth: 1, borderBottomColor: C.hairline }}>
              <Checkbox
                style={{ flex: 1 }} checked={all} indeterminate={n > 0 && !all} label={p.id} description={`${p.date} · ${p.fac} · ${p.vault}`}
                onChange={() => {
                  if (all) return set((a) => a.filter((x) => !p.bars.includes(x)));
                  const room = need - sel.length;
                  if (room <= 0) return full();
                  set((a) => { p.bars.filter((x) => !a.includes(x)).slice(0, room).forEach((x) => a.push(x)); return a; });
                }}
              />
              <Txt style={[font(600, 12, 16), tabular, { color: n ? C.primary600 : C.text2 }]}>{n}/{p.bars.length}</Txt>
            </View>
            <Grid
              columnGap={12} rowGap={0} style={{ paddingTop: 2, paddingHorizontal: 14, paddingBottom: 6 }}
              cells={shown.map((x) => {
                const on = sel.includes(x);
                return <Checkbox key={x} checked={on} label={x} onChange={() => (on ? set((a) => a.filter((y) => y !== x)) : sel.length >= need ? full() : set((a) => [...a, x]))} />;
              })}
            />
          </Box>
        );
      })}
      {!groups.length ? (
        <View style={{ paddingVertical: 24, paddingHorizontal: 14, borderRadius: R.card, backgroundColor: '#fff' }}>
          <Txt style={[font(400, 13, 18), { color: C.text2, textAlign: 'center' }]}>{ps.length ? `No bars match “${bp.q.trim()}”.` : `No stock of this item at ${fc}.`}</Txt>
        </View>
      ) : null}
    </Sheet>
  );
}

// ─── Allocate to picker ─────────────────────────────────

export function AllocSheet({ no }: { no: string }) {
  const s = useStore();
  const o = s.orders.find((x) => x.no === no)!;
  const [picker, setPicker] = useState('Omar Farooq');
  const [note, setNote] = useState('Release window 10:00–12:00');
  const close = () => s.set({ allocNo: null });
  return (
    <Sheet
      onClose={close} z={45} bodyStyle={{ padding: 16, gap: 16 }}
      header={<SheetHeader title="Allocate to picker" subtitle={`${o.no} · ${o.customer}`} icon="user-check" onClose={close} />}
      footer={
        <FooterBar base={34} style={{ flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 16 }}>
          <View style={{ flex: 1 }}><Button variant="secondary" size="lg" fullWidth onPress={close}>Cancel</Button></View>
          <View style={{ flex: 2 }}><Button size="lg" fullWidth leadingIcon="user-check" disabled={!picker} onPress={() => s.allocate(no, picker, note)}>Allocate</Button></View>
        </FooterBar>
      }
    >
      <Txt style={[font(400, 12, 17), { color: C.text2 }]}>A pick task is raised for the picker. They select the actual bars from the vault for each line, then mark the order picked.</Txt>
      <TextField leadingIcon="user" label="Picker" required placeholder="Select picker" value={picker} readOnly trailingIcon="chevron-down"
        onPress={() => s.openPicker('Picker', PICKERS.map((v) => ({ v, label: v, sub: 'Vault picker' })), picker, setPicker)} />
      <TextField label="Comments" multiline rows={4} placeholder="Handling notes for the picker" value={note} onChangeText={setNote} />
    </Sheet>
  );
}
