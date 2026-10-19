import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useState } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  PortalField,
  PortalLoading,
  PortalFeedback,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import { AdminPage, AdminEmpty } from '@/components/portal/AdminPage';
import { AdminSearch } from '@/components/portal/AdminSearch';
import { AdminChangelog } from '@/components/portal/AdminChangelog';
import { AdminRewards } from '@/components/portal/AdminRewards';
import { AdminPoints } from '@/components/portal/AdminPoints';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useAuth } from '@/providers/AuthProvider';
import { type AdminPortalData } from '@/models/Portal';
import { getAdminPortal, portalCommand } from '@/services/portal.service';

const sections = [
  'Puntos verdes',
  'Premios',
  'Buscador',
  'Límites',
  'Historial de cambios',
] as const;
export default function AdminScreen() {
  const { profile, logout } = useAuth();
  const [tab, setTab] = useState<string>('Puntos verdes');
  const [historyRevision, setHistoryRevision] = useState(0);
  const { data, loading, error, refresh } = usePortalData(getAdminPortal);
  const action = usePortalAction();
  return (
    <AdminPage
      name={profile?.fullName ?? 'Administrador'}
      sections={sections}
      selected={tab}
      onSelect={setTab}
      refresh={() => {
        void refresh();
        setHistoryRevision((value) => value + 1);
      }}
      busy={action.busy || loading}
      logout={() =>
        void action.run(async () => {
          await logout();
          router.replace('/');
        })
      }
    >
      <PortalFeedback error={action.error} />
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data && !error && (
        <View key={tab} style={s.stack}>
          {tab === 'Buscador' && <AdminSearch companies={data.companies} refresh={refresh} />}
          {tab === 'Puntos verdes' && (
            <AdminPoints key={historyRevision} companies={data.companies} refresh={refresh} />
          )}
          {tab === 'Premios' && <AdminRewards key={historyRevision} companies={data.companies} />}
          {tab === 'Límites' && <Limits data={data} refresh={refresh} />}
          {tab === 'Historial de cambios' && <AdminChangelog key={historyRevision} />}
        </View>
      )}
    </AdminPage>
  );
}
function Limits({
  data,
  refresh,
}: Readonly<{ data: AdminPortalData; refresh: () => Promise<void> }>) {
  const action = usePortalAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <>
      {data.limitRequests.length === 0 && (
        <AdminEmpty
          title="No hay ampliaciones pendientes"
          description="Las empresas pueden solicitar más cupos para su equipo. Sus solicitudes aparecerán aquí."
        />
      )}
      {data.limitRequests.map((r) => (
        <View key={r.id} style={s.row}>
          <Text style={s.subtitle}>
            {r.companyName} · {r.requestedLimit} cupos
          </Text>
          <Text style={s.body}>{r.reason}</Text>
          <Text style={s.hint}>
            {r.status === 'SUBMITTED'
              ? 'En revisión'
              : r.status === 'APPROVED'
                ? 'Aprobada'
                : 'Rechazada'}
          </Text>
          {r.reviewNote && <Text style={s.body}>{r.reviewNote}</Text>}
          {r.status === 'SUBMITTED' && (
            <>
              <PortalField
                label="Observación"
                value={notes[r.id] ?? ''}
                onChangeText={(value) => setNotes({ ...notes, [r.id]: value })}
                editable={!action.busy}
              />
              {['APPROVED', 'REJECTED'].map((status) => (
                <ActionButton
                  key={status}
                  title={status === 'APPROVED' ? 'Aprobar ampliación' : 'Rechazar ampliación'}
                  secondary={status === 'REJECTED'}
                  loading={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await portalCommand('review_limit', {
                        id: r.id,
                        status,
                        note: notes[r.id] ?? '',
                      });
                      await refresh();
                    }, 'Revisión guardada.')
                  }
                />
              ))}
            </>
          )}
        </View>
      ))}
      <PortalFeedback error={action.error} notice={action.notice} />
    </>
  );
}
