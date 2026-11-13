type Suggestion = { id: string; name: string };

const key = (name: string) =>
  name.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export function mergeSuggestions(
  primary: Suggestion[],
  additional: Suggestion[],
) {
  const seen = new Set(primary.map((item) => key(item.name)));
  return [
    ...primary,
    ...additional.filter((item) => {
      const name = key(item.name);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    }),
  ];
}

// Personnel credits are prose, not a structured instrument field. Keep extraction
// conservative: accept explicit instrument names, never production roles or names.
const instrument =
  /^(?:(?:acoustic|electric|electronic|digital|grand|upright|prepared|tack|rhodes|wurlitzer) piano|piano|(?:acoustic|electric|rhythm|lead|steel|pedal steel|lap steel|slide|classical|twelve-string|12-string) guitar|guitars?|(?:electric|double|upright|acoustic|fretless) bass|bass(?: guitar)?|(?:alto|tenor|soprano|baritone|bass) saxophone|saxophone|(?:bass )?clarinet|(?:alto|bass )?flute|flute|piccolo|trumpet|flugelhorn|cornet|(?:bass )?trombone|tuba|french horn|harmonica|oboe|bassoon|violin|viola|cello|harp|banjo|mandolin|sitar|oud|ukulele|accordion|organ|(?:hammond|pipe|electric) organ|keyboards?|(?:moog|analog|modular) synthesizer|synthesizers?|mellotron|clavinet|harpsichord|vibraphone|marimba|xylophone|celesta|drums|drum kit|drum machine|percussion|congas?|bongos?|timbales|tambourine|shaker|cowbell|cymbals|timpani|tabla|djembe|turntables|sampler|(?:lead|backing|background|harmony) vocals|vocals|voice)$/i;

export function parseWikipediaPage(html: string, language: string) {
  // Parse in a detached document; imported HTML is never inserted into the app.
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("sup, script, style, .mw-editsection, .reference")
    .forEach((node) => node.remove());
  const make = (name: string): Suggestion => ({
    id: `wiki:${language}:${key(name)}`,
    name,
  });
  const genres: Suggestion[] = [];
  const instruments: Suggestion[] = [];
  // English infobox/section labels only; Wikidata still supports other languages.
  if (language !== "en") return { genres, instruments };
  for (const row of doc.querySelectorAll(".infobox tr")) {
    if (!/^genres?$/i.test(row.querySelector("th")?.textContent?.trim() ?? ""))
      continue;
    const cell = row.querySelector("td");
    if (!cell) continue;
    cell.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    cell.querySelectorAll("li").forEach((node) => node.append("\n"));
    // Links may be adjacent without textual separators in flat lists.
    cell.querySelectorAll('a[href^="/wiki/"]').forEach((node) => {
      if (node.previousElementSibling?.tagName !== "A") return;
      let previous = node.previousSibling;
      let between = "";
      while (previous && previous !== node.previousElementSibling) {
        between = (previous.textContent ?? "") + between;
        previous = previous.previousSibling;
      }
      if (!between.trim()) node.before("\n");
    });
    for (const part of (cell.textContent ?? "").split(/[,;\n•]+/)) {
      const name = part.replace(/\s+/g, " ").trim();
      if (name && !/^[\W\d]+$/.test(name)) genres.push(make(name));
    }
  }
  let personnel = false;
  for (const node of doc.querySelectorAll("h2, li")) {
    if (node.tagName === "H2") {
      personnel =
        /^(?:personnel|credits|musicians|personnel and credits)$/i.test(
          node.textContent?.trim() ?? "",
        );
      continue;
    }
    if (!personnel || node.querySelector("li")) continue;
    const text = node.textContent ?? "";
    const credit = text.match(/\s+[–—−-]\s+(.+)$/)?.[1];
    if (!credit) continue;
    for (const part of credit
      .replace(/\([^)]*\)/g, "")
      .split(/[,;]|\s+and\s+|\s+&\s+/)) {
      const name = part.trim().replace(/\s+/g, " ");
      if (instrument.test(name)) instruments.push(make(name));
    }
  }
  return {
    genres: mergeSuggestions([], genres),
    instruments: mergeSuggestions([], instruments),
  };
}
