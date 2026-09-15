import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { BeneficialOwner, OwnershipRoster, SaveBeneficialOwner } from '../domain/beneficial-owner';
import { OnboardingStatus } from '../domain/onboarding-status';
import { OnboardingDraft } from '../domain/onboarding-draft';
import { AttachDocuments, OnboardingRepository, RegisterBusiness, SavedDraft } from '../domain/onboarding.repository';
import {
  OnboardingDraftViewDto,
  OnboardingViewDto,
  RegisterBusinessDto,
  UboRosterDto,
  UboViewDto,
} from './onboarding.dto';
import {
  toBeneficialOwner,
  toOnboardingStatus,
  toOwnershipRoster,
  toSavedDraft,
  toSaveUboDto,
} from './onboarding.mapper';

@Injectable()
export class OnboardingHttpRepository extends OnboardingRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  status(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingViewDto>(`${this.baseUrl}/onboarding`).pipe(map(toOnboardingStatus));
  }

  refresh(): Observable<OnboardingStatus> {
    return this.http.post<OnboardingViewDto>(`${this.baseUrl}/onboarding/refresh`, null).pipe(map(toOnboardingStatus));
  }

  roster(): Observable<OwnershipRoster> {
    return this.http.get<UboRosterDto>(`${this.baseUrl}/ubos`).pipe(map(toOwnershipRoster));
  }

  saveOwner(command: SaveBeneficialOwner): Observable<BeneficialOwner> {
    return this.http.post<UboViewDto>(`${this.baseUrl}/ubos`, toSaveUboDto(command)).pipe(map(toBeneficialOwner));
  }

  draft(): Observable<SavedDraft> {
    return this.http.get<OnboardingDraftViewDto>(`${this.baseUrl}/onboarding/draft`).pipe(map(toSavedDraft));
  }

  saveDraft(draft: OnboardingDraft): Observable<SavedDraft> {
    return this.http.put<OnboardingDraftViewDto>(`${this.baseUrl}/onboarding/draft`, { draft }).pipe(map(toSavedDraft));
  }

  register(command: RegisterBusiness): Observable<OnboardingStatus> {
    const body: RegisterBusinessDto = {
      businessLegalName: command.businessLegalName.trim(),
      email: command.email.trim(),
      sourceOfFunds: command.sourceOfFunds,
    };
    return this.http.post<OnboardingViewDto>(`${this.baseUrl}/onboarding`, body).pipe(map(toOnboardingStatus));
  }

  completeProfile(profile: Record<string, unknown>): Observable<OnboardingStatus> {
    return this.http.put<OnboardingViewDto>(`${this.baseUrl}/onboarding`, { profile }).pipe(map(toOnboardingStatus));
  }

  attachCompanyDocuments(command: AttachDocuments): Observable<OnboardingStatus> {
    return this.http
      .post<OnboardingViewDto>(`${this.baseUrl}/onboarding/documents`, toDocumentsForm(command))
      .pipe(map(toOnboardingStatus));
  }

  attachOwnerDocuments(ownerId: string, command: AttachDocuments): Observable<BeneficialOwner> {
    return this.http
      .post<UboViewDto>(`${this.baseUrl}/ubos/${encodeURIComponent(ownerId)}/documents`, toDocumentsForm(command))
      .pipe(map(toBeneficialOwner));
  }

  syncOwners(): Observable<OnboardingStatus> {
    return this.http.post<OnboardingViewDto>(`${this.baseUrl}/ubos/sync`, null).pipe(map(toOnboardingStatus));
  }

  requestLivenessLinks(): Observable<OwnershipRoster> {
    return this.http.post<UboRosterDto>(`${this.baseUrl}/ubos/liveness-links`, null).pipe(map(toOwnershipRoster));
  }
}

/** Multipart del BFF: `files` y `types` repetidos y emparejados por orden; el resto como campos de texto. */
export function toDocumentsForm(command: AttachDocuments): FormData {
  const form = new FormData();
  form.append('informationType', command.informationType);
  form.append('issuingCountry', command.issuingCountry.trim().toUpperCase());
  if (command.number?.trim()) form.append('number', command.number.trim());
  if (command.expiration) form.append('expiration', command.expiration);
  for (const document of command.files) {
    form.append('files', document.file, document.file.name);
    form.append('types', document.role);
  }
  return form;
}
