import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction } from '@/hooks/usePortalData';
import type { AdminPortalData, CompanyLimitRequest } from '@/models/Portal';
import { portalCommand } from '@/services/portal.service';
import { colors } from '@/theme';
import { AdminEmpty } from './AdminPage';
import {
  OrganizationCard,
  PortalBadge,
  PortalFeedback,
  PortalField,
  PortalListItem,
  portalStyles as s,
} from './PortalUI';

const noteLimit = 200;
const statuses = {
  SUBMITTED: { label: 'En revisión', tone: 'neutral', icon: 'time-outline' },
  APPROVED: { label: 'Aprobada', tone: 'success', icon: 'checkmark-circle' },
  REJECTED: { label: 'Rechazada', tone: 'danger', icon: 'close-circle' },
} as const;
const roles = [
  ['Administrador', 'gestiona organizaciones, premios y validaciones de la red.'],
  ['Responsable', 'administra su organización, sus puntos y su equipo.'],
  ['Trabajador', 'recibe entregas y valida premios en el local.'],
] as const;
const card = {
  gap: 16,
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
} as const;

export function LimitsManager({
  data,
  refresh,
}: Readonly<{ data: AdminPortalData; refresh: () => Promise<void> }>) {
  const pending = data.limitRequests.filter((r) => r.status === 'SUBMITTED');
  const reviewed = data.limitRequests.filter((r) => r.status !== 'SUBMITTED');
  return (
    <>
      {pending.map((r) => (
        <LimitRequest
          key={r.id}
          request={r}
          currentLimit={data.companies.find((c) => c.id === r.companyId)?.workerLimit}
          refresh={refresh}
        />
      ))}
      {pending.length === 0 && (
        <View style={card}>
          <AdminEmpty
            icon="document-text-outline"
            title="Sin solicitudes pendientes"
            description="Cuando una organización pida más cupos para su equipo, la solicitud aparecerá acá."
          />
          <StatusLegend />
        </View>
      )}
      {reviewed.length > 0 && (
        <>
          <Text accessibilityRole="header" style={s.heading}>
            Solicitudes revisadas
          </Text>
          {reviewed.map((r) => (
            <PortalListItem
              key={r.id}
              icon="people-outline"
              title={r.companyName}
              badge={
                <PortalBadge label={statuses[r.status].label} tone={statuses[r.status].tone} />
              }
              lines={[`${r.requestedLimit} cupos solicitados`, r.reviewNote]}
            />
          ))}
        </>
      )}
      <View style={[card, { backgroundColor: colors.surfaceSoft }]}>
        <Text accessibilityRole="header" style={s.label}>
          Roles del equipo
        </Text>
        {roles.map(([role, description]) => (
          <View key={role} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Ionicons name="people-outline" size={20} color={colors.primaryDark} />
            <Text style={[s.hint, { flex: 1 }]}>
              <Text style={{ color: colors.text }}>{role}:</Text> {description}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}
function LimitRequest({
  request,
  currentLimit,
  refresh,
}: Readonly<{
  request: CompanyLimitRequest;
  currentLimit?: number;
  refresh: () => Promise<void>;
}>) {
  const action = usePortalAction();
  const [note, setNote] = useState('');
  const review = (status: 'APPROVED' | 'REJECTED') =>
    void action.run(async () => {
      await portalCommand('review_limit', { id: request.id, status, note: note.trim() });
      await refresh();
    }, 'Revisión guardada.');
  return (
    <View style={[card, { padding: 0, overflow: 'hidden' }]}>
      <OrganizationCard
        name={request.companyName}
        role={`Solicita ampliar su equipo${currentLimit != null ? ` · hoy ${currentLimit} cupos` : ''}`}
      />
      <View style={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
        <PortalField
          label="Cupo autorizado"
          labelStyle={s.label}
          value={`${request.requestedLimit} cupos`}
          editable={false}
        />
        <View style={{ gap: 4 }}>
          <PortalField
            label="Motivo"
            labelStyle={s.label}
            value={note}
            onChangeText={setNote}
            placeholder="Ingresar motivo"
            multiline
            maxLength={noteLimit}
            editable={!action.busy}
          />
          <Text style={[s.hint, { alignSelf: 'flex-end' }]}>
            {note.length}/{noteLimit}
          </Text>
        </View>
        <Text style={s.hint}>Motivo de la organización: {request.reason}</Text>
        <PortalFeedback error={action.error} notice={action.notice} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ActionButton
              title="Aprobar"
              loading={action.busy}
              disabled={!note.trim()}
              onPress={() => review('APPROVED')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ActionButton
              title="Rechazar"
              secondary
              loading={action.busy}
              disabled={!note.trim()}
              onPress={() => review('REJECTED')}
            />
          </View>
        </View>
        {!note.trim() && (
          <Text style={s.hint}>Escribí el motivo para aprobar o rechazar la solicitud.</Text>
        )}
      </View>
    </View>
  );
}
function StatusLegend() {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text style={s.hint}>Estados:</Text>
      {Object.values(statuses).map((status) => (
        <View key={status.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons
            name={status.icon}
            size={16}
            color={
              status.tone === 'success'
                ? colors.primary
                : status.tone === 'danger'
                  ? colors.danger
                  : colors.textSecondary
            }
          />
          <Text style={s.hint}>{status.label}</Text>
        </View>
      ))}
    </View>
  );
}
