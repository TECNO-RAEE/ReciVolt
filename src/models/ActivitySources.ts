import type { Href } from 'expo-router';

export const activityFilters = ['Todos', 'Entregas', 'Retiros', 'Canjes'] as const;
export type ActivityFilter = (typeof activityFilters)[number];
export type ActivitySource = 'deliveries' | 'pickups' | 'redemptions';

const activitySourcesByFilter: Record<ActivityFilter, readonly ActivitySource[]> = {
  Todos: ['deliveries', 'pickups', 'redemptions'],
  Entregas: ['deliveries'],
  Retiros: ['pickups'],
  Canjes: ['redemptions'],
};

const activitySourceLabels: Record<ActivitySource, string> = {
  deliveries: 'Entregas',
  pickups: 'Retiros',
  redemptions: 'Canjes',
};

export interface ActivitySourceIssue {
  source: ActivitySource;
  label: string;
  message: string;
}

export function activityFilterFromParam(tab?: string): ActivityFilter {
  return activityFilters.find((filter) => filter.toLowerCase() === tab?.toLowerCase()) ?? 'Todos';
}

export function activityErrorsForFilter(
  errors: Partial<Record<ActivitySource, string>>,
  filter: ActivityFilter
): ActivitySourceIssue[] {
  return activitySourcesByFilter[filter].flatMap((source) => {
    const message = errors[source];
    return message ? [{ source, label: activitySourceLabels[source], message }] : [];
  });
}

function textProperty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function formatActivityError(cause: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (typeof cause === 'string') return cause.trim() || fallback;
  if (typeof cause !== 'object' || cause === null) return fallback;

  const error = cause as Record<string, unknown>;
  const message =
    textProperty(error.message) ?? (cause instanceof Error ? textProperty(cause.message) : undefined);
  const details = textProperty(error.details);
  const hint = textProperty(error.hint);
  const code = textProperty(error.code);
  const parts = [
    message,
    details && `Detalle: ${details}`,
    hint && `Sugerencia: ${hint}`,
    code && `Código: ${code}`,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : fallback;
}

export type ActivitySourceResults<T extends Record<string, unknown>> = {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
};

export async function settleActivitySources<T extends Record<string, unknown>>(
  sources: { [K in keyof T]: Promise<T[K]> }
): Promise<ActivitySourceResults<T>> {
  const values: Partial<T> = {};
  const errors: Partial<Record<keyof T, string>> = {};

  await Promise.all(
    (Object.keys(sources) as (keyof T)[]).map(async (source) => {
      try {
        values[source] = await sources[source];
      } catch (cause) {
        errors[source] = formatActivityError(cause, 'No se pudo cargar esta sección.');
      }
    })
  );

  return { values, errors };
}

export function activityDestination(
  kind: 'DELIVERY' | 'PICKUP' | 'REDEMPTION',
  id: string
): Href {
  switch (kind) {
    case 'DELIVERY':
      return { pathname: '/delivery/[id]', params: { id } };
    case 'PICKUP':
      return { pathname: '/pickup/[id]', params: { id } };
    case 'REDEMPTION':
      return { pathname: '/redemption/[id]', params: { id } };
  }
}
