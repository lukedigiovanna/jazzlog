import { starPath } from "./icons";
import { displayRating } from "./presentation";
export function stars(rating: number) {
  return `<span class="stars" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(2, rating - i * 2));
    return `<span class="star"><svg viewBox="0 0 24 24"><path d="${starPath}"/></svg><span class="star-fill" style="--fill:${fill * 50}%"><svg viewBox="0 0 24 24"><path d="${starPath}"/></svg></span></span>`;
  }).join('')}</span>`;
}

export function renderRating(rating: number | undefined) {
  return rating ? `<span class="rating" aria-label="${displayRating(rating)} out of 5 stars">${stars(rating)}<span aria-hidden="true">${displayRating(rating)}</span></span>`
    : '<span class="unrated">Unrated</span>';
}
