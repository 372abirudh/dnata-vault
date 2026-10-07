import React from 'react';
import { ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '../../store';
import type { Order, SigData } from '../../data/types';
import { C, font, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Badge, Box, Button, Grid, IconTile, ListRow, StatusChip, Txt } from '../../components/ds';
import { CardHeader, DetailHeader, DetailTabs, InfoSection, NextStep, ProgressStep, ProgressSteps, SheetHeader, Timeline } from '../../components/vault';
import { PushScreen, Sheet, useDetailPad } from '../../components/overlay';
import { Logo, SigView } from '../../components/art';
import { ME, WT, byCode } from '../../data/seed';
import { aed, nowShort, plural } from '../../data/format';
import { ORDER_FLOW, createdOf, deliveryOf, orderActIcon, orderActText, orderNextAct, orderPrompt } from '../../logic/orders';
import { podHtml, printHtml } from '../../logic/docs';

const eventIcon = (t: string) =>
  /created/i.test(t) ? 'file-text' : /approved/i.test(t) ? 'shield-check' : /pick/i.test(t) ? 'list-checks' : /pack/i.test(t) ? 'box' : /dispatch/i.test(t) ? 'truck' : /deliver/i.test(t) ? 'circle-check' : 'clock';

const bagsOf = (o: Order) =>
  o.pack
    ? o.pack.bags && o.pack.bags.length
      ? o.pack.bags
      : String(o.pack.seal || '').split(',').map((t) => t.trim()).filter(Boolean).map((seal, j) => ({ item: o.items[Math.min(j, o.items.length - 1)].name, qty: '', s1: seal, s2: '', pid: `${o.no}-B${j + 1}` }))
    : [];

export function OrderDetail({ no }: { no: string }) {
  const s = useStore();
  const o = s.orders.find((x) => x.no === no);
  const pad = useDetailPad();
  if (!o) return null;
  const a = orderNextAct(o.status);
  const back = () => s.set({ orderActive: null });
  return (
    <PushScreen onBack={back} z={30}>
      <DetailHeader
        backLabel="Orders" onBack={back} icon="truck" title={o.no} subtitle={`${o.customer} · ${o.type}`} status={o.status}
        facts={[{ label: 'Release', value: o.release }, { label: 'Destination', value: o.dest.split(' · ')[0] }, { label: 'Value', value: o.value }]}
        actText={a ? orderActText(a, o.status) : null} actIcon={a ? orderActIcon(a) : undefined} onAction={() => s.runOrder(o.no)}
      />
      <DetailTabs
        items={[{ key: 'overview', label: 'Overview' }, { key: 'items', label: 'Lines & bags' }, { key: 'docs', label: 'Documents' }, { key: 'activity', label: 'Activity' }]}
        active={s.oTab} onChange={(k) => s.set({ oTab: k })}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: pad, gap: 12 }} showsVerticalScrollIndicator={false}>
        {s.oTab === 'overview' ? <Overview o={o} /> : null}
        {s.oTab === 'items' ? <Lines o={o} /> : null}
        {s.oTab === 'docs' ? <Docs o={o} /> : null}
        {s.oTab === 'activity' ? <Activity o={o} /> : null}
      </ScrollView>
    </PushScreen>
  );
}

function Overview({ o }: { o: Order }) {
  const x = o.extra ?? {}, dsp = o.dispatch ?? {}, pod = o.pod;
  const fi = ORDER_FLOW.indexOf(o.status as never);
  const PRE = [/created/i, /approved|allocat/i, /pick/i, /pack/i, /dispatch/i, /deliver/i];
  const progress: ProgressStep[] = ['Created', 'Allocated', 'Picked', 'Packed', 'Dispatched', 'Delivered'].map((label, i, arr) => {
    const last = i === arr.length - 1, done = fi >= 0 && (i < fi || (last && i === fi)), cur = i === fi;
    const e = o.history.find((h) => PRE[i].test(h.t));
    return { label, done, cur: cur && !done, lineOn: i < fi, time: e ? e.ts : '', sub: e ? e.a.split(' · ')[0] : cur ? 'In progress' : 'Pending' };
  });
  const bags = bagsOf(o);
  const R2 = (rows: [string, string | undefined][]) => rows.filter((r) => r[1] != null && String(r[1]).trim() !== '').map((r) => ({ label: r[0], value: String(r[1]) }));
  const details = R2([
    ['Order type', o.type], ['Source', x.source], ['Release date', o.release], ['Facility', o.facility], ['Delivery', x.method], ['Destination', o.dest],
    ['Account', x.account || o.customer], ['Payment', x.payment || dsp.payment], ['AWB', x.awb || dsp.cNum], ['Recipient', pod?.recipient || dsp.recipient || x.recipient],
    ['Emirates ID', pod?.eid || dsp.rEid], ['Emergency contact', dsp.rPhone ? '+971 ' + dsp.rPhone : x.contact], ['Handover', dsp.hTo || dsp.carrier],
    ['Vehicle', dsp.hVehicle || dsp.vehicle], ['Bags', o.pack ? `${bags.length} sealed` : ''], ['POD at', pod?.at], ['Created by', (o.history[0]?.a || '').split(' · ')[0]],
  ]);
  const TK: [string, RegExp][] = [['Pick task', /pick/i], ['Pack task', /pack/i], ['Dispatch', /dispatch/i], ['Delivery', /deliver/i]];
  const assign = TK.map(([task, re]) => { const e = o.history.find((h) => re.test(h.t)); return e ? { name: e.a.split(' · ')[0], sub: `${task} · done`, meta: e.ts } : null; }).filter(Boolean) as { name: string; sub: string; meta: string }[];
  return (
    <>
      <ProgressSteps steps={progress} />
      <NextStep text={orderPrompt(o.status)} />
      <InfoSection section={{ icon: 'file-text', title: 'Order details', sub: 'Routing, delivery and handover', items: details }} />
      <Box>
        <CardHeader icon="user-check" title="Assignment" subtitle={assign.length ? plural(assign.length, 'task') + ' completed' : 'No tasks started yet'} />
        {assign.length ? (
          <View style={{ paddingVertical: 4 }}>
            {assign.map((a, j) => <ListRow key={j} leading="user" leadingTone="primary" title={a.name} subtitle={a.sub} meta={a.meta} divider={j < assign.length - 1} />)}
          </View>
        ) : (
          <Txt style={[font(400, 13, 18), { padding: 14, color: C.text2 }]}>Staff appear here as they pick, pack and dispatch this order.</Txt>
        )}
      </Box>
    </>
  );
}

function Lines({ o }: { o: Order }) {
  const s = useStore();
  const bags = bagsOf(o);
  const total = o.items.reduce((t, it) => t + (byCode(it.code)?.price ?? 0) * it.qty, 0);
  const outOf = (picked: boolean): [string, string] =>
    o.status === 'Delivered' ? ['Delivered', 'success'] : o.status === 'Dispatched' ? ['Dispatched', 'info'] : o.status === 'Ready for dispatch' ? ['Packed', 'info']
      : o.status === 'Cancelled' ? ['Cancelled', 'neutral'] : picked ? ['Picked', 'info'] : ['Pending', 'warning'];
  return (
    <>
      <Box>
        <CardHeader icon="boxes" title="Lines" subtitle={`${plural(o.items.length, 'line')} · ${aed(total)}`} />
        {o.items.map((it, j) => {
          const c = byCode(it.code), bars = it.bars ?? [], key = `${o.no}:${j}`, open = !!s.barsOpen[key];
          const bg = bags.filter((b) => b.item === it.name).map((b) => b.pid);
          const out = outOf(it.picked);
          const w = Math.round((WT[it.code] || 0) * it.qty * 1000) / 1000;
          const unit = String(it.unit || '').replace(/s$/, '').replace(/^./, (m) => m.toUpperCase());
          return (
            <View key={j} style={{ padding: 14, gap: 10, borderTopWidth: j ? 1 : 0, borderTopColor: C.hairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <IconTile name="box" tone="primary" size={36} radius={10} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={font(600, 13, 18)}>{it.name.split(' · ')[0]}</Txt>
                  <Txt style={[font(400, 12, 16), tabular, { color: C.text2, marginTop: 2 }]}>{`${unit} · Qty ${it.qty} · ${w} kg`}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Txt style={[font(600, 13, 18), tabular]}>{c ? aed(c.price * it.qty) : '—'}</Txt>
                  <StatusChip tone={out[1]} label={out[0]} size="sm" />
                </View>
              </View>
              {bars.length ? (
                <View style={{ gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.muted }}>
                  <Txt style={[font(500, 12, 16), { color: C.text2 }]}>Bars · {bars.length}</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {(open ? bars : bars.slice(0, 6)).map((b) => <Badge key={b} label={b} tone="primary" />)}
                  </View>
                  {bars.length > 6 ? (
                    <View style={{ alignSelf: 'flex-start' }}>
                      <Button variant="text" size="sm" onPress={() => s.set({ barsOpen: { ...s.barsOpen, [key]: !open } })}>{open ? 'Show less' : `+${bars.length - 6} more`}</Button>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {bg.length ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IconSmall />
                  <Txt style={[font(400, 12, 16), { color: C.text2 }]}>Bag</Txt>
                  <Txt style={[font(500, 12, 16), tabular, { flex: 1 }]} lines={1}>{bg.join(', ')}</Txt>
                </View>
              ) : null}
            </View>
          );
        })}
      </Box>
      <Box>
        <CardHeader icon="package" title="Bags & seals" subtitle={bags.length ? `${plural(bags.length, 'bag')} sealed` : 'Not packed yet'} />
        {bags.map((b, j) => (
          <View key={j} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 8, borderTopWidth: j ? 1 : 0, borderTopColor: C.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt style={font(600, 13, 18)}>Bag {j + 1}</Txt>
              <Txt style={[font(400, 12, 16), { flex: 1, textAlign: 'right', color: C.text2 }]} lines={1}>{String(b.item || '').split(' · ')[0]}</Txt>
            </View>
            <Grid
              columnGap={12} rowGap={8} spans={[1, 1, 2]}
              cells={[['Seal 1', b.s1 || '—'], ['Seal 2', b.s2 || '—'], ['Packing ID', b.pid || '—']].map(([k, v]) => (
                <View key={k}>
                  <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{k}</Txt>
                  <Txt style={[font(500, 13, 18), tabular, { marginTop: 2 }]}>{v}</Txt>
                </View>
              ))}
            />
          </View>
        ))}
        {!bags.length ? <Txt style={[font(400, 13, 18), { padding: 14, color: C.text2 }]}>Bags and seals appear here once the order is packed.</Txt> : null}
      </Box>
    </>
  );
}
const IconSmall = () => <Icon name="package" size={14} color={C.n400} />;

function Docs({ o }: { o: Order }) {
  const s = useStore();
  const dispd = o.status === 'Dispatched' || o.status === 'Delivered';
  const gen: [string, string, string, boolean, string][] = [
    ['VHR — Delivery', 'Valuable handling receipt', 'file-text', dispd, 'Available after dispatch'],
    ['VHR (bar detail)', 'Serial-level receipt', 'file-text', dispd, 'Available after dispatch'],
    ['Delivery note', 'Goods handed over', 'file-text', dispd, 'Available after dispatch'],
    ['Pack labels', 'One label per sealed bag', 'tag', !!o.pack, 'Available after packing'],
    ['POD document', 'Signed proof of delivery', 'id-card', o.status === 'Delivered', 'Available after delivery'],
  ];
  const pod = o.pod, dsp = o.dispatch ?? {};
  const files = [
    ...(pod?.sigImg || pod?.at ? [{ name: 'POD signature', icon: 'pen-line', ts: pod?.at || '' }] : []),
    ...(dsp.file ? [{ name: `POD files — ${dsp.file}`, icon: 'paperclip', ts: '' }] : []),
    ...(dsp.sigImg ? [{ name: 'Dispatch signature', icon: 'pen-line', ts: '' }] : []),
    ...(o.docs ?? []),
  ];
  const attach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
    if (r.canceled) return;
    const name = r.assets[0].name;
    s.patchOrder(o.no, (x) => { x.docs = [...(x.docs ?? []), { name, icon: 'paperclip', ts: nowShort() }]; });
    s.flash(`${name} attached.`);
  };
  return (
    <>
      <Box>
        <CardHeader icon="printer" title="Generate a document" subtitle="Open, print or save any of these against this order" />
        <View style={{ paddingVertical: 4 }}>
          {gen.map(([t, sub, icon, ok, why], j) => (
            <ListRow key={t} leading={icon} leadingTone="primary" title={t} subtitle={ok ? sub : why} trailing="chevron" disabled={!ok} divider={j < gen.length - 1}
              onPress={() => (t === 'POD document' ? s.set({ podDoc: o.no }) : s.flash(`${t} sent to print.`))} />
          ))}
        </View>
      </Box>
      <Box>
        <CardHeader icon="folder-open" title="Documents" subtitle="Receipts, POD and labels filed against this order" actionLabel="Attach" actionIcon="plus" onAction={attach} />
        {files.length ? (
          <View style={{ paddingVertical: 4 }}>
            {files.map((f, j) => <ListRow key={j} leading={f.icon} leadingTone="neutral" title={f.name} meta={f.ts} divider={j < files.length - 1} />)}
          </View>
        ) : (
          <Txt style={[font(400, 13, 18), { padding: 14, color: C.text2 }]}>No documents filed yet. Attach receipts, POD or labels here.</Txt>
        )}
      </Box>
    </>
  );
}

function Activity({ o }: { o: Order }) {
  const s = useStore();
  const closed = o.status === 'Delivered';
  const billable = o.billable ?? [];
  const mark = () =>
    s.openPicker('Mark activity', ['Repacking', 'Inspection', 'Value-added service', 'Seal replacement'].map((v) => ({ v, label: v })), null, (v: string) => {
      s.patchOrder(o.no, (x) => {
        x.billable = [...(x.billable ?? []), { t: v, by: ME, ts: nowShort() }];
        x.history = [...x.history, { t: 'Billable activity', a: ME, ts: nowShort(), d: v }];
      });
      s.flash(`${v} marked as billable.`);
    });
  return (
    <>
      <Timeline
        title="Progress" meta={plural(o.history.length, 'event')}
        steps={o.history.slice().reverse().map((e, i) => ({ title: e.t, subtitle: e.d ? `${e.a} — ${e.d}` : e.a, timeLine: e.ts, icon: eventIcon(e.t), cur: i === 0 && !closed }))}
      />
      <Box>
        <CardHeader icon="receipt" title="Billable activities" subtitle="Repacking, inspection, VAS and seal charges — billed on the next invoice" actionLabel="Mark" actionIcon="plus" onAction={mark} />
        {billable.length ? (
          <View style={{ paddingVertical: 4 }}>
            {billable.map((b, j) => <ListRow key={j} leading="receipt" leadingTone="primary" title={b.t} subtitle={b.by} meta={b.ts} divider={j < billable.length - 1} />)}
          </View>
        ) : (
          <Txt style={[font(400, 13, 18), { padding: 14, color: C.text2 }]}>No special handling marked on this order.</Txt>
        )}
      </Box>
    </>
  );
}

// ─── POD document ───────────────────────────────────────

const SANS = { color: '#101828' };
export function PodDocSheet({ no }: { no: string }) {
  const s = useStore();
  const d = s.orders.find((x) => x.no === no);
  if (!d) return null;
  const close = () => s.set({ podDoc: null });
  const p = d.pod, dsp = d.dispatch ?? {}, x = d.extra ?? {};
  const f: [string, string][] = [['Order', d.no], ['Customer', d.customer], ['Recipient', p?.recipient || dsp.recipient || x.recipient || '—'], ['Delivery', deliveryOf(d)],
    ['Created', createdOf(d)], ['Value', d.value], ['AWB', x.awb || dsp.cNum || '—'], ['Handover', dsp.hTo || dsp.carrier || '—']];
  const items = d.items.map((it) => { const c = byCode(it.code); return { name: it.name.split(' · ')[0], qty: String(it.qty), wt: `${Math.round((WT[it.code] || 0) * it.qty * 1000) / 1000} kg`, val: c ? aed(c.price * it.qty) : '—' }; });
  const h = d.history.slice().reverse().find((h2) => /deliver/i.test(h2.t));
  const at = p?.at || h?.ts || '';
  const print = () => printHtml(podHtml(d)).then(() => s.flash(`POD ${d.no} sent to print.`)).catch(() => s.flash('Printing is not available on this device.', 'warning'));
  const sigs: [string, string, SigData | undefined][] = [
    ['Released by (dnata)', dsp.signedBy || dsp.staff || '', dsp.sigImg],
    ['Received by (recipient)', p?.recipient || dsp.recipient || '', p?.sigImg],
  ];
  return (
    <Sheet
      onClose={close} z={45} bodyBg={C.bgApp} bodyStyle={{ paddingBottom: 34 }}
      header={<SheetHeader title="POD document" subtitle={d.no} icon="id-card" actionLabel="Print" actionIcon="printer" onAction={print} onClose={close} />}
    >
      <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Logo height={24} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#ECFDF3' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A' }} />
              <Txt style={[font(600, 11, 14), { color: '#067647' }]}>{d.status}</Txt>
            </View>
          </View>
          <View>
            <Txt style={[font(700, 18, 24), SANS]}>Proof of delivery</Txt>
            <Txt style={[font(400, 12, 16), { color: '#6A7280', marginTop: 2 }]}>dnata valuable cargo · Vault operations</Txt>
          </View>
        </View>
        <Grid
          style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 12 }} columnGap={16} rowGap={0}
          cells={f.map(([k, v]) => (
            <View key={k} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' }}>
              <Txt style={[font(500, 11, 14), { color: '#6A7280' }]}>{k}</Txt>
              <Txt style={[font(500, 13, 18), tabular, SANS, { marginTop: 2 }]}>{v}</Txt>
            </View>
          ))}
        />
        <View style={{ marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: C.hairline, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F6F7F9' }}>
            <Txt style={[font(600, 12, 16), { flex: 1, color: '#344054' }]}>Items delivered</Txt>
            <Txt style={[font(500, 11, 14), { color: '#6A7280' }]}>{plural(items.length, 'line')}</Txt>
          </View>
          {items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.hairline }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={[font(600, 13, 18), SANS]}>{it.name}</Txt>
                <Txt style={[font(400, 11, 14), tabular, { color: '#6A7280', marginTop: 2 }]}>Qty {it.qty} · {it.wt}</Txt>
              </View>
              <Txt style={[font(600, 13, 18), tabular, SANS]}>{it.val}</Txt>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.hairline, backgroundColor: '#F4F8FF' }}>
            <Txt style={[font(600, 12, 16), { flex: 1, color: '#1A4CB8' }]}>Declared value</Txt>
            <Txt style={[font(700, 14, 20), tabular, { color: '#1A4CB8' }]}>{d.value}</Txt>
          </View>
        </View>
        <View style={{ padding: 16, flexDirection: 'row', gap: 10 }}>
          {sigs.map(([role, name, sig]) => (
            <View key={role} style={{ flex: 1, minWidth: 0, gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#F6F7F9' }}>
              <View style={{ height: 56, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: '#D5D9E0', justifyContent: 'flex-end' }}>
                {sig ? <SigView sig={sig} height={52} /> : null}
              </View>
              <View>
                <Txt style={[font(500, 11, 14), { color: '#6A7280' }]}>{role}</Txt>
                <Txt style={[font(600, 13, 18), SANS, { marginTop: 2 }]} lines={1}>{name}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.hairline }}>
          <Txt style={[font(400, 11, 14), { flex: 1, color: '#6A7280' }]}>{at ? `Delivered ${at}` : 'Awaiting delivery'}</Txt>
          <Txt style={[font(400, 11, 14), tabular, { color: '#6A7280' }]}>{d.no}</Txt>
        </View>
      </View>
    </Sheet>
  );
}
