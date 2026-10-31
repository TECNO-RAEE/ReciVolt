import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { PortalLoading } from '@/components/portal/PortalUI';
import { AdminPage } from '@/components/portal/AdminPage';
import { AdminSearch } from '@/components/portal/AdminSearch';
import { AdminChangelog } from '@/components/portal/AdminChangelog';
import { AdminRewards } from '@/components/portal/AdminRewards';
import { AdminPoints } from '@/components/portal/AdminPoints';
import { LimitsManager } from '@/components/portal/LimitsManager';
import { usePortalData } from '@/hooks/usePortalData';
import { getAdminPortal } from '@/services/portal.service';
import { colors } from '@/theme';

const sections = [
  'Puntos verdes',
  'Buscador',
  'Premios',
  'Límites',
  'Historial de cambios',
] as const;
export default function AdminScreen() {
  const [tab, setTab] = useState<string>('Puntos verdes');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [pointsList, setPointsList] = useState(true);
  const [addingPoint, setAddingPoint] = useState(0);
  const { data, loading, error, refresh } = usePortalData(getAdminPortal);
  return (
    <AdminPage
      sections={sections}
      selected={tab}
      onSelect={(value) => {
        setTab(value);
        setPointsList(true);
      }}
      refresh={() => {
        void refresh();
        setHistoryRevision((value) => value + 1);
      }}
      footer={
        tab === 'Puntos verdes' &&
        pointsList &&
        data && (
          <ActionButton
            title="Agregar punto"
            icon={<Ionicons name="add" size={24} color={colors.textOnPrimary} />}
            onPress={() => setAddingPoint((value) => value + 1)}
          />
        )
      }
    >
      <PortalLoading loading={loading && !data} error={error} retry={() => void refresh()} />
      {data && !error && (
        <>
          {tab === 'Buscador' && <AdminSearch companies={data.companies} refresh={refresh} />}
          {tab === 'Puntos verdes' && (
            <AdminPoints
              key={historyRevision}
              companies={data.companies}
              refresh={refresh}
              addRequest={addingPoint}
              onListChange={setPointsList}
            />
          )}
          {tab === 'Premios' && <AdminRewards key={historyRevision} companies={data.companies} />}
          {tab === 'Límites' && <LimitsManager data={data} refresh={refresh} />}
          {tab === 'Historial de cambios' && (
            <AdminChangelog key={historyRevision} companies={data.companies} />
          )}
        </>
      )}
    </AdminPage>
  );
}
