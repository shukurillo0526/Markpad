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
    .doc-layout {
      width: 100%;
      max-width: 850px;
      margin: 0 auto;
      border-collapse: collapse;
      border: none;
    }
    .doc-layout td {
      padding: 0;
      border: none;
    }
    .doc-header-space, .doc-footer-space {
      display: none;
    }
    .screen-footer {
      max-width: 850px;
      margin: 60px auto 0 auto;
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
      .screen-footer {
        display: none !important;
      }
      .doc-layout {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border: none !important;
      }
      .doc-layout td {
        padding: 0 !important;
        border: none !important;
      }
      .doc-layout > thead {
        display: table-header-group !important;
      }
      .doc-layout > tfoot {
        display: table-footer-group !important;
      }
      .doc-header-space {
        display: block !important;
        padding: 12mm 18mm 4mm 18mm !important;
      }
      .doc-footer-space {
        display: block !important;
        padding: 4mm 18mm 10mm 18mm !important;
      }
      .doc-content {
        display: block !important;
        padding: 0 18mm !important;
        box-sizing: border-box !important;
      }
      .print-doc-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 1.5px solid #0f172a !important;
        padding-bottom: 6px !important;
        margin-bottom: 6px !important;
        font-size: 11px !important;
        color: #475569 !important;
        font-weight: 600 !important;
        letter-spacing: 0.5px !important;
      }
      .print-doc-header .brand {
        color: #0284c7 !important;
        font-weight: 800 !important;
      }
      .print-doc-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-top: 1px solid #cbd5e1 !important;
        padding-top: 6px !important;
        margin-top: 4px !important;
        font-size: 10px !important;
        color: #94a3b8 !important;
      }
      pre {
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
        color: #0f172a !important;
        white-space: pre-wrap !important;
        word-break: break-all !important;
        overflow: visible !important;
        overflow-x: visible !important;
        overflow-y: visible !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
        margin: 0 0 16px 0 !important;
        padding: 12px 14px !important;
        border-radius: 6px !important;
        font-size: 9pt !important;
        line-height: 1.5 !important;
      }
      code {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        font-family: 'JetBrains Mono', Consolas, monospace !important;
        white-space: pre-wrap !important;
        word-break: break-all !important;
      }
      table:not(.doc-layout) {
        width: 100% !important;
        border-collapse: collapse !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
        margin: 16px 0 !important;
      }
      table:not(.doc-layout) tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      table:not(.doc-layout) th, table:not(.doc-layout) td {
        border: 1px solid #cbd5e1 !important;
        padding: 8px 10px !important;
      }
      table:not(.doc-layout) th {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }
      h1, h2, h3, h4, h5, h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
        color: #0f172a !important;
      }
    }
  </style>
</head>
<body>
  <table class="doc-layout">
    <thead>
      <tr>
        <td>
          <div class="doc-header-space">
            <div class="print-doc-header">
              <span class="brand">MARKPAD NATIVE</span>
              <span>${escapeHtml(title)}</span>
            </div>
          </div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="doc-content">
            ${htmlContent}
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td>
          <div class="doc-footer-space">
            <div class="print-doc-footer">
              <span>Published with Vodiy Markpad Native</span>
              <span>Enterprise Offline Document</span>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  </table>
  <footer class="screen-footer">
    Exported with <strong>Markpad Native v2.0</strong> &bull; Published by Vodiy
  </footer>
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
