import { useCallback, useState } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/discovery/SearchBar';
import { usePortalData } from '@/hooks/usePortalData';
import {
  auditGroupOf,
  auditGroups,
  auditNames,
  changelogChanges,
  type AuditGroupKey,
} from '@/models/Changelog';
import type { AuditEntry, PortalCompany } from '@/models/Portal';
import { getChangelog } from '@/services/portal.service';
import { colors } from '@/theme';
import { AdminEmpty } from './AdminPage';
import {
  PortalLink,
  PortalListItem,
  PortalLoading,
  PortalSelect,
  portalStyles as s,
} from './PortalUI';

const groupIcons: Record<AuditGroupKey, ComponentProps<typeof Ionicons>['name']> = {
  organizations: 'business-outline',
  points: 'leaf',
  rewards: 'gift-outline',
  limits: 'people-outline',
  users: 'person-outline',
  documents: 'document-text-outline',
};

export function AdminChangelog({ companies }: Readonly<{ companies: PortalCompany[] }>) {
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [group, setGroup] = useState<AuditGroupKey | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const loader = useCallback(
    () =>
      getChangelog(page * 25, search, true, {
        companyId: companyId || null,
        actions: auditGroups.find((g) => g.key === group)?.actions ?? null,
      }),
    [page, search, companyId, group]
  );
  const { data, loading, error, refresh } = usePortalData(loader);
  const filtered = Boolean(search || companyId || group);
  return (
    <View style={s.stack}>
      <PortalSelect
        label="Institución"
        hideLabel
        value={companyId}
        options={[
          { value: '', label: 'Todas las instituciones' },
          ...companies.map((c) => ({ value: c.id, label: c.name })),
        ]}
        onChange={(value) => {
          setCompanyId(value);
          setPage(0);
        }}
      />
      <PortalSelect
        label="Tipo de acción"
        hideLabel
        value={group}
        options={[
          { value: '' as const, label: 'Todos los tipos de acción' },
          ...auditGroups.map((g) => ({ value: g.key, label: g.label })),
        ]}
        onChange={(value) => {
          setGroup(value);
          setPage(0);
        }}
      />
      <SearchBar
        value={draft}
        onChangeText={(value) => {
          setDraft(value);
          if (!value) {
            setSearch('');
            setPage(0);
          }
        }}
        onSubmit={() => {
          setSearch(draft.trim());
          setPage(0);
        }}
        label="Buscar por persona, empresa o referencia"
        placeholder="Persona, empresa o referencia"
      />
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data && !loading && !error && (
        <>
          {data.entries.length === 0 && (
            <AdminEmpty
              icon="time-outline"
              title="Sin operaciones registradas"
              description={
                filtered
                  ? 'No hay resultados para estos filtros.'
                  : 'Las próximas operaciones aparecerán aquí automáticamente.'
              }
            />
          )}
          {data.entries.map((entry) => (
            <ChangelogEntry
              key={entry.id}
              entry={entry}
              open={open === entry.id}
              toggle={() => setOpen(open === entry.id ? null : entry.id)}
            />
          ))}
          {(page > 0 || data.hasMore) && (
            <View style={[s.actions, { justifyContent: 'center' }]}>
              <PortalLink
                title="Anterior"
                disabled={page === 0 || loading}
                onPress={() => setPage(page - 1)}
              />
              <Text style={s.body}>Página {page + 1}</Text>
              <PortalLink
                title="Siguiente"
                disabled={!data.hasMore || loading}
                onPress={() => setPage(page + 1)}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
function ChangelogEntry({
  entry,
  open,
  toggle,
}: Readonly<{ entry: AuditEntry; open: boolean; toggle: () => void }>) {
  const group = auditGroupOf(entry.action);
  const changes = changelogChanges(entry.details.before, entry.details.after);
  const name = typeof entry.details.name === 'string' ? entry.details.name : null;
  const detail: TextStyle = { ...s.body, color: colors.textSecondary };
  return (
    <PortalListItem
      icon={group ? groupIcons[group] : 'time-outline'}
      title={auditNames[entry.action] ?? entry.action}
      lines={[
        name,
        entry.companyName !== name && entry.companyName,
        new Date(entry.createdAt).toLocaleDateString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          dateStyle: 'medium',
        }),
      ]}
      accessibilityHint={open ? 'Ocultar detalle' : 'Ver detalle'}
      onPress={toggle}
    >
      {open && (
        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={detail}>
            {entry.actorName || 'Cuenta'}
            {entry.actorEmail ? ` · ${entry.actorEmail}` : ''}
          </Text>
          <Text style={detail}>
            {new Date(entry.createdAt).toLocaleString('es-AR', {
              timeZone: 'America/Argentina/Buenos_Aires',
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
          {typeof entry.details.email === 'string' && (
            <Text style={detail}>Destinatario: {entry.details.email}</Text>
          )}
          {entry.note && <Text style={detail}>Motivo: {entry.note}</Text>}
          {changes.map((change, i) => (
            <View
              key={i}
              style={{
                gap: 4,
                paddingLeft: 12,
                borderLeftWidth: 2,
                borderLeftColor: colors.primary,
              }}
            >
              <Text style={s.body}>
                {change.entity} · {change.field}
              </Text>
              <Text selectable style={s.hint}>
                {change.before} → {change.after}
              </Text>
            </View>
          ))}
          {entry.targetId && (
            <Text selectable style={s.hint}>
              Referencia: {entry.targetId}
            </Text>
          )}
        </View>
      )}
    </PortalListItem>
  );
}
