/**
 * The Discere mark: an open book seen from above, with the idea rising off the page.
 *
 * The old mark was a circle with a bar through it, which is a no-entry sign — the worst possible
 * reading for the way into a learning app. This one is two leaves meeting at a spine and a point
 * lifting away from them. It survives being 20 pixels wide in a nav rail, which is where it
 * spends most of its life, and it is drawable as one continuous gesture for the welcome.
 */
/** The strokes, shared by both readings of the mark. */
function MarkPaths() {
  return (
    <>
      {/* The two leaves. Drawn as one path each so the welcome can sweep them open in turn. */}
      <path
        className="mark-leaf mark-leaf-left"
        d="M16 12.4C13.1 9.9 9.4 8.8 5.5 9.2A1.6 1.6 0 0 0 4 10.8v11.6a1.6 1.6 0 0 0 1.8 1.6c3.6-.4 7 .6 9.6 2.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        className="mark-leaf mark-leaf-right"
        d="M16 12.4c2.9-2.5 6.6-3.6 10.5-3.2A1.6 1.6 0 0 1 28 10.8v11.6a1.6 1.6 0 0 1-1.8 1.6c-3.6-.4-7 .6-9.6 2.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      {/* The spine, and the idea leaving the page. */}
      <path
        className="mark-spine"
        d="M16 12.4v14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <circle className="mark-spark" cx="16" cy="5" fill="currentColor" r="2.9" />
    </>
  );
}

export function DiscereMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  /** Supply only where the mark is the sole label; otherwise it stays decorative. */
  title?: string;
}) {
  // Two explicit shapes rather than one with spread attributes: a mark inside an already
  // labelled link must be hidden, and a mark standing alone must be named.
  if (title) {
    return (
      <svg className={className} fill="none" height={size} role="img" viewBox="0 0 32 32" width={size}>
        <title>{title}</title>
        <MarkPaths />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <MarkPaths />
    </svg>
  );
}
