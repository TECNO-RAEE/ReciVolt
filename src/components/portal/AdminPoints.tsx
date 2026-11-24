import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SearchBar } from '@/components/discovery/SearchBar';
import { ActionButton } from '@/components/ui/ActionButton';
import { CompanyPointEditor } from './CompanyPointEditor';
import {
  PortalBadge,
  PortalChoice,
  PortalFeedback,
  PortalField,
  PortalLink,
  PortalListItem,
  PortalLoading,
  portalStyles as s,
} from './PortalUI';
import { usePortalData } from '@/hooks/usePortalData';
import {
  pointWorkspaceBackTarget,
  type ManagedPoint,
  type PortalCompany,
} from '@/models/Portal';
import { splitPointAddress } from '@/models/PointAddress';
import { getActiveRewardCompanyIds } from '@/services/reward.service';
import {
  getAdminPoints,
  getCompanyPortal,
  getNewPointData,
  portalCommand,
} from '@/services/portal.service';
import { matchesAdminSearch } from '@/models/AdminSearch';

const loadOrganizations = () =>
  Promise.all([getAdminPoints(), getActiveRewardCompanyIds()]).then(
    ([points, rewardCompanies]) => ({ points, rewardCompanies })
  );
// "Calle 123, Villa Rosa, Buenos Aires · Entre calles: X y Y" -> "Villa Rosa, Buenos Aires"
const locality = (address?: string) => {
  if (!address) return null;
  const base = splitPointAddress(address).address;
  return base.split(',').slice(-2).join(',').trim() || null;
};

export function AdminPoints({
  companies,
  refresh,
  addRequest = 0,
  onListChange,
  onBackChange,
  reload = 0,
}: Readonly<{
  companies: PortalCompany[];
  refresh: () => Promise<void>;
  addRequest?: number;
  onListChange?: (list: boolean) => void;
  onBackChange?: (handler: (() => void) | null) => void;
  reload?: number;
}>) {
  const [selected, setSelected] = useState<PortalCompany | null | undefined>();
  const [search, setSearch] = useState('');
  const [pointId, setPointId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [handledAdd, setHandledAdd] = useState(addRequest);
  if (addRequest !== handledAdd) {
    setHandledAdd(addRequest);
    setCreating(true);
    setSavedNotice(null);
  }
  const listing = selected === undefined && !creating;
  useEffect(() => onListChange?.(listing), [listing, onListChange]);
  useEffect(() => {
    if (selected !== undefined) return;
    onBackChange?.(creating ? () => setCreating(false) : null);
    return () => onBackChange?.(null);
  }, [selected, creating, onBackChange]);
  const closeWorkspace = useCallback(() => {
    setSelected(undefined);
    setPointId(undefined);
  }, []);
  const cancelCreating = useCallback(() => {
    setCreating(false);
    closeWorkspace();
  }, [closeWorkspace]);
  const result = usePortalData(loadOrganizations);
  const { refresh: reloadOrganizations } = result;
  // Pull-to-refresh reloads the list without resetting an open editor.
  useEffect(() => {
    if (reload) void reloadOrganizations();
  }, [reload, reloadOrganizations]);
  if (selected !== undefined)
    return (
      <PointWorkspace
        company={selected}
        pointId={pointId}
        newPoint={creating}
        onBackChange={onBackChange}
        back={closeWorkspace}
        exitCreating={cancelCreating}
        saved={async () => {
          await refresh();
          await result.refresh();
          setSelected(undefined);
          setCreating(false);
          setPointId(undefined);
          setSavedNotice('Cambios guardados.');
        }}
      />
    );
  if (creating) {
    const filteredCompanies = companies.filter((c) =>
      matchesAdminSearch(companySearch, c.name, c.id)
    );
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
        {filteredCompanies.length === 0 && (
          <Text style={s.body}>
            {companies.length
              ? 'No encontramos instituciones para esta búsqueda.'
              : 'Todavía no hay instituciones registradas. Creá una nueva institución arriba.'}
          </Text>
        )}
        {filteredCompanies.map((c) => (
          <PortalChoice
            key={c.id}
            label={c.name}
            selected={false}
            role="button"
            onPress={() => setSelected(c)}
          />
        ))}
      </View>
    );
  }
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
        onChangeText={(value) => {
          setSearch(value);
          if (savedNotice) setSavedNotice(null);
        }}
        label="Buscar organización"
        placeholder="Buscar organización"
      />
      <PortalFeedback notice={savedNotice} />
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
            onPress={() => {
              setSavedNotice(null);
              setSelected(company);
            }}
          />
        ))}
    </View>
  );
}

function PointWorkspace({
  company,
  pointId,
  newPoint,
  onBackChange,
  back,
  exitCreating,
  saved,
}: Readonly<{
  company: PortalCompany | null;
  pointId?: string;
  newPoint: boolean;
  onBackChange?: (handler: (() => void) | null) => void;
  back: () => void;
  exitCreating: () => void;
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
  const backTarget = pointWorkspaceBackTarget({
    hasCompany: Boolean(company),
    hasPointId: Boolean(pointId),
    newPoint,
    isEditingPoint: currentPoint !== undefined,
  });
  const handleBack = useCallback(() => {
    if (backTarget === 'points_list') setEditing(undefined);
    else back();
  }, [backTarget, back]);
  useEffect(() => {
    onBackChange?.(handleBack);
    return () => onBackChange?.(null);
  }, [handleBack, onBackChange]);
  const filteredPoints =
    data?.points.filter((p) => matchesAdminSearch(search, p.name, p.id)) ?? [];
  return (
    <View style={s.stack}>
      {currentPoint === undefined ? (
        !pointId && <PortalLink title="Volver a puntos verdes" onPress={back} />
      ) : newPoint ? (
        <PortalLink title="Volver a elegir institución" onPress={handleBack} />
      ) : backTarget === 'points_list' ? (
        <PortalLink title="Volver a puntos de la empresa" onPress={handleBack} />
      ) : null}
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
                maxLength={150}
              />
            )}
            {company && <Text style={s.subtitle}>{company.name}</Text>}
            <CompanyPointEditor
              key={currentPoint?.id ?? 'new'}
              data={data}
              point={currentPoint}
              isAdmin
              onCancel={newPoint ? exitCreating : handleBack}
              cancelLabel={
                newPoint
                  ? 'Cancelar y volver a puntos verdes'
                  : currentPoint === null
                    ? 'Cancelar alta'
                    : 'Cancelar edición'
              }
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
            {data.points.length > 0 && (
              <PortalField
                label="Buscar puntos por nombre o ID"
                value={search}
                onChangeText={setSearch}
              />
            )}
            {data.points.length === 0 && (
              <Text style={s.body}>Esta institución todavía no tiene puntos verdes.</Text>
            )}
            {data.points.length > 0 && filteredPoints.length === 0 && (
              <Text style={s.body}>No encontramos puntos verdes para esta búsqueda.</Text>
            )}
            {filteredPoints.map((point) => (
              <PortalListItem
                key={point.id}
                icon="leaf-outline"
                title={point.name}
                badge={
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <PortalBadge
                      label={point.active ? 'Publicado' : 'Borrador'}
                      tone={point.active ? 'success' : 'neutral'}
                    />
                    {!point.intakeConfirmed && (
                      <PortalBadge label="Política pendiente" tone="neutral" />
                    )}
                  </View>
                }
                lines={[point.address, `ID: ${point.id}`]}
                accessibilityHint="Editar punto verde"
                onPress={() => setEditing(point)}
              />
            ))}
          </>
        ))}
    </View>
  );
}
