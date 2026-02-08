/**
 * Extrai texto de um PDF e retorna apenas os domínios encontrados na tabela anexo.
 * Pensado para PDFs de ofícios (ex.: Anatel) com tabela de domínios.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { sanitizeDominio } from '@/utils/stringUtils';
import { isValidIPv4, isValidIPv6 } from '@/utils/validators';

// Worker do pdfjs (CDN para evitar copiar arquivo para public)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
}

/**
 * Estrutura que armazena texto de uma página com informações de posição.
 */
interface PageText {
  pageNumber: number;
  text: string;
  lines: string[];
  /** Bbox de cada linha (mesmo índice que lines), para detectar tabela. */
  rowBboxes: RowBbox[];
}

/** Bounding box de uma linha de texto (posições do PDF). */
interface RowBbox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Extrai todo o texto de um PDF a partir de um ArrayBuffer, mantendo informações de página.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n');
}

/** Tolerância em pontos para considerar mesmo Y (mesma linha). */
const Y_LINE_TOLERANCE = 4;

interface PdfItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

/**
 * Extrai texto por página com informações de posição e bbox por linha.
 * Usado para detectar região de tabela e extrair domínios apenas de dentro da tabela.
 */
async function extractTextByPage(arrayBuffer: ArrayBuffer): Promise<PageText[]> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: PageText[] = [];

  for (let i = 1; i <= numPages; i++) {
    const pdfPage = await pdf.getPage(i);
    const textContent = await pdfPage.getTextContent();

    const lineGroups: string[] = [];
    const rowBboxes: RowBbox[] = [];
    let currentLine: PdfItem[] = [];
    let lastY: number | null = null;
    let curMinX = Infinity;
    let curMaxX = -Infinity;
    let curMinY = Infinity;
    let curMaxY = -Infinity;

    for (const item of textContent.items) {
      if ('str' in item) {
        const str = item.str ?? '';
        if (!str.trim()) continue;

        const pdfItem = item as unknown as PdfItem;
        let x = 0;
        let y = 0;
        if (pdfItem.transform && Array.isArray(pdfItem.transform) && pdfItem.transform.length >= 6) {
          x = Number(pdfItem.transform[4]) || 0;
          y = Number(pdfItem.transform[5]) || 0;
        }

        const sameRow = lastY !== null && Math.abs(y - lastY) <= Y_LINE_TOLERANCE;

        if (!sameRow && currentLine.length > 0) {
          // Processa a linha anterior para juntar texto com espaçamento correto
          processLineGroup(lineGroups, rowBboxes, currentLine, curMinX, curMaxX, curMinY, curMaxY);
          currentLine = [];
          curMinX = Infinity;
          curMaxX = -Infinity;
          curMinY = Infinity;
          curMaxY = -Infinity;
        }

        currentLine.push(pdfItem);
        curMinX = Math.min(curMinX, x);
        curMaxX = Math.max(curMaxX, x + (pdfItem.width || 0));
        curMinY = Math.min(curMinY, y);
        curMaxY = Math.max(curMaxY, y + (pdfItem.height || 0));
        lastY = y;
      }
    }

    if (currentLine.length > 0) {
      processLineGroup(lineGroups, rowBboxes, currentLine, curMinX, curMaxX, curMinY, curMaxY);
    }

    // lineGroups agora já contém strings processadas
    const linesWithBbox = lineGroups.map((line, idx) => ({
      line,
      bbox: rowBboxes[idx]
    })).filter(o => o.line.length > 0);

    const lines =
      linesWithBbox.length > 0
        ? linesWithBbox.map((o) => o.line)
        : [textContent.items.map((item) => ('str' in item ? item.str : '')).join('')]; 
    
    const bboxesForLines = linesWithBbox.length > 0
        ? linesWithBbox.map((o) => o.bbox)
        : [{ minX: 0, maxX: 0, minY: 0, maxY: 0 }];

    const pageText = lines.join('\n');

    pages.push({
      pageNumber: i,
      text: pageText,
      lines,
      rowBboxes: bboxesForLines,
    });
  }

  return pages;
}

/**
 * Processa um grupo de itens de texto (uma linha visual) e junta-os em uma string,
 * inserindo espaços apenas quando houver distância significativa entre eles.
 */
function processLineGroup(
  targetLines: string[],
  targetBboxes: RowBbox[],
  items: PdfItem[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
) {
  if (items.length === 0) return;

  // Ordena itens por X para garantir ordem de leitura
  items.sort((a, b) => (a.transform[4] - b.transform[4]));

  let lineStr = '';
  let lastItemEnd = -1;

  for (const item of items) {
    const str = item.str;
    const x = item.transform[4];
    const width = item.width || 0;
    
    // Se não é o primeiro item, decide se põe espaço
    if (lastItemEnd !== -1) {
      const gap = x - lastItemEnd;
      // Heurística: se o gap for maior que um valor pequeno (ex: 2px ou fração da altura), insere espaço.
      // Se for negativo (overlap) ou muito pequeno, junta sem espaço.
      // Assumindo que fonte média tem largura ~5-10px, um espaço é ~3-5px.
      // Vamos usar 3.0 como limiar seguro.
      if (gap > 3.0 && !lineStr.endsWith(' ') && !str.startsWith(' ')) {
        lineStr += ' ';
      }
    }
    
    lineStr += str;
    lastItemEnd = x + width;
  }

  targetLines.push(lineStr.trim());
  targetBboxes.push({ minX, maxX, minY, maxY });
}



/**
 * Remove todos os espaços de um texto.
 * Inspirado no script Python que faz: .replace(' ', '')
 * Resolve TODOS os casos de TLDs quebrados automaticamente.
 * Ex: "dom inio.i nfo" -> "dominio.info"
 */
function removeSpacesFromDomain(text: string): string {
  // Remove TODOS os espaços (igual o script Python faz)
  return text.replace(/\s+/g, '');
}

/**
 * Detecta se uma linha está em região de tabela baseado em bounding boxes.
 * Simula o comportamento do Python que extrai apenas de tabelas.
 * Tabelas têm: múltiplas linhas consecutivas com padrões visuais similares.
 */
function isInTableRegion(
  lineIndex: number,
  bboxes: RowBbox[],
  lines: string[]
): boolean {
  if (bboxes.length === 0 || lineIndex >= bboxes.length) return false;
  
  const currentBbox = bboxes[lineIndex];
  if (!currentBbox) return false;
  
  // Linhas de tabela geralmente têm largura consistente e estão em sequência
  // Verifica se há pelo menos 3 linhas consecutivas com padrão similar (característica de tabela)
  let consecutiveTableLines = 0;
  const tolerance = 50; // Tolerância em pixels para considerar alinhamento
  
  for (let i = Math.max(0, lineIndex - 2); i <= Math.min(bboxes.length - 1, lineIndex + 2); i++) {
    const bbox = bboxes[i];
    if (!bbox) continue;
    
    const line = lines[i];
    if (!line) continue;
    
    // Verifica se a linha parece fazer parte de tabela:
    // 1. Tem domínio-like pattern (contém pontos)
    // 2. Tem comprimento razoável (não muito curta)
    // 3. Está alinhada com outras linhas próximas
    const hasDot = line.includes('.');
    const isReasonableLength = line.trim().length > 10;
    const isAligned = Math.abs(bbox.minX - currentBbox.minX) < tolerance;
    
    if (hasDot && isReasonableLength && isAligned) {
      consecutiveTableLines++;
    }
  }
  
  // Se há 3+ linhas consecutivas com padrão de tabela, considera que está em tabela
  return consecutiveTableLines >= 3;
}

/**
 * Extrai domínios e IPs APENAS de regiões de tabela.
 * Simula o comportamento do Python que usa extract_tables().
 */
function extractDomainsAndIpsFromPages(pages: PageText[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  // Domínio + porta opcional + path opcional (igual ao Python)
  // TLD pode ter letras, números e hífen (ex: salto-alto777bet)
  const domainLikeRegex = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?::\d{1,5})?(?:\/[^\s'"<>]*)?/g;
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ipv6Regex = /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::/g;

  for (const page of pages) {
    const lines = page.lines.length > 0 ? page.lines : [page.text];
    const bboxes = page.rowBboxes;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      
      // CHAVE: Processa APENAS linhas que estão em região de tabela
      // (igual Python que processa apenas células de tabelas)
      if (!isInTableRegion(lineIndex, bboxes, lines)) {
        continue;
      }
      
      // Remove TODOS os espaços da linha (igual Python: .replace(' ', ''))
      const lineClean = removeSpacesFromDomain(line);
      
      let m: RegExpExecArray | null;

      // Busca IPv4
      const re4 = new RegExp(ipv4Regex.source, 'g');
      while ((m = re4.exec(lineClean)) !== null) {
        const ip = m[0];
        if (isValidIPv4(ip) && !seen.has(ip)) {
          seen.add(ip);
          result.push(ip);
        }
      }

      // Busca IPv6
      const re6 = new RegExp(ipv6Regex.source, 'g');
      while ((m = re6.exec(lineClean)) !== null) {
        const ip = m[0];
        if (isValidIPv6(ip) && !seen.has(ip)) {
          seen.add(ip);
          result.push(ip);
        }
      }

      // Busca domínios
      const reDom = new RegExp(domainLikeRegex.source, 'g');
      while ((m = reDom.exec(lineClean)) !== null) {
        const raw = m[0];
        
        // Rejeita só se o TLD for apenas dígitos (ex: processo.123)
        const parts = raw.split('.');
        const tld = parts[parts.length - 1] ?? '';
        if (/^\d+$/.test(tld)) continue;
        
        // Sanitiza (lowercase, remove www, etc)
        const cleaned = sanitizeDominio(raw);
        if (!cleaned || seen.has(cleaned)) continue;
        
        seen.add(cleaned);
        result.push(cleaned);
      }
    }
  }

  return result;
}

/**
 * Extrai domínios (e IPs) de um PDF a partir do buffer.
 * Retorna uma string com um item por linha, pronta para colar no textarea do Importar lista.
 * Usa detecção inteligente de cabeçalho/rodapé baseada em posição e contexto.
 */
export async function extractDomainsFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const pages = await extractTextByPage(arrayBuffer);
  const items = extractDomainsAndIpsFromPages(pages);
  return items.join('\n');
}

/**
 * Baixa um PDF por URL e extrai os domínios.
 * Pode falhar por CORS se o servidor não permitir; nesse caso o usuário deve fazer upload do arquivo.
 */
export async function extractDomainsFromPdfUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Falha ao baixar PDF: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return extractDomainsFromPdfBuffer(arrayBuffer);
}
