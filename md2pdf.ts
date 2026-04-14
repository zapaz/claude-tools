#!/usr/bin/env npx tsx
// md2pdf.ts - Zero-dependency Markdown to PDF converter
// Usage: npx tsx md2pdf.ts input.md [-o output.pdf]

import { readFileSync, writeFileSync } from "fs";
import { basename, extname, resolve } from "path";

// ==================== TYPES ====================

interface InlineNode {
  type: "text" | "bold" | "italic" | "bold_italic" | "code" | "link";
  content: string;
  url?: string;
}

type Block =
  | { type: "heading"; level: number; inlines: InlineNode[] }
  | { type: "paragraph"; inlines: InlineNode[] }
  | { type: "code_block"; language: string; content: string }
  | { type: "blockquote"; blocks: Block[] }
  | { type: "unordered_list"; items: InlineNode[][] }
  | { type: "ordered_list"; items: InlineNode[][] }
  | { type: "horizontal_rule" }
  | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right")[]; rows: string[][] };

interface StyledRun {
  text: string;
  font: string;
  size: number;
  color: [number, number, number];
}

interface WrappedLine {
  runs: StyledRun[];
  width: number;
}

interface HighlightToken {
  text: string;
  tokenType: "keyword" | "string" | "comment" | "number" | "punctuation" | "default";
}

// ==================== FONT METRICS ====================

// Helvetica widths for ASCII 32-126 (per 1000 em units)
const HELVETICA_WIDTHS = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
  556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,
];

const HELVETICA_BOLD_WIDTHS = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
  975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
  333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
  611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,
];

// Courier: all chars are 600 units wide
const COURIER_WIDTH = 600;

function charWidth(charCode: number, font: string): number {
  if (font.startsWith("Courier")) return COURIER_WIDTH;
  const idx = charCode - 32;
  if (idx < 0 || idx >= 95) return 500;
  if (font === "Helvetica-Bold" || font === "Helvetica-BoldOblique") {
    return HELVETICA_BOLD_WIDTHS[idx];
  }
  return HELVETICA_WIDTHS[idx];
}

function measureText(text: string, font: string, size: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += charWidth(text.charCodeAt(i), font);
  }
  return (w * size) / 1000;
}

// ==================== MARKDOWN PARSER ====================

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Order matters: bold_italic before bold before italic
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", content: text.slice(last, m.index) });
    }
    if (m[2] !== undefined) {
      nodes.push({ type: "bold_italic", content: m[2] });
    } else if (m[3] !== undefined) {
      nodes.push({ type: "bold", content: m[3] });
    } else if (m[4] !== undefined) {
      nodes.push({ type: "italic", content: m[4] });
    } else if (m[5] !== undefined) {
      nodes.push({ type: "code", content: m[5] });
    } else if (m[6] !== undefined) {
      nodes.push({ type: "link", content: m[6], url: m[7] });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    nodes.push({ type: "text", content: text.slice(last) });
  }

  return nodes.length ? nodes : [{ type: "text", content: text }];
}

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block
    const codeMatch = line.match(/^```(\w*)$/);
    if (codeMatch) {
      const lang = codeMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code_block", language: lang, content: codeLines.join("\n") });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        inlines: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "horizontal_rule" });
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const parseRow = (row: string): string[] =>
        row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

      const headers = parseRow(line);
      const aligns = parseRow(lines[i + 1]).map((c): "left" | "center" | "right" => {
        if (c.startsWith(":") && c.endsWith(":")) return "center";
        if (c.endsWith(":")) return "right";
        return "left";
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, alignments: aligns, rows });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ") || line === ">") {
      const bqLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", blocks: parseMarkdown(bqLines.join("\n")) });
      continue;
    }

    // Unordered list
    if (/^[\-\*\+]\s/.test(line)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^[\-\*\+]\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[\-\*\+]\s+/, "")));
        i++;
      }
      blocks.push({ type: "unordered_list", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s+/, "")));
        i++;
      }
      blocks.push({ type: "ordered_list", items });
      continue;
    }

    // Paragraph: collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^(\*{3,}|-{3,}|_{3,})\s*$/) &&
      !lines[i].match(/^[\-\*\+]\s/) &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith("> ")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", inlines: parseInline(paraLines.join(" ")) });
    }
  }

  return blocks;
}

// ==================== SYNTAX HIGHLIGHTER ====================

const LANG_KEYWORDS: Record<string, Set<string>> = {
  js: new Set([
    "async","await","break","case","catch","class","const","continue","debugger",
    "default","delete","do","else","export","extends","false","finally","for",
    "function","if","import","in","instanceof","let","new","null","of","return",
    "static","super","switch","this","throw","true","try","typeof","undefined",
    "var","void","while","with","yield",
  ]),
  ts: new Set([
    "abstract","any","as","async","await","bigint","boolean","break","case","catch",
    "class","const","continue","declare","default","delete","do","else","enum",
    "export","extends","false","finally","for","from","function","get","if",
    "implements","import","in","infer","instanceof","interface","is","keyof","let",
    "module","namespace","never","new","null","number","object","of","private",
    "protected","public","readonly","return","require","set","static","string",
    "super","switch","symbol","this","throw","true","try","type","typeof",
    "undefined","unique","unknown","var","void","while","with","yield",
  ]),
  py: new Set([
    "False","None","True","and","as","assert","async","await","break","class",
    "continue","def","del","elif","else","except","finally","for","from","global",
    "if","import","in","is","lambda","nonlocal","not","or","pass","raise",
    "return","try","while","with","yield",
  ]),
  go: new Set([
    "break","case","chan","const","continue","default","defer","else","fallthrough",
    "for","func","go","goto","if","import","interface","map","package","range",
    "return","select","struct","switch","type","var",
  ]),
};

// Aliases
LANG_KEYWORDS["javascript"] = LANG_KEYWORDS["js"];
LANG_KEYWORDS["typescript"] = LANG_KEYWORDS["ts"];
LANG_KEYWORDS["python"] = LANG_KEYWORDS["py"];
LANG_KEYWORDS["golang"] = LANG_KEYWORDS["go"];

function highlightCode(code: string, language: string): HighlightToken[] {
  const keywords = LANG_KEYWORDS[language.toLowerCase()] || new Set<string>();
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < code.length) {
    // Line comments
    if (code[i] === "/" && code[i + 1] === "/") {
      let end = code.indexOf("\n", i);
      if (end === -1) end = code.length;
      tokens.push({ text: code.slice(i, end), tokenType: "comment" });
      i = end;
      continue;
    }
    // Python line comments
    if (code[i] === "#" && (language === "py" || language === "python")) {
      let end = code.indexOf("\n", i);
      if (end === -1) end = code.length;
      tokens.push({ text: code.slice(i, end), tokenType: "comment" });
      i = end;
      continue;
    }
    // Block comments
    if (code[i] === "/" && code[i + 1] === "*") {
      let end = code.indexOf("*/", i + 2);
      if (end === -1) end = code.length;
      else end += 2;
      tokens.push({ text: code.slice(i, end), tokenType: "comment" });
      i = end;
      continue;
    }
    // Strings
    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++; // skip escaped char
        j++;
      }
      j++; // include closing quote
      tokens.push({ text: code.slice(i, j), tokenType: "string" });
      i = j;
      continue;
    }
    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxXoObB._]/.test(code[j])) j++;
      tokens.push({ text: code.slice(i, j), tokenType: "number" });
      i = j;
      continue;
    }
    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      tokens.push({
        text: word,
        tokenType: keywords.has(word) ? "keyword" : "default",
      });
      i = j;
      continue;
    }
    // Newlines (keep separate for line-by-line rendering)
    if (code[i] === "\n") {
      tokens.push({ text: "\n", tokenType: "default" });
      i++;
      continue;
    }
    // Punctuation and whitespace
    tokens.push({ text: code[i], tokenType: /\s/.test(code[i]) ? "default" : "punctuation" });
    i++;
  }

  return tokens;
}

const TOKEN_COLORS: Record<string, [number, number, number]> = {
  keyword: [0.0, 0.0, 0.7],
  string: [0.64, 0.08, 0.08],
  comment: [0.0, 0.5, 0.0],
  number: [0.04, 0.53, 0.34],
  punctuation: [0.3, 0.3, 0.3],
  default: [0.15, 0.15, 0.15],
};

// ==================== PDF GENERATOR ====================

function pdfEscape(text: string): string {
  // Escape special PDF string characters and strip non-WinAnsi chars
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x28) out += "\\(";       // (
    else if (c === 0x29) out += "\\)";   // )
    else if (c === 0x5c) out += "\\\\";  // backslash
    else if (c >= 32 && c <= 126) out += text[i];
    else if (c === 9) out += "    ";     // tab -> spaces
    else out += "?";                     // replace non-ASCII
  }
  return out;
}

const FONT_NAMES: Record<string, string> = {
  Helvetica: "F1",
  "Helvetica-Bold": "F2",
  "Helvetica-Oblique": "F3",
  "Helvetica-BoldOblique": "F4",
  Courier: "F5",
  "Courier-Bold": "F6",
};

// Page constants
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 72;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const TOP_Y = PAGE_H - MARGIN;
const BOTTOM_Y = MARGIN;

class PdfBuilder {
  private objects = new Map<number, string>();
  private nextId = 1;
  private pages: { pageId: number; streamId: number }[] = [];

  // Layout state
  private y = TOP_Y;
  private stream = "";
  private currentFont = "";
  private currentSize = 0;
  private currentColor: [number, number, number] = [0, 0, 0];

  allocId(): number {
    return this.nextId++;
  }

  // Pre-allocate fixed objects
  private catalogId = 0;
  private pagesId = 0;
  private fontIds: Record<string, number> = {};

  constructor() {
    this.catalogId = this.allocId(); // 1
    this.pagesId = this.allocId();   // 2
    // Font objects
    for (const name of Object.keys(FONT_NAMES)) {
      this.fontIds[name] = this.allocId();
    }
  }

  // ---- Stream helpers ----

  private setFont(font: string, size: number): void {
    if (font !== this.currentFont || size !== this.currentSize) {
      this.stream += `/${FONT_NAMES[font]} ${size} Tf\n`;
      this.currentFont = font;
      this.currentSize = size;
    }
  }

  private setColor(r: number, g: number, b: number): void {
    if (r !== this.currentColor[0] || g !== this.currentColor[1] || b !== this.currentColor[2]) {
      this.stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
      this.currentColor = [r, g, b];
    }
  }

  private moveTo(x: number, y: number): void {
    this.stream += `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm\n`;
  }

  private showText(text: string): void {
    this.stream += `(${pdfEscape(text)}) Tj\n`;
  }

  private drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
    this.stream += `q\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
    this.stream += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re\nf\nQ\n`;
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, width = 0.5): void {
    this.stream += `q\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n${width} w\n`;
    this.stream += `${x1.toFixed(2)} ${y1.toFixed(2)} m\n${x2.toFixed(2)} ${y2.toFixed(2)} l\nS\nQ\n`;
  }

  private ensureSpace(height: number): void {
    if (this.y - height < BOTTOM_Y) {
      this.finishPage();
      this.startPage();
    }
  }

  private startPage(): void {
    this.stream = "";
    this.y = TOP_Y;
    this.currentFont = "";
    this.currentSize = 0;
    this.currentColor = [0, 0, 0];
  }

  private finishPage(): void {
    const streamId = this.allocId();
    const pageId = this.allocId();
    this.pages.push({ pageId, streamId });

    const fontEntries = Object.entries(FONT_NAMES)
      .map(([name, label]) => `/${label} ${this.fontIds[name]} 0 R`)
      .join(" ");

    this.objects.set(
      streamId,
      `<< /Length ${this.stream.length} >>\nstream\n${this.stream}\nendstream`
    );
    this.objects.set(
      pageId,
      `<< /Type /Page /Parent ${this.pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${streamId} 0 R /Resources << /Font << ${fontEntries} >> >> >>`
    );
  }

  // ---- Text wrapping ----

  private wrapRuns(runs: StyledRun[], maxWidth: number): WrappedLine[] {
    // Split runs into word-level pieces
    const pieces: StyledRun[] = [];
    for (const run of runs) {
      const parts = run.text.split(/( +)/);
      for (const part of parts) {
        if (part !== "") {
          pieces.push({ ...run, text: part });
        }
      }
    }

    const lines: WrappedLine[] = [];
    let lineRuns: StyledRun[] = [];
    let lineW = 0;

    for (const piece of pieces) {
      const pw = measureText(piece.text, piece.font, piece.size);
      if (lineW + pw > maxWidth && lineRuns.length > 0 && piece.text.trim() !== "") {
        lines.push({ runs: lineRuns, width: lineW });
        lineRuns = [];
        lineW = 0;
        if (piece.text.trim() === "") continue; // skip leading space on new line
      }
      lineRuns.push(piece);
      lineW += pw;
    }
    if (lineRuns.length > 0) {
      lines.push({ runs: lineRuns, width: lineW });
    }
    return lines;
  }

  private renderWrappedLines(lines: WrappedLine[], x: number, lineHeight: number): void {
    this.stream += "BT\n";
    for (const line of lines) {
      this.moveTo(x, this.y);
      for (const run of line.runs) {
        this.setFont(run.font, run.size);
        this.setColor(...run.color);
        this.showText(run.text);
      }
      this.y -= lineHeight;
    }
    this.stream += "ET\n";
  }

  // ---- Inline -> StyledRun conversion ----

  private inlinesToRuns(inlines: InlineNode[], fontSize: number): StyledRun[] {
    const runs: StyledRun[] = [];
    for (const n of inlines) {
      switch (n.type) {
        case "text":
          runs.push({ text: n.content, font: "Helvetica", size: fontSize, color: [0, 0, 0] });
          break;
        case "bold":
          runs.push({ text: n.content, font: "Helvetica-Bold", size: fontSize, color: [0, 0, 0] });
          break;
        case "italic":
          runs.push({ text: n.content, font: "Helvetica-Oblique", size: fontSize, color: [0, 0, 0] });
          break;
        case "bold_italic":
          runs.push({ text: n.content, font: "Helvetica-BoldOblique", size: fontSize, color: [0, 0, 0] });
          break;
        case "code":
          runs.push({ text: n.content, font: "Courier", size: fontSize - 1, color: [0.8, 0.1, 0.1] });
          break;
        case "link":
          runs.push({ text: n.content, font: "Helvetica", size: fontSize, color: [0, 0, 0.8] });
          break;
      }
    }
    return runs;
  }

  // ---- Block renderers ----

  private renderHeading(block: Extract<Block, { type: "heading" }>): void {
    const sizes = [0, 24, 20, 16, 14, 12, 11]; // h1..h6
    const size = sizes[block.level] || 11;
    const lineHeight = size * 1.5;
    const spaceBefore = size * 0.8;
    const spaceAfter = size * 0.4;

    this.ensureSpace(spaceBefore + lineHeight + spaceAfter);
    this.y -= spaceBefore;

    const runs = block.inlines.map((n): StyledRun => ({
      text: n.content,
      font: "Helvetica-Bold",
      size,
      color: [0, 0, 0],
    }));

    const wrapped = this.wrapRuns(runs, CONTENT_W);
    this.renderWrappedLines(wrapped, MARGIN, lineHeight);
    this.y -= spaceAfter;
  }

  private renderParagraph(block: Extract<Block, { type: "paragraph" }>): void {
    const fontSize = 11;
    const lineHeight = fontSize * 1.5;
    const spaceAfter = fontSize * 0.6;

    const runs = this.inlinesToRuns(block.inlines, fontSize);
    const wrapped = this.wrapRuns(runs, CONTENT_W);

    this.ensureSpace(lineHeight);
    this.renderWrappedLines(wrapped, MARGIN, lineHeight);
    this.y -= spaceAfter;
  }

  private renderCodeBlock(block: Extract<Block, { type: "code_block" }>): void {
    const fontSize = 9;
    const lineHeight = fontSize * 1.4;
    const padding = 8;
    const codeLines = block.content.split("\n");
    const blockHeight = codeLines.length * lineHeight + padding * 2;

    this.ensureSpace(Math.min(blockHeight, TOP_Y - BOTTOM_Y));

    // Background
    const bgTop = this.y + fontSize * 0.3;
    this.drawRect(MARGIN - 4, bgTop - blockHeight, CONTENT_W + 8, blockHeight, 0.95, 0.95, 0.95);

    // Highlight and render
    const tokens = highlightCode(block.content, block.language);
    this.y -= padding;
    this.stream += "BT\n";

    let x = MARGIN;
    this.moveTo(x, this.y);
    this.setFont("Courier", fontSize);

    for (const token of tokens) {
      if (token.text === "\n") {
        this.y -= lineHeight;
        if (this.y < BOTTOM_Y) {
          this.stream += "ET\n";
          this.finishPage();
          this.startPage();
          // Continue background on new page
          const remainingLines = codeLines.length; // simplified
          this.drawRect(MARGIN - 4, BOTTOM_Y, CONTENT_W + 8, TOP_Y - BOTTOM_Y, 0.95, 0.95, 0.95);
          this.stream += "BT\n";
        }
        this.moveTo(MARGIN, this.y);
        continue;
      }
      const col = TOKEN_COLORS[token.tokenType] || TOKEN_COLORS["default"];
      this.setColor(...col);
      this.setFont(token.tokenType === "keyword" ? "Courier-Bold" : "Courier", fontSize);
      this.showText(token.text);
    }

    this.stream += "ET\n";
    this.y -= padding + lineHeight * 0.5;
  }

  private renderBlockquote(block: Extract<Block, { type: "blockquote" }>): void {
    const indentX = MARGIN + 16;
    const barX = MARGIN + 4;
    const startY = this.y;

    // Render inner blocks with indent (simplified: just render as paragraphs)
    for (const inner of block.blocks) {
      if (inner.type === "paragraph") {
        const fontSize = 11;
        const lineHeight = fontSize * 1.5;
        const runs = this.inlinesToRuns(inner.inlines, fontSize).map((r) => ({
          ...r,
          color: [0.35, 0.35, 0.35] as [number, number, number],
        }));
        const wrapped = this.wrapRuns(runs, CONTENT_W - 20);
        this.ensureSpace(lineHeight);
        this.renderWrappedLines(wrapped, indentX, lineHeight);
        this.y -= fontSize * 0.4;
      } else {
        this.renderBlock(inner);
      }
    }

    const endY = this.y;
    // Draw left border bar
    this.drawLine(barX, startY, barX, endY + 4, 0.7, 0.7, 0.7, 2);
    this.y -= 6;
  }

  private renderList(items: InlineNode[][], ordered: boolean): void {
    const fontSize = 11;
    const lineHeight = fontSize * 1.5;
    const bulletIndent = 20;

    for (let idx = 0; idx < items.length; idx++) {
      const bullet = ordered ? `${idx + 1}.` : "\u2022";
      const bulletRun: StyledRun = {
        text: bullet + " ",
        font: "Helvetica",
        size: fontSize,
        color: [0, 0, 0],
      };
      const bulletWidth = measureText(bulletRun.text, bulletRun.font, bulletRun.size);
      const runs = this.inlinesToRuns(items[idx], fontSize);
      const wrapped = this.wrapRuns(runs, CONTENT_W - bulletIndent);

      this.ensureSpace(lineHeight);

      // Render bullet
      this.stream += "BT\n";
      this.moveTo(MARGIN, this.y);
      this.setFont(bulletRun.font, bulletRun.size);
      this.setColor(0, 0, 0);
      // Use octal 225 for bullet in WinAnsi, or just use the dash
      this.showText(ordered ? `${idx + 1}.` : "-");
      this.stream += "ET\n";

      // Render item text
      if (wrapped.length > 0) {
        this.stream += "BT\n";
        for (const line of wrapped) {
          this.moveTo(MARGIN + bulletIndent, this.y);
          for (const run of line.runs) {
            this.setFont(run.font, run.size);
            this.setColor(...run.color);
            this.showText(run.text);
          }
          this.y -= lineHeight;
        }
        this.stream += "ET\n";
      }
    }
    this.y -= 6;
  }

  private renderHorizontalRule(): void {
    this.ensureSpace(20);
    this.y -= 10;
    this.drawLine(MARGIN, this.y, PAGE_W - MARGIN, this.y, 0.75, 0.75, 0.75, 0.5);
    this.y -= 10;
  }

  private renderTable(block: Extract<Block, { type: "table" }>): void {
    const fontSize = 10;
    const lineHeight = fontSize * 1.6;
    const cellPadding = 6;
    const numCols = block.headers.length;
    const colWidth = CONTENT_W / numCols;
    const totalRows = 1 + block.rows.length;
    const tableHeight = totalRows * lineHeight + cellPadding;

    this.ensureSpace(lineHeight * 2);

    // Header row
    const headerY = this.y;
    this.drawRect(MARGIN, headerY - lineHeight, CONTENT_W, lineHeight, 0.92, 0.92, 0.92);

    this.stream += "BT\n";
    for (let c = 0; c < numCols; c++) {
      const cellX = MARGIN + c * colWidth + cellPadding;
      this.moveTo(cellX, headerY - lineHeight + cellPadding);
      this.setFont("Helvetica-Bold", fontSize);
      this.setColor(0, 0, 0);
      const text = block.headers[c] || "";
      this.showText(text.substring(0, Math.floor((colWidth - cellPadding * 2) / (fontSize * 0.5))));
    }
    this.stream += "ET\n";
    this.y -= lineHeight;

    // Draw header bottom line
    this.drawLine(MARGIN, this.y, PAGE_W - MARGIN, this.y, 0.6, 0.6, 0.6, 0.75);

    // Data rows
    for (const row of block.rows) {
      this.ensureSpace(lineHeight);
      this.stream += "BT\n";
      for (let c = 0; c < numCols; c++) {
        const cellX = MARGIN + c * colWidth + cellPadding;
        this.moveTo(cellX, this.y - lineHeight + cellPadding);
        this.setFont("Helvetica", fontSize);
        this.setColor(0.1, 0.1, 0.1);
        const text = (row[c] || "").substring(0, Math.floor((colWidth - cellPadding * 2) / (fontSize * 0.45)));
        this.showText(text);
      }
      this.stream += "ET\n";
      this.y -= lineHeight;
      this.drawLine(MARGIN, this.y, PAGE_W - MARGIN, this.y, 0.85, 0.85, 0.85, 0.25);
    }
    this.y -= 10;
  }

  private renderBlock(block: Block): void {
    switch (block.type) {
      case "heading":
        this.renderHeading(block);
        break;
      case "paragraph":
        this.renderParagraph(block);
        break;
      case "code_block":
        this.renderCodeBlock(block);
        break;
      case "blockquote":
        this.renderBlockquote(block);
        break;
      case "unordered_list":
        this.renderList(block.items, false);
        break;
      case "ordered_list":
        this.renderList(block.items, true);
        break;
      case "horizontal_rule":
        this.renderHorizontalRule();
        break;
      case "table":
        this.renderTable(block);
        break;
    }
  }

  // ---- Main build ----

  build(blocks: Block[]): Buffer {
    this.startPage();

    for (const block of blocks) {
      this.renderBlock(block);
    }

    this.finishPage();

    // Catalog
    this.objects.set(this.catalogId, `<< /Type /Catalog /Pages ${this.pagesId} 0 R >>`);

    // Font objects
    for (const [name, id] of Object.entries(this.fontIds)) {
      this.objects.set(id, `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`);
    }

    // Pages object
    const kids = this.pages.map((p) => `${p.pageId} 0 R`).join(" ");
    this.objects.set(this.pagesId, `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`);

    // Assemble PDF
    const header = "%PDF-1.4\n%\xC0\xC1\xC2\xC3\n";
    const offsets = new Map<number, number>();
    let body = "";

    for (let id = 1; id < this.nextId; id++) {
      const content = this.objects.get(id);
      if (!content) continue;
      offsets.set(id, Buffer.byteLength(header, "latin1") + Buffer.byteLength(body, "latin1"));
      body += `${id} 0 obj\n${content}\nendobj\n\n`;
    }

    const xrefOffset = Buffer.byteLength(header, "latin1") + Buffer.byteLength(body, "latin1");
    let xref = `xref\n0 ${this.nextId}\n`;
    xref += "0000000000 65535 f \r\n";
    for (let id = 1; id < this.nextId; id++) {
      const off = offsets.get(id) ?? 0;
      xref += `${String(off).padStart(10, "0")} 00000 n \r\n`;
    }

    const trailer =
      `trailer\n<< /Size ${this.nextId} /Root ${this.catalogId} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(header + body + xref + trailer, "latin1");
  }
}

// ==================== CLI ====================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`md2pdf - Zero-dependency Markdown to PDF converter

Usage: npx tsx md2pdf.ts <input.md> [-o output.pdf]

Options:
  -o, --output  Output PDF file path (default: input with .pdf extension)
  -h, --help    Show this help message`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputPath = resolve(args[0]);
  let outputPath: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if ((args[i] === "-o" || args[i] === "--output") && args[i + 1]) {
      outputPath = resolve(args[i + 1]);
      i++;
    }
  }

  if (!outputPath) {
    const base = basename(inputPath, extname(inputPath));
    outputPath = resolve(base + ".pdf");
  }

  let source: string;
  try {
    source = readFileSync(inputPath, "utf-8");
  } catch (e: any) {
    console.error(`Error: Cannot read file "${inputPath}": ${e.message}`);
    process.exit(1);
  }

  const blocks = parseMarkdown(source);
  const pdf = new PdfBuilder();
  const buffer = pdf.build(blocks);

  try {
    writeFileSync(outputPath, buffer);
  } catch (e: any) {
    console.error(`Error: Cannot write file "${outputPath}": ${e.message}`);
    process.exit(1);
  }

  console.log(`Converted ${inputPath} -> ${outputPath} (${blocks.length} blocks, ${buffer.length} bytes)`);
}

main();
