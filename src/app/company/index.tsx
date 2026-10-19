import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { brand } from '@/config/brand';
import {
  PortalMenuItem,
  PortalField,
  PortalLink,
  PortalLoading,
  PortalFeedback,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import { CompanyPointEditor } from '@/components/portal/CompanyPointEditor';
import { AdminPage } from '@/components/portal/AdminPage';
import { CompanyRewards } from '@/components/portal/CompanyRewards';
import { matchesAdminSearch } from '@/models/AdminSearch';
import { DeliveryHistory } from '@/components/delivery/DeliveryHistory';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { activeMemberships, canManageCompany } from '@/models/Access';
import type { CompanyPortalData, ManagedPoint } from '@/models/Portal';
import { useAuth } from '@/providers/AuthProvider';
import { getCompanyPortal, portalCommand, sendCompanyInvitation } from '@/services/portal.service';

export default function CompanyScreen() {
  const { company, role, profile, access, selectCompany, logout } = useAuth();
  const action = usePortalAction();
  const [tab, setTab] = useState('Inicio');
  const owner = canManageCompany(role);
  const loader = useCallback(() => getCompanyPortal(company!.companyId), [company]);
  const { data, loading, error, refresh } = usePortalData(loader);
  const memberships = activeMemberships(access);
  return (
    <AdminPage
      title="Mi empresa"
      name={`${data?.company.name ?? company?.companyName ?? 'Empresa'} · ${profile?.fullName ?? ''} · ${owner ? 'Responsable' : 'Trabajador'}`}
      sections={
        owner
          ? [
              'Inicio',
              'Entregas',
              'Puntos verdes',
              'Premios',
              'Datos',
              'Puntos por categoría',
              'Equipo',
              'Configuraciones',
            ]
          : ['Inicio', 'Entregas', 'Puntos verdes', 'Premios', 'Configuraciones']
      }
      selected={tab}
      onSelect={(value) => (value === 'Configuraciones' ? router.push('/settings') : setTab(value))}
      refresh={() => void refresh()}
      busy={action.busy || loading}
      logout={() =>
        void action.run(async () => {
          await logout();
          router.replace('/');
        })
      }
    >
      {memberships.length > 1 && (
        <View style={s.actions}>
          {memberships.map((m) => (
            <PortalLink
              key={m.id}
              title={`${m.companyId === company?.companyId ? '✓ ' : ''}${m.companyName}`}
              onPress={() => {
                selectCompany(m.companyId);
                setTab('Inicio');
              }}
            />
          ))}
        </View>
      )}
      <PortalFeedback error={action.error} />
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data && !error && (
        <View key={`${data.company.id}:${tab}`} style={s.stack}>
          {tab === 'Inicio' && (
            <>
              <ActionButton
                title="Recibir entrega o validar premio"
                onPress={() => router.push('/company/scanner')}
              />
              <PortalMenuItem
                title="Historial de entregas"
                description="Consultá las recepciones y su estado."
                icon="receipt-outline"
                onPress={() => setTab('Entregas')}
              />
              <PortalMenuItem
                title="Puntos verdes"
                description={`${data.points.filter((p) => p.active).length} publicados · ${data.points.filter((p) => !p.active).length} borradores`}
                icon="location-outline"
                onPress={() => setTab('Puntos verdes')}
              />
              <PortalMenuItem
                title="Premios de tu empresa"
                description="Consultá los premios que tu equipo puede entregar."
                icon="gift-outline"
                onPress={() => setTab('Premios')}
              />
              {data.points.length === 0 && (
                <PortalMenuItem
                  title="Sumá un punto verde"
                  description="Coordiná el alta con el equipo de TecnoRAEE."
                  icon="leaf-outline"
                  onPress={() => router.push('/contact?topic=point')}
                />
              )}
              <Text style={s.subtitle}>Gestión de la empresa</Text>
              <Text style={s.body}>
                {owner
                  ? 'Administrá los datos, los puntos por entrega y el equipo.'
                  : 'Tu acceso permite recibir entregas y validar premios.'}
              </Text>
              {owner ? (
                <View style={s.section}>
                  <PortalLink title="Datos de la empresa" onPress={() => setTab('Datos')} />
                  <PortalLink
                    title="Horarios y dispositivos recibidos"
                    onPress={() => setTab('Puntos verdes')}
                  />
                  <PortalLink
                    title="Puntos por dispositivo"
                    onPress={() => setTab('Puntos por categoría')}
                  />
                  <PortalLink title="Equipo e invitaciones" onPress={() => setTab('Equipo')} />
                </View>
              ) : (
                <Text style={s.body}>
                  Podés consultar los puntos de tu empresa. La edición de la organización y del
                  equipo corresponde al responsable.
                </Text>
              )}
              <Text style={s.hint}>
                Verificá físicamente los dispositivos antes de acreditar. Desde el escáner también
                podés validar los premios publicados por los administradores para tu comercio.
              </Text>
            </>
          )}
          {tab === 'Datos' && owner && <CompanyProfile data={data} refresh={refresh} />}
          {tab === 'Premios' && <CompanyRewards companyId={data.company.id} />}
          {tab === 'Entregas' && (
            <DeliveryHistory key={data.company.id} companyId={data.company.id} />
          )}
          {tab === 'Puntos verdes' && <CompanyPoints data={data} refresh={refresh} owner={owner} />}
          {tab === 'Puntos por categoría' && owner && (
            <CategoryPoints data={data} refresh={refresh} />
          )}
          {tab === 'Equipo' && owner && <CompanyTeam data={data} refresh={refresh} />}
        </View>
      )}
    </AdminPage>
  );
}
function CompanyProfile({
  data,
  refresh,
}: Readonly<{ data: CompanyPortalData; refresh: () => Promise<void> }>) {
  const [name, setName] = useState(data.company.name),
    [phone, setPhone] = useState(data.details?.phone ?? ''),
    [address, setAddress] = useState(data.details?.address ?? '');
  const [website, setWebsite] = useState(data.details?.website ?? ''),
    [description, setDescription] = useState(data.details?.description ?? '');
  const action = usePortalAction();
  return (
    <View style={s.stack}>
      {data.details && (
        <Text style={s.body}>
          {data.details.legalName} · CUIT {data.details.taxId}
        </Text>
      )}
      <Text style={s.hint}>Para corregir datos legales, contactá al equipo de {brand.name}.</Text>
      <PortalField
        label="Nombre comercial"
        value={name}
        onChangeText={setName}
        editable={!action.busy}
      />
      <PortalField label="Teléfono" value={phone} onChangeText={setPhone} editable={!action.busy} />
      <PortalField
        label="Dirección"
        value={address}
        onChangeText={setAddress}
        editable={!action.busy}
      />
      <PortalField
        label="Sitio web"
        value={website}
        onChangeText={setWebsite}
        editable={!action.busy}
      />
      <PortalField
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        multiline
        editable={!action.busy}
      />
      <PortalFeedback error={action.error} notice={action.notice} />
      <ActionButton
        title="Guardar datos"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await portalCommand('save_company', {
              companyId: data.company.id,
              name,
              phone,
              address,
              website,
              description,
            });
            await refresh();
          })
        }
      />
    </View>
  );
}
function CompanyPoints({
  data,
  refresh,
  owner,
}: Readonly<{ data: CompanyPortalData; refresh: () => Promise<void>; owner: boolean }>) {
  const [editing, setEditing] = useState<ManagedPoint | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  if (owner && editing !== undefined)
    return (
      <CompanyPointEditor
        key={editing?.id ?? 'new'}
        data={data}
        point={editing}
        onCancel={() => setEditing(undefined)}
        onSaved={async () => {
          await refresh();
          setEditing(undefined);
        }}
      />
    );
  return (
    <View style={s.stack}>
      <Text style={s.body}>
        {owner
          ? 'Revisá la ubicación, los horarios y qué dispositivos recibe cada punto. El alta de nuevos puntos la realiza TecnoRAEE.'
          : 'Consultá los puntos de recepción y los dispositivos que reciben.'}
      </Text>
      <PortalField label="Buscar puntos por nombre o ID" value={search} onChangeText={setSearch} />
      {data.points.length === 0 && (
        <Text style={s.body}>
          Todavía no hay puntos verdes. El equipo de TecnoRAEE coordina el alta de nuevos puntos.
        </Text>
      )}
      {data.points
        .filter((p) => matchesAdminSearch(search, p.name, p.id))
        .map((p) => (
          <View key={p.id} style={s.row}>
            <Text style={s.subtitle}>{p.name}</Text>
            <Text style={s.body}>
              {p.active ? 'Publicado' : 'Borrador'} ·{' '}
              {p.pickupEnabled ? 'Con retiros' : 'Recepción en el punto'}
            </Text>
            <Text style={s.body}>{p.address}</Text>
            <Text selectable style={s.hint}>
              ID: {p.id}
            </Text>
            <Text style={s.hint}>
              {data.categories
                .filter((c) => p.categories.includes(c.id))
                .map((c) => c.name)
                .join(' · ')}
            </Text>
            {owner && <PortalLink title="Editar punto y horarios" onPress={() => setEditing(p)} />}
          </View>
        ))}
    </View>
  );
}
function CategoryPoints({
  data,
  refresh,
}: Readonly<{ data: CompanyPortalData; refresh: () => Promise<void> }>) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      data.categories.map((c) => [
        c.id,
        String(data.categoryPoints.find((p) => p.id === c.id)?.points ?? 0),
      ])
    )
  );
  const action = usePortalAction();
  return (
    <View style={s.stack}>
      <Text style={s.body}>
        Estos puntos se suman al saldo global de cada ciudadano y se pueden canjear por premios.
        Se acreditan al confirmar la recepción de los dispositivos.
      </Text>
      {data.categories.map((c) => (
        <PortalField
          key={c.id}
          label={`${c.name} · puntos por unidad`}
          compact
          keyboardType="number-pad"
          value={values[c.id]}
          editable={!action.busy}
          onChangeText={(value) => setValues({ ...values, [c.id]: value })}
        />
      ))}
      <PortalFeedback error={action.error} notice={action.notice} />
      <ActionButton
        title="Guardar puntos"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const categories = data.categories.map((c) => ({
              id: c.id,
              points: Number(values[c.id]),
            }));
            if (
              categories.some(
                (c) =>
                  !values[c.id].trim() ||
                  !Number.isSafeInteger(c.points) ||
                  c.points < 0 ||
                  c.points > 1000000
              )
            )
              throw new Error('Usá puntos enteros entre 0 y 1.000.000.');
            await portalCommand('save_points', { companyId: data.company.id, categories });
            await refresh();
          })
        }
      />
    </View>
  );
}
function CompanyTeam({
  data,
  refresh,
}: Readonly<{ data: CompanyPortalData; refresh: () => Promise<void> }>) {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState(''),
    [limit, setLimit] = useState(String(data.company.workerLimit + 10)),
    [reason, setReason] = useState('');
  const action = usePortalAction();
  const used =
    data.members.filter((m) => m.role === 'company_worker' && m.status !== 'DISABLED').length +
    data.invitations.filter((i) => i.role === 'company_worker' && i.status === 'INVITED').length;
  async function command(operation: string, payload: object) {
    await portalCommand(operation, payload);
    await refresh();
  }
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>
        Equipo · {used} de {data.company.workerLimit} cupos
      </Text>
      <Text style={s.body}>
        Las invitaciones pendientes reservan un cupo. Los trabajadores pueden operar, pero no editar
        la empresa ni el equipo.
      </Text>
      {data.members.map((m) => (
        <View key={m.id} style={s.row}>
          <Text style={s.body}>
            {m.userId === user?.id
              ? `${profile?.fullName || 'Mi cuenta'} (vos)`
              : (data.invitations.find((i) => i.acceptedBy === m.userId)?.email ??
                (m.role === 'company_owner' ? 'Responsable de empresa' : 'Trabajador del equipo'))}
          </Text>
          <Text style={s.hint}>
            {m.role === 'company_owner' ? 'Responsable' : 'Trabajador'} ·{' '}
            {m.status === 'ACTIVE'
              ? 'Activo'
              : m.status === 'DISABLED'
                ? 'Deshabilitado'
                : 'Invitado'}
          </Text>
          {m.role === 'company_worker' && (
            <PortalLink
              title={m.status === 'DISABLED' ? 'Reactivar acceso' : 'Deshabilitar acceso'}
              disabled={action.busy}
              onPress={() =>
                void action.run(() =>
                  command('set_member_status', {
                    id: m.id,
                    status: m.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED',
                  })
                )
              }
            />
          )}
        </View>
      ))}
      {data.invitations
        .filter((i) => i.status === 'INVITED')
        .map((i) => (
          <View key={i.id} style={s.row}>
            <Text style={s.body}>{i.email} · Invitación pendiente</Text>
            <PortalLink
              title="Enviar / Reenviar email"
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
        ))}
      <View style={s.section}>
        <PortalField
          label="Email del trabajador"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!action.busy}
        />
        <ActionButton
          title="Invitar trabajador"
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              const result = await portalCommand('invite_worker', {
                companyId: data.company.id,
                email,
              });
              setEmail('');
              await refresh();
              await sendCompanyInvitation(result.invitationId!);
            }, 'Invitación enviada.')
          }
        />
      </View>
      <View style={s.section}>
        <Text style={s.subtitle}>Solicitar más cupos</Text>
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
              onChangeText={setLimit}
              keyboardType="number-pad"
              editable={!action.busy}
            />
            <PortalField
              label="Motivo de la ampliación"
              value={reason}
              onChangeText={setReason}
              multiline
              editable={!action.busy}
            />
            <ActionButton
              title="Enviar solicitud de ampliación"
              secondary
              loading={action.busy}
              onPress={() =>
                void action.run(
                  () =>
                    command('request_limit', {
                      companyId: data.company.id,
                      limit: Number(limit),
                      reason,
                    }),
                  'Solicitud enviada al administrador.'
                )
              }
            />
          </>
        )}
      </View>
      <PortalFeedback error={action.error} notice={action.notice} />
    </View>
  );
}
