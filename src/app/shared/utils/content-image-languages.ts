import { ContentImageSelection } from '../../features/content/data-access/content-api.service';
import { ContentImageLanguageOption } from '../components/content-image-language-filter/content-image-language-filter.component';

export function buildContentImageLanguageOptions(
  images: ContentImageSelection[],
  noLanguageLabel: string,
  locale = 'pt-BR',
): ContentImageLanguageOption[] {
  const counts = new Map<string, number>();
  for (const image of images) {
    const code = image.language || 'null';
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
  return [...counts.entries()]
    .map(([code, count]) => {
      const label = code === 'null' ? noLanguageLabel : displayNames.of(code) ?? code;
      return {
        code,
        label: label ? label[0].toLocaleUpperCase(locale) + label.slice(1) : label,
        count,
      };
    })
    .sort((left, right) => {
      if (left.code === 'null') return right.code === 'null' ? 0 : -1;
      if (right.code === 'null') return 1;
      return right.count - left.count || left.label.localeCompare(right.label, locale);
    });
}
