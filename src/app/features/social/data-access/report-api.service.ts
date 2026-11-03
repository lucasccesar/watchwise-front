import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type SocialReportTargetType = 'USER' | 'COMMENT' | 'REVIEW' | 'CONTENT_REVIEW';
export type SocialReportReason =
  | 'SPAM_OR_MISLEADING'
  | 'HARASSMENT_OR_BULLYING'
  | 'HATE_SPEECH'
  | 'UNMARKED_SPOILER'
  | 'SEXUAL_OR_VIOLENT_CONTENT'
  | 'OTHER';

export interface SocialReportRequest {
  targetType: SocialReportTargetType;
  targetId: string;
  reason: SocialReportReason;
  details?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  constructor(private readonly http: HttpClient) {}

  createReport(request: SocialReportRequest): Observable<unknown> {
    return this.http.post<unknown>('/api/v1/reports', request);
  }
}
