import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { CodePill, InfoCard } from '@/components/ui/InfoCard';
import { brand } from '@/config/brand';
import { usePortalAction } from '@/hooks/usePortalData';
import type { CompanyPortalData } from '@/models/Portal';
import { useAuth } from '@/providers/AuthProvider';
import { useCompanyPortal } from '@/providers/CompanyPortalProvider';
import { portalCommand, sendCompanyInvitation } from '@/services/portal.service';
import { useColors, useThemedStyles, type ThemeColors } from '@/theme';
import {
  OrganizationCard,
  PortalFeedback,
  PortalField,
  PortalLink,
  usePortalStyles,
} from './PortalUI';

export function CompanyTeam({ data }: Readonly<{ data: CompanyPortalData }>) {
  const colors = useColors();
  const s = usePortalStyles();
  const styles = useThemedStyles(makeStyles);
  const { user, profile } = useAuth();
  const { refresh } = useCompanyPortal();
  const [name, setName] = useState(''),
    [email, setEmail] = useState('');
  const [limit, setLimit] = useState(String(data.company.workerLimit + 10)),
    [reason, setReason] = useState('');
  const [confirmingDisableId, setConfirmingDisableId] = useState<string | null>(null);
  const action = usePortalAction(),
    invite = usePortalAction(),
    request = usePortalAction();
  const used =
    data.members.filter((m) => m.role === 'company_worker' && m.status !== 'DISABLED').length +
    data.invitations.filter((i) => i.role === 'company_worker' && i.status === 'INVITED').length;
  async function command(operation: string, payload: object) {
    await portalCommand(operation, payload);
    await refresh();
  }
  return (
    <>
      <OrganizationCard name={data.company.name} role="Responsable" />
      <Text accessibilityRole="header" style={s.heading}>
        Miembros del equipo
      </Text>
      {data.members.map((m) => (
        <InfoCard
          key={m.id}
          icon={<Ionicons name="person-outline" size={26} color={colors.text} />}
          title={
            m.userId === user?.id
              ? profile?.fullName || 'Mi cuenta'
              : (data.invitations.find((i) => i.acceptedBy === m.userId)?.email ??
                (m.role === 'company_owner' ? 'Responsable de empresa' : 'Trabajador del equipo'))
          }
          subtitle={`${m.role === 'company_owner' ? 'Responsable' : 'Trabajador'} · ${
            m.status === 'ACTIVE'
              ? 'Activo'
              : m.status === 'DISABLED'
                ? 'Deshabilitado'
                : 'Invitado'
          }`}
          right={m.userId === user?.id ? <CodePill code="Tú" /> : undefined}
        >
          {m.role === 'company_worker' &&
            (m.status === 'DISABLED' ? (
              <PortalLink
                title="Reactivar acceso"
                disabled={action.busy}
                onPress={() =>
                  void action.run(() =>
                    command('set_member_status', {
                      id: m.id,
                      status: 'ACTIVE',
                    })
                  )
                }
              />
            ) : confirmingDisableId === m.id ? (
              <View style={[styles.dangerBox, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                  <Text style={[s.body, { flex: 1, minWidth: 0, color: colors.danger }]}>
                    Si deshabilitás este acceso, la persona dejará de recibir entregas y validar
                    premios en la empresa.
                  </Text>
                </View>
                <ActionButton
                  title="Confirmar deshabilitación"
                  destructive
                  loading={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await command('set_member_status', {
                        id: m.id,
                        status: 'DISABLED',
                      });
                      setConfirmingDisableId(null);
                    })
                  }
                />
                <ActionButton
                  title="Cancelar"
                  secondary
                  disabled={action.busy}
                  onPress={() => setConfirmingDisableId(null)}
                />
              </View>
            ) : (
              <PortalLink
                title="Deshabilitar acceso"
                disabled={action.busy}
                onPress={() => setConfirmingDisableId(m.id)}
              />
            ))}
        </InfoCard>
      ))}
      {data.invitations
        .filter((i) => i.status === 'INVITED')
        .map((i) => (
          <InfoCard
            key={i.id}
            icon={<Ionicons name="mail-outline" size={26} color={colors.text} />}
            title={i.email}
            subtitle="Invitación pendiente · reserva un cupo"
          >
            <View style={s.actions}>
              <PortalLink
                title="Reenviar email"
                disabled={action.busy}
                onPress={() => void action.run(() => sendCompanyInvitation(i.id), 'Email enviado.')}
              />
              {i.role === 'company_worker' && (
                <PortalLink
                  title="Cancelar invitación"
                  disabled={action.busy}
                  onPress={() => void action.run(() => command('cancel_invitation', { id: i.id }))}
                />
              )}
            </View>
          </InfoCard>
        ))}
      <PortalFeedback error={action.error} notice={action.notice} />
      <Text accessibilityRole="header" style={s.heading}>
        Invitar nuevo miembro
      </Text>
      <View style={styles.formCard}>
        <PortalField
          label="Nombre"
          labelStyle={s.label}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={120}
          editable={!invite.busy}
        />
        <PortalField
          label="Correo electrónico"
          labelStyle={s.label}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          editable={!invite.busy}
        />
        <Text style={s.label}>Rol asignado: Trabajador</Text>
        <Text style={s.hint}>
          Los trabajadores reciben entregas y validan premios. Para sumar otro responsable, contactá
          al equipo de {brand.name}.
        </Text>
        <PortalFeedback error={invite.error} notice={invite.notice} />
        <ActionButton
          title="Invitar al equipo"
          loading={invite.busy}
          onPress={() =>
            void invite.run(async () => {
              const result = await portalCommand('invite_worker', {
                companyId: data.company.id,
                email,
              });
              setName('');
              setEmail('');
              await refresh();
              await sendCompanyInvitation(result.invitationId!, name);
            }, 'Invitación enviada.')
          }
        />
      </View>
      <InfoNote>El acceso se limita a esta organización.</InfoNote>
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.heading}>
          Cupos del equipo
        </Text>
        <Text style={s.body}>
          {used} de {data.company.workerLimit} cupos de trabajadores en uso. Las invitaciones
          pendientes reservan un cupo.
        </Text>
        {data.limitRequests.map((r) => (
          <View key={r.id} style={s.row}>
            <Text style={s.body}>
              {r.requestedLimit} cupos ·{' '}
              {r.status === 'SUBMITTED'
                ? 'En revisión'
                : r.status === 'APPROVED'
                  ? 'Aprobada'
                  : 'Rechazada'}
            </Text>
            {r.reviewNote && <Text style={s.hint}>{r.reviewNote}</Text>}
          </View>
        ))}
        {!data.limitRequests.some((r) => r.status === 'SUBMITTED') && (
          <>
            <PortalField
              label="Límite solicitado"
              value={limit}
              onChangeText={(value) => setLimit(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!request.busy}
            />
            <PortalField
              label="Motivo de la ampliación"
              value={reason}
              onChangeText={setReason}
              multiline
              editable={!request.busy}
            />
            <PortalFeedback error={request.error} notice={request.notice} />
            <ActionButton
              title="Enviar solicitud de ampliación"
              secondary
              loading={request.busy}
              onPress={() =>
                void request.run(async () => {
                  const trimmedLimit = limit.trim();
                  if (!/^\d+$/.test(trimmedLimit)) {
                    throw new Error('Ingresá un número entero para el límite solicitado.');
                  }
                  const parsedLimit = Number(trimmedLimit);
                  if (
                    !Number.isSafeInteger(parsedLimit) ||
                    parsedLimit <= data.company.workerLimit ||
                    parsedLimit > 1000000
                  ) {
                    throw new Error(
                      `Indicá un límite mayor al actual (${data.company.workerLimit} cupos).`
                    );
                  }
                  if (reason.trim().length < 10) {
                    throw new Error(
                      'Contanos el motivo de la ampliación (al menos 10 caracteres).'
                    );
                  }
                  await command('request_limit', {
                    companyId: data.company.id,
                    limit: parsedLimit,
                    reason: reason.trim(),
                  });
                  setReason('');
                }, 'Solicitud enviada al administrador.')
              }
            />
          </>
        )}
      </View>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    formCard: {
      gap: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    dangerBox: {
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerBackground,
    },
  });
