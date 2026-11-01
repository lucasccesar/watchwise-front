import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { messageCatalog } from '../../../../shared/i18n/messages';

type ImportedPickType = 'MOVIE' | 'SERIES' | 'EPISODE' | 'PERSON';
type ImportedGroup = 'PRIMARY' | 'SECONDARY';
type ImportedTemplate = { title: string; description: string; coverImage: string; eligibilityStartDate: string; eligibilityEndDate: string; categories: Array<{ name: string; description: string; group: ImportedGroup; allowedType: ImportedPickType; optionMode: 'OPEN' | 'FIXED'; nominees: string[] }> };
type ImportValidation = { valid: boolean; errors: string[]; data: ImportedTemplate | null; categoryCount: number; nomineeCount: number };

const EXAMPLE_JSON = `{
  "title": "Clube dos clássicos",
  "description": "Os melhores filmes, séries e interpretações de 1960 a 2009.",
  "coverImage": "https://images.example.com/classics-club.jpg",
  "eligibility": {
    "start": "1960-01-01",
    "end": "2009-12-31"
  },
  "categories": [
    { "name": "Melhor filme", "type": "movie" },
    { "name": "Melhor sequência", "type": "movie", "nominees": ["De Volta para o Futuro 2", "O Império Contra-Ataca", "A Vingança dos Sith"] },
    { "name": "Melhor série", "type": "series" },
    { "name": "Melhor episódio", "type": "episode" },
    { "name": "Melhor atuação principal", "type": "person", "nominees": ["Michael J. Fox", "Christopher Lloyd", "Lea Thompson", "Crispin Glover"] }
  ]
}`;

@Component({
  selector: 'app-pick-import',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-import.component.html',
  styleUrl: './pick-import.component.css',
})
export class PickImportComponent {
  protected readonly copy = messageCatalog['pt-BR'].pickImportPage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly jsonText = signal(EXAMPLE_JSON);
  protected readonly dragging = signal(false);
  protected readonly fileError = signal('');
  protected readonly validation = computed(() => this.parse(this.jsonText()));
  protected readonly lineCount = computed(() => this.jsonText().split(/\r?\n/).length);
  protected readonly categories = computed(() => this.validation().data?.categories ?? []);
  protected readonly previewTitle = computed(() => this.validation().data?.title ?? '');

  private readonly router = inject(Router);

  protected updateJson(event: Event): void { this.jsonText.set((event.target as HTMLTextAreaElement).value); this.fileError.set(''); }
  protected resetExample(): void { this.jsonText.set(EXAMPLE_JSON); this.fileError.set(''); }
  protected handleFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; if (file) this.readFile(file);
    input.value = '';
  }
  protected dragOver(event: DragEvent): void { event.preventDefault(); this.dragging.set(true); }
  protected dragLeave(event: DragEvent): void { event.preventDefault(); this.dragging.set(false); }
  protected dropFile(event: DragEvent): void {
    event.preventDefault(); this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0]; if (file) this.readFile(file);
  }
  protected importTemplate(): void {
    const result = this.validation(); if (!result.valid || !result.data) return;
    void this.router.navigateByUrl('/picks/create', { state: { importedTemplate: result.data } });
  }
  protected downloadExample(): void {
    const blob = new Blob([EXAMPLE_JSON], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'exemplo-modelo-watchwise.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  protected typeLabel(value: ImportedPickType): string { return value === 'MOVIE' ? this.copy.movie : value === 'SERIES' ? this.copy.series : value === 'EPISODE' ? this.copy.episode : this.copy.person; }
  protected nomineeLabel(count: number): string { return this.copy.nomineesCount.replace('{count}', String(count)); }
  protected dateRange(): string { const data = this.validation().data; return [data?.eligibilityStartDate, data?.eligibilityEndDate].filter(Boolean).join(' – '); }

  private readFile(file: File): void {
    if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.json')) { this.fileError.set(this.copy.onlyJson); return; }
    const reader = new FileReader();
    reader.onload = () => { this.jsonText.set(typeof reader.result === 'string' ? reader.result : ''); this.fileError.set(''); };
    reader.onerror = () => this.fileError.set(this.copy.fileError);
    reader.readAsText(file);
  }

  private parse(raw: string): ImportValidation {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { valid: false, errors: [this.copy.invalidJson], data: null, categoryCount: 0, nomineeCount: 0 }; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { valid: false, errors: [this.copy.invalidJson], data: null, categoryCount: 0, nomineeCount: 0 };
    const record = parsed as Record<string, unknown>;
    const errors: string[] = [];
    const title = typeof record['title'] === 'string' ? record['title'].trim() : '';
    const description = typeof record['description'] === 'string' ? record['description'].trim() : '';
    const coverImage = typeof record['coverImage'] === 'string' ? record['coverImage'].trim() : '';
    if (!title || title.length > 120) errors.push(this.copy.invalidTitle);
    if (coverImage && !this.isHttpUrl(coverImage)) errors.push(this.copy.invalidCover);
    const eligibility = record['eligibility'] && typeof record['eligibility'] === 'object' ? record['eligibility'] as Record<string, unknown> : {};
    const start = typeof eligibility['start'] === 'string' ? eligibility['start'] : '';
    const end = typeof eligibility['end'] === 'string' ? eligibility['end'] : '';
    if ((start && !this.isDate(start)) || (end && !this.isDate(end)) || (start && end && start > end)) errors.push(this.copy.invalidEligibility);
    const inputCategories = Array.isArray(record['categories']) ? record['categories'] : [];
    const typeMap: Record<string, ImportedPickType> = { movie: 'MOVIE', MOVIE: 'MOVIE', series: 'SERIES', SERIES: 'SERIES', episode: 'EPISODE', EPISODE: 'EPISODE', person: 'PERSON', PERSON: 'PERSON' };
    const categories: ImportedTemplate['categories'] = [];
    for (const [index, rawCategory] of inputCategories.entries()) {
      if (!rawCategory || typeof rawCategory !== 'object' || Array.isArray(rawCategory)) continue;
      const category = rawCategory as Record<string, unknown>;
      const name = typeof category['name'] === 'string' ? category['name'].trim() : '';
      const type = typeof category['type'] === 'string' ? typeMap[category['type']] : undefined;
      if (!name || !type) continue;
      const nominees = Array.isArray(category['nominees']) ? category['nominees'].filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
      const group = category['group'] === 'SECONDARY' || category['group'] === 'secondary' ? 'SECONDARY' : category['group'] === 'PRIMARY' || category['group'] === 'primary' ? 'PRIMARY' : index < 3 ? 'PRIMARY' : 'SECONDARY';
      categories.push({ name, description: typeof category['description'] === 'string' ? category['description'].trim() : '', group, allowedType: type, optionMode: nominees.length ? 'FIXED' : 'OPEN', nominees });
    }
    if (!categories.length) errors.push(this.copy.invalidCategories);
    const nomineeCount = categories.reduce((sum, category) => sum + category.nominees.length, 0);
    const data: ImportedTemplate = { title, description, coverImage, eligibilityStartDate: start, eligibilityEndDate: end, categories };
    return { valid: errors.length === 0, errors, data: errors.length === 0 ? data : null, categoryCount: categories.length, nomineeCount };
  }

  private isDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
  private isHttpUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } }
}
