import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useStore } from '../../store';
import type { Grn, PutawayRow } from '../../data/types';
import { C, R, font, mono, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Badge, Box, Button, Grid, IconTile, ListRow, SelectField, StatusChip, Txt } from '../../components/ds';
import {
  BarTableHead, BinRow, BottomNav, CardHeader, DetailHeader, DetailTabs, DoneFooter, Hero, InfoSection, SelectRow, SheetFooter, SheetHeader, Timeline,
} from '../../components/vault';
import { PushScreen, Sheet } from '../../components/overlay';
import { ACCOUNTS, BINS, FACILITIES } from '../../data/seed';
import { plural, shortFac, todayLine } from '../../data/format';
import { sumExp, sumRec } from '../../logic/grn';
import { useNav } from '../home';

const binOf = (r: PutawayRow) => (r.pkgs.length && r.pkgs.every((p) => p.bin) ? [...new Set(r.pkgs.map((p) => p.bin))].join(', ') : '');
const rowOk = (r: PutawayRow) => !!(r.account && r.facility && r.vault && binOf(r));

// ─── Put away task (signed GRN → bins) ──────────────────

export function PutawayTaskSheet() {
  const s = useStore();
  const g = s.grns.find((x) => x.no === s.sheetNo)!;
  const [rows, setRows] = useState<PutawayRow[]>(() => s.putawayDraft(g));
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<number | null>(null);
  const [barStatus, setBarStatus] = useState<Record<string, string>>({});
  const close = () => s.set({ grnSheet: null });
  const upRow = (p: Partial<PutawayRow>) => setRows((rs) => rs.map((r, i) => (i === sel ? { ...r, ...p } : r)));
  const upPkg = (j: number, bin: string) => setRows((rs) => rs.map((r, i) => (i === sel ? { ...r, pkgs: r.pkgs.map((p, k) => (k === j ? { ...p, bin } : p)) } : r)));

  const r = rows[sel];
  const line = g.lines.find((l) => l.pkgId === r.pkgId) ?? g.lines[0];
  const n = rows.filter(rowOk).length, ok = n === rows.length;
  const tb = r.pkgs.reduce((a, p) => a + p.bars.length, 0);
  const vp = view != null ? r.pkgs[view] : null;

  return (
    <>
      <Sheet
        onClose={close} z={40} bodyBg={C.bgApp}
        header={<SheetHeader title={`${g.customer} · ${g.no}`} subtitle="Put away" icon="package" onClose={close} />}
        footer={
          <SheetFooter
            note={ok ? 'All items allocated — put away to store them' : `Every package needs an account, facility, vault and bin. ${n} of ${rows.length} allocated.`}
            noteTone={ok ? 'success' : 'warning'} primaryLabel="Put away" primaryIcon="check" blocked={!ok} onCancel={close}
            onPrimary={() => { const msg = s.putawayGrn(g.no, rows); close(); s.flash(msg); }}
          />
        }
      >
        <Box>
          <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt style={[font(600, 14, 20), { flex: 1 }]}>Items in package</Txt>
            <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{n}/{rows.length} allocated</Txt>
          </View>
          {rows.map((x, i) => (
            <SelectRow key={x.pkgId} leftBar name={x.pkg.split(' · ')[0]} sub={[x.vault, binOf(x)].filter(Boolean).join(' · ') || 'Not allocated yet'} selected={i === sel} done={rowOk(x)} onPress={() => setSel(i)} />
          ))}
        </Box>
        <Box>
          <CardHeader
            icon="package" title={line.name}
            subtitle={[`Package ${r.pkgId}`, `${line.received ?? line.exp} pcs received`, line.seal || 'No seal'].join(' · ')}
            status={rowOk(r) ? 'Allocated' : 'Pending'} statusTone={rowOk(r) ? 'success' : 'warning'}
          />
          <View style={{ padding: 14, gap: 12 }}>
            <Txt style={font(600, 14, 20)}>Putaway allocation</Txt>
            <SelectField label="Account" required placeholder="Select account" value={r.account} onPress={() => s.openPicker('Account', ACCOUNTS.map((v) => ({ v, label: v })), r.account, (v) => upRow({ account: v }))} />
            <SelectField label="Facility" required placeholder="Select facility" value={r.facility}
              onPress={() => s.openPicker('Facility', Object.entries(FACILITIES).map(([k, v]) => ({ v: k, label: k, sub: `${v.length} vaults` })), r.facility, (v) => upRow({ facility: v, vault: '' }))} />
            <SelectField label="Vault" required placeholder="Select" value={r.vault}
              onPress={() => {
                const vs = FACILITIES[r.facility] ?? [];
                if (!vs.length) return s.flash('Pick a facility first.');
                s.openPicker('Vault', vs.map((v) => ({ v, label: v })), r.vault, (v) => upRow({ vault: v }));
              }} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt style={[font(600, 14, 20), { flex: 1 }]}>Package details</Txt>
            <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{plural(r.pkgs.length, 'package')} · {plural(tb, 'bar')}</Txt>
          </View>
          {r.pkgs.map((p, j) => (
            <BinRow
              key={p.no} n={String(j + 1)} code={p.no} bin={p.bin} barsLabel={`View bars (${p.bars.length})`} divider={j > 0}
              onPickBin={() => s.openPicker('Bin', BINS.map((b) => ({ v: b, label: b, sub: 'Available' })), p.bin, (v) => upPkg(j, v))}
              onScan={() => s.openScan('Scan bin', (code) => { upPkg(j, code); s.flash(BINS.includes(code) ? `Bin ${code} scanned.` : `Bin ${code} scanned — not in the bin master, check the label.`); }, 'Point the camera at the bin label')}
              onViewBars={() => setView(j)}
            />
          ))}
        </Box>
      </Sheet>
      {vp ? (
        <Sheet
          onClose={() => setView(null)} z={48} bodyBg={C.bgApp} form={false}
          header={<SheetHeader title={`Bars · ${vp.no}`} subtitle={r.pkg} icon="scan-barcode" onClose={() => setView(null)} />}
          footer={<DoneFooter onPress={() => setView(null)} />}
        >
          <Box>
            <BarTableHead count={plural(vp.bars.length, 'bar')} />
            {vp.bars.map((b, k) => {
              const st = barStatus[b] ?? 'Verified';
              return (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderTopWidth: k ? 1 : 0, borderTopColor: C.hairline }}>
                  <Txt style={[font(500, 13, 18), tabular, { width: 20, color: C.text2 }]}>{k + 1}</Txt>
                  <Txt style={[mono(14, 20), { flex: 1 }]}>{b}</Txt>
                  <Pressable
                    onPress={() => s.openPicker(`Bar ${b}`, ['Verified', 'Unverified'].map((v) => ({ v, label: v })), st, (v) => setBarStatus((m) => ({ ...m, [b]: v })))}
                    style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }, pressed && { opacity: 0.7 }]}
                  >
                    <StatusChip tone={st === 'Verified' ? 'success' : 'warning'} label={st} size="sm" />
                    <Icon name="chevron-down" size={16} color={C.n400} />
                  </Pressable>
                </View>
              );
            })}
            {!vp.bars.length ? <Txt style={[font(400, 13, 18), { color: C.text2, textAlign: 'center', paddingVertical: 20, paddingHorizontal: 14 }]}>No bars recorded for this package.</Txt> : null}
          </Box>
        </Sheet>
      ) : null}
    </>
  );
}

// ─── Put away page (list) ───────────────────────────────

type PaRec = { grn: Grn; code: string; status: string; tone: string; vaults: string[]; bins: string[]; pkgs: number };

function usePaRecords() {
  const grns = useStore((s) => s.grns);
  return useMemo<PaRec[]>(() => grns.filter((x) => x.putaway).map((x) => {
    const rs = x.putaway!.rows;
    const ok = x.putaway!.status === 'Vault Assigned';
    return {
      grn: x, code: x.putaway!.code || '—', status: ok ? 'Vault assigned' : 'Pending', tone: ok ? 'success' : 'warning',
      vaults: [...new Set(rs.map((r) => r.vault).filter(Boolean))], bins: rs.flatMap((r) => r.pkgs.map((p) => p.bin)).filter(Boolean), pkgs: rs.length || x.lines.length,
    };
  }), [grns]);
}

export function PutawayPage() {
  const s = useStore();
  const scroll = useRef<ScrollView>(null);
  const nav = useNav(() => scroll.current?.scrollTo({ y: 0, animated: true }));
  const recs = usePaRecords();
  const q = s.q.trim().toLowerCase();
  const all = recs.slice().reverse();
  const list = all.filter((r) => (s.paStatus === 'All' || r.status === s.paStatus) && (s.paFac === 'All' || r.grn.facility === s.paFac)
    && (!q || `${r.code} ${r.grn.no} ${r.grn.customer} ${r.vaults.join(' ')}`.toLowerCase().includes(q)));
  const nf = (s.paStatus !== 'All' ? 1 : 0) + (s.paFac !== 'All' ? 1 : 0);
  const assigned = recs.filter((r) => r.status === 'Vault assigned').length;
  const kpis = [
    { label: 'Requests', value: recs.length, icon: 'warehouse' },
    { label: 'Packages', value: recs.reduce((t, r) => t + r.pkgs, 0), icon: 'boxes' },
    { label: 'Bins in use', value: new Set(recs.flatMap((r) => r.bins)).size, icon: 'map-pin' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bgApp }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Hero
          title="Put away" subtitle={todayLine()} overviewTitle="Put away summary" pct={(recs.length ? Math.round((assigned / recs.length) * 100) : 0) + '%'} kpis={kpis}
          showSearch={s.homeSearch} onToggleSearch={() => s.set(s.homeSearch ? { homeSearch: false, q: '' } : { homeSearch: true })} q={s.q} onSearch={(v) => s.set({ q: v })}
          searchPlaceholder="Search GRN, customer or PO" onNotify={() => s.set({ notif: true, acct: false })}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32, paddingHorizontal: 4 }}>
          <Txt style={[font(400, 13, 18), { flex: 1, color: C.text2 }]}>Showing {list.length} of {all.length}</Txt>
          <Button variant={nf ? 'secondary' : 'tertiary'} size="sm" leadingIcon="sliders-horizontal" onPress={() => s.set({ paFilter: true })}>{nf ? `Filter · ${nf}` : 'Filter'}</Button>
          <Button variant="tertiary" size="sm" leadingIcon="upload" onPress={() => s.flash(`${plural(list.length, 'put away request')} exported.`)}>Export</Button>
        </View>
        {list.map((r) => (
          <Pressable key={r.grn.no} onPress={() => s.set({ paDetail: r.grn.no, paTab: 'storage' })} style={({ pressed }) => [{ backgroundColor: '#fff', borderRadius: R.card, padding: 14, gap: 12 }, pressed && { transform: [{ scale: 0.99 }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <IconTile name="warehouse" tone={r.status === 'Vault assigned' ? 'primary' : 'warning'} size={40} radius={12} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={font(600, 14, 20)} lines={1}>{r.grn.customer}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Txt style={[font(600, 12, 16), tabular, { color: C.primary600 }]}>{r.code}</Txt>
                  <Txt style={[font(400, 12, 16), { color: C.text3 }]}>·</Txt>
                  <Txt style={[font(400, 12, 16), tabular, { color: C.text2, flexShrink: 1 }]} lines={1}>{r.grn.no}</Txt>
                </View>
              </View>
              <StatusChip tone={r.tone} label={r.status} size="sm" />
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.hairline }}>
              {[['Facility', shortFac(r.grn.facility)], ['Vault', r.vaults.join(', ') || '—'], ['Packages', `${r.pkgs} pkg`]].map(([k, v], j) => (
                <View key={k} style={{ flex: 1, minWidth: 0, paddingLeft: j ? 10 : 0, borderLeftWidth: j ? 1 : 0, borderLeftColor: C.hairline }}>
                  <Txt style={[font(400, 11, 14), { color: C.text2 }]}>{k}</Txt>
                  <Txt style={[font(500, 13, 18), tabular, { marginTop: 2 }]} lines={1}>{v}</Txt>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 }}>
              <Icon name="clock" size={14} color={C.n500} />
              <Txt style={[font(400, 12, 16), { flex: 1, color: C.text2 }]} lines={1}>Raised {r.grn.putaway!.ts || '—'}</Txt>
            </View>
          </Pressable>
        ))}
        {!list.length ? (
          <View style={{ backgroundColor: '#fff', borderRadius: R.card, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 10 }}>
            <IconTile name="warehouse" tone="neutral" size={44} radius={14} />
            <View style={{ alignItems: 'center' }}>
              <Txt style={font(600, 14, 20)}>No put away requests</Txt>
              <Txt style={[font(400, 12, 17), { color: C.text2, marginTop: 2, textAlign: 'center' }]}>Try another status or facility, or reset the filters.</Txt>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <BottomNav items={nav} onCreate={() => s.set({ createMenu: true })} />
    </View>
  );
}

export function PaFilterSheet() {
  const s = useStore();
  const recs = usePaRecords();
  const close = () => s.set({ paFilter: false });
  const all = recs.slice().reverse();
  const facs = ['All', ...new Set(all.map((r) => r.grn.facility))];
  const q = s.q.trim().toLowerCase();
  const n = all.filter((r) => (s.paStatus === 'All' || r.status === s.paStatus) && (s.paFac === 'All' || r.grn.facility === s.paFac)
    && (!q || `${r.code} ${r.grn.no} ${r.grn.customer}`.toLowerCase().includes(q))).length;
  return (
    <Sheet
      onClose={close} z={30} bodyBg={C.bgApp} bodyStyle={{ paddingBottom: 20 }}
      header={<SheetHeader title="Filter" subtitle="Narrow put away requests" icon="sliders-horizontal" onClose={close} />}
      footer={
        <SheetFooter note={`Showing ${n} of ${all.length}`} noteTone="neutral" cancelLabel="Reset" primaryLabel={`Show ${plural(n, 'result')}`} primaryIcon="check"
          onCancel={() => s.set({ paStatus: 'All', paFac: 'All', q: '' })} onPrimary={close} />
      }
    >
      <Box padded style={{ gap: 12 }}>
        <SelectField label="Facility" value={s.paFac === 'All' ? 'All facilities' : shortFac(s.paFac)}
          onPress={() => s.openPicker('Facility', facs.map((f) => ({ v: f, label: f === 'All' ? 'All facilities' : f })), s.paFac, (v) => s.set({ paFac: v }))} />
        <SelectField label="Status" value={s.paStatus} onPress={() => s.openPicker('Status', ['All', 'Vault assigned', 'Pending'].map((v) => ({ v, label: v })), s.paStatus, (v) => s.set({ paStatus: v }))} />
      </Box>
    </Sheet>
  );
}

// ─── Put away detail ────────────────────────────────────

export function PutawayDetail({ no }: { no: string }) {
  const s = useStore();
  const x = s.grns.find((g) => g.no === no);
  if (!x || !x.putaway) return null;
  const pa = x.putaway, rs = pa.rows, tab = s.paTab;
  const back = () => s.set({ paDetail: null });
  const vaults = [...new Set(rs.map((r) => r.vault).filter(Boolean))];
  const ln = (id: string) => x.lines.find((l) => l.pkgId === id);
  const sig = x.signature, ho = x.handover;

  const ev: [string, string, string, string][] = [];
  if (ho?.driver) ev.push(['Handed over by driver', ho.driver + (ho.supplier ? ` · ${ho.supplier}` : ''), ho.arrived || '', 'truck']);
  x.history.forEach((h) => {
    if (h.k === 'verify') ev.push(['Goods verified & sealed', h.a.split(' · ')[0], h.ts, 'shield-check']);
    else if (h.k === 'sign') ev.push(['Receipt signed', h.a.split(' · ')[0], h.ts, 'signature']);
  });
  if (!ev.some((e) => e[0] === 'Receipt signed') && sig?.signedAt) ev.push(['Receipt signed', sig.approver || '', sig.signedAt, 'signature']);
  ev.push([`Put away — ${plural(rs.length, 'package')}`, rs.map((r) => `${r.vault} / ${binOf(r)}`).filter((t) => t.trim() !== '/').slice(0, 2).join(' · '), pa.ts || '', 'warehouse']);

  return (
    <PushScreen onBack={back} z={25}>
      <DetailHeader
        backLabel="Put away" onBack={back} icon="warehouse" title={pa.code || '—'} subtitle={`${x.customer} · ${x.no}`}
        status={pa.status === 'Vault Assigned' ? 'Vault assigned' : pa.status || 'Pending'}
        facts={[{ label: 'Packages', value: `${rs.length} stored` }, { label: 'Facility', value: shortFac(x.facility) }, { label: 'Vault', value: vaults.join(', ') || '—' }]}
        actText="Print labels" actIcon="printer" onAction={() => s.flash(`Labels for ${plural(rs.length, 'package')} sent to print.`)}
      />
      <DetailTabs
        items={[{ key: 'storage', label: 'Storage' }, { key: 'packages', label: 'Packages' }, { key: 'source', label: 'Source receipt' }, { key: 'activity', label: 'Activity' }]}
        active={tab} onChange={(k) => s.set({ paTab: k })}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}>
        {tab === 'storage' ? (
          <>
            <Box>
              <CardHeader icon="warehouse" title="Storage allocation" subtitle={`Raised ${pa.ts || '—'}`} />
              {rs.map((r, j) => (
                <View key={r.pkgId} style={{ padding: 14, gap: 10, borderTopWidth: j ? 1 : 0, borderTopColor: C.hairline }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <IconTile name="package" tone="primary" size={36} radius={10} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt style={font(600, 13, 18)}>{r.pkg.split(' · ')[0]}</Txt>
                      <Txt style={[font(400, 12, 16), tabular, { color: C.text2, marginTop: 2 }]}>{r.pkgId}</Txt>
                    </View>
                    <StatusChip tone="success" label={binOf(r) ? `Bin ${binOf(r)}` : 'No bin'} size="sm" />
                  </View>
                  <Grid
                    columnGap={12} rowGap={10} spans={[2, 1, 1]} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.muted }}
                    cells={[['Account', r.account ? `${x.customer} — ${r.account}` : '—'], ['Vault', r.vault || '—'], ['Seal ID', ln(r.pkgId)?.seal || '—']].map(([k, v]) => (
                      <View key={k}>
                        <Txt style={[font(400, 11, 14), { color: C.text2 }]}>{k}</Txt>
                        <Txt style={[font(500, 13, 18), tabular, { marginTop: 2 }]}>{v}</Txt>
                      </View>
                    ))}
                  />
                </View>
              ))}
            </Box>
            <Pressable onPress={() => s.flash('Vault map is outside this prototype.')} style={({ pressed }) => [{ backgroundColor: '#fff', borderRadius: R.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.85 }]}>
              <IconTile name="map-pin" tone="primary" size={36} radius={10} />
              <View style={{ flex: 1 }}>
                <Txt style={font(600, 13, 18)}>View on vault map</Txt>
                <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>{vaults.join(', ')} · {shortFac(x.facility)}</Txt>
              </View>
              <Icon name="chevron-right" size={18} color={C.n400} />
            </Pressable>
          </>
        ) : null}
        {tab === 'packages' ? (
          <Box>
            <CardHeader icon="package" title="Package details" subtitle="Captured at the receiving counter" />
            {x.lines.map((l, j) => (
              <View key={l.pkgId} style={{ padding: 14, gap: 10, borderTopWidth: j ? 1 : 0, borderTopColor: C.hairline }}>
                <View>
                  <Txt style={font(600, 13, 18)}>{l.name.split(' · ')[0]}</Txt>
                  <Txt style={[font(400, 12, 16), tabular, { color: C.text2, marginTop: 2 }]}>{l.pkgId}</Txt>
                </View>
                <Grid
                  columnGap={12} rowGap={10} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.muted }}
                  cells={[['Lot', l.lot || '—'], ['Weight', l.weight ? `${l.weight} kg` : '—'], ['Dimensions', l.l ? `${l.l} × ${l.w} × ${l.h} cm` : '—'], ['Origin', l.origin || '—']].map(([k, v]) => (
                    <View key={k}>
                      <Txt style={[font(400, 11, 14), { color: C.text2 }]}>{k}</Txt>
                      <Txt style={[font(500, 13, 18), tabular, { marginTop: 2 }]}>{v}</Txt>
                    </View>
                  ))}
                />
                {l.bars.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{l.bars.map((b) => <Badge key={b} label={b} tone="primary" />)}</View> : null}
              </View>
            ))}
          </Box>
        ) : null}
        {tab === 'source' ? (
          <>
            <InfoSection section={{ icon: 'file-text', title: 'Source receipt', sub: 'Goods receipt note these packages arrived on', items: [
              { label: 'GRN number', value: x.no }, { label: 'Customer', value: `${x.custId} / ${x.customer}` }, { label: 'PO number', value: x.po || '—' },
              { label: 'Facility', value: x.facility }, { label: 'Expected', value: `${sumExp(x)} pcs` }, { label: 'Received', value: `${sumRec(x)} pcs` },
              { label: 'Signed by', value: sig?.approver || '—' }, { label: 'Signed at', value: sig?.signedAt || '—' },
            ] }} />
            <Box style={{ paddingVertical: 4 }}>
              <ListRow leading="file-text" leadingTone="primary" title="Open goods receipt" subtitle={`${x.no} · ${x.customer}`} trailing="chevron" onPress={() => s.set({ grnActive: x.no, recTab: 'overview' })} />
            </Box>
          </>
        ) : null}
        {tab === 'activity' ? (
          <Timeline
            title="Chain of custody" meta={`${ev.length} events`}
            steps={ev.map(([title, subtitle, time, icon], j) => ({ title, subtitle, timeLine: time, icon, cur: j === ev.length - 1 }))}
          />
        ) : null}
      </ScrollView>
    </PushScreen>
  );
}
