export type LegalDocumentPage = 'terms' | 'privacy' | 'guidelines';

export type LegalInlineSegment = {
  text: string;
  href?: string;
  routerLink?: string;
  external?: boolean;
  bold?: boolean;
};

export type LegalBlock =
  | { type: 'paragraph' | 'quote' | 'heading'; segments: LegalInlineSegment[] }
  | { type: 'list'; ordered: boolean; items: LegalInlineSegment[][] }
  | { type: 'table'; headers: LegalInlineSegment[][]; rows: LegalInlineSegment[][][] };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDocument = {
  title: string;
  updatedAt: string;
  responsibleLabel: string;
  responsible: string;
  contactLabel: string;
  contact: string;
  introduction: LegalBlock[];
  sections: LegalSection[];
};

const localDocumentRoutes: Record<string, string> = {
  'termos-de-uso.md': '/terms',
  'politica-de-privacidade.md': '/privacy',
  'diretrizes-da-comunidade.md': '/community-guidelines',
};

export function parseLegalDocument(page: LegalDocumentPage, markdown: string): LegalDocument {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const document: LegalDocument = {
    title: '',
    updatedAt: '',
    responsibleLabel: page === 'privacy' ? 'Controlador dos dados' : page === 'guidelines' ? 'Serviço' : 'Responsável pelo serviço',
    responsible: page === 'guidelines' ? 'Watchwise' : 'Lucas César, pessoa natural no Brasil',
    contactLabel: page === 'privacy' ? 'Canal de privacidade' : page === 'guidelines' ? 'Denúncias' : 'Contato',
    contact: 'support@watch-wise.app',
    introduction: [],
    sections: [],
  };

  let currentSection: LegalSection | null = null;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      document.title = line.slice(2).trim();
      index += 1;
      continue;
    }

    const updatedAt = line.match(/^\*\*Última atualização:\*\*\s*(.+)$/i);
    if (updatedAt) {
      document.updatedAt = updatedAt[1].trim();
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      const title = line.slice(3).trim();
      currentSection = { id: slugify(title), title, blocks: [] };
      document.sections.push(currentSection);
      index += 1;
      continue;
    }

    const target = currentSection?.blocks ?? document.introduction;
    if (line.startsWith('### ')) {
      target.push({ type: 'heading', segments: parseInline(line.slice(4).trim()) });
      index += 1;
      continue;
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      if (tableLines.length >= 2) {
        const headers = parseTableRow(tableLines[0]);
        const rows = tableLines
          .slice(1)
          .filter((row) => !/^\|?\s*:?-{3,}/.test(row))
          .map(parseTableRow);
        target.push({ type: 'table', headers, rows });
      }
      continue;
    }

    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      target.push({ type: 'quote', segments: parseInline(quote.join(' ')) });
      continue;
    }

    const listMatch = line.match(/^(\d+\.|[-*])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d+\.$/.test(listMatch[1]);
      const items: LegalInlineSegment[][] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^(\d+\.|[-*])\s+(.+)$/);
        if (!item || /^\d+\.$/.test(item[1]) !== ordered) break;
        items.push(parseInline(item[2]));
        index += 1;
      }
      target.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current ||
        current.startsWith('#') ||
        current.startsWith('|') ||
        current.startsWith('>') ||
        /^(\d+\.|[-*])\s+/.test(current)
      ) break;
      paragraph.push(current);
      index += 1;
    }
    target.push({ type: 'paragraph', segments: parseInline(paragraph.join(' ')) });
  }

  return document;
}

function parseTableRow(line: string): LegalInlineSegment[][] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => parseInline(cell.trim()));
}

function parseInline(value: string): LegalInlineSegment[] {
  const segments: LegalInlineSegment[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? cursor;
    if (start > cursor) segments.push({ text: value.slice(cursor, start) });

    if (match[1] && match[2]) {
      const sourceHref = match[2].trim();
      const route = localDocumentRoutes[sourceHref];
      segments.push(route
        ? { text: match[1], routerLink: route }
        : { text: match[1], href: sourceHref, external: /^https?:\/\//i.test(sourceHref) });
    } else if (match[3]) {
      segments.push({ text: match[3], bold: true });
    }
    cursor = start + match[0].length;
  }

  if (cursor < value.length) segments.push({ text: value.slice(cursor) });
  return segments.length ? segments : [{ text: value }];
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .replace(/^\d+\.\s*/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
