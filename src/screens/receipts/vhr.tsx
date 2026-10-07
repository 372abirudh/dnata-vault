import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore } from '../../store';
import { C, R, font, shadow, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Button, Grid, SelectField, Txt } from '../../components/ds';
import { SheetHeader } from '../../components/vault';
import { Sheet, useFooterPad } from '../../components/overlay';
import { HeroBackground, Logo, SignaturePad, SignaturePadHandle } from '../../components/art';
import { STAFF, byCode, staffById } from '../../data/seed';
import { sumExp, sumRec } from '../../logic/grn';
import { grnDocHtml, printHtml } from '../../logic/docs';

function SecHead({ icon, title, ar }: { icon: string; title: string; ar: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F6F8FC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E6EAF2' }}>
      <Icon name={icon} size={15} color={C.primary600} />
      <Txt style={[font(600, 11, 14), { flex: 1, letterSpacing: 0.9, textTransform: 'uppercase' }]}>{title}</Txt>
      <Txt style={[font(400, 11, 14), { color: C.primary600 }]}>{ar}</Txt>
    </View>
  );
}

function KvGrid({ items }: { items: [string, string][] }) {
  return (
    <Grid
      style={{ padding: 14 }} columnGap={16} rowGap={12}
      cells={items.map(([k, v]) => (
        <View key={k}>
          <Txt style={[font(500, 10, 14), { letterSpacing: 0.6, textTransform: 'uppercase', color: C.text2 }]}>{k}</Txt>
          <Txt style={[font(500, 13, 18), { marginTop: 3 }]}>{v}</Txt>
        </View>
      ))}
    />
  );
}

const Pill = ({ children, bg = '#F1F3F7', fg = C.text2, icon }: { children: string; bg?: string; fg?: string; icon?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: bg }}>
    {icon ? <Icon name={icon} size={12} color={fg} /> : null}
    <Txt style={[font(500, 11, 14), tabular, { color: fg }]}>{children}</Txt>
  </View>
);

export function VhrSheet() {
  const s = useStore();
  const g = s.grns.find((x) => x.no === s.sheetNo)!;
  const [approver, setApprover] = useState('EMP-2041');
  const [confirmed, setConfirmed] = useState(true);
  const [signed, setSigned] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  const pb = useFooterPad(30);
  const close = () => s.set({ grnSheet: null });
  const ho = g.handover, ap = staffById(approver);
  const vhrNo = `VHR-${g.no.slice(4)}`;

  let tw = 0;
  const lines = g.lines.map((l, i) => {
    const rec = l.received ?? 0;
    const wt = parseFloat(l.weight) || l.unitWt * (rec || l.exp);
    tw += wt;
    return { n: String(i + 1), name: l.name, code: l.code, rec: String(rec), exp: String(l.exp), seal: l.seal || 'No seal', wt: `${wt.toFixed(2)} kg`, bin: byCode(l.code)?.bin ?? '—', bars: l.bars.join(', ') || '—' };
  });
  const reason = !ap ? 'Select the approving officer.' : !signed ? 'Capture the approver signature.' : !confirmed ? 'Confirm goods and seals match the receipt.' : null;
  const sigs: [string, string, string][] = [['Handler', 'المناول', ho?.driver ?? ''], ['Customer rep.', 'العميل أو من ينوب عنه', g.customer], ['Vault in-charge', 'مسؤول الخزنة', ap?.name ?? '']];

  const print = () => {
    const doc = { ...g, signature: { approver: ap?.name ?? '—', signedAt: '', doc: vhrNo, sig: pad.current?.data() } };
    printHtml(grnDocHtml(doc, 'vhr')).then(() => s.flash(`${vhrNo} sent to print.`)).catch(() => s.flash('Printing is not available on this device.', 'warning'));
  };
  const sign = () => {
    if (reason) return;
    const msg = s.signGrn(g.no, approver, pad.current?.data());
    close();
    s.flash(msg);
  };

  return (
    <Sheet
      onClose={close} z={40} bodyBg={C.bgApp}
      header={<SheetHeader title="Valuable handling receipt" subtitle={`${g.no} · ${g.customer} · ${g.facility}`} icon="clipboard-check" onClose={close} />}
      bodyStyle={{ gap: 14, paddingBottom: 20 }}
      footer={
        <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: pb, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.hairline, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={reason ? 'circle-alert' : 'circle-check'} size={14} color={reason ? C.warningIcon : C.successIcon} />
            <Txt style={[font(400, 12, 16), { flex: 1, color: reason ? C.warningText : C.successText }]}>{reason ?? 'Ready to sign and lock this GRN'}</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" size="lg" leadingIcon="printer" onPress={print}>Print</Button>
            <Button variant="secondary" size="lg" onPress={close}>Cancel</Button>
            <View style={{ flex: 1 }}><Button size="lg" fullWidth leadingIcon="lock" disabled={!!reason} onPress={sign}>Sign & lock GRN</Button></View>
          </View>
        </View>
      }
    >
      <View style={[{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }, shadow.card2]}>
        <View style={{ padding: 16, gap: 12, borderBottomWidth: 3, borderBottomColor: C.primary500, overflow: 'hidden', backgroundColor: C.navy }}>
          <HeroBackground />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Logo height={24} white />
              <Txt style={[font(500, 9, 12), { letterSpacing: 1.4, color: 'rgba(255,255,255,0.7)', marginTop: 6 }]}>LOGISTICS · VAULT SERVICES</Txt>
            </View>
            <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center' }}>
              <Txt style={[font(600, 11, 14), { color: '#fff' }]}>{vhrNo}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt style={[font(700, 15, 20), { letterSpacing: 0.9, color: '#fff' }]}>VALUABLE HANDLING RECEIPT</Txt>
              <Txt style={[font(400, 11, 16), { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]}>إيصال مناولة المقتنيات الثمينة</Txt>
            </View>
            <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.primary500, justifyContent: 'center' }}>
              <Txt style={[font(600, 10, 14), { letterSpacing: 0.6, color: '#fff' }]}>RECEIPT — INBOUND</Txt>
            </View>
          </View>
        </View>
        <SecHead icon="file-text" title="Consignment" ar="الإرسالية" />
        <KvGrid items={[
          ['Customer', g.customer], ['Account number', g.custId], ['Facility', g.facility], ['Date', (ho?.arrived ?? g.expected).split(' · ')[0]],
          ['Received from', ho?.supplier ?? '—'], ['Reference / PO', g.po], ['Vehicle', ho?.vehicle ?? '—'], ['Received by', g.assignee !== '—' ? g.assignee : g.createdBy],
        ]} />
        <SecHead icon="package" title="Goods received" ar="البضائع المستلمة" />
        {lines.map((ln, i) => (
          <View key={ln.n} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#F1F3F7', alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={[font(600, 11, 13), { color: C.text2 }]}>{ln.n}</Txt>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={font(600, 13, 18)}>{ln.name}</Txt>
                <Txt style={[font(400, 11, 16), { color: C.text2, marginTop: 1 }]}>{ln.code}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt style={[font(600, 14, 18), tabular]}>{ln.rec}</Txt>
                <Txt style={[font(400, 11, 16), { color: C.text2 }]}>of {ln.exp}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingLeft: 32 }}>
              <Pill bg={C.primary50} fg={C.primary600} icon="shield-check">{ln.seal}</Pill>
              <Pill>{ln.wt}</Pill>
              <Pill>{`Bin ${ln.bin}`}</Pill>
            </View>
            <Txt style={[font(400, 11, 16), { paddingLeft: 32, color: C.text2 }]}>Bars: <Txt style={[font(400, 11, 16), { color: C.text }]}>{ln.bars}</Txt></Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E6EAF2', backgroundColor: '#FAFBFD' }}>
          {[['Line items', String(g.lines.length)], ['Expected', `${sumExp(g)} pcs`], ['Received', `${sumRec(g)} pcs`], ['Weight', `${tw.toFixed(2)} kg`]].map(([k, v], i) => (
            <View key={k} style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingHorizontal: 10, paddingBottom: 12, borderLeftWidth: i ? 1 : 0, borderLeftColor: '#E6EAF2' }}>
              <Txt style={[font(500, 9, 12), { letterSpacing: 0.5, textTransform: 'uppercase', color: C.text2 }]} lines={1}>{k}</Txt>
              <Txt style={[font(600, 14, 20), tabular, { marginTop: 4 }]} lines={1}>{v}</Txt>
            </View>
          ))}
        </View>
        <SecHead icon="truck" title="Handover record" ar="سجل التسليم" />
        <KvGrid items={[['Handed over by', ho?.driver ?? '—'], ['Driver contact', ho?.mobile ?? '—'], ['Arrived', ho?.arrived ?? '—'], ['Created', g.createdTime]]} />
        <SecHead icon="pen-line" title="Signatures" ar="التواقيع" />
        <View style={{ flexDirection: 'row', gap: 8, padding: 14 }}>
          {sigs.map(([role, ar, name]) => (
            <View key={role} style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <View style={{ height: 56, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D5DBE6', backgroundColor: '#FAFBFD', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                <Txt style={{ fontStyle: 'italic', fontSize: 13, lineHeight: 16, fontFamily: 'serif', color: name ? C.primary700 : C.text3, textAlign: 'center' }} lines={2}>{name || 'Pending'}</Txt>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#E6EAF2', paddingTop: 6 }}>
                <Txt style={[font(600, 9, 12), { letterSpacing: 0.5, textTransform: 'uppercase', color: C.text2 }]}>{role}</Txt>
                <Txt style={[font(400, 10, 14), { color: C.primary600, textAlign: 'right', marginTop: 2 }]} lines={1}>{ar}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F6F8FC', borderTopWidth: 1, borderTopColor: '#E6EAF2' }}>
          <Txt style={[font(400, 10, 14), { flex: 1, color: C.text2 }]}>Items received subject to dnata standard terms of valuable cargo handling and storage. Receipt timestamp drives FIFO pickup sequence and storage billing.</Txt>
          <Txt style={[font(500, 10, 14), { color: C.text2 }]}>{vhrNo}</Txt>
        </View>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary50, alignItems: 'center', justifyContent: 'center' }}><Icon name="pen-line" size={20} color={C.primary600} /></View>
          <View style={{ flex: 1 }}>
            <Txt style={font(600, 14, 20)}>Sign this receipt</Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>Countersign on behalf of dnata vault operations</Txt>
          </View>
        </View>
        <View style={{ padding: 14, gap: 14 }}>
          <SelectField label="Vault in-charge" required placeholder="Select officer" value={ap ? `${ap.name} · ${ap.role}` : ''}
            onPress={() => s.openPicker('Approved by', STAFF.map((x) => ({ v: x.id, label: x.name, sub: `${x.role} · ${x.id}` })), approver, setApprover)} />
          <Pressable onPress={() => setConfirmed(!confirmed)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, pressed && { opacity: 0.6 }]}>
            <View style={{ width: 20, height: 20, borderRadius: 6, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: confirmed ? C.primary500 : '#fff', borderWidth: 1.5, borderColor: confirmed ? C.primary500 : C.borderStrong }}>
              {confirmed ? <Icon name="check" size={13} color="#fff" /> : null}
            </View>
            <Txt style={[font(400, 13, 18), { flex: 1 }]}>I confirm the goods listed above were received, counted and sealed in the presence of the customer representative.</Txt>
          </Pressable>
          <View style={{ gap: 6 }}>
            <Txt style={font(500, 12, 16)}>Signature <Txt style={{ color: C.errorText }}>*</Txt></Txt>
            <SignaturePad ref={pad} onChange={setSigned} style={{ height: 160, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D5DBE6', borderRadius: 14, backgroundColor: '#FAFBFD' }}>
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 30, height: 1, backgroundColor: '#D5DBE6' }} />
              <Txt style={[font(400, 11, 14), { position: 'absolute', left: 16, bottom: 10, color: C.text2 }]}>Sign above with your finger</Txt>
            </SignaturePad>
            <View style={{ position: 'absolute', top: 30, right: 8 }}>
              <Button variant="secondary" size="sm" leadingIcon="eraser" onPress={() => pad.current?.clear()}>Clear</Button>
            </View>
          </View>
        </View>
      </View>
    </Sheet>
  );
}
