import Link from "next/link";
import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { IconStack } from "./IconStack";
import { ratingStrings } from "./strings";
import { displayTitle } from "./text";

// The niche's tasks as a list of links to the task pages (spec 11 §3.9). Server. Public (D2).
//
//   <RatingTaskList tasks={ratingTaskCards(niche)} niche={slug} locale={L} dataLang={textLang} variant="full" />
//   <RatingTaskList tasks={appTasks(niche, app.id)} … variant="compact" />               app page
//   <RatingTaskList tasks={ratingTaskCards(niche)} … variant="compact" exclude={n} />     task page
//
// full (niche page «Для чего тебе приложение?»): the job as an H3 (2 lines), «Что проверить»
// (2 lines), and the first rated apps as an icon stack with their names.
// compact: the job (2 lines) and the audience name (1 line). Clamps are CSS only (RR6).

/** One task (sitedata RatingTaskCard satisfies it). */
export type RatingTaskItem = {
  /** 1-based index: routes.ratingTask(L, niche, n). */
  n: number;
  /** The audience name; null = none. */
  name: string | null;
  job: string;
  /** «Что проверить перед выбором»; null = none. */
  gap: string | null;
  /** The first 4 rated apps. */
  apps: readonly { id: string; short: string; icon: string | null }[];
  /** All rated apps of the task. */
  appCount: number;
};

export function RatingTaskList({
  tasks,
  niche,
  locale,
  dataLang,
  variant,
  exclude,
}: {
  tasks: readonly RatingTaskItem[];
  niche: string;
  locale: Locale;
  /** `lang` of the data texts on de/fr/ja pages ("en"). */
  dataLang?: string;
  variant: "full" | "compact";
  /** A task to leave out (the task page's own). */
  exclude?: number;
}) {
  const shown = exclude === undefined ? tasks : tasks.filter((task) => task.n !== exclude);
  if (shown.length === 0) return null;
  return (
    <ul className={`ia-rt-tasks__list ia-rt-tasks__list--${variant}`}>
      {shown.map((task) => (
        <li key={task.n}>
          <Link className={`ia-rt-task ia-rt-task--${variant}`} href={routes.ratingTask(locale, niche, task.n)}>
            {variant === "full" ? (
              <>
                <h3 className="ia-rt-task__job" lang={dataLang}>
                  {task.job}
                </h3>
                {task.gap ? (
                  <p className="ia-rt-task__gap" lang={dataLang}>
                    {task.gap}
                  </p>
                ) : null}
                {task.apps.length > 0 ? (
                  <div className="ia-rt-task__apps">
                    <IconStack icons={task.apps.map((a) => a.icon)} size={28} />
                    <p className="ia-rt-task__names">{appNames(task, locale)}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <span className="ia-rt-task__job" lang={dataLang}>
                  {task.job}
                </span>
                {task.name ? (
                  <span className="ia-rt-task__audience" lang={dataLang}>
                    {task.name}
                  </span>
                ) : null}
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * «Hevy, Way of Life и ещё 3» — the first 2 names and the rest counted when there are more than
 * 3 apps; otherwise all names joined the locale's way («Hevy, Way of Life и Streaks»).
 */
function appNames(task: RatingTaskItem, locale: Locale): string {
  const names = task.apps.map((a) => displayTitle(a.short));
  if (task.appCount > 3 && names.length >= 2) {
    return format(ratingStrings[locale].moreApps, {
      names: names.slice(0, 2).join(locale === "ja" ? "、" : ", "),
      n: task.appCount - 2,
    });
  }
  return new Intl.ListFormat(INTL_LOCALE[locale], { type: "conjunction" }).format(names.slice(0, 3));
}
