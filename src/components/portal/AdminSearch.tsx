import { Ionicons } from '@expo/vector-icons';
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
import { useColors } from '@/theme';
import { CompanyPointEditor } from './CompanyPointEditor';
import { RewardEditor } from './AdminRewards';
import {
  PortalBadge,
  PortalField,
  PortalFeedback,
  PortalLink,
  PortalListItem,
  PortalLoading,
  PortalNav,
  usePortalStyles,
} from './PortalUI';

const kindIcons = {
  users: 'person-outline',
  companies: 'business-outline',
  points: 'leaf-outline',
  rewards: 'gift-outline',
} as const;

function companyStatusBadge(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ACTIVE') return { label: 'Activa', tone: 'success' as const };
  if (normalized === 'SUSPENDED') return { label: 'Suspendida', tone: 'danger' as const };
  return null;
}

export function AdminSearch({
  companies,
  refresh,
  onBackChange,
}: Readonly<{
  companies: PortalCompany[];
  refresh: () => Promise<void>;
  onBackChange?: (handler: (() => void) | null) => void;
}>) {
  const s = usePortalStyles();
  const [kind, setKind] = useState<AdminKind>('users');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
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
    setSavedNotice('Cambios guardados.');
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
  const rows = result.data?.rows ?? [];
  const showPagination = Boolean(result.data && (page > 0 || result.data.hasMore));
  return (
    <View style={s.stack}>
      <PortalNav
        items={Object.values(adminKinds)}
        selected={adminKinds[kind]}
        onSelect={(label) => {
          setKind(Object.entries(adminKinds).find(([, v]) => v === label)![0] as AdminKind);
          setPage(0);
          setSavedNotice(null);
        }}
      />
      <PortalField
        label={`Buscar ${adminKinds[kind].toLowerCase()} por nombre o ID`}
        value={draft}
        onChangeText={(value) => {
          setDraft(value);
          if (savedNotice) setSavedNotice(null);
        }}
        maxLength={150}
        returnKeyType="search"
      />
      <PortalFeedback notice={savedNotice} />
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
              {rows.length === 0 && (
                <Text style={s.body}>No encontramos resultados para esta búsqueda.</Text>
              )}
              {rows.map((row) => {
                const badge = row.kind === 'companies' ? companyStatusBadge(row.description) : null;
                return (
                  <PortalListItem
                    key={row.id}
                    icon={kindIcons[row.kind]}
                    title={row.name || 'Sin nombre'}
                    badge={
                      row.kind === 'companies' ? (
                        <PortalBadge
                          label={badge?.label ?? 'Estado no disponible'}
                          tone={badge?.tone ?? 'neutral'}
                        />
                      ) : undefined
                    }
                    lines={[
                      row.kind !== 'companies' ? row.description : undefined,
                      `ID: ${row.id}`,
                    ]}
                    accessibilityHint="Editar registro"
                    onPress={() => {
                      setSavedNotice(null);
                      setSelected(row);
                    }}
                  />
                );
              })}
              {showPagination && (
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
              )}
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
  const s = usePortalStyles();
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
  const s = usePortalStyles();
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
  const s = usePortalStyles();
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
  const colors = useColors();
  const s = usePortalStyles();
  const [name, setName] = useState(data.company.name);
  const [fields, setFields] = useState(
    data.details ?? { phone: '', address: '', website: '', description: '' }
  );
  const [note, setNote] = useState('');
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const saveAction = usePortalAction();
  const suspendAction = usePortalAction();
  const busy = saveAction.busy || suspendAction.busy;
  const isActive = data.company.status === 'ACTIVE';
  const trimmedNote = note.trim();

  const executeStatusChange = () =>
    void suspendAction.run(async () => {
      if (trimmedNote.length < 5) {
        throw new Error('Ingresá un motivo de al menos 5 caracteres.');
      }
      await portalCommand('set_company_status', {
        id: record.id,
        status: isActive ? 'SUSPENDED' : 'ACTIVE',
        note: trimmedNote,
      });
      await close();
    });

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
        editable={!busy}
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
            editable={!busy}
          />
        ))}
      <PortalFeedback error={saveAction.error} notice={saveAction.notice} />
      <ActionButton
        title="Guardar empresa"
        loading={saveAction.busy}
        disabled={busy}
        onPress={() =>
          void saveAction.run(async () => {
            await editAdminRecord('companies', record.id, { name, ...fields });
            await close();
          })
        }
      />
      <View style={s.section}>
        <View style={s.actions}>
          <Text style={s.label}>Estado actual:</Text>
          <PortalBadge
            label={isActive ? 'Activa' : 'Suspendida'}
            tone={isActive ? 'success' : 'danger'}
          />
        </View>
        <View style={{ gap: 6 }}>
          <PortalField
            label="Motivo de suspensión o reactivación"
            value={note}
            onChangeText={(value) => {
              setNote(value);
              if (confirmingSuspend && value.trim().length < 5) {
                setConfirmingSuspend(false);
              }
            }}
            editable={!busy && !confirmingSuspend}
          />
          <Text style={s.hint}>Mínimo 5 caracteres ({trimmedNote.length}/5).</Text>
        </View>
        <PortalFeedback error={suspendAction.error} notice={suspendAction.notice} />
        {isActive ? (
          confirmingSuspend ? (
            <View
              style={{
                gap: 12,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.danger,
                backgroundColor: colors.dangerBackground,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={[s.body, { flex: 1, minWidth: 0, color: colors.danger }]}>
                  ¿Confirmás suspender a {data.company.name}? Sus puntos verdes, premios y equipo
                  dejarán de operar hasta que la reactives.
                </Text>
              </View>
              <ActionButton
                title="Confirmar suspensión"
                destructive
                loading={suspendAction.busy}
                disabled={busy}
                onPress={executeStatusChange}
              />
              <ActionButton
                title="Cancelar"
                secondary
                disabled={busy}
                onPress={() => setConfirmingSuspend(false)}
              />
            </View>
          ) : (
            <ActionButton
              title="Suspender empresa"
              secondary
              destructive
              loading={suspendAction.busy}
              disabled={busy}
              onPress={() => {
                if (trimmedNote.length < 5) {
                  void suspendAction.run(async () => {
                    throw new Error('Ingresá un motivo de al menos 5 caracteres.');
                  });
                  return;
                }
                setConfirmingSuspend(true);
              }}
            />
          )
        ) : (
          <ActionButton
            title="Reactivar empresa"
            secondary
            loading={suspendAction.busy}
            disabled={busy}
            onPress={executeStatusChange}
          />
        )}
      </View>

      <PortalLink title="Volver al buscador" disabled={busy} onPress={cancel} />
    </View>
  );
}
