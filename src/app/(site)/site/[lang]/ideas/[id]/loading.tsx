import { DetailToolbar, SkeletonText } from "@/site/ui";
import "@/site/features/ideas/ideas.css";

// Loading boundary of an idea page (review performance P6): an empty reader toolbar, then the
// hero (title Georgia 30, lead Georgia 20) and a few paragraph lines in the 640 reading column.
// No text: loading.tsx gets no params, so it cannot pick the locale.

export default function IdeaLoading() {
  return (
    <div className="ia-reading-page">
      <DetailToolbar />
      <div className="ia-page ia-page--reading ia-idea" aria-busy="true">
        <div className="ia-idea__hero" aria-hidden="true">
          <SkeletonText lines={2} lineHeight={40} />
          <SkeletonText lines={2} lineHeight={30} />
        </div>
        <div className="ia-idea__blocks" aria-hidden="true">
          <SkeletonText lines={5} lineHeight={30} />
          <SkeletonText lines={4} lineHeight={30} />
        </div>
      </div>
    </div>
  );
}
