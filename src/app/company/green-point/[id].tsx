import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { CompanyPage } from '@/components/portal/CompanyPage';
import { CompanyPointEditor } from '@/components/portal/CompanyPointEditor';
import { makePortalStyles } from '@/components/portal/PortalUI';
import { useCompanyPortal } from '@/providers/CompanyPortalProvider';
import { useThemedStyles } from '@/theme';

export default function CompanyGreenPointScreen() {
  const s = useThemedStyles(makePortalStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useCompanyPortal();
  return (
    <CompanyPage title="Punto verde" back="/company/points" ownerOnly>
      {(data) => {
        const point = data.points.find((p) => p.id === id);
        return point ? (
          <CompanyPointEditor
            key={point.id}
            data={data}
            point={point}
            onSaved={async () => {
              await refresh();
              if (router.canGoBack()) router.back();
              else router.replace('/company/points');
            }}
          />
        ) : (
          <Text style={s.body}>No encontramos este punto verde en tu organización.</Text>
        );
      }}
    </CompanyPage>
  );
}
