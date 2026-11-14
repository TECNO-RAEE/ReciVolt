import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '@/config/supabase';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  PortalPage,
  PortalField,
  PortalFeedback,
  PortalLoading,
  makePortalStyles,
} from '@/components/portal/PortalUI';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthFlowArrival } from '@/hooks/useAuthFlowArrival';
import { authRoute } from '@/models/AuthFlow';
import { getMyInvitations, portalCommand } from '@/services/portal.service';
import { useThemedStyles } from '@/theme';

export default function CompanyInvitationsScreen() {
  const s = useThemedStyles(makePortalStyles);
  useAuthFlowArrival();
  const { session } = useAuth();
  const url = Linking.useURL();
  const [emailInvite, setEmailInvite] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const handledUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!url) return;
    const hash = new URLSearchParams(url.split('#')[1] ?? '');
    const accessToken = hash.get('access_token'),
      refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      if (handledUrl.current === url) return;
      handledUrl.current = url;
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setLinkError('La invitación venció. Pedí un nuevo email o iniciá sesión.');
          else {
            setEmailInvite(hash.get('type') === 'invite');
            router.replace('/company-invitations');
          }
        });
    }
  }, [url]);
  return (
    <PortalPage
      title="Invitaciones de empresa"
      subtitle="Aceptá tu acceso para comenzar a trabajar con tu organización."
      back="/"
    >
      <PortalFeedback error={linkError} />
      {session ? (
        <Invitations key={session.user.id} needsPassword={emailInvite} />
      ) : (
        <View style={s.stack}>
          <Text style={s.body}>
            Ingresá con el email al que enviaron la invitación. Si es tu primera cuenta, abrí el
            enlace del email para configurar tu contraseña.
          </Text>
          <ActionButton
            title="Iniciar sesión"
            onPress={() => router.push(authRoute('/login', 'invitations'))}
          />
        </View>
      )}
    </PortalPage>
  );
}
function Invitations({ needsPassword }: Readonly<{ needsPassword: boolean }>) {
  const s = useThemedStyles(makePortalStyles);
  const { data, loading, error, refresh } = usePortalData(getMyInvitations);
  const { retryAccess } = useAuth();
  const action = usePortalAction();
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  return (
    <>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {needsPassword && (
        <View style={s.stack}>
          <PortalField
            label="Creá tu contraseña (mínimo 8 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!action.busy}
          />
          <PortalField
            label="Repetí la contraseña"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!action.busy}
          />
        </View>
      )}
      {data?.length === 0 && (
        <Text style={s.body}>No tenés invitaciones pendientes para esta cuenta.</Text>
      )}
      {data?.map((inv) => (
        <View key={inv.id} style={s.row}>
          <Text style={s.subtitle}>{inv.companyName}</Text>
          <Text style={s.body}>
            {inv.role === 'company_owner' ? 'Responsable de empresa' : 'Trabajador'} · {inv.email}
          </Text>
          <ActionButton
            title="Aceptar y entrar a la empresa"
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (needsPassword) {
                  if (password.length < 8 || password !== confirm)
                    throw new Error(
                      'Las contraseñas deben coincidir y tener al menos 8 caracteres.'
                    );
                  const { error: passwordError } = await supabase.auth.updateUser({ password });
                  if (passwordError) throw passwordError;
                }
                await portalCommand('accept_invitation', { id: inv.id });
                retryAccess();
                router.replace('/');
              }, 'Acceso aceptado.')
            }
          />
        </View>
      ))}
      <PortalFeedback error={action.error} notice={action.notice} />
    </>
  );
}
