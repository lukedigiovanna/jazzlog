const sortLabels = {
  albums: "Most albums",
  rating: "Highest rated",
  recent: "Recently logged",
  updated: "Recently updated",
  name: "Name",
  title: "Album title",
  year: "Release year",
};

export function renderSortOptions(
  options: readonly (keyof typeof sortLabels)[],
  selected: string,
) {
  return options
    .map(
      (value) =>
        /* HTML */ `<option
          value="${value}"
          ${value === selected ? "selected" : ""}
        >
          ${sortLabels[value]}
        </option>`,
    )
    .join("");
}
