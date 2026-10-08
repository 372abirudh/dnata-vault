import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, newGrnDraft, grnDraftGate, customersOf, GrnDraft } from '../../store';
import { C, R, font } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Box, Button, IconButton, Radio, SelectField, TextField, Txt } from '../../components/ds';
import { SectionLabel, SheetFooter, SheetHeader } from '../../components/vault';
import { FooterBar, Sheet } from '../../components/overlay';
import { CATALOG, FACILITIES, PACK_TYPES, STAFF, byCode, staffById } from '../../data/seed';
import { dateLong } from '../../data/format';

export function GrnCreateSheet() {
  const s = useStore();
  const [c, setC] = useState<GrnDraft>(newGrnDraft);
  const up = (p: Partial<GrnDraft>) => setC((x) => ({ ...x, ...p }));
  const upLine = (i: number, p: Partial<GrnDraft['lines'][number]>) => setC((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) }));
  const close = () => s.set({ grnSheet: null });
  const customers = customersOf(s.grns, s.orders);
  const gate = grnDraftGate(c);
  const pick = <T,>(title: string, opts: { v: T; label: string; sub?: string }[], cur: T, fn: (v: T) => void) => s.openPicker(title, opts, cur, fn);
  const simple = (title: string, list: string[], key: keyof GrnDraft) => () => pick(title, list.map((v) => ({ v, label: v })), c[key] as string, (v) => up({ [key]: v } as never));

  const addFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: false });
    if (!r.canceled) up({ files: [...c.files, ...r.assets.map((a) => a.name)] });
  };

  return (
    <Sheet
      onClose={close} z={40}
      header={<SheetHeader title="Goods Receipt Note" onClose={close} />}
      bodyStyle={{ paddingTop: 4, paddingBottom: 20 }}
      footer={
        <FooterBar style={{ flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.hairline }}>
          <View style={{ flex: 1 }}><Button variant="secondary" size="lg" fullWidth onPress={close}>Cancel</Button></View>
          <View style={{ flex: 1.6 }}>
            <Button size="lg" fullWidth disabled={!!gate} onPress={() => { const no = s.createGrn(c); close(); s.flash(`${no} created as draft.`); }}>Create request</Button>
          </View>
        </FooterBar>
      }
    >
      <SelectField label="Customer name" required placeholder="Select customer" value={customers.find((x) => x.id === c.customer)?.name ?? ''}
        onPress={() => pick('Customer name', customers.map((x) => ({ v: x.id, label: x.name, sub: x.id })), c.customer, (v) => up({ customer: v }))} />
      <SelectField label="Transaction type" required placeholder="Select type" value={c.txType} onPress={simple('Transaction type', ['Contractual', 'Ad-hoc', 'Consignment'], 'txType')} />
      <SectionLabel form label="Goods receipt note information" />
      <SelectField label="Facility" required placeholder="Select facility" value={c.facility}
        onPress={() => pick('Facility', Object.entries(FACILITIES).map(([k, v]) => ({ v: k, label: k, sub: `${v.length} vaults` })), c.facility, (v) => up({ facility: v }))} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><SelectField label="Inbound type" required placeholder="Select" value={c.inbound} onPress={simple('Inbound type', ['Local', 'Import', 'Re-export', 'Transit'], 'inbound')} /></View>
        <View style={{ flex: 1 }}><SelectField label="Receipt mode" placeholder="Select" value={c.mode} onPress={simple('Receipt mode', ['Counter', 'Airside', 'Armoured vehicle', 'Courier'], 'mode')} /></View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt style={font(500, 12, 16)}>Vault type</Txt>
        <View style={{ flexDirection: 'row', gap: 24, minHeight: 32 }}>
          {['Virtual Vault', 'Actual Vault'].map((v) => <Radio key={v} checked={c.vaultType === v} label={v} onPress={() => up({ vaultType: v })} />)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><TextField label="PO number" required placeholder="E.g. 757753" value={c.po} onChangeText={(v) => up({ po: v.toUpperCase() })} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}>
          <TextField label="Expected receipt date" required value={dateLong(c.date)} readOnly trailingIcon="calendar"
            onPress={() => s.openDate('Expected receipt date', 'date', c.date, (d) => up({ date: d }))} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Txt style={font(500, 12, 16)}>Attachments</Txt>
        <Pressable onPress={addFiles} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 16, paddingRight: 14, borderRadius: R.input, backgroundColor: pressed ? C.fieldPressed : C.field }]}>
          <Txt style={[font(400, 14, 20), { flex: 1, color: c.files.length ? C.text : C.text3 }]} lines={1}>
            {c.files.length ? `${c.files.length} ${c.files.length === 1 ? 'file' : 'files'} attached` : 'Upload invoice, packing list or permit'}
          </Txt>
          <Icon name="upload" size={18} color={C.n600} />
        </Pressable>
        {c.files.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {c.files.map((f, i) => (
              <View key={f + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingLeft: 10, paddingRight: 4, borderRadius: 999, backgroundColor: C.primary50, maxWidth: '100%' }}>
                <Icon name="paperclip" size={14} color={C.primary600} />
                <Txt style={[font(500, 12, 16), { color: C.primary600, flexShrink: 1 }]} lines={1}>{f}</Txt>
                <Pressable onPress={() => up({ files: c.files.filter((_, j) => j !== i) })} accessibilityLabel="Remove attachment" style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={14} color={C.primary600} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <TextField label="Description" multiline rows={3} placeholder="Handling notes for the receiving team" value={c.desc} onChangeText={(v) => up({ desc: v })} />
      <SectionLabel form label="Goods line items" />
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 16, overflow: 'hidden' }}>
        {c.lines.map((l, i) => (
          <View key={i} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
              <Txt style={[font(600, 12, 16), { flex: 1, color: C.text2 }]}>Line {i + 1}</Txt>
              {c.lines.length > 1 ? <IconButton icon="trash-2" label="Remove item" variant="neutral" size="sm" onPress={() => setC((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))} /> : null}
            </View>
            <SelectField label="Item name" required placeholder="Select item" value={byCode(l.item)?.name ?? ''}
              onPress={() => pick('Item name', CATALOG.map((x) => ({ v: x.code, label: x.name, sub: x.code })), l.item, (v) => upLine(i, { item: v, pack: l.pack || byCode(v)!.pack }))} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SelectField label="Pack type" required placeholder="Select" value={l.pack} onPress={() => pick('Pack type', PACK_TYPES.map((v) => ({ v, label: v })), l.pack, (v) => upLine(i, { pack: v }))} />
              </View>
              <View style={{ width: 104 }}>
                <TextField label="Expected qty" required keyboardType="number-pad" value={l.qty} onChangeText={(v) => upLine(i, { qty: v.replace(/[^0-9]/g, '') })} />
              </View>
            </View>
          </View>
        ))}
        <View style={{ padding: 8, alignItems: 'flex-start' }}>
          <Button variant="text" size="sm" leadingIcon="plus" onPress={() => setC((x) => ({ ...x, lines: [...x.lines, { item: '', pack: '', qty: '1' }] }))}>Add new</Button>
        </View>
      </View>
      {gate ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <Icon name="circle-alert" size={16} color={C.warningIcon} />
          <Txt style={[font(400, 12, 16), { flex: 1, color: C.warningText }]}>{gate}</Txt>
        </View>
      ) : null}
    </Sheet>
  );
}

export function AssignSheet() {
  const s = useStore();
  const [staff, setStaff] = useState('EMP-2110');
  const [remarks, setRemarks] = useState('Dual-custody count at Bay 2');
  const close = () => s.set({ grnSheet: null });
  const st = staffById(staff);
  return (
    <Sheet
      onClose={close} z={50} bodyBg={C.bgApp}
      header={<SheetHeader title="Assign staff" subtitle="The assignee takes ownership" icon="user-check" onClose={close} />}
      footer={
        <SheetFooter
          note={st ? 'Assignee is notified and becomes owner' : 'Select a staff member to continue'} noteTone={st ? 'success' : 'warning'}
          primaryLabel="Assign staff" primaryIcon="user-check" blocked={!st} onCancel={close}
          onPrimary={() => { s.assignGrn(s.sheetNo, staff, remarks); close(); s.flash(`Assigned to ${st!.name}.`); }}
        />
      }
    >
      <Box padded style={{ gap: 12 }}>
        <SelectField label="Staff name" required placeholder="Select staff member" value={st ? `${st.name} · ${st.role}` : ''}
          onPress={() => s.openPicker('Assign to', STAFF.map((x) => ({ v: x.id, label: x.name, sub: `${x.role} · ${x.id}` })), staff, setStaff)} />
        <TextField label="Remarks" multiline rows={3} placeholder="Handling notes for the assignee" value={remarks} onChangeText={setRemarks} />
      </Box>
    </Sheet>
  );
}
