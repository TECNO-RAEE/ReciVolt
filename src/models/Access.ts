export type AppRole = 'citizen' | 'company_owner' | 'company_worker' | 'platform_admin';
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';
export interface CompanyMembership {
  id: string;
  companyId: string;
  companyName: string;
  companyStatus: 'ACTIVE' | 'SUSPENDED';
  role: 'company_owner' | 'company_worker';
  status: MembershipStatus;
}
export interface Access {
  isPlatformAdmin: boolean;
  memberships: CompanyMembership[];
  hasPendingInvitations?: boolean;
}
export function activeMemberships(access: Access | null): CompanyMembership[] {
  return (
    access?.memberships.filter(
      (membership) => membership.status === 'ACTIVE' && membership.companyStatus === 'ACTIVE'
    ) ?? []
  );
}
export function resolveRole(access: Access | null, companyId?: string | null): AppRole | null {
  if (!access) return null;
  if (access.isPlatformAdmin) return 'platform_admin';
  const memberships = activeMemberships(access);
  const membership = memberships.find((item) => item.companyId === companyId) ?? memberships[0];
  return membership?.role ?? 'citizen';
}
export function roleHome(role: AppRole): '/home' | '/company' | '/admin' {
  if (role === 'platform_admin') return '/admin';
  if (role === 'company_owner' || role === 'company_worker') return '/company';
  return '/home';
}
export function canManageCompany(role: AppRole | null): boolean {
  return role === 'company_owner';
}
export function canAccessCitizen(role: AppRole | null, guest: boolean): boolean {
  return role === 'citizen' || (role === null && guest);
}
export function shouldRedirectToPendingInvitations(input: {
  role: AppRole | null;
  hasPendingInvitations?: boolean;
  invitationsPostponed?: boolean;
}): boolean {
  return (
    input.role === 'citizen' &&
    Boolean(input.hasPendingInvitations) &&
    !input.invitationsPostponed
  );
}
