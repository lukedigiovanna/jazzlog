import { escapeHtml } from "./html";
import { renderLayoutToggle } from "./layoutToggle";

export function renderAlbumListHeading(
  title: string,
  count: number,
  layout: string,
  action: string,
  id?: string,
) {
  return /* HTML */ `<div class="library-heading album-list-heading">
    <div class="detail-heading">
      <h2 ${id ? `id="${escapeHtml(id)}"` : ""}>${escapeHtml(title)}</h2>
      <span class="count-pill">${count}</span>
    </div>
    ${renderLayoutToggle(layout, `${title} layout`, action)}
  </div>`;
}
