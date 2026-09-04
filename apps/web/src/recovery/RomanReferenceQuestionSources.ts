import type { RomanReferenceQuestionContent } from "@discere/contracts";
import type { ReferenceSource } from "./ReferenceSourceDialog.js";

const QUESTION_SOURCE_CATALOG: Readonly<Record<string, ReferenceSource>> = {
  "wikipedia-augustus": {
    title: "Augustus",
    detail: "Wikipedia · CC BY-SA 4.0",
    href: "https://en.wikipedia.org/wiki/Augustus",
  },
  "wikipedia-roman-empire": {
    title: "Roman Empire",
    detail: "Wikipedia · CC BY-SA 4.0",
    href: "https://en.wikipedia.org/wiki/Roman_Empire",
  },
  "wikipedia-fall-western-empire": {
    title: "Fall of the Western Roman Empire",
    detail: "Wikipedia · CC BY-SA 4.0",
    href: "https://en.wikipedia.org/wiki/Fall_of_the_Western_Roman_Empire",
  },
  "openstax-world-history-eastward-shift": {
    title: "World History Volume 1: The Eastward Shift",
    detail: "OpenStax · CC BY 4.0",
    href: "https://openstax.org/books/world-history-volume-1/pages/10-1-the-eastward-shift",
  },
  "commons-roman-empire-extent-map": {
    title: "Map: the Roman Empire in 117 CE",
    detail: "Wikimedia Commons · CC BY-SA 3.0",
    href: "https://commons.wikimedia.org/wiki/File:Roman_Empire_Trajan_117AD.png",
  },
};

/** Public source IDs choose the drawer contents; licence metadata never carries answer authority. */
export function questionSources(content: RomanReferenceQuestionContent): ReferenceSource[] {
  return content.sourceIds.flatMap((sourceId) => {
    const source = QUESTION_SOURCE_CATALOG[sourceId];
    return source ? [source] : [];
  });
}
