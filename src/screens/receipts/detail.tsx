import React from 'react';
import { ScrollView, View } from 'react-native';
import { useStore } from '../../store';
import type { Grn } from '../../data/types';
import { C, font, mono, shadow, tabular } from '../../theme/tokens';
import { Button, Card, Chip, EmptyState, IconTile, InfoGrid, ListGroup, ListRow, StatusChip, Txt } from '../../components/ds';
import { DetailHeader, DetailTabs, InfoSection, Metric, NextStep, SectionLabel, SheetHeader, Timeline } from '../../components/vault';
import { PushScreen, Sheet, useDetailPad, useFooterPad } from '../../components/overlay';
import { Barcode, SigView } from '../../components/art';
import { plural, shortFac } from '../../data/format';
import { grnActIcon, grnEventIcon, grnLabel, grnNextAct, grnPrompt, sealedCount, sumExp, sumRec, variance, varianceTone } from '../../logic/grn';
import { grnDocHtml, printHtml, shareHtml } from '../../logic/docs';

const dash = (v?: string | null) => (v && v.trim() ? v : '—');

export function GrnDetail({ no }: { no: string }) {
  const g = useStore((s) => s.grns.find((x) => x.no === no));
  const tab = useStore((s) => s.recTab);
  const set = useStore((s) => s.set), runGrn = useStore((s) => s.runGrn);
  const pad = useDetailPad();
  if (!g) return null;
  const a = grnNextAct(g.status);
  const back = () => set({ grnActive: null });
  return (
    <PushScreen onBack={back} z={30}>
      <DetailHeader
        backLabel="Goods receipt" onBack={back} icon="package" title={g.no} subtitle={g.customer} status={grnLabel(g.status)}
        facts={[{ label: 'Expected', value: g.expected }, { label: 'Facility', value: shortFac(g.facility) }, { label: 'Received', value: `${sumRec(g)} of ${sumExp(g)} pcs` }]}
        actText={a} actIcon={a ? grnActIcon(a) : undefined} onAction={() => runGrn(g.no)}
      />
      <DetailTabs
        items={[{ key: 'overview', label: 'Overview' }, { key: 'goods', label: 'Goods' }, { key: 'handover', label: 'Handover' }, { key: 'activity', label: 'Activity' }, { key: 'docs', label: 'Docs' }]}
        active={tab} onChange={(k) => set({ recTab: k })}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: pad, gap: 12 }} showsVerticalScrollIndicator={false}>
        {tab === 'overview' ? <Overview g={g} /> : null}
        {tab === 'goods' ? <Goods g={g} /> : null}
        {tab === 'handover' ? <HandoverTab g={g} /> : null}
        {tab === 'activity' ? (
          <Timeline
            title="Tracking status" meta="Latest first"
            steps={g.history.slice().reverse().map((e, i) => ({
              title: e.t, subtitle: e.d ? `${e.a} — ${e.d}` : e.a, timeLine: e.ts.replace('2026 · ', '· '), icon: grnEventIcon(e.k), cur: i === 0 && g.status !== 'Closed',
            }))}
          />
        ) : null}
        {tab === 'docs' ? <Docs g={g} /> : null}
      </ScrollView>
    </PushScreen>
  );
}

function Overview({ g }: { g: Grn }) {
  return (
    <>
      <NextStep text={grnPrompt(g.status)} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Metric icon="package-check" iconBg={C.successBg} iconFg={C.successIcon} label="Received" value={String(sumRec(g))} unit={`of ${sumExp(g)} pcs`} />
        <Metric icon="lock" iconBg={C.primary50} iconFg={C.primary600} label="Sealed" value={String(sealedCount(g))} unit={`of ${plural(g.lines.length, 'package')}`} />
      </View>
      <InfoSection section={{ icon: 'file-text', title: 'Request', items: [
        { label: 'GRN number', value: g.no }, { label: 'Transaction type', value: g.txType }, { label: 'Inbound type', value: g.inbound },
        { label: 'Receipt mode', value: g.receiptMode }, { label: 'PO number', value: g.po }, { label: 'Expected receipt', value: g.expected },
      ] }} />
      <InfoSection section={{ icon: 'vault', title: 'Storage', items: [
        { label: 'Facility', value: g.facility }, { label: 'Vault type', value: g.vaultType }, { label: 'Vault', value: g.vault }, { label: 'Bin', value: g.bin },
        { label: 'Attachments', value: plural(g.attachments, 'file') },
      ] }} />
      <InfoSection section={{ icon: 'shield-check', title: 'Audit', items: [
        { label: 'Created by', value: g.createdBy }, { label: 'Created', value: g.createdTime }, { label: 'Last updated', value: g.updated }, { label: 'Remarks', value: g.remarks },
      ] }} />
    </>
  );
}

function Goods({ g }: { g: Grn }) {
  return (
    <>
      {g.lines.map((l) => {
        const v = variance(l);
        return (
          <Card key={l.pkgId}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <IconTile name="box" tone="accent" size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={[mono(12, 16, 400), { color: C.text2 }]}>{l.code}</Txt>
                  <Txt style={[font(600, 14, 20), { marginTop: 2 }]}>{l.name}</Txt>
                </View>
                <StatusChip tone={varianceTone(v)} label={v} size="sm" />
              </View>
              <InfoGrid columns={3} dense items={[
                { label: 'Expected', value: String(l.exp) }, { label: 'Received', value: l.received == null ? '—' : String(l.received) },
                { label: 'Unit weight', value: `${l.unitWt.toFixed(3)} kg` },
              ]} />
              <InfoGrid columns={2} dense inset={false} items={[
                { label: 'Package ID', value: l.pkgId },
                { label: 'Receipt mode', value: l.mode === 'package' ? `Package · ${l.packType}` : l.mode ? 'Individual' : '—' },
                { label: 'Lot', value: dash(l.lot) }, { label: 'Weight', value: l.weight ? `${l.weight} kg` : '—' },
                { label: 'Dimensions', value: l.l ? `${l.l} × ${l.w} × ${l.h} cm` : '—' }, { label: 'Origin', value: dash(l.origin) }, { label: 'Seal', value: dash(l.seal) },
              ]} />
              {l.bars.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {l.bars.map((b) => <Chip key={b} label={b} icon="barcode" size="sm" />)}
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}
      {g.putaway ? (
        <View style={{ gap: 8 }}>
          <SectionLabel icon="warehouse" label={`Put away · ${g.putaway.code}`} />
          <ListGroup>
            {g.putaway.rows.map((r) => (
              <ListRow key={r.pkgId} leading="warehouse" leadingTone="primary" title={r.pkg.split(' · ')[0]} subtitle={`${r.account} · ${r.vault}`}
                value={[...new Set(r.pkgs.map((p) => p.bin))].join(', ')} />
            ))}
          </ListGroup>
        </View>
      ) : null}
    </>
  );
}

function HandoverTab({ g }: { g: Grn }) {
  const ho = g.handover, sig = g.signature;
  return (
    <>
      {ho ? (
        <View style={{ gap: 8 }}>
          <SectionLabel icon="hand" label="Delivery handover" />
          <Card>
            <InfoGrid columns={2} inset={false} items={[
              { label: 'Supplier', value: ho.supplier }, { label: 'Driver', value: ho.driver }, { label: 'Driver mobile', value: ho.mobile },
              { label: 'Vehicle', value: ho.vehicle }, { label: 'Arrived', value: ho.arrived },
            ]} />
          </Card>
        </View>
      ) : (
        <EmptyState icon="truck" tone="neutral" title="No handover yet" description="Delivery details are captured when goods are verified." />
      )}
      {sig ? (
        <View style={{ gap: 8 }}>
          <SectionLabel icon="shield-check" label="Valuable handling receipt" />
          <Card>
            <View style={{ height: 96, borderRadius: 14, backgroundColor: C.surfaceInset, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 12 }}>
              {sig.sig ? <SigView sig={sig.sig} height={84} /> : <Txt style={[font(400, 12, 16), { color: C.text2 }]}>Signature on file</Txt>}
            </View>
            <InfoGrid columns={2} inset={false} dense style={{ marginTop: 12 }} items={[{ label: 'Approved by', value: sig.approver }, { label: 'Signed', value: sig.signedAt }]} />
          </Card>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <SectionLabel icon="user-check" label="Assignment" />
        <Card>
          <InfoGrid columns={2} inset={false} items={[
            { label: 'Assignee', value: g.assignee }, { label: 'Employee code', value: g.assigneeCode }, { label: 'Role', value: g.assigneeRole }, { label: 'Remarks', value: g.remarks },
          ]} />
        </Card>
      </View>
    </>
  );
}

function Docs({ g }: { g: Grn }) {
  const set = useStore((s) => s.set);
  const open = (kind: 'vhr' | 'labels') => set({ grnSheet: 'doc', sheetNo: g.no, docKind: kind });
  return (
    <>
      <View style={{ gap: 8 }}>
        <SectionLabel icon="file-text" label="Generate" />
        <ListGroup>
          <ListRow leading="file-text" leadingTone="primary" title="Valuable handling receipt" subtitle={`VHR · ${g.no}`} trailing="chevron" onPress={() => open('vhr')} />
          <ListRow leading="file-text" leadingTone="primary" title="Package labels" subtitle={`${plural(g.lines.length, 'label')} · barcode`} trailing="chevron" onPress={() => open('labels')} />
        </ListGroup>
      </View>
      {g.filed.length ? (
        <View style={{ gap: 8 }}>
          <SectionLabel icon="folder-open" label="Filed" />
          <ListGroup>
            {g.filed.map((d, i) => <ListRow key={i} leading="file-check" leadingTone="neutral" title={d.name} subtitle={d.meta} />)}
          </ListGroup>
        </View>
      ) : (
        <EmptyState icon="folder-open" tone="neutral" title="Nothing filed yet" description="Signed receipts and allocations appear here." />
      )}
    </>
  );
}

// ─── Document preview (VHR / package labels) ────────────

export function DocSheet() {
  const set = useStore((s) => s.set), flash = useStore((s) => s.flash);
  const kind = useStore((s) => s.docKind);
  const g = useStore((s) => s.grns.find((x) => x.no === s.sheetNo));
  const pb = useFooterPad(34);
  if (!g) return null;
  const close = () => set({ grnSheet: null });
  const labels = kind === 'labels';
  const title = labels ? 'Package labels' : 'Valuable handling receipt';
  const docNo = labels ? `${g.no}-LBL` : `VHR-${g.no.slice(4)}`;
  const kv: [string, string][] = [
    ['GRN', g.no], ['Customer', g.customer], ['Customer ID', g.custId], ['PO number', g.po], ['Facility', g.facility],
    ['Vault / bin', g.vault === '—' ? '—' : `${g.vault} · ${g.bin}`], ['Supplier', g.handover?.supplier ?? '—'], ['Vehicle', g.handover?.vehicle ?? '—'],
    ['Pieces received', `${sumRec(g)} of ${sumExp(g)}`],
  ];
  const run = (fn: () => Promise<void>, ok: string) => fn().then(() => flash(ok)).catch(() => flash('Printing is not available on this device.', 'warning'));
  return (
    <Sheet
      onClose={close} z={40} bg={C.n150}
      header={<SheetHeader title={title} subtitle={docNo} onClose={close} closeBg="#fff" />}
      bodyStyle={{ paddingTop: 20, paddingBottom: 16 }}
      footer={
        <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: pb }}>
          <Button variant="tertiary" size="lg" leadingIcon="share" onPress={() => run(() => shareHtml(grnDocHtml(g, kind), docNo), `${docNo} ready to share.`)}>Share</Button>
          <View style={{ flex: 1 }}><Button size="lg" fullWidth leadingIcon="printer" onPress={() => run(() => printHtml(grnDocHtml(g, kind)), `${title} sent to print.`)}>Print</Button></View>
        </View>
      }
    >
      <View style={[{ backgroundColor: '#fff', borderRadius: 22, paddingVertical: 24, paddingHorizontal: 22 }, shadow.card2]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.n900 }}>
          <View style={{ flex: 1 }}>
            <Txt style={font(600, 14, 20)}>{title}</Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>Valuable cargo vault, Dubai</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt style={mono(12, 16, 400)}>{docNo}</Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>{g.updated}</Txt>
          </View>
        </View>
        <View style={{ marginTop: 16, gap: 8 }}>
          {kv.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
              <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{k}</Txt>
              <Txt style={[font(500, 12, 16), { flex: 1, textAlign: 'right' }]}>{v}</Txt>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderSubtle, gap: 12 }}>
          <Txt style={[font(500, 11, 14), { color: C.text2 }]}>Line detail</Txt>
          {g.lines.map((l) => (
            <View key={l.pkgId}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <Txt style={[font(500, 12, 16), { flex: 1 }]}>{l.name}</Txt>
                <Txt style={[font(500, 12, 16), tabular]}>{`${l.received ?? l.exp} ${l.pack}`}</Txt>
              </View>
              <Txt style={[mono(12, 16, 400), { color: C.text2, marginTop: 4 }]}>{[l.code, l.lot, l.seal, l.bars.join(' / ')].filter(Boolean).join(' · ')}</Txt>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderSubtle, flexDirection: 'row', gap: 18 }}>
          {[['Released by', g.signature?.sig], ['Received by', undefined]].map(([role, sig]) => (
            <View key={role as string} style={{ flex: 1 }}>
              <View style={{ height: 52, justifyContent: 'flex-end' }}>{sig ? <SigView sig={sig as never} /> : null}</View>
              <View style={{ borderTopWidth: 1, borderTopColor: C.n900, marginTop: 6, paddingTop: 6 }}>
                <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{role as string}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 20, borderRadius: 3, overflow: 'hidden' }}><Barcode height={40} /></View>
        <Txt style={[mono(12, 16, 400), { marginTop: 6, letterSpacing: 1.7, textAlign: 'center' }]}>{docNo}</Txt>
      </View>
    </Sheet>
  );
}
