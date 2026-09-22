<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    bytes = null,
    filePath = ''
  } = $props<{
    bytes: Uint8Array | null;
    filePath?: string;
  }>();

  let pdfUrl = $state<string | null>(null);

  $effect(() => {
    if (bytes && bytes.length > 0) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      pdfUrl = URL.createObjectURL(blob);
    }
  });

  onDestroy(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  });
</script>

<div class="pdf-viewer-container">
  {#if pdfUrl}
    <iframe
      src={pdfUrl}
      class="pdf-frame"
      title="PDF Document Viewer"
    ></iframe>
  {:else}
    <div class="pdf-loading">
      <div class="loading-spinner"></div>
      <span>Loading PDF Document...</span>
    </div>
  {/if}
</div>

<style>
  .pdf-viewer-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #525659;
    position: relative;
  }

  .pdf-frame {
    width: 100%;
    height: 100%;
    border: none;
    flex: 1;
  }

  .pdf-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: #cbd5e1;
    font-size: 13px;
  }

  .loading-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
