import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useStore } from '../store';
import { C, R, font, tabular } from '../theme/tokens';
import { Icon } from '../icons/Icon';
import { Avatar, EmptyState, IconTile, SegmentedControl, StatusChip, Txt } from '../components/ds';
import { BottomNav, Hero, HeroKpi, NavItem, RecordCard, RecordRow, SheetHeader, StatusTabs } from '../components/vault';
import { Grabber, Sheet, useFooterPad, useNavBottom, useSheetDrag } from '../components/overlay';
import { IconButton } from '../components/ds';
import { initials, shortFac, todayLine } from '../data/format';
import { GRN_TABS, grnLabel, grnNextAct, grnTone, sumExp } from '../logic/grn';
import { ORDER_TABS, ORDER_TAB_ICON, createdOf, deliveryOf, orderActText, orderNextAct, orderTone, recipientOf } from '../logic/orders';

/** Today's activity KPIs across receipts and orders. */
export function useHomeKpis() {
  const grns = useStore((s) => s.grns), orders = useStore((s) => s.orders);
  return useMemo(() => {
    const cg = (st: string) => grns.filter((x) => x.status === st).length, co = (st: string) => orders.filter((x) => x.status === st).length;
    const total = grns.length + orders.length - co('Cancelled'), pending = cg('Draft') + co('Pending'), done = cg('Closed') + co('Delivered');
    const active = Math.max(0, total - pending - done);
    const kpis: HeroKpi[] = [
      { label: 'Pending', value: pending, icon: 'clock' },
      { label: 'In progress', value: active, icon: 'activity' },
      { label: 'Completed', value: done, icon: 'circle-check' },
    ];
    return { kpis, pct: (total ? Math.round((done / total) * 100) : 0) + '%' };
  }, [grns, orders]);
}

/** Home / Put away / Profile items for the floating nav. */
export function useNav(onHomeTop?: () => void): NavItem[] {
  const page = useStore((s) => s.page), set = useStore((s) => s.set);
  return [
    { label: 'Home', icon: 'house', on: page === 'home', onPress: () => (page === 'home' ? onHomeTop?.() : set({ page: 'home', createMenu: false })) },
    { label: 'Put away', icon: 'warehouse', on: page === 'putaway', onPress: () => (page === 'putaway' ? onHomeTop?.() : set({ page: 'putaway', section: 'receipts', createMenu: false })) },
    { label: 'Profile', icon: 'circle-user', on: false, onPress: () => set({ acct: true, createMenu: false }) },
  ];
}

export function HomeScreen() {
  const s = useStore();
  const scroll = useRef<ScrollView>(null);
  const { kpis, pct } = useHomeKpis();
  const nav = useNav(() => scroll.current?.scrollTo({ y: 0, animated: true }));
  const navBottom = useNavBottom();
  const receipts = s.section === 'receipts';
  const q = s.q.trim().toLowerCase();

  const tabs = receipts
    ? GRN_TABS.map((t) => ({ key: t.key, label: t.key === 'All' ? 'All' : grnLabel(t.key as never), icon: t.icon, count: t.key === 'All' ? s.grns.length : s.grns.filter((g) => g.status === t.key).length }))
    : ORDER_TABS.map((k) => ({ key: k, label: k, icon: ORDER_TAB_ICON[k], count: k === 'All' ? s.orders.length : s.orders.filter((o) => o.status === k).length }));

  const rows: RecordRow[] = receipts
    ? s.grns
        .filter((g) => (s.grnTab === 'All' || g.status === s.grnTab) && (!q || `${g.no} ${g.customer} ${g.custId} ${g.po}`.toLowerCase().includes(q)))
        .map((g) => {
          const a = grnNextAct(g.status);
          const asg = g.assignee !== '—' ? g.assignee : '', by = g.createdBy !== '—' ? g.createdBy : '';
          return {
            customer: g.customer, no: g.no, tone: grnTone(g.status), status: grnLabel(g.status),
            grid: [{ label: 'PO number', value: g.po }, { label: 'Facility', value: shortFac(g.facility) }, { label: 'Pieces', value: `${sumExp(g)} pcs` }],
            who: asg || by || 'Not assigned',
            whatLine: asg ? (g.assigneeRole !== '—' ? g.assigneeRole : 'Assigned') : by ? 'GRN created · awaiting staff' : 'Awaiting staff assignment',
            when: g.updated.replace(/ \d{4}/, ''), dateLabel: 'Expected', dateValue: g.expected,
            actText: a ?? 'View', onAct: a ? () => s.runGrn(g.no) : () => s.openGrn(g.no), onOpen: () => s.openGrn(g.no),
          };
        })
    : s.orders
        .filter((o) => (s.orderTab === 'All' || o.status === s.orderTab) && (!s.dFilter || deliveryOf(o) === s.dFilter) && (!q || `${o.no} ${o.customer} ${recipientOf(o)} ${o.dest}`.toLowerCase().includes(q)))
        .map((o) => {
          const a = orderNextAct(o.status);
          const e = o.history[o.history.length - 1];
          const w = String(e?.a ?? '').split(' · ')[0];
          return {
            customer: o.customer, no: o.no, tone: orderTone(o.status), status: o.status,
            grid: [{ label: 'Recipient', value: recipientOf(o) }, { label: 'Delivery', value: deliveryOf(o) }, { label: 'Value', value: o.value }],
            who: w || '—', whatLine: e?.t ?? '', when: e?.ts ?? '', dateLabel: 'Created', dateValue: createdOf(o),
            actText: a ? orderActText(a, o.status) : o.status === 'Delivered' ? 'POD document' : 'View order',
            onAct: a ? () => s.runOrder(o.no) : o.status === 'Delivered' ? () => s.set({ podDoc: o.no }) : () => s.openOrder(o.no),
            onOpen: () => s.openOrder(o.no),
          };
        });

  return (
    <View style={{ flex: 1, backgroundColor: C.bgApp }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: navBottom + 96, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Hero
          title={receipts ? 'Goods receipt' : 'Orders'} subtitle={todayLine()} overviewTitle="Today’s activity" pct={pct} kpis={kpis}
          showSearch={s.homeSearch} onToggleSearch={() => s.set(s.homeSearch ? { homeSearch: false, q: '' } : { homeSearch: true })}
          q={s.q} onSearch={(v) => s.set({ q: v })} searchPlaceholder="Search GRN, order, customer or PO" onNotify={() => s.set({ notif: true, acct: false })}
        />
        <View style={{ gap: 8 }}>
          <SegmentedControl items={[{ key: 'receipts', label: 'Receipts' }, { key: 'orders', label: 'Orders' }]} active={s.section} onChange={(k) => s.setSection(k as never)} trackColor="rgba(118,118,128,0.12)" />
          <StatusTabs items={tabs} active={receipts ? s.grnTab : s.orderTab} onChange={(k) => s.set(receipts ? { grnTab: k } : { orderTab: k })} />
        </View>
        {rows.map((r) => <RecordCard key={r.no} row={r} icon={receipts ? 'package' : 'truck'} />)}
        {rows.length === 0 ? (
          <EmptyState icon="search-x" tone="neutral" title={receipts ? 'No receipts match' : 'No orders match'} description="Clear the search or pick another status." />
        ) : null}
      </ScrollView>
      <BottomNav items={nav} onCreate={() => s.set({ createMenu: true })} />
    </View>
  );
}

// ─── Create menu ────────────────────────────────────────

function CreateHead({ onClose }: { onClose: () => void }) {
  const drag = useSheetDrag();
  return (
    <View {...drag.panHandlers} style={{ paddingHorizontal: 16 }}>
      <Grabber />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
        <View style={{ flex: 1 }}>
          <Txt style={font(600, 18, 24)}>Create new</Txt>
          <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>Start a new inbound or outbound request</Txt>
        </View>
        <IconButton icon="x" label="Close" onPress={onClose} />
      </View>
    </View>
  );
}

export function CreateMenu() {
  const set = useStore((s) => s.set);
  const pb = useFooterPad(34);
  const close = () => set({ createMenu: false });
  const actions = [
    { label: 'New goods receipt', sub: 'Inbound · receive goods into the vault', icon: 'package-open', go: () => set({ createMenu: false, section: 'receipts', page: 'home', grnSheet: 'create' }) },
    { label: 'New order', sub: 'Outbound · release goods to a customer', icon: 'truck', go: () => set({ createMenu: false, section: 'orders', page: 'home', orderCreate: true }) },
  ];
  return (
    <Sheet onClose={close} z={55} form={false} header={<CreateHead onClose={close} />} bodyStyle={{ paddingTop: 8, paddingBottom: pb, gap: 8 }}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.go} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.hairline, backgroundColor: pressed ? C.muted : '#fff' }]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.tileBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={a.icon} size={20} color={C.tileFg} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={font(600, 15, 20)}>{a.label}</Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]} lines={1}>{a.sub}</Txt>
          </View>
          <Icon name="chevron-right" size={18} color={C.n400} />
        </Pressable>
      ))}
    </Sheet>
  );
}

// ─── Profile & notifications ────────────────────────────

function useNotifs() {
  const grns = useStore((s) => s.grns), orders = useStore((s) => s.orders);
  return useMemo(() => {
    const ev: { icon: string; title: string; sub: string; ts: string }[] = [];
    grns.forEach((x) => x.history.forEach((h) => ev.push({ icon: 'package-open', title: `${h.t || 'Update'} · ${x.no}`, sub: h.a || x.customer, ts: h.ts || '' })));
    orders.forEach((o) => o.history.forEach((h) => ev.push({ icon: 'truck', title: `${h.t || 'Update'} · ${o.no}`, sub: h.a || o.customer, ts: h.ts || '' })));
    return ev.slice(-6).reverse();
  }, [grns, orders]);
}

export function ProfileSheet() {
  const set = useStore((s) => s.set), flash = useStore((s) => s.flash);
  const notifs = useNotifs();
  const close = () => set({ acct: false });
  const rows: [string, string, string, () => void, boolean][] = [
    ['bell', 'Notifications', notifs.length ? String(notifs.length) : '', () => set({ notif: true, acct: false }), true],
    ['building-2', 'Facility', 'DXB North', () => flash('Facility access is managed by your supervisor.', 'info'), true],
    ['life-buoy', 'Help & support', '', () => flash('Support: vault-ops@dnata.com', 'info'), true],
    ['info', 'App version', '2.4.0', () => {}, false],
  ];
  return (
    <Sheet onClose={close} z={50} bodyBg={C.bgApp} header={<SheetHeader title="Profile" subtitle="Signed in to Vault" icon="circle-user" onClose={close} />} bodyStyle={{ paddingBottom: 34 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: R.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <Avatar name="Omar Farooq" size={48} />
        <View style={{ flex: 1 }}>
          <Txt style={font(600, 15, 20)}>Omar Farooq</Txt>
          <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>Vault Officer · DXB North</Txt>
        </View>
        <StatusChip tone="success" label="On shift" size="sm" />
      </View>
      <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
        {rows.map(([icon, label, value, pick, chev], i) => (
          <Pressable key={label} onPress={pick} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.hairline }, pressed && { backgroundColor: C.n50 }]}>
            <IconTile name={icon} tone="primary" size={32} radius={10} />
            <Txt style={[font(500, 14, 20), { flex: 1 }]}>{label}</Txt>
            <Txt style={[font(400, 13, 18), tabular, { color: C.text2 }]}>{value}</Txt>
            {chev ? <Icon name="chevron-right" size={18} color={C.n400} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
        <Pressable onPress={() => { close(); flash('Signed out. Demo session kept for review.', 'info'); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52 }, pressed && { backgroundColor: C.n50 }]}>
          <Icon name="log-out" size={18} color={C.errorText} />
          <Txt style={[font(600, 15, 20), { color: C.errorText }]}>Sign out</Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function NotificationsSheet() {
  const set = useStore((s) => s.set);
  const notifs = useNotifs();
  const close = () => set({ notif: false });
  return (
    <Sheet onClose={close} z={50} bodyBg={C.bgApp} header={<SheetHeader title="Notifications" subtitle={notifs.length ? `${notifs.length} recent updates` : 'Nothing new'} icon="bell" onClose={close} />} bodyStyle={{ paddingBottom: 34 }}>
      {notifs.length ? (
        <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
          {notifs.map((n, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.hairline }}>
              <IconTile name={n.icon} tone="primary" size={32} radius={10} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={font(600, 14, 20)}>{n.title}</Txt>
                <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]} lines={1}>{n.sub}</Txt>
              </View>
              <Txt style={[font(400, 11, 16), { color: C.text2 }]}>{n.ts}</Txt>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ backgroundColor: '#fff', borderRadius: R.card, paddingVertical: 12 }}>
          <EmptyState icon="bell" tone="neutral" title="You’re all caught up" description="New activity on receipts and orders shows up here." />
        </View>
      )}
    </Sheet>
  );
}

export { initials };
