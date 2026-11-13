const entities = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeEntities(input: string): string {
  return input.replace(
    /&(?:nbsp|amp|quot|#39|lt|gt);/g,
    (entity) => entities[entity as keyof typeof entities],
  );
}
