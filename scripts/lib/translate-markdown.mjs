export function protectCodeBlocks(markdown) {
  const blocks = [];
  const text = markdown.replace(/```[\s\S]*?```/g, (block) => {
    const placeholder = `__SHOA_CODE_BLOCK_${blocks.length}__`;
    blocks.push(block);
    return placeholder;
  });
  return { text, blocks };
}

export function restoreCodeBlocks(markdown, blocks) {
  return blocks.reduce(
    (value, block, index) => value.replace(`__SHOA_CODE_BLOCK_${index}__`, block),
    markdown,
  );
}

export function protectImages(markdown) {
  const images = [];
  const text = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => {
    const placeholder = `__SHOA_IMAGE_${images.length}__`;
    images.push({ alt, target });
    return placeholder;
  });
  return { text, images };
}

export function restoreImages(markdown, images, translatedAlts) {
  return images.reduce(
    (value, image, index) => value.replace(
      `__SHOA_IMAGE_${index}__`,
      `![${translatedAlts[index]}](${image.target})`,
    ),
    markdown,
  );
}

export function protectLinks(markdown) {
  const links = [];
  const text = markdown.replace(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, target) => {
    const placeholder = `__SHOA_LINK_${links.length}__`;
    links.push({ label, target });
    return placeholder;
  });
  return { text, links };
}

export function restoreLinks(markdown, links, translatedLabels) {
  return links.reduce(
    (value, link, index) => value.replace(
      `__SHOA_LINK_${index}__`,
      `[${translatedLabels[index]}](${link.target})`,
    ),
    markdown,
  );
}

export function protectHeadings(markdown) {
  const headings = [];
  const text = markdown.replace(/^(#{1,6})\s+(.+)$/gm, (_, marker, label) => {
    const placeholder = `__SHOA_HEADING_${headings.length}__`;
    headings.push({ marker, label });
    return placeholder;
  });
  return { text, headings };
}

export function restoreHeadings(markdown, headings, translatedLabels) {
  return headings.reduce(
    (value, heading, index) => value.replace(
      `__SHOA_HEADING_${index}__`,
      `${heading.marker} ${translatedLabels[index]}`,
    ),
    markdown,
  );
}

export function chunkMarkdown(markdown, limit = 3200) {
  const paragraphs = markdown.split("\n\n");
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > limit) throw new Error(`Markdown paragraph exceeds translation limit (${paragraph.length})`);
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > limit && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function structureSignature(body) {
  const headings = [];
  const images = [];
  const codeLanguages = [];
  const externalLinks = [];
  let headingIndex = -1;
  let tableCount = 0;
  let inFence = false;

  for (const line of body.split(/\r?\n/)) {
    const fence = line.match(/^```([^\s`]*)/);
    if (fence) {
      codeLanguages.push(fence[1]);
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = line.match(/^(#{1,6})\s+\S/);
    if (heading) {
      headings.push(heading[1].length);
      headingIndex += 1;
    }
    for (const match of line.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      images.push({ headingIndex, target: match[1].split(/\s+/)[0] });
    }
    if (/^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line.trim())) tableCount += 1;
    for (const match of line.matchAll(/(?<!!)\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)) {
      externalLinks.push(match[1]);
    }
  }

  return { headings, images, codeLanguages, tableCount, externalLinks };
}
