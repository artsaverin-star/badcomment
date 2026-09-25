import { meterScore, painColor, PAIN_SEGMENTS } from "./pain";

// The pain scale (SPEC «Правила чтения», «Карточка»): 10 fully rounded segments, `score` of
// them filled with the colour of their position (amber → red); the number stays ink-coloured
// (the amber end is unreadable as text on white). Decorative for assistive tech — callers put
// «Боль 7 из 10» into text. Styles: ./pain-meter.css (self-contained, also loaded by the old archive).

const SEGMENTS = Array.from({ length: PAIN_SEGMENTS }, (_, i) => i + 1);

export function PainMeter({ score, size = "full", className }: { score: number; size?: "full" | "mini"; className?: string }) {
  const filled = meterScore(score);
  return (
    <span className={`ia-pain-meter ia-pain-meter--${size}${className ? ` ${className}` : ""}`} aria-hidden="true" data-score={filled}>
      {SEGMENTS.map((position) => (
        <span key={position} className="ia-pain-meter__seg" style={position <= filled ? { backgroundColor: painColor(position) } : undefined} />
      ))}
    </span>
  );
}

/** «7/10»: the number in the text colour, «/10» grey; the colour lives in the meter. */
export function PainValue({ score, className }: { score: number; className?: string }) {
  const filled = meterScore(score);
  return (
    <span className={`ia-pain-value${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="ia-pain-value__n">{filled}</span>
      <span className="ia-pain-value__of">/10</span>
    </span>
  );
}
