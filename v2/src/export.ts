import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface ExportOptions {
  title: string;
  htmlContent: string;
  isDark?: boolean;
}

/**
 * Escape HTML entities to prevent XSS when injecting user content into HTML templates.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
export function generateStandaloneHtml({ title, htmlContent, isDark = true }: ExportOptions): string {
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markpad Native v2.0 by Vodiy">
  <title>${title} — Markpad Native</title>
  <style>
    body {
      background-color: ${bgColor};
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    h1, h2, h3, h4 {
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 0.3em;
      margin-top: 1.5em;
    }
    pre {
      background-color: ${cardBg};
      padding: 16px;
      border-radius: 8px;
      border: 1px solid ${borderColor};
      overflow-x: auto;
    }
    code {
      background-color: ${cardBg};
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 85%;
    }
    blockquote {
      border-left: 4px solid #38bdf8;
      margin: 0;
      padding-left: 16px;
      color: #94a3b8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid ${borderColor};
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: ${cardBg};
    }
    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid ${borderColor};
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .print-doc-header, .print-doc-footer {
      display: none;
    }
    @page {
      size: auto;
      margin: 0; /* Suppresses Chromium default headers/footers (tauri.localhost, date/time) */
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .container {
        max-width: 100% !important;
        padding: 16mm 20mm !important;
        box-sizing: border-box !important;
      }
      .print-doc-header {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1.5px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 24px;
        font-size: 11px;
        color: #475569;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .print-doc-header .brand {
        color: #0284c7;
        font-weight: 800;
      }
      pre {
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
        color: #0f172a !important;
        page-break-inside: avoid;
        white-space: pre-wrap !important;
        word-break: break-all !important;
      }
      code {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }
      table {
        page-break-inside: avoid;
        border: 1px solid #cbd5e1 !important;
      }
      th {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        border: 1px solid #cbd5e1 !important;
      }
      td {
        border: 1px solid #cbd5e1 !important;
      }
      .print-doc-footer {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #cbd5e1;
        padding-top: 10px;
        margin-top: 36px;
        font-size: 10px;
        color: #94a3b8;
        page-break-inside: avoid;
      }
      footer {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-doc-header">
      <span class="brand">MARKPAD NATIVE</span>
      <span>${escapeHtml(title)}</span>
    </div>
    ${htmlContent}
    <div class="print-doc-footer">
      <span>Published with Vodiy Markpad Native</span>
      <span>Enterprise Offline Document</span>
    </div>
    <footer>
      Exported with <strong>Markpad Native v2.0</strong> &bull; Published by Vodiy
    </footer>
  </div>
</body>
</html>`;
}

export async function exportAsHtml(title: string, htmlContent: string, isDark = true): Promise<boolean> {
  const fullHtml = generateStandaloneHtml({ title, htmlContent, isDark });
  const defaultPath = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;

  try {
    const filePath = await save({
      title: 'Export Standalone HTML',
      defaultPath,
      filters: [{ name: 'HTML Document', extensions: ['html'] }]
    });

    if (filePath) {
      await invoke('save_file_content', { path: filePath, content: fullHtml });
      return true;
    }
  } catch (e) {
    console.error('Failed to export HTML', e);
  }
  return false;
}

export function printToPdf(title: string, htmlContent: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  // Force light mode for PDF export to ensure clean paper-like appearance
  const fullHtml = generateStandaloneHtml({ title, htmlContent, isDark: false });

  doc.open();
  doc.write(fullHtml);
  doc.close();

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  // Use afterprint event for reliable cleanup instead of a fixed timeout
  iframe.contentWindow.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
    // Fallback cleanup if afterprint doesn't fire (e.g., user cancels quickly)
    setTimeout(cleanup, 60000);
  }, 300);
}
