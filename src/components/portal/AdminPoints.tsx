import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { CompanyPointEditor } from './CompanyPointEditor';
import {
  PortalField,
  PortalLink,
  PortalLoading,
  PortalChoice,
  portalStyles as s,
} from './PortalUI';
import { usePortalData } from '@/hooks/usePortalData';
import type { ManagedPoint, PortalCompany } from '@/models/Portal';
import {
  getAdminPoints,
  getCompanyPortal,
  getNewPointData,
  portalCommand,
} from '@/services/portal.service';
import { matchesAdminSearch } from '@/models/AdminSearch';

export function AdminPoints({
  companies,
  refresh,
}: Readonly<{
  companies: PortalCompany[];
  refresh: () => Promise<void>;
}>) {
  const [selected, setSelected] = useState<PortalCompany | null | undefined>();
  const [search, setSearch] = useState('');
  const [pointId, setPointId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const result = usePortalData(getAdminPoints);
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
  const rows = result.data?.filter((p) => matchesAdminSearch(search, p.name, p.id));
  return (
    <View style={s.stack}>
      <Text style={s.body}>
        Publicá los lugares de recepción con su ubicación, horarios y dispositivos aceptados.
      </Text>
      <ActionButton title="Dar de alta un punto verde" onPress={() => setCreating(true)} />
      <PortalField
        label="Buscar puntos verdes por nombre o ID"
        value={search}
        onChangeText={setSearch}
      />
      <PortalLoading
        loading={result.loading}
        error={result.error}
        retry={() => void result.refresh()}
      />
      {!result.loading && !result.error && rows?.length === 0 && (
        <Text style={s.body}>
          {result.data?.length
            ? 'No encontramos puntos para esta búsqueda.'
            : 'Todavía no hay puntos verdes. Agregá el primero para publicarlo en el mapa.'}
        </Text>
      )}
      {rows?.map((point) => (
        <View key={point.id} style={s.row}>
          <Text style={s.subtitle}>{point.name}</Text>
          <Text style={s.body}>{point.address}</Text>
          <Text style={s.hint}>
            {companies.find((c) => c.id === point.companyId)?.name} ·{' '}
            {point.active ? 'Publicado' : 'Borrador'}
          </Text>
          <Text selectable style={s.hint}>
            ID: {point.id}
          </Text>
          <PortalLink
            title="Editar punto verde"
            onPress={() => {
              setPointId(point.id);
              setSelected(companies.find((c) => c.id === point.companyId));
            }}
          />
        </View>
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
