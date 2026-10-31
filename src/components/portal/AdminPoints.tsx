import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SearchBar } from '@/components/discovery/SearchBar';
import { ActionButton } from '@/components/ui/ActionButton';
import { CompanyPointEditor } from './CompanyPointEditor';
import {
  PortalField,
  PortalLink,
  PortalLoading,
  PortalChoice,
  PortalBadge,
  PortalListItem,
  portalStyles as s,
} from './PortalUI';
import { usePortalData } from '@/hooks/usePortalData';
import type { ManagedPoint, PortalCompany } from '@/models/Portal';
import { getRewards } from '@/services/reward.service';
import {
  getAdminPoints,
  getCompanyPortal,
  getNewPointData,
  portalCommand,
} from '@/services/portal.service';
import { matchesAdminSearch } from '@/models/AdminSearch';

const loadOrganizations = () =>
  Promise.all([getAdminPoints(), getRewards(undefined, true)]).then(([points, rewards]) => ({
    points,
    rewardCompanies: new Set(rewards.map((r) => r.companyId)),
  }));
// "Calle 123, Villa Rosa, Buenos Aires" -> "Villa Rosa, Buenos Aires"
const locality = (address?: string) => address?.split(',').slice(-2).join(',').trim() || null;

export function AdminPoints({
  companies,
  refresh,
  addRequest = 0,
  onListChange,
}: Readonly<{
  companies: PortalCompany[];
  refresh: () => Promise<void>;
  addRequest?: number;
  onListChange?: (list: boolean) => void;
}>) {
  const [selected, setSelected] = useState<PortalCompany | null | undefined>();
  const [search, setSearch] = useState('');
  const [pointId, setPointId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [handledAdd, setHandledAdd] = useState(addRequest);
  if (addRequest !== handledAdd) {
    setHandledAdd(addRequest);
    setCreating(true);
  }
  const listing = selected === undefined && !creating;
  useEffect(() => onListChange?.(listing), [listing, onListChange]);
  const result = usePortalData(loadOrganizations);
  if (selected !== undefined)
    return (
      <PointWorkspace
        company={selected}
        pointId={pointId}
        newPoint={creating}
        back={() => {
          setSelected(undefined);
          setCreating(false);
          setPointId(undefined);
        }}
        saved={async () => {
          await refresh();
          await result.refresh();
          setSelected(undefined);
          setCreating(false);
          setPointId(undefined);
        }}
      />
    );
  if (creating)
    return (
      <View style={s.stack}>
        <PortalLink title="Volver a puntos verdes" onPress={() => setCreating(false)} />
        <Text style={s.subtitle}>Institución responsable</Text>
        <Text style={s.body}>
          Elegí una institución de la red o incorporá una nueva para este punto.
        </Text>
        <ActionButton title="Nueva institución" onPress={() => setSelected(null)} />
        <PortalField
          label="Buscar institución por nombre o ID"
          value={companySearch}
          onChangeText={setCompanySearch}
        />
        {companies
          .filter((c) => matchesAdminSearch(companySearch, c.name, c.id))
          .map((c) => (
            <PortalChoice
              key={c.id}
              label={c.name}
              selected={false}
              onPress={() => setSelected(c)}
            />
          ))}
      </View>
    );
  const organizations = companies
    .filter((c) => matchesAdminSearch(search, c.name, c.id))
    .map((company) => {
      const points = result.data?.points.filter((p) => p.companyId === company.id) ?? [];
      return {
        company,
        points,
        published: points.some((p) => p.active),
        commerce: result.data?.rewardCompanies.has(company.id) ?? false,
      };
    });
  return (
    <View style={s.stack}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        label="Buscar organización"
        placeholder="Buscar organización"
      />
      <PortalLoading
        loading={result.loading}
        error={result.error}
        retry={() => void result.refresh()}
      />
      {!result.loading && !result.error && organizations.length === 0 && (
        <Text style={s.body}>
          {companies.length
            ? 'No encontramos organizaciones para esta búsqueda.'
            : 'Todavía no hay organizaciones. Agregá el primer punto verde para incorporar una.'}
        </Text>
      )}
      {result.data &&
        organizations.map(({ company, points, published, commerce }) => (
          <PortalListItem
            key={company.id}
            icon={points.length ? 'leaf' : 'storefront-outline'}
            title={company.name}
            accessibilityHint="Ver y editar sus puntos verdes"
            badge={
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {company.status === 'SUSPENDED' && <PortalBadge label="Suspendida" tone="danger" />}
                {published ? (
                  <PortalBadge label="Punto publicado" />
                ) : points.length ? (
                  <PortalBadge label="Punto en borrador" tone="neutral" />
                ) : null}
                {commerce && <PortalBadge label="Comercio de canje" />}
              </View>
            }
            lines={[
              locality(points[0]?.address),
              points.length > 1 && `${points.length} puntos verdes`,
            ]}
            onPress={() => setSelected(company)}
          />
        ))}
    </View>
  );
}

function PointWorkspace({
  company,
  pointId,
  newPoint,
  back,
  saved,
}: Readonly<{
  company: PortalCompany | null;
  pointId?: string;
  newPoint: boolean;
  back: () => void;
  saved: () => Promise<void>;
}>) {
  const loader = useCallback(
    () => (company ? getCompanyPortal(company.id) : getNewPointData()),
    [company]
  );
  const { data, loading, error, refresh } = usePortalData(loader);
  const [editing, setEditing] = useState<ManagedPoint | null | undefined>(
    company && !newPoint ? undefined : null
  );
  const [companyName, setCompanyName] = useState('');
  const [search, setSearch] = useState('');
  const currentPoint = pointId ? data?.points.find((p) => p.id === pointId) : editing;
  return (
    <View style={s.stack}>
      {editing === undefined && !pointId && (
        <PortalLink title="Volver a puntos verdes" onPress={back} />
      )}
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data &&
        !error &&
        (currentPoint !== undefined ? (
          <>
            {!company && (
              <PortalField
                label="Nombre de la institución responsable"
                value={companyName}
                onChangeText={setCompanyName}
              />
            )}
            {company && <Text style={s.subtitle}>{company.name}</Text>}
            <CompanyPointEditor
              data={data}
              point={currentPoint}
              onCancel={() => (company && !pointId ? setEditing(undefined) : back())}
              onSaved={saved}
              savePoint={async (input) => {
                if (!company && !companyName.trim())
                  throw new Error('Ingresá el nombre de la institución responsable.');
                return portalCommand('admin_save_point', { ...input, companyName });
              }}
            />
          </>
        ) : (
          <>
            <Text style={s.subtitle}>{company?.name}</Text>
            <ActionButton title="Agregar punto verde" onPress={() => setEditing(null)} />
            <PortalField
              label="Buscar puntos por nombre o ID"
              value={search}
              onChangeText={setSearch}
            />
            {data.points.length === 0 && (
              <Text style={s.body}>Esta institución todavía no tiene puntos verdes.</Text>
            )}
            {data.points
              .filter((p) => matchesAdminSearch(search, p.name, p.id))
              .map((point) => (
                <View key={point.id} style={s.row}>
                  <Text style={s.subtitle}>{point.name}</Text>
                  <Text style={s.body}>{point.address}</Text>
                  <Text style={s.hint}>{point.active ? 'Publicado' : 'Borrador'}</Text>
                  <Text selectable style={s.hint}>
                    ID: {point.id}
                  </Text>
                  <PortalLink title="Editar punto verde" onPress={() => setEditing(point)} />
                </View>
              ))}
          </>
        ))}
    </View>
  );
}
