const STAR_RATINGS: Record<number, string> = {
    0: "☆☆☆☆☆",
    1: "½☆☆☆☆",
    2: "★☆☆☆☆",
    3: "★½☆☆☆",
    4: "★★☆☆☆",
    5: "★★½☆☆",
    6: "★★★☆☆",
    7: "★★★½☆",
    8: "★★★★☆",
    9: "★★★★½",
    10: "★★★★★",
};

export function renderRating(rating: number | null): string {
    const hasRating = rating !== null && rating > 0;
    const score = hasRating
        ? Math.max(1, Math.min(10, Math.round(rating)))
        : 0;
    const stars = STAR_RATINGS[score] ?? STAR_RATINGS[0];
    const label = hasRating
        ? `Rated ${score} out of 10`
        : "Not rated";
    const modifier = hasRating ? "" : " rating--empty";

    return `
        <span
            class="rating${modifier}"
            role="img"
            aria-label="${label}"
        >${stars}</span>
    `;
}
