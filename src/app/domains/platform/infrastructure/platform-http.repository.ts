import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { toDate } from '../../../shared/utilities/dates';
import { PlatformRepository, ReviewItem, Tenant360, TenantSummary } from '../domain/platform';

type Dto = Record<string, unknown>;

@Injectable()
export class PlatformHttpRepository extends PlatformRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/platform`;

  tenants(): Observable<readonly TenantSummary[]> {
    return this.http.get<Dto[]>(`${this.url}/tenants`).pipe(map((dtos) => dtos.map(toSummary)));
  }

  tenant(id: string): Observable<Tenant360> {
    return this.http.get<Dto>(`${this.url}/tenants/${encodeURIComponent(id)}`).pipe(map(toTenant360));
  }

  refresh(id: string): Observable<Tenant360> {
    return this.http
      .post<Dto>(`${this.url}/tenants/${encodeURIComponent(id)}/refresh`, null)
      .pipe(map(toTenant360));
  }

  reviewQueue(): Observable<readonly ReviewItem[]> {
    return this.http.get<Dto[]>(`${this.url}/review-queue`).pipe(
      map((dtos) =>
        dtos.map((d) => ({
          tenantId: str(d['tenantId']) ?? '',
          tenantName: str(d['tenantName']) ?? '',
          kind: str(d['kind']) ?? '',
          severity: d['severity'] === 'critical' ? 'critical' : 'attention',
          title: str(d['title']) ?? '',
          detail: str(d['detail']),
          since: toDate(str(d['since']) ?? undefined),
        })),
      ),
    );
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function list(value: unknown): Dto[] {
  return Array.isArray(value) ? (value as Dto[]) : [];
}

export function toSummary(d: Dto): TenantSummary {
  return {
    id: str(d['id']) ?? '',
    name: str(d['name']) ?? '',
    providerUserId: str(d['kiraUserId']),
    status: str(d['status']) ?? 'UNKNOWN',
    verificationTriggered: d['verificationTriggered'] === true,
    readyForVirtualAccounts: d['readyForVirtualAccounts'] === true,
    pendingFields: num(d['pendingFields']) ?? 0,
    rejectionReason: str(d['rejectionReason']),
    beneficialOwners: num(d['beneficialOwners']) ?? 0,
    virtualAccounts: num(d['virtualAccounts']) ?? 0,
    openRfis: num(d['openRfis']) ?? 0,
    overdueRfis: num(d['overdueRfis']) ?? 0,
    heldPayouts: num(d['heldPayouts']) ?? 0,
    createdAt: toDate(str(d['createdAt']) ?? undefined),
  };
}

export function toTenant360(d: Dto): Tenant360 {
  const onboarding = (d['onboarding'] ?? {}) as Dto;
  const roster = (d['beneficialOwners'] ?? {}) as Dto;
  return {
    summary: toSummary((d['summary'] ?? {}) as Dto),
    onboarding: {
      status: str(onboarding['status']) ?? 'UNKNOWN',
      pendingFields: Array.isArray(onboarding['pendingFields'])
        ? (onboarding['pendingFields'] as unknown[]).filter((f): f is string => typeof f === 'string')
        : [],
      rejectionReason: str(onboarding['rejectionReason']),
      readyForVirtualAccounts: onboarding['readyForVirtualAccounts'] === true,
      enhancedDueDiligenceRequired: onboarding['enhancedDueDiligenceRequired'] === true,
    },
    beneficialOwners: list(roster['members']).map((m) => ({
      id: str(m['id']) ?? '',
      fullName: str(m['fullName']) ?? '',
      ownershipPercentage: num(m['ownershipPercentage']),
      beneficialOwner: m['beneficialOwner'] === true,
      livenessStatus: str(m['livenessStatus']),
      knownToKira: m['knownToKira'] === true,
    })),
    accounts: list(d['accounts']).map((a) => ({
      id: str(a['id']) ?? '',
      status: str(a['status']) ?? '',
      bankName: str(a['bankName']),
      fundsReady: a['fundsReady'] === true,
      activationDelayed: a['activationDelayed'] === true,
      availableBalance: num(a['availableBalance']),
      currency: str(a['currency']),
    })),
    payouts: list(d['payouts']).map((p) => ({
      id: str(p['id']) ?? '',
      status: str(p['status']) ?? '',
      approvalState: str(p['approvalState']) ?? '',
      amount: num(p['amount']),
      currency: str(p['currency']),
      createdAt: toDate(str(p['createdAt']) ?? undefined),
    })),
    deposits: list(d['deposits']).map((x) => ({
      id: str(x['id']) ?? '',
      status: str(x['status']) ?? '',
      netAmount: num(x['netAmount']),
      currency: str(x['currency']),
      held: x['held'] === true,
      createdAt: toDate(str(x['createdAt']) ?? undefined),
    })),
    rfis: list(d['rfis']).map((r) => ({
      id: str(r['id']) ?? '',
      status: str(r['status']) ?? '',
      resolutionReason: str(r['resolutionReason']),
      dueDate: toDate(str(r['dueDate']) ?? undefined),
      overdue: r['overdue'] === true,
      blockingType: str(r['blockingType']),
    })),
  };
}
