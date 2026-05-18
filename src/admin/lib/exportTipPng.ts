import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import JSZip from "jszip";

export type TipForExport = {
  id: string;
  title: string;
  team1_name?: string | null;
  team2_name?: string | null;
  team1_logo_url?: string | null;
  team2_logo_url?: string | null;
  market?: string | null;
  bet_choice?: string | null;
  odds?: number | null;
  match_date?: string | null;
  result: string;
  feature_required?: string | null;
  addon_required?: string | null;
};

const COLORS = {
  navyDark: "#060D1E",
  navyCard: "#112236",
  green: "#00FF7F",
  white: "#FFFFFF",
  textMuted: "#94A3B8",
};

const FONT_HEADING = "'Barlow Condensed', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatOdd(odd: number | null | undefined): string {
  if (odd == null || isNaN(odd as number)) return "—";
  return (odd as number).toFixed(2);
}

async function waitForRender(): Promise<void> {
  try { await (document as any).fonts?.ready; } catch {}
  await new Promise((r) => setTimeout(r, 350));
}

async function captureNode(
  node: HTMLElement,
  width: number,
  height: number,
  transparent: boolean
): Promise<Blob> {
  await waitForRender();
  const dataUrl = await toPng(node, {
    width,
    height,
    pixelRatio: 2,
    backgroundColor: transparent ? undefined : COLORS.navyDark,
    cacheBust: true,
    skipFonts: false,
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

/** Selo GREEN compartilhado */
function renderGreenBadge(odd: number | null | undefined): string {
  return `
    <div style="
      display:inline-flex; align-items:center; gap:14px;
      background:${COLORS.green};
      color:#000;
      padding:14px 28px;
      border-radius:999px;
      font-family:${FONT_HEADING};
      font-weight:900;
      box-shadow:0 0 40px rgba(0,255,127,0.5);
    ">
      <span style="font-size:38px; line-height:1;">✓</span>
      <span style="font-size:42px; letter-spacing:2px;">GREEN</span>
      <span style="font-size:32px; opacity:0.85;">@${formatOdd(odd)}</span>
    </div>
  `;
}

function renderTeam(name: string | null | undefined, logo: string | null | undefined): string {
  const safeName = escapeHtml(name ?? "");
  const logoHtml = logo
    ? `<img src="${escapeHtml(logo)}" crossorigin="anonymous" style="width:120px;height:120px;object-fit:contain;" />`
    : `<div style="width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);"></div>`;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;flex:1;">
      <div style="width:140px;height:140px;border-radius:50%;border:3px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;">
        ${logoHtml}
      </div>
      <div style="font-family:${FONT_HEADING};font-weight:700;font-size:34px;color:${COLORS.white};text-align:center;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${safeName}
      </div>
    </div>
  `;
}

/** Card visual padronizado (largura fixa 920px) */
function renderCard(tip: TipForExport): string {
  const market = escapeHtml(tip.market ?? "");
  const choice = escapeHtml(tip.bet_choice ?? "");
  const odd = formatOdd(tip.odds);
  const matchDate = escapeHtml(tip.match_date ?? "");

  return `
    <div style="
      width:920px;
      background:linear-gradient(135deg, rgba(0,255,127,0.08) 0%, transparent 60%), ${COLORS.navyDark};
      border:3px solid ${COLORS.green};
      border-radius:32px;
      box-shadow:0 0 60px rgba(0,255,127,0.25);
      padding:40px 48px;
      font-family:${FONT_BODY};
      color:${COLORS.white};
      display:flex;flex-direction:column;gap:28px;
      box-sizing:border-box;
    ">
      <!-- Top: badge tier + match date -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="background:rgba(0,255,127,0.18);border:2px solid rgba(0,255,127,0.5);color:${COLORS.green};font-family:${FONT_HEADING};font-weight:900;font-size:22px;letter-spacing:2px;padding:6px 18px;border-radius:10px;">
          PREMIER FC
        </div>
        <div style="font-family:${FONT_HEADING};font-weight:700;font-size:28px;color:${COLORS.white};">
          ${matchDate || "&nbsp;"}
        </div>
      </div>

      <!-- Teams -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;">
        ${renderTeam(tip.team1_name, tip.team1_logo_url)}
        <div style="font-family:${FONT_HEADING};font-weight:700;font-size:36px;color:${COLORS.textMuted};">VS</div>
        ${renderTeam(tip.team2_name, tip.team2_logo_url)}
      </div>

      <!-- Market -->
      ${market ? `<div style="text-align:center;font-family:${FONT_BODY};font-size:22px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:1.5px;">${market}</div>` : ""}

      <!-- Choice + Odd -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;border-top:2px solid rgba(255,255,255,0.08);padding-top:24px;">
        <div style="font-family:${FONT_HEADING};font-weight:800;font-size:42px;color:${COLORS.white};line-height:1.1;flex:1;">
          ${choice}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;">
          <div style="font-family:${FONT_BODY};font-size:18px;color:${COLORS.textMuted};">Odd</div>
          <div style="font-family:${FONT_HEADING};font-weight:900;font-size:78px;color:${COLORS.green};line-height:1;">
            ${odd}
          </div>
        </div>
      </div>
    </div>
  `;
}

/** STORY 1080×1920 */
function renderStoryHTML(tip: TipForExport): string {
  return `
    <div style="
      width:1080px;height:1920px;
      background:radial-gradient(circle at 50% 20%, rgba(0,255,127,0.15) 0%, transparent 55%), linear-gradient(180deg, #050913 0%, ${COLORS.navyDark} 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:80px 60px;
      box-sizing:border-box;
      gap:60px;
      font-family:${FONT_BODY};
    ">
      <div style="display:flex;flex-direction:column;align-items:center;gap:24px;">
        ${renderGreenBadge(tip.odds)}
        <div style="font-family:${FONT_HEADING};font-weight:700;font-size:34px;color:${COLORS.white};letter-spacing:3px;text-transform:uppercase;opacity:0.85;">
          Mais um acerto
        </div>
      </div>
      ${renderCard(tip)}
      <div style="font-family:${FONT_HEADING};font-weight:900;font-size:38px;color:${COLORS.green};letter-spacing:4px;text-transform:uppercase;">
        PREMIERFCAPP.COM
      </div>
    </div>
  `;
}

/** CUTOUT — card + selo, fundo transparente, ~1080x1100 */
function renderCutoutHTML(tip: TipForExport): string {
  return `
    <div style="
      width:1080px;
      display:flex;flex-direction:column;align-items:center;gap:40px;
      padding:40px 60px;
      box-sizing:border-box;
      font-family:${FONT_BODY};
    ">
      ${renderGreenBadge(tip.odds)}
      ${renderCard(tip)}
    </div>
  `;
}

export async function exportTipAsPngs(
  tip: TipForExport
): Promise<{ story: Blob; cutout: Blob }> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  try {
    const storyWrap = document.createElement("div");
    storyWrap.innerHTML = renderStoryHTML(tip);
    container.appendChild(storyWrap);
    const storyBlob = await captureNode(storyWrap.firstElementChild as HTMLElement, 1080, 1920, false);

    const cutWrap = document.createElement("div");
    cutWrap.innerHTML = renderCutoutHTML(tip);
    container.appendChild(cutWrap);
    const cutoutEl = cutWrap.firstElementChild as HTMLElement;
    // Allow natural height
    const rect = cutoutEl.getBoundingClientRect();
    const cutoutBlob = await captureNode(cutoutEl, 1080, Math.max(800, Math.ceil(rect.height)), true);

    return { story: storyBlob, cutout: cutoutBlob };
  } finally {
    document.body.removeChild(container);
  }
}

function safeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
}

export async function downloadSingleTipPngs(tip: TipForExport): Promise<void> {
  const { story, cutout } = await exportTipAsPngs(tip);
  const name = safeFileName(tip.title || tip.id);
  saveAs(story, `${name}_story.png`);
  saveAs(cutout, `${name}_recortado.png`);
}

export async function exportGreensAsZip(tips: TipForExport[], dateLabel: string): Promise<void> {
  if (tips.length === 0) return;
  const zip = new JSZip();
  const folder = zip.folder("greens") ?? zip;
  for (const tip of tips) {
    try {
      const { story, cutout } = await exportTipAsPngs(tip);
      const name = safeFileName(tip.title || tip.id);
      folder.file(`${name}_story.png`, story);
      folder.file(`${name}_recortado.png`, cutout);
    } catch (e) {
      console.error("[exportGreens] failed for tip", tip.id, e);
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const safeDate = dateLabel.replace(/[^0-9-]/g, "_");
  saveAs(blob, `greens_${safeDate}.zip`);
}
