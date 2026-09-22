<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';

  let {
    bytes = null,
    filePath = ''
  } = $props<{
    bytes: Uint8Array | null;
    filePath?: string;
  }>();

  let canvasEl: HTMLCanvasElement | null = $state(null);
  let viewportContainer: HTMLDivElement | null = $state(null);
  let loading = $state(true);
  let errorMsg = $state<string | null>(null);

  let pdfDoc: any = null;
  let currentPage = $state(1);
  let totalPages = $state(0);
  let scale = $state(1.0);
  let rotation = $state(0);
  let renderTask: any = null;

  async function initPdf() {
    if (!bytes || bytes.length === 0) {
      loading = false;
      return;
    }

    loading = true;
    errorMsg = null;

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      // Copy bytes to Uint8Array to avoid detached buffer issues
      const dataCopy = new Uint8Array(bytes);
      const loadingTask = pdfjsLib.getDocument({
        data: dataCopy,
        cMapPacked: true
      });

      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;

      // Auto-fit initial scale based on container width
      if (viewportContainer) {
        try {
          const firstPage = await pdfDoc.getPage(1);
          const unscaledVp = firstPage.getViewport({ scale: 1.0, rotation: 0 });
          const availableW = viewportContainer.clientWidth - 48;
          if (availableW > 200 && unscaledVp.width > 0) {
            scale = Math.max(0.3, Math.min(2.0, Math.round((availableW / unscaledVp.width) * 100) / 100));
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('PDF.js loading error:', err);
      errorMsg = (err as Error).message || 'Failed to load PDF document';
    } finally {
      loading = false;
    }

    // Await Svelte DOM update so canvasEl is mounted
    await tick();
    await renderCurrentPage();
  }

  async function renderCurrentPage() {
    if (!pdfDoc || !canvasEl) return;

    if (renderTask) {
      try {
        renderTask.cancel();
      } catch (e) {}
      renderTask = null;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.floor(viewport.width * dpr);
      canvasEl.height = Math.floor(viewport.height * dpr);
      canvasEl.style.width = `${Math.floor(viewport.width)}px`;
      canvasEl.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      renderTask = page.render({
        canvasContext: ctx,
        viewport
      });

      await renderTask.promise;
      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    }
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  }

  function handlePageInput(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      currentPage = val;
      renderCurrentPage();
    }
  }

  function zoomIn() {
    if (scale < 3.0) {
      scale = Math.round((scale + 0.2) * 10) / 10;
      renderCurrentPage();
    }
  }

  function zoomOut() {
    if (scale > 0.4) {
      scale = Math.round((scale - 0.2) * 10) / 10;
      renderCurrentPage();
    }
  }

  function resetZoom() {
    scale = 1.0;
    renderCurrentPage();
  }

  async function fitWidth() {
    if (!viewportContainer || !pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledVp = page.getViewport({ scale: 1.0, rotation });
      const availableWidth = viewportContainer.clientWidth - 48;
      scale = Math.max(0.2, Math.round((availableWidth / unscaledVp.width) * 100) / 100);
      await renderCurrentPage();
    } catch (e) {}
  }

  async function fitPage() {
    if (!viewportContainer || !pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledVp = page.getViewport({ scale: 1.0, rotation });
      const availableHeight = viewportContainer.clientHeight - 48;
      scale = Math.max(0.2, Math.round((availableHeight / unscaledVp.height) * 100) / 100);
      await renderCurrentPage();
    } catch (e) {}
  }

  function rotateClockwise() {
    rotation = (rotation + 90) % 360;
    renderCurrentPage();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      goToNextPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goToPrevPage();
    }
  }

  $effect(() => {
    if (bytes) {
      initPdf();
    }
  });

  onDestroy(() => {
    if (renderTask) {
      try {
        renderTask.cancel();
      } catch (e) {}
    }
    if (pdfDoc) {
      try {
        pdfDoc.destroy();
      } catch (e) {}
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="pdf-container">
  <!-- Toolbar -->
  <div class="pdf-toolbar">
    <div class="toolbar-group">
      <button
        class="tool-btn"
        disabled={currentPage <= 1 || loading}
        onclick={goToPrevPage}
        title="Previous Page (Left Arrow)"
      >
        ◀ Prev
      </button>
      <div class="page-indicator">
        <span>Page</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={currentPage}
          onchange={handlePageInput}
          class="page-input"
        />
        <span>of {totalPages || 1}</span>
      </div>
      <button
        class="tool-btn"
        disabled={currentPage >= totalPages || loading}
        onclick={goToNextPage}
        title="Next Page (Right Arrow)"
      >
        Next ▶
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="tool-btn" onclick={zoomOut} title="Zoom Out" disabled={loading}>
        🔍-
      </button>
      <span class="zoom-text">{Math.round(scale * 100)}%</span>
      <button class="tool-btn" onclick={zoomIn} title="Zoom In" disabled={loading}>
        🔍+
      </button>
      <button class="tool-btn text-btn" onclick={fitWidth} title="Fit Width">
        Fit Width
      </button>
      <button class="tool-btn text-btn" onclick={fitPage} title="Fit Page">
        Fit Page
      </button>
      <button class="tool-btn text-btn" onclick={resetZoom} title="Reset 100%">
        100%
      </button>
      <button class="tool-btn" onclick={rotateClockwise} title="Rotate Clockwise" disabled={loading}>
        🔄
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group doc-info">
      <span class="doc-badge">PDF 100% OFFLINE</span>
    </div>
  </div>

  <!-- Main View Area -->
  <div class="pdf-viewport" bind:this={viewportContainer}>
    {#if loading}
      <div class="center-message">
        <div class="spinner"></div>
        <span>Rendering PDF Document...</span>
      </div>
    {/if}

    {#if errorMsg}
      <div class="error-box">
        <h3>Unable to display PDF</h3>
        <p>{errorMsg}</p>
      </div>
    {/if}

    <div class="canvas-wrapper" style:display={loading || errorMsg ? 'none' : 'inline-block'}>
      <canvas bind:this={canvasEl} class="pdf-canvas"></canvas>
    </div>
  </div>
</div>

<style>
  .pdf-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-color, #090d16);
    color: var(--text-color, #f8fafc);
    overflow: hidden;
  }

  .pdf-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--surface-bg, #0f172a);
    border-bottom: 1px solid var(--border-color, #1e293b);
    user-select: none;
    flex-wrap: wrap;
    z-index: 5;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-divider {
    width: 1px;
    height: 18px;
    background: var(--border-color, #334155);
    margin: 0 4px;
  }

  .tool-btn {
    background: var(--surface-secondary, #1e293b);
    color: var(--text-color, #e2e8f0);
    border: 1px solid var(--border-color, #334155);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .tool-btn:hover:not(:disabled) {
    background: #38bdf8;
    color: #0f172a;
    border-color: #38bdf8;
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .text-btn {
    font-size: 11px;
  }

  .page-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--status-text, #94a3b8);
  }

  .page-input {
    width: 44px;
    text-align: center;
    background: var(--surface-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    color: var(--text-color, #f8fafc);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
  }

  .page-input:focus {
    border-color: #38bdf8;
  }

  .zoom-text {
    font-size: 11px;
    font-weight: 700;
    color: var(--status-text, #94a3b8);
    min-width: 42px;
    text-align: center;
  }

  .doc-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .doc-info {
    margin-left: auto;
  }

  .pdf-viewport {
    flex: 1;
    overflow: auto;
    text-align: center;
    padding: 24px;
    background: #1e293b;
    position: relative;
  }

  .canvas-wrapper {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    background: #ffffff;
    overflow: hidden;
    line-height: 0;
    margin: 0 auto;
  }

  .pdf-canvas {
    display: block;
  }

  .center-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 14px;
    color: #e2e8f0;
    font-size: 13px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-box {
    margin: 40px auto;
    padding: 20px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #f87171;
    max-width: 500px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
