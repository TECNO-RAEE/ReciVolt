import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import {
  adminKinds,
  editAdminRecord,
  searchAdminRecords,
  type AdminKind,
  type AdminRecord,
} from '@/services/admin.service';
import { getCompanyPortal, portalCommand } from '@/services/portal.service';
import { getReward } from '@/services/reward.service';
import type { CompanyPortalData, PortalCompany } from '@/models/Portal';
import { CompanyPointEditor } from './CompanyPointEditor';
import { RewardEditor } from './AdminRewards';
import {
  PortalField,
  PortalFeedback,
  PortalLink,
  PortalLoading,
  PortalNav,
  portalStyles as s,
} from './PortalUI';

export function AdminSearch({
  companies,
  refresh,
  onBackChange,
}: Readonly<{
  companies: PortalCompany[];
  refresh: () => Promise<void>;
  onBackChange?: (handler: (() => void) | null) => void;
}>) {
  const [kind, setKind] = useState<AdminKind>('users');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  useEffect(() => {
    onBackChange?.(selected ? () => setSelected(null) : null);
    return () => onBackChange?.(null);
  }, [selected, onBackChange]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(draft.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft]);
  const loader = useCallback(() => searchAdminRecords(query, kind, page * 25), [query, kind, page]);
  const result = usePortalData(loader);
  const close = async () => {
    await refresh();
    await result.refresh();
    setSelected(null);
  };
  if (selected)
    return (
      <RecordEditor
        key={`${selected.kind}/${selected.id}`}
        record={selected}
        companies={companies}
        close={close}
        cancel={() => setSelected(null)}
      />
    );
  const pending = draft.trim() !== query;
  return (
    <View style={s.stack}>
      <PortalNav
        items={Object.values(adminKinds)}
        selected={adminKinds[kind]}
        onSelect={(label) => {
          setKind(Object.entries(adminKinds).find(([, v]) => v === label)![0] as AdminKind);
          setPage(0);
        }}
      />
      <PortalField
        label={`Buscar ${adminKinds[kind].toLowerCase()} por nombre o ID`}
        value={draft}
        onChangeText={setDraft}
        maxLength={150}
        returnKeyType="search"
      />
      {!draft.trim() ? (
        <Text style={s.body}>Escribí un nombre o un ID completo o parcial.</Text>
      ) : (
        <>
          <PortalLoading
            loading={result.loading || pending}
            error={result.error}
            retry={() => void result.refresh()}
          />
          {!result.loading && !pending && !result.error && (
            <>
              {result.data?.rows.length === 0 && (
                <Text style={s.body}>No encontramos resultados para esta búsqueda.</Text>
              )}
              {result.data?.rows.map((row) => (
                <View key={row.id} style={s.row}>
                  <Text style={s.subtitle}>{row.name || 'Sin nombre'}</Text>
                  <Text style={s.body}>{row.description}</Text>
                  <Text selectable style={s.hint}>
                    ID: {row.id}
                  </Text>
                  <PortalLink title="Editar" onPress={() => setSelected(row)} />
                </View>
              ))}
              <View style={s.actions}>
                <PortalLink
                  title="Anterior"
                  disabled={page === 0}
                  onPress={() => setPage(page - 1)}
                />
                <Text style={s.body}>Página {page + 1}</Text>
                <PortalLink
                  title="Siguiente"
                  disabled={!result.data?.hasMore}
                  onPress={() => setPage(page + 1)}
                />
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}
function RecordEditor({
  record,
  companies,
  close,
  cancel,
}: Readonly<{
  record: AdminRecord;
  companies: PortalCompany[];
  close: () => Promise<void>;
  cancel: () => void;
}>) {
  if (record.kind === 'users') return <UserEditor record={record} close={close} cancel={cancel} />;
  if (record.kind === 'rewards')
    return <SearchReward record={record} companies={companies} close={close} cancel={cancel} />;
  return <CompanyRecordEditor record={record} close={close} cancel={cancel} />;
}
function UserEditor({
  record,
  close,
  cancel,
}: Readonly<{ record: AdminRecord; close: () => Promise<void>; cancel: () => void }>) {
  const [name, setName] = useState(record.name);
  const action = usePortalAction();
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>Editar usuario</Text>
      <Text selectable style={s.hint}>
        ID: {record.id}
      </Text>
      <Text style={s.body}>Correo de la cuenta: {record.description}</Text>
      <PortalField
        label="Nombre completo"
        value={name}
        onChangeText={setName}
        maxLength={150}
        editable={!action.busy}
      />
      <PortalFeedback error={action.error} />
      <ActionButton
        title="Guardar usuario"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await editAdminRecord('users', record.id, { name });
            await close();
          })
        }
      />
      <PortalLink title="Volver al buscador" disabled={action.busy} onPress={cancel} />
    </View>
  );
}
function SearchReward({
  record,
  companies,
  close,
  cancel,
}: Readonly<{
  record: AdminRecord;
  companies: PortalCompany[];
  close: () => Promise<void>;
  cancel: () => void;
}>) {
  const loader = useCallback(() => getReward(record.id), [record.id]);
  const { data, loading, error, refresh } = usePortalData(loader);
  return (
    <View style={s.stack}>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data && !loading && !error && (
        <RewardEditor
          reward={data}
          companies={companies}
          close={() => void close()}
          cancel={cancel}
        />
      )}
      {!data && !loading && !error && <Text style={s.body}>Premio no encontrado.</Text>}
      {(!data || error) && <PortalLink title="Volver al buscador" onPress={cancel} />}
    </View>
  );
}
function CompanyRecordEditor({
  record,
  close,
  cancel,
}: Readonly<{ record: AdminRecord; close: () => Promise<void>; cancel: () => void }>) {
  const loader = useCallback(() => getCompanyPortal(record.company_id!), [record.company_id]);
  const { data, loading, error, refresh } = usePortalData(loader);
  const point = data?.points.find((p) => p.id === record.id);
  return (
    <View style={s.stack}>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data &&
        !loading &&
        !error &&
        (record.kind === 'points' ? (
          point ? (
            <CompanyPointEditor data={data} point={point} onSaved={close} onCancel={cancel} />
          ) : (
            <Text style={s.body}>Punto verde no encontrado.</Text>
          )
        ) : (
          <CompanyFields data={data} record={record} close={close} cancel={cancel} />
        ))}
      {(error || (!loading && (!data || (record.kind === 'points' && !point)))) && (
        <PortalLink title="Volver al buscador" onPress={cancel} />
      )}
    </View>
  );
}
function CompanyFields({
  data,
  record,
  close,
  cancel,
}: Readonly<{
  data: CompanyPortalData;
  record: AdminRecord;
  close: () => Promise<void>;
  cancel: () => void;
}>) {
  const [name, setName] = useState(data.company.name);
  const [fields, setFields] = useState(
    data.details ?? { phone: '', address: '', website: '', description: '' }
  );
  const [note, setNote] = useState('');
  const action = usePortalAction();
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>Editar empresa</Text>
      <Text selectable style={s.hint}>
        ID: {record.id}
      </Text>
      <PortalField
        label="Nombre de la empresa o institución"
        value={name}
        onChangeText={setName}
        maxLength={150}
        editable={!action.busy}
      />
      {data.details &&
        (['phone', 'address', 'website', 'description'] as const).map((key) => (
          <PortalField
            key={key}
            label={
              {
                phone: 'Teléfono',
                address: 'Dirección',
                website: 'Sitio web',
                description: 'Descripción',
              }[key]
            }
            value={fields[key]}
            onChangeText={(value) => setFields({ ...fields, [key]: value })}
            multiline={key === 'description'}
            editable={!action.busy}
          />
        ))}
      <ActionButton
        title="Guardar empresa"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await editAdminRecord('companies', record.id, { name, ...fields });
            await close();
          })
        }
      />
      <Text style={s.body}>
        Estado: {data.company.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
      </Text>
      <PortalField
        label="Motivo de suspensión o reactivación"
        value={note}
        onChangeText={setNote}
        editable={!action.busy}
      />
      <ActionButton
        title={data.company.status === 'ACTIVE' ? 'Suspender empresa' : 'Reactivar empresa'}
        secondary
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await portalCommand('set_company_status', {
              id: record.id,
              status: data.company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              note,
            });
            await close();
          })
        }
      />
      <PortalFeedback error={action.error} />

      <PortalLink title="Volver al buscador" disabled={action.busy} onPress={cancel} />
    </View>
  );
}
