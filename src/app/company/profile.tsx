import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { CompanyPage } from '@/components/portal/CompanyPage';
import {
  PortalFeedback,
  PortalField,
  PortalLink,
  usePortalStyles,
} from '@/components/portal/PortalUI';
import { brand } from '@/config/brand';
import { usePortalAction } from '@/hooks/usePortalData';
import type { CompanyPortalData } from '@/models/Portal';
import { useCompanyPortal } from '@/providers/CompanyPortalProvider';
import { portalCommand } from '@/services/portal.service';

export default function CompanyProfileScreen() {
  return (
    <CompanyPage title="Datos de la empresa" ownerOnly>
      {(data) => <CompanyProfile data={data} />}
    </CompanyPage>
  );
}
function CompanyProfile({ data }: Readonly<{ data: CompanyPortalData }>) {
  const s = usePortalStyles();
  const { refresh } = useCompanyPortal();
  const [name, setName] = useState(data.company.name),
    [phone, setPhone] = useState(data.details?.phone ?? ''),
    [address, setAddress] = useState(data.details?.address ?? '');
  const [website, setWebsite] = useState(data.details?.website ?? ''),
    [description, setDescription] = useState(data.details?.description ?? '');
  const action = usePortalAction();
  return (
    <>
      {data.details && (
        <Text style={s.body}>
          {data.details.legalName} · CUIT {data.details.taxId}
        </Text>
      )}
      <View style={{ gap: 2 }}>
        <Text style={s.hint}>¿Necesitás corregir datos legales?</Text>
        <PortalLink
          title={`Contactá al equipo de ${brand.name}`}
          onPress={() => router.push('/contact?topic=support')}
        />
      </View>
      <Text style={s.hint}>Los campos con * son obligatorios.</Text>
      <PortalField
        label="Nombre comercial *"
        value={name}
        onChangeText={setName}
        maxLength={150}
        editable={!action.busy}
      />
      <PortalField
        label="Teléfono *"
        value={phone}
        onChangeText={setPhone}
        placeholder="Ej. 11 2345-6789"
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={100}
        editable={!action.busy}
      />
      <PortalField
        label="Dirección *"
        value={address}
        onChangeText={setAddress}
        placeholder="Calle, altura y localidad"
        maxLength={500}
        editable={!action.busy}
      />
      <PortalField
        label="Sitio web"
        value={website}
        onChangeText={setWebsite}
        placeholder="https://…"
        keyboardType="url"
        autoComplete="url"
        maxLength={1000}
        editable={!action.busy}
      />
      <PortalField
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
        editable={!action.busy}
      />
      <PortalFeedback error={action.error} notice={action.notice} />
      <ActionButton
        title="Guardar cambios"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            if (!name.trim() || !phone.trim() || !address.trim()) {
              throw new Error('Completá nombre comercial, teléfono y dirección.');
            }
            await portalCommand('save_company', {
              companyId: data.company.id,
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
              website: website.trim(),
              description: description.trim(),
            });
            await refresh();
          })
        }
      />
    </>
  );
}
