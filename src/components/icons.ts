const paths: Record<string, string> = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.75" cy="10.75" r="6.25"/><path d="m16 16 4 4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  external: '<path d="M8 16 17 7M8 7h9v9"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M7.3 9a5.6 5.6 0 0 1 3-2.3m6.4 8.3a5.6 5.6 0 0 1-3 2.3"/>',
  edit: '<path d="m14.5 6.5 3 3M5 19l4-.8 10.1-10.1a2.1 2.1 0 0 0-3-3L6 15.2 5 19Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  music:
    '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2"/><ellipse cx="17.5" cy="16" rx="2.5" ry="2"/>',
  play: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/>',
  link: '<path d="m10 13 4-4m-6 5-1 1a3 3 0 0 0 4 4l4-4a3 3 0 0 0 0-4M9 13a3 3 0 0 1 0-4l4-4a3 3 0 0 1 4 4l-1 1"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7m-2-12v5h5m4-4v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  bars: '<path d="M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4"/>',
  sort: '<path d="M8 4v16m-3-3 3 3 3-3m5 3V4m-3 3 3-3 3 3"/>',
};

export const starPath =
  "m12 2.5 2.8 5.9 6.5 1-4.7 4.6 1.1 6.5-5.7-3.1-5.7 3.1 1.1-6.5-4.7-4.6 6.5-1Z";
export const icon = (name: string, size = 18) =>
  '<svg class="icon" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  (paths[name] ?? "") +
  "</svg>";
