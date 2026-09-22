import { Skeleton, SkeletonCard } from "@/site/ui";
import "@/site/features/ideas/ideas.css";

// Loading boundary of the «Идеи» tab (review performance P6): with it, links to /<L>/ideas are
// prefetched down to here and a tap shows this placeholder at once instead of waiting for the
// dynamic render. Same geometry as ideas/page.tsx: heading, search, category pill, 3 cards.
// The idea cards themselves link with prefetch={false} (a grid can hold 293 of them).

export default function IdeasLoading() {
  return (
    <div className="ia-page ia-page--grid flex flex-col gap-3.5 pt-5" aria-busy="true">
      <div className="ia-heading" aria-hidden="true">
        <Skeleton width={120} height={34} />
        <Skeleton width="min(100%, 360px)" height={22} />
      </div>
      <div className="ia-ideas" aria-hidden="true">
        <div className="ia-ideas__controls">
          <Skeleton height={48} radius={999} style={{ maxWidth: 680 }} />
          <Skeleton width={180} height={44} radius={999} />
        </div>
        <ul className="ia-grid ia-grid--ideas ia-ideas-grid ia-ideas__grid">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <SkeletonCard variant="idea" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
