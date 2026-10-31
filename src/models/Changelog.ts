export const auditNames: Record<string, string> = {
  admin_edit_users: 'Usuario editado por administrador',
  admin_edit_companies: 'Empresa editada por administrador',
  reward_saved: 'Premio guardado por administrador',
  reward_reserved: 'Premio reservado',
  reward_redeemed: 'Premio entregado',
  delivery_created: 'Entrega registrada',
  delivery_cancelled: 'Entrega cancelada',
  delivery_confirmed: 'Recepción confirmada',
  submit_application: 'Solicitud enviada',
  resubmit_application: 'Solicitud completada',
  review_application: 'Solicitud revisada',
  accept_invitation: 'Invitación aceptada',
  save_company: 'Empresa actualizada',
  save_point: 'Punto verde guardado',
  create_point_organization: 'Institución incorporada a la red',
  save_points: 'Puntos por categoría actualizados',
  invite_worker: 'Trabajador invitado',
  cancel_invitation: 'Invitación cancelada',
  set_member_status: 'Acceso del trabajador actualizado',
  request_limit: 'Ampliación solicitada',
  review_limit: 'Ampliación revisada',
  set_company_status: 'Estado de empresa actualizado',
  save_global_xp: 'XP global actualizado',
  save_level: 'Nivel de impacto guardado',
  invitation_email_attempt: 'Envío de invitación solicitado',
  invitation_email_sent: 'Invitación enviada por email',
  invitation_email_failed: 'Falló el envío de invitación',
  admin_document_opened: 'Documentación privada consultada',
  admin_save_point: 'Punto verde guardado por administrador',
  point_device_policy_saved: 'Política de recepción guardada',
};
// Action types an administrator can filter by in the history.
export const auditGroups = [
  {
    key: 'organizations',
    label: 'Organizaciones',
    actions: [
      'create_point_organization',
      'review_application',
      'set_company_status',
      'admin_edit_companies',
    ],
  },
  {
    key: 'points',
    label: 'Puntos verdes',
    actions: ['admin_save_point', 'save_point', 'point_device_policy_saved'],
  },
  { key: 'rewards', label: 'Premios', actions: ['reward_saved'] },
  { key: 'limits', label: 'Cupos del equipo', actions: ['review_limit'] },
  { key: 'users', label: 'Usuarios', actions: ['admin_edit_users'] },
  { key: 'documents', label: 'Documentación', actions: ['admin_document_opened'] },
] as const;
export type AuditGroupKey = (typeof auditGroups)[number]['key'];
export function auditGroupOf(action: string): AuditGroupKey | null {
  return auditGroups.find((g) => (g.actions as readonly string[]).includes(action))?.key ?? null;
}
const labels: Record<string, string> = {
  name: 'Nombre',
  status: 'Estado',
  review_note: 'Observación',
  company_id: 'Empresa',
  worker_limit: 'Cupos',
  requested_limit: 'Cupos solicitados',
  impact_xp: 'XP por unidad',
  minimum_xp: 'XP mínimo',
};
const values: Record<string, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  SUBMITTED: 'Enviada',
  UNDER_REVIEW: 'En revisión',
  NEEDS_INFO: 'Falta información',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};
function display(value: unknown) {
  if (value == null) return 'Sin valor';
  return values[String(value)] ?? String(value);
}
export function changelogChanges(before: unknown, after: unknown) {
  const previous = Array.isArray(before) ? (before as Record<string, unknown>[]) : [];
  const next = Array.isArray(after) ? (after as Record<string, unknown>[]) : [];
  const changes: { entity: string; field: string; before: string; after: string }[] = [];
  for (const id of new Set([...previous, ...next].map((row) => row.id))) {
    const old = previous.find((row) => row.id === id);
    const current = next.find((row) => row.id === id);
    const entity = String(current?.name ?? old?.name ?? id);
    for (const key of new Set([...Object.keys(old ?? {}), ...Object.keys(current ?? {})])) {
      if (key === 'id' || old?.[key] === current?.[key]) continue;
      changes.push({
        entity,
        field: labels[key] ?? key,
        before: display(old?.[key]),
        after: display(current?.[key]),
      });
    }
  }
  return changes;
}
