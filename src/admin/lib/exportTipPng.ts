import React, { createRef } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { GreenStoryExport } from "@/admin/components/GreenStoryExport";
import { GreenHorizontalExport } from "@/admin/components/GreenHorizontalExport";
import { GreenCompactExport } from "@/admin/components/GreenCompactExport";
import premierLogo from "@/assets/premier-logo-new.png";


export type TipForExport = {
  id: string;
  title: string;
  team1_name?: string | null;
  team2_name?: string | null;
  team1_logo_url?: string | null;
  team2_logo_url?: string | null;
  team1_shirt_variant?: string | null;
  team1_primary_color?: string | null;
  team1_secondary_color?: string | null;
  team2_shirt_variant?: string | null;
  team2_primary_color?: string | null;
  team2_secondary_color?: string | null;
  market?: string | null;
  bet_choice?: string | null;
  odds?: number | null;
  match_date?: string | null;
  result: string;
  tier_required?: string | null;
  feature_required?: string | null;
  addon_required?: string | null;
};

async function waitForRender(): Promise<void> {
  try { await (document as any).fonts?.ready; } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

type ExportFormat = "story" | "horizontal";

const FORMAT_DIMS: Record<ExportFormat, { width: number; height: number; component: any }> = {
  story:      { width: 1080, height: 1920, component: GreenStoryExport },
  horizontal: { width: 1080, height: 540,  component: GreenHorizontalExport },
};

async function generateBlob(tip: TipForExport, format: ExportFormat): Promise<Blob> {
  const { width, height, component } = FORMAT_DIMS[format];
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  const root = createRoot(container);
  const targetRef = createRef<HTMLDivElement>();

  try {
    await new Promise<void>((resolve) => {
      root.render(React.createElement(component, { tip, ref: targetRef }));
      requestAnimationFrame(() => resolve());
    });

    await waitForRender();

    if (!targetRef.current) throw new Error("Export ref not attached");

    const dataUrl = await toPng(targetRef.current, {
      width,
      height,
      pixelRatio: 1,
      backgroundColor: "#060D1E",
      cacheBust: true,
      skipFonts: false,
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  } finally {
    try { root.unmount(); } catch {}
    if (container.parentNode) document.body.removeChild(container);
  }
}

export async function downloadStoryPng(tip: TipForExport): Promise<Blob> {
  return generateBlob(tip, "story");
}

export async function downloadHorizontalPng(tip: TipForExport): Promise<Blob> {
  return generateBlob(tip, "horizontal");
}

// Legacy alias (kept in case anything still imports it)
export async function generateGreenStoryBlob(tip: TipForExport): Promise<Blob> {
  return downloadStoryPng(tip);
}

function safeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
}

export function tipFileName(tip: TipForExport, format: ExportFormat = "story"): string {
  const t1 = safeFileName(tip.team1_name || "time1");
  const t2 = safeFileName(tip.team2_name || "time2");
  const date = (tip.match_date || "").replace(/[^0-9-]/g, "_") || "tip";
  return `tip-${format}-${date}-${t1}-vs-${t2}.png`;
}

export async function downloadSingleTipPng(tip: TipForExport, format: ExportFormat = "story"): Promise<void> {
  const blob = await generateBlob(tip, format);
  saveAs(blob, tipFileName(tip, format));
}

// ZIP batch — story only (per spec, to keep size/time reasonable)
export async function exportGreensAsZip(tips: TipForExport[], dateLabel: string): Promise<void> {
  if (tips.length === 0) return;
  const zip = new JSZip();
  const folder = zip.folder("greens") ?? zip;
  for (const tip of tips) {
    try {
      const blob = await downloadStoryPng(tip);
      folder.file(tipFileName(tip, "story"), blob);
    } catch (e) {
      console.error("[exportGreens] failed for tip", tip.id, e);
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const safeDate = dateLabel.replace(/[^0-9-]/g, "_");
  saveAs(blob, `greens_${safeDate}.zip`);
}

// Multi-page story export: 1080×1920 per page, ~CARDS_PER_STORY compact cards per page.
export async function exportGreensSingleImage(
  greens: TipForExport[],
  dateLabel: string,
): Promise<void> {
  if (greens.length === 0) return;

  const CARDS_PER_STORY = 4;
  const STORY_W = 1080;
  const STORY_H = 1920;
  const HEADER_H = 140;
  const PADDING_X = 32;
  const PADDING_TOP = 24;
  const PADDING_BOTTOM = 40;

  // Format date as DD/MM
  let headerDate = dateLabel;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateLabel);
  if (m) headerDate = `${m[3]}/${m[2]}`;

  // Split into groups
  const groups: TipForExport[][] = [];
  for (let i = 0; i < greens.length; i += CARDS_PER_STORY) {
    groups.push(greens.slice(i, i + CARDS_PER_STORY));
  }
  const totalPages = groups.length;
  const safeDate = dateLabel.replace(/[^0-9-]/g, "_");

  for (let pageIdx = 0; pageIdx < groups.length; pageIdx++) {
    const group = groups[pageIdx];
    const pageLabel = totalPages > 1 ? ` — ${pageIdx + 1}/${totalPages}` : "";

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = "-1";
    document.body.appendChild(container);

    const root = createRoot(container);
    const targetRef = createRef<HTMLDivElement>();

    try {
      const headerEl = React.createElement(
        "div",
        {
          key: "header",
          style: {
            width: "100%",
            height: HEADER_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${PADDING_X}px`,
            boxSizing: "border-box",
            color: "#FFFFFF",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            borderBottom: "2px solid rgba(0,255,127,0.4)",
            flexShrink: 0,
          },
        },
        React.createElement("span", { key: "t" }, `GREENS DO DIA — ${headerDate}${pageLabel}`),
        React.createElement("img", {
          key: "logo",
          src: premierLogo,
          crossOrigin: "anonymous",
          style: { height: 80, width: "auto", objectFit: "contain" },
        }),
      );

      const cardEls = group.map((tip, i) =>
        React.createElement(
          "div",
          { key: tip.id || i, style: { width: "100%", display: "flex", justifyContent: "center" } },
          React.createElement(GreenCompactExport, { tip }),
        ),
      );

      const cardsArea = React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "stretch",
            padding: `${PADDING_TOP}px 0 ${PADDING_BOTTOM}px 0`,
            gap: 12,
            overflow: "hidden",
          },
        },
        ...cardEls,
      );

      const tree = React.createElement(
        "div",
        {
          ref: targetRef,
          style: {
            width: STORY_W,
            height: STORY_H,
            background: "#060D1E",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            fontFamily: "'Barlow Condensed', sans-serif",
            overflow: "hidden",
          },
        },
        headerEl,
        cardsArea,
      );

      await new Promise<void>((resolve) => {
        root.render(tree);
        requestAnimationFrame(() => resolve());
      });

      await waitForRender();
      await new Promise((r) => setTimeout(r, 400 + group.length * 30));

      if (!targetRef.current) throw new Error("Export ref not attached");

      const dataUrl = await toPng(targetRef.current, {
        width: STORY_W,
        height: STORY_H,
        pixelRatio: 1,
        backgroundColor: "#060D1E",
        cacheBust: true,
        skipFonts: false,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = totalPages > 1
        ? `greens_${safeDate}_${pageIdx + 1}.png`
        : `greens_${safeDate}.png`;
      saveAs(blob, fileName);
    } finally {
      try { root.unmount(); } catch {}
      if (container.parentNode) document.body.removeChild(container);
    }
  }
}


