import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activeMemberships,
  canAccessCitizen,
  canManageCompany,
  resolveRole,
  roleHome,
  shouldRedirectToPendingInvitations,
} from '../src/models/Access.ts';

const membership = {
  id: 'membership-a',
  companyId: 'company-a',
  companyName: 'EcoCentro',
  companyStatus: 'ACTIVE',
  role: 'company_owner',
  status: 'ACTIVE',
};
const access = (memberships, isPlatformAdmin = false) => ({ memberships, isPlatformAdmin });

test('sin permisos cargados no se concede un rol; ciudadano requiere lectura DB exitosa', () => {
  assert.equal(resolveRole(null), null);
  assert.equal(resolveRole(access([])), 'citizen');
  assert.equal(canAccessCitizen(null, false), false);
});
test('cada rol llega a su portal; admin tiene prioridad', () => {
  assert.equal(roleHome(resolveRole(access([]))), '/home');
  assert.equal(roleHome(resolveRole(access([membership]))), '/company');
  assert.equal(
    roleHome(resolveRole(access([{ ...membership, role: 'company_worker' }]))),
    '/company'
  );
  assert.equal(roleHome(resolveRole(access([membership], true))), '/admin');
});
test('INVITED, DISABLED y empresa suspendida no habilitan operaciones', () => {
  for (const item of [
    { ...membership, status: 'INVITED' },
    { ...membership, status: 'DISABLED' },
    { ...membership, companyStatus: 'SUSPENDED' },
  ]) {
    assert.equal(activeMemberships(access([item])).length, 0);
    assert.equal(resolveRole(access([item])), 'citizen');
    assert.equal(canManageCompany(resolveRole(access([item]))), false);
  }
});
test('el cambio de empresa usa el rol de esa membresía; no eleva workers', () => {
  const twoCompanies = access([
    membership,
    { ...membership, id: 'membership-b', companyId: 'company-b', role: 'company_worker' },
  ]);
  assert.equal(resolveRole(twoCompanies, 'company-b'), 'company_worker');
  assert.equal(canManageCompany(resolveRole(twoCompanies, 'company-b')), false);
  assert.equal(canManageCompany(resolveRole(twoCompanies, 'company-a')), true);
  assert.equal(resolveRole(twoCompanies, 'unknown'), 'company_owner');
});
test('invitados acceden al shell ciudadano y roles empresa/admin no lo habilitan', () => {
  assert.equal(canAccessCitizen(null, true), true);
  assert.equal(canAccessCitizen('citizen', false), true);
  assert.equal(canAccessCitizen('company_worker', true), false);
  assert.equal(canAccessCitizen('company_owner', true), false);
  assert.equal(canAccessCitizen('platform_admin', true), false);
});
test('ciudadano con invitación pendiente redirige salvo que la haya pospuesto', () => {
  assert.equal(
    shouldRedirectToPendingInvitations({
      role: 'citizen',
      hasPendingInvitations: true,
      invitationsPostponed: false,
    }),
    true
  );
  assert.equal(
    shouldRedirectToPendingInvitations({
      role: 'citizen',
      hasPendingInvitations: true,
      invitationsPostponed: true,
    }),
    false
  );
  assert.equal(
    shouldRedirectToPendingInvitations({
      role: 'citizen',
      hasPendingInvitations: false,
      invitationsPostponed: false,
    }),
    false
  );
  assert.equal(
    shouldRedirectToPendingInvitations({
      role: 'company_owner',
      hasPendingInvitations: true,
      invitationsPostponed: false,
    }),
    false
  );
});
