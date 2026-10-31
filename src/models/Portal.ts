import type { CompanyMembership } from './Access';
import type { DeviceCategory, DeviceIntakeMode } from './DeviceCategory';

export const applicationStatuses = {
  SUBMITTED: 'Enviada',
  UNDER_REVIEW: 'En revisión',
  NEEDS_INFO: 'Falta información',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
} as const;
export type ApplicationStatus = keyof typeof applicationStatuses;
export interface ApplicationInput {
  businessName: string;
  legalName: string;
  taxId: string;
  corporateEmail: string;
  phone: string;
  responsible: string;
  address: string;
  activity: string;
  website: string;
  description: string;
  documentPath: string;
}
export interface CompanyApplication extends ApplicationInput {
  id: string;
  applicantId: string;
  status: ApplicationStatus;
  reviewNote: string | null;
  companyId: string | null;
  createdAt: string;
}
export interface PortalCompany {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  workerLimit: number;
}
export interface CompanyDetails {
  legalName: string;
  taxId: string;
  corporateEmail: string;
  phone: string;
  responsible: string;
  address: string;
  activity: string;
  website: string;
  description: string;
}
export interface CompanyInvitation {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  role: CompanyMembership['role'];
  status: 'INVITED' | 'ACCEPTED' | 'CANCELLED';
  acceptedBy: string | null;
}
export interface CompanyLimitRequest {
  id: string;
  companyId: string;
  companyName: string;
  requestedLimit: number;
  reason: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
}
export interface ManagedPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  description: string;
  timeZone: string;
  active: boolean;
  pickupEnabled: boolean;
  categories: string[];
  intakeConfirmed: boolean;
  intakePolicies: Record<string, DeviceIntakeMode>;
  schedules: { weekday: number; opensMinute: number; closesMinute: number }[];
}
export interface CompanyPortalData {
  company: PortalCompany;
  details: CompanyDetails | null;
  points: ManagedPoint[];
  categories: DeviceCategory[];
  categoryPoints: { id: string; points: number }[];
  members: {
    id: string;
    userId: string;
    role: CompanyMembership['role'];
    status: CompanyMembership['status'];
  }[];
  invitations: CompanyInvitation[];
  limitRequests: CompanyLimitRequest[];
}
export interface PointInput extends Omit<
  ManagedPoint,
  'id' | 'intakeConfirmed' | 'intakePolicies'
> {
  id?: string;
  companyId: string;
}
export interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  targetId: string | null;
  createdAt: string;
  note: string | null;
  actorName: string;
  actorEmail: string;
  companyName: string | null;
  details: Record<string, unknown>;
}
export interface AdminPortalData {
  companies: PortalCompany[];
  limitRequests: CompanyLimitRequest[];
}
