import { defineStrings } from "../../i18n/strings";

// The methodology of the review archive (/<L>/reviews/methodology): how the reviews are labelled
// and how to read the numbers. Placeholders are filled on the page with the live corpus size;
// word forms are "one|few|many|other" in the case the sentence needs. The old page's substance,
// in the new reading voice. Voice: informal «ты» / du / tu; Japanese です・ます.

export const methodologyStrings = defineStrings({
  ru: {
    metaTitle: "Методика разметки отзывов",
    metaDescription:
      "Как inApp превращает исходные отзывы в проверяемые паттерны ниш и темы приложений — с порогами, цитатами и честными ограничениями.",
    title: "Как мы превращаем отзывы в выводы",
    lead:
      "Главный принцип — трассируемость. От паттерна можно спуститься к приложениям, цитатам и исходным оценкам; слабый или неоднозначный текст не получает искусственно точную тему.",
    version: "Версия данных от {date}",
    corpusTitle: "Корпус",
    corpus1:
      "В текущем снимке {reviews} из публичных источников о {apps} в {niches}. Полный текст, звёздная оценка и принадлежность к приложению сохранены для каждого отзыва.",
    corpus2:
      "Поштучная разметка полная: у каждого отзыва есть одна или несколько меток. Всего тематических меток — {assignments}.",
    reviewsWord: "отзыв|отзыва|отзывов|отзыва",
    reviewsGenWord: "отзыва|отзывов|отзывов|отзыва",
    aboutAppsWord: "приложении|приложениях|приложениях|приложениях",
    appsGenWord: "приложения|приложений|приложений|приложения",
    inNichesWord: "нише|нишах|нишах|нишах",
    nichesGenWord: "ниши|ниш|ниш|ниши",
    uniqueReviewsWord: "уникальный отзыв|уникальных отзыва|уникальных отзывов|уникального отзыва",
    accessTitle: "Доступ к источникам",
    access:
      "Категория «{free}» открыта полностью как проверяемый пример: категория → приложение → отзывы по темам. Остальной архив входит в Plus. Замок действует и на страницы, и на API; названия категорий и объём корпуса видны до оплаты.",
    layersTitle: "Три уровня разметки",
    layer1Title: "Все темы каждого отзыва",
    layer1Body:
      "Ищем все явно выраженные сюжеты: списание, рекламу, вылет, вход, доставку, качество и другие узкие сигналы. Один текст может получить несколько меток. Если конкретики нет, сохраняем только общую оценку — без выдуманной причины.",
    layer2Title: "Паттерны ниши",
    layer2Body:
      "Сюжет должен встретиться минимум в 8 сигналах и минимум у 3 разных приложений. Для каждого паттерна сохраняются приложения, направление и проверяемые цитаты.",
    layer3Title: "Темы приложения",
    layer3Body:
      "Повторяющиеся сюжеты формируются отдельно внутри каждого приложения. Поэтому одна и та же проблема у двух конкурентов может называться по-разному и сохранять продуктовый контекст.",
    readTitle: "Как читать показатели",
    defSignal: "Сигнал",
    defSignalBody:
      "Отзыв, который поддерживает конкретный паттерн. Один содержательный отзыв может затрагивать несколько сюжетов, поэтому суммы сигналов не равны числу уникальных отзывов и не являются долей рынка.",
    defDirection: "Направление темы",
    defDirectionBody:
      "«В основном хвалят», «в основном критикуют» или «мнения расходятся» — это направление темы в целом, а не ярлык каждого текста. Пятизвёздочный отзыв может упомянуть недостаток, а однозвёздочный — полезную функцию.",
    defSpecific: "Конкретная тема",
    defSpecificBody:
      "Содержательный сюжет, который можно назвать без домыслов. Одну или несколько таких тем получили {specific} — {pct} полного корпуса; остальное остаётся в явных общих корзинах «без конкретной причины».",
    defCoverage: "Охват",
    defCoverageBody:
      "Тексты и поштучные метки есть у всех {reviews}. Паттерны рынка готовы в каждой из {niches}. Дополнительная глубокая продуктовая разметка готова для {deep} из {planned} — это {pct} полного корпуса. Эти показатели намеренно публикуются раздельно.",
    limitsTitle: "Ограничения",
    limit1:
      "Отзывы пишут неслучайные пользователи: чаще те, у кого был особенно хороший или плохой опыт. Это голос аудитории, но не репрезентативный опрос.",
    limit2: "Корпус — снимок во времени. Версия продукта, страна, язык и политика магазина могут влиять на видимую картину.",
    limit3:
      "Мы не подтверждаем факт покупки и личность автора. Подозрительную активность нельзя считать доказанным реальным опытом.",
    limit4:
      "Частота упоминаний показывает силу сигнала внутри корпуса, но не измеряет, насколько проблема распространена среди всех пользователей приложения.",
    checkTitle: "Лучший способ проверить вывод",
    checkBody:
      "Открой категорию и конкретное приложение, выбери тему и прочитай все исходные тексты под ней. Любую метку можно сверить со звёздами и точными словами — разметка не прячет корпус за пересказом.",
    checkLink: "Перейти к отзывам",
  },
  en: {
    metaTitle: "Review labelling methodology",
    metaDescription:
      "How inApp turns source reviews into verifiable niche patterns and app themes, with thresholds, quotes and honest limitations.",
    title: "How reviews become findings",
    lead:
      "The governing principle is traceability. A pattern can be followed down to apps, quotes and source ratings; weak or ambiguous text never gets an artificially precise theme.",
    version: "Data version dated {date}",
    corpusTitle: "Corpus",
    corpus1:
      "The current snapshot holds {reviews} from public sources about {apps} in {niches}. The complete text, star rating and app of every review are kept.",
    corpus2: "Per-review labelling is complete: every review carries one or more labels. Topic labels in total: {assignments}.",
    reviewsWord: "review|reviews|reviews|reviews",
    reviewsGenWord: "review|reviews|reviews|reviews",
    aboutAppsWord: "app|apps|apps|apps",
    appsGenWord: "app|apps|apps|apps",
    inNichesWord: "niche|niches|niches|niches",
    nichesGenWord: "niche|niches|niches|niches",
    uniqueReviewsWord: "unique review|unique reviews|unique reviews|unique reviews",
    accessTitle: "Source access",
    access:
      "{free} is fully open as a verifiable sample: category → app → reviews by topic. The rest of the archive is part of Plus. The lock applies to both the pages and the API; category names and corpus size stay visible before purchase.",
    layersTitle: "Three labelling layers",
    layer1Title: "Every topic in each review",
    layer1Body:
      "We identify every explicit story: charges, ads, crashes, login, delivery, quality and other narrow signals. One text may get several labels. If it has no specifics, only an overall assessment is kept, without an invented reason.",
    layer2Title: "Niche patterns",
    layer2Body:
      "A story must appear in at least 8 signals and in at least 3 different apps. The apps, the direction and verifiable quotes are kept for every pattern.",
    layer3Title: "App themes",
    layer3Body:
      "Recurring stories are formed separately within each app. The same issue can therefore be named differently for two competitors and keep its product context.",
    readTitle: "How to read the numbers",
    defSignal: "Signal",
    defSignalBody:
      "A review that supports a specific pattern. One substantive review can touch several stories, so signal totals do not equal unique review counts and are not market share.",
    defDirection: "Theme direction",
    defDirectionBody:
      "“Mostly praised”, “mostly criticised” or “opinions differ” describes the theme as a whole, not every text. A five-star review may mention a drawback, and a one-star review a useful feature.",
    defSpecific: "Specific theme",
    defSpecificBody:
      "A substantive story that can be named without speculation. {specific} — {pct} of the complete corpus — have one or more; the rest stays in explicit “without a specific reason” buckets.",
    defCoverage: "Coverage",
    defCoverageBody:
      "Texts and per-review labels exist for all {reviews}. Market patterns are ready for each of the {niches}. The additional deep product layer is ready for {deep} of {planned}, or {pct} of the complete corpus. These figures are deliberately reported separately.",
    limitsTitle: "Limitations",
    limit1:
      "Reviewers are self-selected: more often people with an especially good or bad experience. This is the audience’s voice, not a representative survey.",
    limit2: "The corpus is a snapshot in time. Product version, country, language and store policy can affect what is visible.",
    limit3:
      "We do not verify purchases or who wrote a review. Suspicious activity should not be treated as proven real-world experience.",
    limit4:
      "Mention frequency shows signal strength within the corpus, but does not measure how common a problem is among all users of an app.",
    checkTitle: "The best way to verify a finding",
    checkBody:
      "Open a category and an app, pick a topic and read every source text under it. Any label can be checked against the stars and the exact words — the labelling never hides the corpus behind a summary.",
    checkLink: "Go to the reviews",
  },
  de: {
    metaTitle: "Methodik der Rezensionskennzeichnung",
    metaDescription:
      "Wie inApp aus Original-Rezensionen überprüfbare Muster von Nischen und Themen von Apps macht — mit Schwellen, Zitaten und ehrlichen Grenzen.",
    title: "Wie aus Rezensionen Erkenntnisse werden",
    lead:
      "Das Grundprinzip ist Nachvollziehbarkeit. Von einem Muster kommst du hinunter zu Apps, Zitaten und Original-Bewertungen; ein schwacher oder mehrdeutiger Text bekommt kein künstlich genaues Thema.",
    version: "Datenstand vom {date}",
    corpusTitle: "Korpus",
    corpus1:
      "Der aktuelle Stand umfasst {reviews} aus öffentlichen Quellen zu {apps} in {niches}. Vollständiger Text, Sternebewertung und App sind für jede Rezension gespeichert.",
    corpus2:
      "Die Kennzeichnung pro Rezension ist vollständig: Jede Rezension hat eine oder mehrere Kennzeichnungen. Themenkennzeichnungen insgesamt: {assignments}.",
    reviewsWord: "Rezension|Rezensionen|Rezensionen|Rezensionen",
    reviewsGenWord: "Rezension|Rezensionen|Rezensionen|Rezensionen",
    aboutAppsWord: "App|Apps|Apps|Apps",
    appsGenWord: "App|Apps|Apps|Apps",
    inNichesWord: "Nische|Nischen|Nischen|Nischen",
    nichesGenWord: "Nische|Nischen|Nischen|Nischen",
    uniqueReviewsWord: "einzelne Rezension|einzelne Rezensionen|einzelne Rezensionen|einzelne Rezensionen",
    accessTitle: "Zugang zu den Quellen",
    access:
      "Die Kategorie {free} ist als überprüfbares Beispiel komplett offen: Kategorie → App → Rezensionen nach Themen. Der Rest des Archivs gehört zu Plus. Die Sperre gilt für die Seiten und die API; Namen der Kategorien und Größe des Korpus sind vor dem Kauf sichtbar.",
    layersTitle: "Drei Ebenen der Kennzeichnung",
    layer1Title: "Alle Themen jeder Rezension",
    layer1Body:
      "Wir suchen alle ausdrücklich genannten Geschichten: Abbuchungen, Werbung, Abstürze, Anmeldung, Lieferung, Qualität und andere enge Signale. Ein Text kann mehrere Kennzeichnungen bekommen. Fehlt das Konkrete, bleibt nur die Gesamtbewertung — ohne erfundenen Grund.",
    layer2Title: "Muster der Nische",
    layer2Body:
      "Eine Geschichte muss in mindestens 8 Signalen und bei mindestens 3 verschiedenen Apps vorkommen. Zu jedem Muster werden Apps, Richtung und überprüfbare Zitate gespeichert.",
    layer3Title: "Themen der App",
    layer3Body:
      "Wiederkehrende Geschichten werden für jede App getrennt gebildet. Dasselbe Problem kann deshalb bei zwei Konkurrenten unterschiedlich heißen und seinen Produktkontext behalten.",
    readTitle: "So liest du die Zahlen",
    defSignal: "Signal",
    defSignalBody:
      "Eine Rezension, die ein bestimmtes Muster stützt. Eine gehaltvolle Rezension kann mehrere Geschichten berühren, deshalb entsprechen Summen von Signalen nicht der Zahl einzelner Rezensionen und sind kein Marktanteil.",
    defDirection: "Richtung eines Themas",
    defDirectionBody:
      "„Überwiegend gelobt“, „überwiegend kritisiert“ oder „Meinungen gehen auseinander“ beschreibt das Thema als Ganzes, nicht jeden Text. Eine Fünf-Sterne-Rezension kann einen Mangel erwähnen, eine Ein-Stern-Rezension eine nützliche Funktion.",
    defSpecific: "Konkretes Thema",
    defSpecificBody:
      "Eine gehaltvolle Geschichte, die sich ohne Spekulation benennen lässt. {specific} — {pct} des ganzen Korpus — haben ein oder mehrere solche Themen; der Rest bleibt in ausdrücklichen Sammelgruppen „ohne konkreten Grund“.",
    defCoverage: "Abdeckung",
    defCoverageBody:
      "Texte und Kennzeichnungen gibt es für alle {reviews}. Marktmuster sind für jede der {niches} fertig. Die zusätzliche tiefe Produktebene ist für {deep} von {planned} fertig, das sind {pct} des ganzen Korpus. Diese Zahlen veröffentlichen wir bewusst getrennt.",
    limitsTitle: "Grenzen",
    limit1:
      "Rezensionen schreiben nicht zufällig ausgewählte Leute: öfter die mit besonders guter oder schlechter Erfahrung. Das ist die Stimme des Publikums, keine repräsentative Umfrage.",
    limit2: "Der Korpus ist eine Momentaufnahme. Produktversion, Land, Sprache und Richtlinien des Stores können das Bild beeinflussen.",
    limit3:
      "Wir prüfen weder Käufe noch die Identität der Verfasser. Verdächtige Aktivität gilt nicht als nachgewiesene echte Erfahrung.",
    limit4:
      "Die Häufigkeit von Erwähnungen zeigt die Stärke eines Signals im Korpus, misst aber nicht, wie verbreitet ein Problem unter allen Nutzern einer App ist.",
    checkTitle: "So prüfst du ein Ergebnis am besten",
    checkBody:
      "Öffne eine Kategorie und eine App, wähl ein Thema und lies alle Original-Texte darunter. Jede Kennzeichnung lässt sich mit den Sternen und dem genauen Wortlaut abgleichen — die Kennzeichnung versteckt den Korpus nie hinter einer Zusammenfassung.",
    checkLink: "Zu den Rezensionen",
  },
  fr: {
    metaTitle: "Méthode d’étiquetage des avis",
    metaDescription:
      "Comment inApp transforme les avis d’origine en schémas de niche et en thèmes d’apps vérifiables, avec des seuils, des citations et des limites assumées.",
    title: "Comment les avis deviennent des conclusions",
    lead:
      "Le principe de base est la traçabilité. D’un schéma, on peut descendre jusqu’aux apps, aux citations et aux notes d’origine ; un texte faible ou ambigu ne reçoit jamais de thème artificiellement précis.",
    version: "Données à jour au {date}",
    corpusTitle: "Corpus",
    corpus1:
      "L’état actuel compte {reviews} issus de sources publiques sur {apps} dans {niches}. Le texte complet, la note en étoiles et l’app de chaque avis sont conservés.",
    corpus2:
      "L’étiquetage avis par avis est complet : chaque avis porte une ou plusieurs étiquettes. Étiquettes thématiques au total : {assignments}.",
    reviewsWord: "avis|avis|avis|avis",
    reviewsGenWord: "avis|avis|avis|avis",
    aboutAppsWord: "app|apps|apps|apps",
    appsGenWord: "app|apps|apps|apps",
    inNichesWord: "niche|niches|niches|niches",
    nichesGenWord: "niche|niches|niches|niches",
    uniqueReviewsWord: "avis distinct|avis distincts|avis distincts|avis distincts",
    accessTitle: "Accès aux sources",
    access:
      "La catégorie {free} est entièrement ouverte comme exemple vérifiable : catégorie → app → avis par thème. Le reste des archives fait partie de Plus. Le verrou s’applique aux pages comme à l’API ; les noms des catégories et la taille du corpus restent visibles avant l’achat.",
    layersTitle: "Trois niveaux d’étiquetage",
    layer1Title: "Tous les thèmes de chaque avis",
    layer1Body:
      "On repère chaque histoire explicite : prélèvements, publicité, plantages, connexion, livraison, qualité et autres signaux précis. Un texte peut recevoir plusieurs étiquettes. S’il n’a rien de concret, on garde seulement l’appréciation générale, sans raison inventée.",
    layer2Title: "Schémas de la niche",
    layer2Body:
      "Une histoire doit apparaître dans au moins 8 signaux et chez au moins 3 apps différentes. Pour chaque schéma, on garde les apps, le sens et des citations vérifiables.",
    layer3Title: "Thèmes de l’app",
    layer3Body:
      "Les histoires récurrentes se forment séparément dans chaque app. Le même problème peut donc porter deux noms chez deux concurrents et garder son contexte produit.",
    readTitle: "Comment lire les chiffres",
    defSignal: "Signal",
    defSignalBody:
      "Un avis qui étaye un schéma précis. Un avis riche peut toucher plusieurs histoires : les totaux de signaux ne sont donc ni le nombre d’avis distincts ni une part de marché.",
    defDirection: "Sens d’un thème",
    defDirectionBody:
      "« Surtout loué », « surtout critiqué » ou « avis partagés » décrit le thème dans son ensemble, pas chaque texte. Un avis cinq étoiles peut citer un défaut, et un avis une étoile une fonction utile.",
    defSpecific: "Thème précis",
    defSpecificBody:
      "Une histoire concrète qu’on peut nommer sans supposition. {specific} — {pct} du corpus complet — en ont un ou plusieurs ; le reste reste dans des catégories générales explicites « sans raison précise ».",
    defCoverage: "Couverture",
    defCoverageBody:
      "Les textes et les étiquettes existent pour les {reviews}. Les schémas de marché sont prêts pour chacune des {niches}. La couche produit approfondie est prête pour {deep} sur {planned}, soit {pct} du corpus complet. Ces chiffres sont publiés séparément, volontairement.",
    limitsTitle: "Limites",
    limit1:
      "Les avis ne viennent pas d’utilisateurs tirés au hasard : plus souvent de gens qui ont vécu une expérience particulièrement bonne ou mauvaise. C’est la voix du public, pas un sondage représentatif.",
    limit2: "Le corpus est un instantané. La version du produit, le pays, la langue et les règles du store peuvent changer ce qu’on voit.",
    limit3:
      "On ne vérifie ni les achats ni l’identité des auteurs. Une activité suspecte ne doit pas être prise pour une expérience réelle prouvée.",
    limit4:
      "La fréquence des mentions montre la force d’un signal dans le corpus, mais ne mesure pas à quel point un problème est répandu chez tous les utilisateurs d’une app.",
    checkTitle: "La meilleure façon de vérifier une conclusion",
    checkBody:
      "Ouvre une catégorie et une app, choisis un thème et lis tous les textes d’origine qu’il regroupe. Chaque étiquette se vérifie avec les étoiles et les mots exacts : l’étiquetage ne cache jamais le corpus derrière un résumé.",
    checkLink: "Aller aux avis",
  },
  ja: {
    metaTitle: "レビューのラベル付けの方法",
    metaDescription:
      "inAppが元のレビューを、確かめられるニッチのパターンとアプリのテーマに変える方法。しきい値、引用、正直な限界まで説明します。",
    title: "レビューが結論になるまで",
    lead:
      "基本の原則はたどれることです。パターンからアプリ、引用、元の評価までたどれます。弱い本文やあいまいな本文に、不自然に細かいテーマを付けることはありません。",
    version: "データの時点：{date}",
    corpusTitle: "コーパス",
    corpus1:
      "現在のスナップショットには、公開情報から集めた{niches}の{apps}についての{reviews}があります。各レビューの全文、星の評価、対象アプリを保存しています。",
    corpus2: "レビューごとのラベル付けは完了しています。どのレビューにも1つ以上のラベルがあります。テーマのラベルは合計{assignments}件です。",
    reviewsWord: "件のレビュー",
    reviewsGenWord: "件のレビュー",
    aboutAppsWord: "アプリ",
    appsGenWord: "アプリ",
    inNichesWord: "ニッチ",
    nichesGenWord: "ニッチ",
    uniqueReviewsWord: "件のレビュー",
    accessTitle: "出典へのアクセス",
    access:
      "{free}カテゴリーは、確かめられる例としてすべて公開しています。カテゴリー → アプリ → テーマ別のレビューの順にたどれます。ほかのアーカイブはPlusに含まれます。ロックはページにもAPIにもかかりますが、カテゴリー名とコーパスの規模は購入前でも見られます。",
    layersTitle: "ラベル付けの3つの層",
    layer1Title: "各レビューのすべてのテーマ",
    layer1Body:
      "請求、広告、クラッシュ、ログイン、配送、品質など、はっきり書かれた出来事をすべて拾います。1つの本文に複数のラベルが付くこともあります。具体的な内容がなければ、理由をでっち上げずに全体の評価だけを残します。",
    layer2Title: "ニッチのパターン",
    layer2Body:
      "ある出来事がパターンになるには、少なくとも8件のシグナルと、少なくとも3つの異なるアプリに現れる必要があります。各パターンには、アプリ、方向、確かめられる引用を保存します。",
    layer3Title: "アプリのテーマ",
    layer3Body:
      "繰り返し出る出来事は、アプリごとに別々にまとめます。そのため同じ問題でも、2つの競合で呼び方が違い、プロダクトの文脈を保てます。",
    readTitle: "数字の読み方",
    defSignal: "シグナル",
    defSignalBody:
      "特定のパターンを支えるレビューです。内容のある1件のレビューが複数の出来事に触れることがあるため、シグナルの合計は重複しないレビューの数とは一致せず、市場シェアでもありません。",
    defDirection: "テーマの方向",
    defDirectionBody:
      "「主に称賛」「主に批判」「意見が分かれる」はテーマ全体の方向で、各本文のラベルではありません。星5のレビューが欠点に触れることも、星1のレビューが便利な機能に触れることもあります。",
    defSpecific: "具体的なテーマ",
    defSpecificBody:
      "推測なしで名前を付けられる、内容のある出来事です。{specific}（コーパス全体の{pct}）に1つ以上あり、残りは「特定の理由なし」という明示的な全体のまとまりに入ります。",
    defCoverage: "カバー範囲",
    defCoverageBody:
      "本文とレビューごとのラベルは{reviews}すべてにあります。市場のパターンは{niches}すべてで用意できています。追加の詳しいプロダクトの層は{deep}／{planned}で完成しており、コーパス全体の{pct}にあたります。これらの数字はあえて分けて公開しています。",
    limitsTitle: "限界",
    limit1:
      "レビューを書くのは無作為に選ばれた人ではなく、特に良い体験や悪い体験をした人が多くなります。利用者の声ではありますが、代表的な調査ではありません。",
    limit2: "コーパスはある時点のスナップショットです。製品のバージョン、国、言語、ストアの方針によって見え方が変わることがあります。",
    limit3:
      "購入の事実や書き手の身元は確認していません。不審な動きを、実際の体験が証明されたものとして扱わないでください。",
    limit4:
      "言及の頻度はコーパス内のシグナルの強さを示しますが、アプリの全利用者の中でその問題がどれだけ広がっているかは測れません。",
    checkTitle: "結論を確かめるいちばんの方法",
    checkBody:
      "カテゴリーとアプリを開き、テーマを選んで、その下にある元の本文をすべて読んでください。どのラベルも星と実際の言葉で確かめられます。ラベル付けは要約の後ろにコーパスを隠しません。",
    checkLink: "レビューへ",
  },
});

export type MethodologyStrings = (typeof methodologyStrings)["ru"];
