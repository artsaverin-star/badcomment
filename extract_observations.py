#!/usr/bin/env python3
"""
Extract observations from app store reviews for Toggl Track.
Follows strict template: specific mechanisms only, no generic praise/complaints.
"""

import json
from pathlib import Path

# First file: -0009.txt reviews with extracted observations
OBSERVATIONS_0009 = {
    "7672963458": [],  # generic feature requests
    "7665259139": [
        {
            "text": "Простая логика включения/выключения часов удовлетворяет фрилансера-подрядчика с фиксированным недельным лимитом часов — позволяет точно знать, когда остановиться.",
            "trigger": "I can only work a set amount of hours per week, so I can know exactly when to stop working",
            "jtbd": "Контроль недельного лимита часов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["pace-control", "freelance"]
        }
    ],
    "7645698094": [],  # generic praise
    "7599196122": [
        {
            "text": "Приложение случайно перезаписывает старые недели новыми, делая логирование недостоверным.",
            "trigger": "the app will take the oldest week from your log, and write it over the most recent week",
            "jtbd": "Сохранение истории рабочего времени",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["data-loss", "critical-bug"]
        }
    ],
    "7564877217": [],  # requests, no concrete mechanism
    "7529142946": [
        {
            "text": "Тег-система разрешает отследить разные ставки зарплаты внутри одного месяца для одной работы.",
            "trigger": "one of them has a bunch of different pay rates depending on the department I'm in. This app has done a wonderful job in helping me keep track of everything. the tag feature helps a lot!",
            "jtbd": "Управление несколькими ставками зарплаты в одной работе",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["tagging", "multi-rate", "power-user"]
        }
    ],
    "7477882808": [
        {
            "text": "Бесплатная версия ограничена ~9-10 днями данных перед принудительной покупкой премиума.",
            "trigger": "You only can track 9 or 10 days and have to purchase the premium if you want unlimited entries",
            "jtbd": "Продолжение отслеживания часов сверх лимита",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["paywall", "hidden-limit"]
        }
    ],
    "7410988744": [
        {
            "text": "Комментарии к записям служат дневником выполненной работы — пользователь вспоминает, что именно делал.",
            "trigger": "I like being able to describe the tasks I've completed in the comments section each time",
            "jtbd": "Аудит выполненной работы через комментарии",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["notes", "audit-trail"]
        }
    ],
    "7338256869": [],  # request, no mechanism
    "7272637408": [
        {
            "text": "Приложение заменило ненадёжный десктопный трекер — простота и надёжность вытеснили конкурента.",
            "trigger": "I used to use a desk top app from another company but it was unreliable and not easy to use. This app however is perfect",
            "jtbd": "Поиск надёжного трекера рабочего времени",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["replacement", "reliability"]
        }
    ],
    "7223818489": [
        {
            "text": "Автоматический расчёт дневной и еженедельной оплаты упрощает общение между сотрудником и работодателем.",
            "trigger": "Then what makes it even better is how you can put in how much you're getting paid per hour. So it calculates everything for you. Plus helps out the boss man so he doesn't have to add up how much to pay me",
            "jtbd": "Расчёт ожидаемой зарплаты и согласование с работодателем",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["wage-calculation", "employer-coordination"]
        }
    ],
    "7163124786": [
        {
            "text": "Приложение показывает часы в месяцах, когда пользователь не работал — ошибка в истории требует ручной очистки.",
            "trigger": "the app shows me to be working in February of this year. I did not start my job until March",
            "jtbd": "Корректное отображение истории работы",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["data-integrity", "history-bug"]
        }
    ],
    "7150448411": [],  # generic praise in Italian
    "7104332437": [
        {
            "text": "Приложение перезаписывает старые записи новыми, ограничивая надёжное хранилище данных более чем одну неделю.",
            "trigger": "there is a glitch where new info is overwriting past entries",
            "jtbd": "Многонедельное хранение истории рабочего времени",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["data-overwrite", "persistence-bug"]
        }
    ],
    "7095024292": [
        {
            "text": "Приложение перезаписывает данные всех месяцев одинаковыми часами при переводе на новый месяц.",
            "trigger": "this app is designed to overwrite the data you have entered for previous months to where all months display the same hours",
            "jtbd": "Корректное ведение многомесячной истории",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["data-loss", "critical-bug"]
        }
    ],
    "7082416973": [
        {
            "text": "Отсутствие суммирования по неделям блокирует пользователей, отслеживающих несколько задач в один день.",
            "trigger": "Still missing subtotals per week. Sometimes I need to record time on several tasks per day: 0,5 for this and 2,5 hours for that",
            "jtbd": "Отслеживание нескольких задач в один день с суммированием по неделям",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["multi-task", "subtotals"]
        }
    ],
    "7080851318": [
        {
            "text": "При изменении недели приложение сохраняет старые часы в полях дня, и удаление приводит к потере всей истории.",
            "trigger": "when I go to delete them it also deletes the previous month. So I lose that data",
            "jtbd": "Навигация между неделями без потери данных",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["navigation-bug", "data-loss"]
        }
    ],
    "7078498401": [],  # request
    "7065615553": [
        {
            "text": "Приложение не вычитает перерывы автоматически — пользователь вынужден вручную вычислять (9-5 это 7.5 с обедом).",
            "trigger": "Either the hours are incorrect because it does not account for breaks. An example; 9 to 5 is not 8 hours. 9 to 5 is 7 1/2 hours because there was a half an hour in there for lunch",
            "jtbd": "Корректный расчёт рабочего времени с учётом перерывов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["break-handling", "calculation"]
        }
    ],
    "7064311945": [
        {
            "text": "На первой неделе месяца приложение предзаполняет часы из предыдущего месяца, и удаление приводит к потере данных.",
            "trigger": "the first week of the month is already pre-filled with the hours I worked the previous month. when I go to delete them it also deletes the previous month",
            "jtbd": "Корректное начало месяца без потери предыдущих данных",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["month-boundary", "data-loss"]
        }
    ],
    "7023213580": [
        {
            "text": "Приложение не сохраняет пользовательскую настройку дня начала недели (воскресенье).",
            "trigger": "My week begins on Sunday and it was allowing for that. Suddenly, Monday starts the week",
            "jtbd": "Настройка дня начала недели в соответствии с требованиями работодателя",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["settings-reset", "week-config"]
        }
    ],
    "7014616370": [],  # requests
    "6960094169": [],  # generic praise
    "6947576550": [
        {
            "text": "Замена электронных таблиц на приложение обнаружила, что некоторые проекты занимают неожиданно много времени на отчёты.",
            "trigger": "I've been surprised how much time I was spending on my reports",
            "jtbd": "Точное отслеживание времени проектов для выставления счетов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["spreadsheet-replacement", "time-insight"]
        }
    ],
    "6791825687": [
        {
            "text": "Приложение отслеживает только неделю и месяц, но не финансовый год (1 июля в Австралии).",
            "trigger": "it does NOT keep track of annual times/charges. So the cumulative figure is from when you start using the app, not from the start of your financial year",
            "jtbd": "Отслеживание финансового года вместо календарного года",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["financial-year", "calendar-limit"]
        }
    ],
    "6756408853": [
        {
            "text": "После обновления iOS 14.2 приложение перестало переходить на следующую неделю — регрессия совместимости.",
            "trigger": "Can no longer move to next week for tracking",
            "jtbd": "Отслеживание часов с навигацией по неделям",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["os-compatibility", "regression"]
        }
    ],
    "6735692475": [
        {
            "text": "Геофенсинг с опцией удалённого режима позволяет отслеживать часы без обновления локации при работе из дома.",
            "trigger": "I went to manually clock in while I was working from home and it gave me the option to work \"remotely\" and not update my location",
            "jtbd": "Автоматическое отслеживание рабочего времени с гибкими вариантами локации",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["geofencing", "remote-work"]
        }
    ],
    "6725879586": [
        {
            "text": "При установке приложение зависало и блокировало iPhone — требуется принудительная перезагрузка.",
            "trigger": "e inmediatamente se me quedó bloqueado el terminal",
            "jtbd": "Успешная установка и инициализация приложения",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["crash", "initialization-bug"]
        }
    ],
    "6716002875": [],  # commodity complaint about paywall shift
    "6681147537": [
        {
            "text": "Функция паузы позволяет адвокату отслеживать многочисленные дела в день с прерываниями от звонков.",
            "trigger": "I work on many things throughout the day and get interrupted by phone calls. So, I love the pause feature, and use it all day",
            "jtbd": "Отслеживание фрагментированного рабочего дня с многочисленными прерываниями",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["pause-feature", "context-switching"]
        }
    ],
    "6675178689": [],  # request
    "6659262278": [
        {
            "text": "Разделение по часам (обычное, 1.5x, 2x) по периодам оплаты позволяет отследить сложную структуру зарплаты.",
            "trigger": "I loved that you could track regular hours, 1.5x hours and 2x hours by pay period, so I started recommending to my co workers",
            "jtbd": "Отслеживание сложных структур зарплаты с несколькими ставками",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["overtime-tracking", "recommendation"]
        }
    ],
    "6643911965": [
        {
            "text": "Постоянные обновления и редизайн интерфейса показывают активное развитие — пользователь остаётся благодаря уверенности в поддержке.",
            "trigger": "It's also looking good after the recent design refresh, which also demonstrates that the developers are actively still committed to the app",
            "jtbd": "Долгосрочное использование надёжного приложения с активной поддержкой",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["developer-commitment", "active-maintenance"]
        }
    ],
    "6638690493": [
        {
            "text": "Многие работодатели начинают неделю с воскресенья, но приложение не позволяет изменить день начала недели.",
            "trigger": "there's not a way to change the week format to start the dates on a Sunday",
            "jtbd": "Отслеживание рабочего времени в соответствии с корпоративным дневником платежных периодов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["week-config", "payroll-sync"]
        }
    ],
    "6637553165": [],  # generic complaint about UI change
    "6612965776": [
        {
            "text": "Копирование проектов и переименование позволяет отслеживать разные проекты с точностью до минуты; облачная синхронизация сохраняет данные при смене телефона.",
            "trigger": "I simply copy old jobs and rename them to the new project name. I really like the cloud backup option as I've upgraded phones and all my data came through without issue",
            "jtbd": "Надёжное отслеживание нескольких проектов с сохранением истории при смене устройства",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["project-templating", "cloud-backup"]
        }
    ],
    "6607440906": [],  # generic praise
    "6606360395": [],  # generic praise
    "6526810096": [
        {
            "text": "Отслеживание часов подрядчиков с разными ставками требует ручного ввода зарплаты для каждого — утомительно при 5 подрядчиках.",
            "trigger": "I have to manual put in there wage as I track there hours, alright with 1 bloke but try 5 gets tiring",
            "jtbd": "Управление рабочим временем и зарплатой нескольких подрядчиков",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["team-management", "wage-entry-friction"]
        }
    ],
    "6524485077": [
        {
            "text": "Предварительное заполнение настроек (стандартные часы, перерывы, доплаты) сэкономит время опытным пользователям.",
            "trigger": "It would be nice if the app already pre input it for me everyday as I clock in",
            "jtbd": "Ускорение процесса отслеживания повторяющихся элементов рабочего дня",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["presets", "time-saving"]
        }
    ],
    "6413828570": [],  # generic praise
    "6212777011": [
        {
            "text": "Возможность запуска нескольких таймеров одновременно с редактированием после факта решает проблему забывчивости фрилансера.",
            "trigger": "Ability to add and run multiple timers simultaneously. Edit times afterwards",
            "jtbd": "Отслеживание нескольких параллельных задач с гибким редактированием",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["multi-timer", "retroactive-edit"]
        }
    ],
    "6114206597": [
        {
            "text": "При первой работе приложение позволило оценить справедливость расчётов зарплаты — метрика точности экономит деньги при ненадёжной системе работодателя.",
            "trigger": "I wanted to make sure I wasn't losing any money so I started to track my hours with this app",
            "jtbd": "Защита от ошибок зарплаты при ненадёжной системе работодателя",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["wage-verification", "audit-protection"]
        }
    ],
    "6027303095": [
        {
            "text": "Приложение не имеет лишних функций, что делает его проще конкурирующих трекеров с перегруженным интерфейсом.",
            "trigger": "could never find one that just did what I needed to do and that was just to keep track of hours without a bunch of other junk",
            "jtbd": "Простое отслеживание часов без лишних возможностей",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["simplicity", "minimalism"]
        }
    ],
    "6017749213": [],  # generic praise
    "5998234304": [
        {
            "text": "Функция «отметить как» с произвольным временем исправляет забытую отметку без потери точности.",
            "trigger": "the ability to clock in and out \"as of\" whatever time you want. There are so many times when I forget to clock in or out. With this app, that is no longer an issue",
            "jtbd": "Исправление забытых отметок времени",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["retroactive-entry", "error-correction"]
        }
    ],
    "5969202993": [
        {
            "text": "Приложение жёстко кодирует коэффициенты переработок (1.5x и 2x), не позволяя установить нестандартные ставки (1.3x и 1.6x).",
            "trigger": "Lacks the ability to amend the overtime rate, it's set at 1.5 and 2x. I actually get 1.3 and 1.6",
            "jtbd": "Отслеживание нестандартных структур переработок и ночных надбавок",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["custom-rates", "overtime-limitation"]
        }
    ],
    "5891160955": [],  # request
    "5816866529": [],  # request
    "5766196418": [
        {
            "text": "Экспорт часов был бы полнее с опциями архивирования выставленных часов и формирования счёт-фактур.",
            "trigger": "Export is great but the icing on the cake would be an invoice and archive billed time option",
            "jtbd": "Полный цикл отслеживания часов, выставления счетов и их архивирования",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["invoicing", "archive", "workflow-completion"]
        }
    ]
}

# Second file: -0010.txt reviews with extracted observations
OBSERVATIONS_0010 = {
    "5765589933": [
        {
            "text": "Приложение не позволяет устанавливать время окончания в некоторых случаях, и не распознаёт AM/PM.",
            "trigger": "it hasn't been letting me set my end time for some reason. It also doesn't allow me to put an \"AM\" time anymore but SOMETIMES allows me to put a \"PM\"",
            "jtbd": "Корректное введение времени работы",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["input-bug", "time-entry"]
        }
    ],
    "5664004430": [],  # generic praise
    "5504358525": [
        {
            "text": "Возможность установки разных ставок зарплаты для разных должностей на одной работе (водитель, помощник, режим ожидания) и экспорт в CSV позволяет проверить расчёты зарплаты с работодателем.",
            "trigger": "All the positions pay differently. These jobs can be tuned to fit pay. I was able to download the CSV file for that pay period. From there it was easy to print the file and show it to my manager",
            "jtbd": "Управление несколькими ставками зарплаты и проверка справедливости расчётов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["multi-rate", "export", "wage-verification"]
        }
    ],
    "5414792218": [
        {
            "text": "Приложение показывает колонку «Перерыв» в отчёте, но не предоставляет интерфейса для добавления перерывов — это проектный дефект.",
            "trigger": "the report generates a column for a \"Break\" but I don't see an option to add in one during the work day",
            "jtbd": "Отслеживание перерывов в рабочем времени",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["break-feature-gap", "reporting-gap"]
        }
    ],
    "5334910249": [],  # generic praise
    "5333002662": [
        {
            "text": "Приложение не позволяет устанавливать время окончания при переносе времени работы на следующий день (4pm-12:10am).",
            "trigger": "I started work @ 4:00 pm and didn't get off till 12:10 am and it would not let me set my ending time",
            "jtbd": "Ввод рабочего времени, переходящего за полночь",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["input-bug", "cross-midnight"]
        }
    ],
    "5283212522": [
        {
            "text": "Приложение работает бесплатно только 21 день, затем требует либо покупку, либо удаление старых данных.",
            "trigger": "Works great easy to use for 21 days then you have to pay or delete old data",
            "jtbd": "Продолжение использования приложения без платежа",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["paywall", "data-deletion"]
        }
    ],
    "5276737732": [
        {
            "text": "Приложение останавливается и требует оплаты каждую неделю в день платежного периода, хотя описано как полностью бесплатное.",
            "trigger": "stopped on December 1. Having the same problem every week it, stops on the 8th this time",
            "jtbd": "Непрерывное использование приложения без блокировок в платежные дни",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["paywall-trap", "misleading"]
        }
    ],
    "5258996977": [],  # commodity complaint
    "5207768302": [
        {
            "text": "При выборе времени окончания приложение по умолчанию использует время начала вместо текущего времени — требуется ручная прокрутка.",
            "trigger": "when choosing an end time the start time is the default if one has been set",
            "jtbd": "Быстрое введение времени окончания работы",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["ui-affordance", "time-entry"]
        }
    ],
    "5182532129": [
        {
            "text": "При введении времени выхода приложение по умолчанию использует время входа вместо текущего, требуя прокрутки для корректировки.",
            "trigger": "when I punch out, it is still the same time as punch in, not the current time. I need to scroll down to adjust",
            "jtbd": "Быстрое введение времени выхода с текущим временем по умолчанию",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["ui-affordance", "time-entry"]
        }
    ],
    "5127158560": [
        {
            "text": "Приложение работает на iPhone и iPad, но не синхронизирует данные между устройствами — требуется ручное восстановление из резервной копии.",
            "trigger": "It works great on my iPhone & iPad, but since it was designed for the phone only, there is no way to sync the two devices",
            "jtbd": "Синхронизация данных отслеживания времени между устройствами",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["cross-device-sync", "mobile-first-design"]
        }
    ],
    "5099904403": [
        {
            "text": "Приложение требует покупку после 21 дня использования для сохранения записей — преграда замаскирована как «испытание», хотя работает как подписка.",
            "trigger": "It keeps records for 21 days then I have to buy, or I just erase the records and start the 21 days again",
            "jtbd": "Постоянное использование приложения для отслеживания часов",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["paywall-friction", "deceptive-trial"]
        }
    ],
    "5066681709": [],  # commodity complaint about paywall
    "4965618112": [
        {
            "text": "Отсутствие архивирования проектов приводит к накоплению в приложении; опции только экспорт или удаление — невозможно справочное обращение к старым проектам.",
            "trigger": "I work a lot of project based jobs. These stack up quickly in the app. The only options are export and delete",
            "jtbd": "Управление длинной историей проектов без перегрузки интерфейса",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["project-management", "archiving"]
        }
    ],
    "4902736154": [
        {
            "text": "Apple Watch позволяет нажать одну кнопку для фиксирования времени при забывчивости, что ускоряет процесс.",
            "trigger": "Once I got the Apple Watch version, clicking in became even easier then ever before",
            "jtbd": "Быстрое фиксирование времени во время работы",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["apple-watch", "convenience"]
        }
    ],
    "4786039078": [
        {
            "text": "Приложение помогает пользователю с гибким графиком удерживать недельный лимит 40 часов, но не имеет встроенного счётчика перерывов.",
            "trigger": "this has really helped me maintain my 40 hour/week goal",
            "jtbd": "Поддержание целевого количества рабочих часов в неделю",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["goal-tracking", "self-employed"]
        }
    ],
    "4468780617": [
        {
            "text": "Приложение поддерживает только почасовую оплату, а не дневную ставку, которая распространена среди фрилансеров.",
            "trigger": "please add the pay rate per day, other than the pay rate per hour! That's the case for many freelancers",
            "jtbd": "Отслеживание фрилансерских проектов с дневными ставками",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["freelance-billing", "pricing-model"]
        }
    ],
    "4357966159": [],  # generic praise
    "4316007918": [
        {
            "text": "Приложение не поддерживает пользовательские платежные периоды (напр. последнюю пятницу месяца с вычетом за 5 дней).",
            "trigger": "my pay period is not listed under the current options. I am paid on the final Friday of every month",
            "jtbd": "Настройка платежных периодов в соответствии с политикой работодателя",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["payroll-config", "custom-period"]
        }
    ],
    "4245638358": [
        {
            "text": "Приложение не имеет учётной записи или входа, поэтому данные не синхронизируются между iPhone и iPad.",
            "trigger": "it seems there is non concept of an account or login, so the data is not shared between my phone and my iPad",
            "jtbd": "Синхронизация данных отслеживания времени между устройствами",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["no-sync", "multi-device"]
        }
    ],
    "4156252703": [
        {
            "text": "Геолокация удобна, но распознавание местоположения ненадёжно и требует ручного надзора — это не «set-and-forget».",
            "trigger": "for some inexplicable reason it decides not to track anything. The Geo fencing is good, but if it's not, then you end up running the risk of not having punches tracked",
            "jtbd": "Надёжное автоматическое отслеживание по геолокации",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["geofencing-reliability", "manual-oversight"]
        }
    ],
    "4147658338": [],  # generic praise
    "4142714190": [],  # generic praise
    "4136531591": [
        {
            "text": "Рабочая смена, пересекающая границу месяца, не разделяется на две части по месяцам — остаётся одним блоком.",
            "trigger": "if you over a shift that goes into the next month it doesn't split the hours and pay between the months",
            "jtbd": "Корректная обработка рабочих смен, пересекающих границы платежных периодов",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["month-boundary", "shift-splitting"]
        }
    ],
    "4119613936": [
        {
            "text": "Приложение с геофенсингом отслеживает время, проведённое в разных местах, что помогает пользователю планировать время (напр. в спортзале).",
            "trigger": "I go between locations/buildings quite a bit throughout the day. I even use it for things that are not job related just to help me keep track of how long I spend at certain locations (gym)",
            "jtbd": "Анализ времени, проведённого в разных местах, для планирования",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["geofencing", "time-planning", "life-tracking"]
        }
    ],
    "4080092690": [
        {
            "text": "Приложение не работает на десктопе, и служба поддержки не отвечает на запросы об отмене подписки.",
            "trigger": "The app doesn't work on the desktop. I sent an email and no one answers. I am trying to cancel the HoursTracker Cloud but they do not cancel",
            "jtbd": "Полнофункциональное использование приложения и получение поддержки",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["desktop-incompatibility", "support-failure"]
        }
    ],
    "3971300366": [],  # commodity complaint about limits and ads
    "3876281488": [],  # generic praise in Portuguese
    "3819469848": [
        {
            "text": "Приложение не имеет альбомной ориентации и требует вертикальную ориентацию iPad — это неудобно для множественных заданий.",
            "trigger": "i just wish there was an iPad version. I hate having to tilt my head to the side or place the iPad on vertically",
            "jtbd": "Удобное отслеживание нескольких заданий на планшете",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["responsive-design", "tablet-optimization"]
        }
    ],
    "3773519806": [],  # request for Apple Watch complication
    "3724056420": [
        {
            "text": "Приложение генерирует уведомление о сторожа при проезде мимо работы, когда не нужно отмечаться.",
            "trigger": "sometimes I drive past my work and I get a notification, annoying",
            "jtbd": "Контролируемое использование геолокации без ложных срабатываний",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["geofencing-false-positive", "notification-control"]
        }
    ],
    "3663624990": [],  # commodity complaint about deceptive trial
    "3660933392": [],  # commodity complaint about pricing
    "3632320509": [
        {
            "text": "В Австралии первые 2 часа сверхурочных выплачиваются 1.5x, остальные 2x, но приложение этого не поддерживает.",
            "trigger": "Weekend on Australia first 2 hours is 1.5 and after that double time ! Thank you so much !!!",
            "jtbd": "Отслеживание региональных структур переработок",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["regional-rules", "overtime-tiers"]
        }
    ],
    "3611702780": [],  # generic praise
    "3606161433": [],  # commodity complaint about paywall
    "3585390631": [
        {
            "text": "Интерфейс редактирования заданий не позволяет изменить налоговую ставку после создания — требуется создание новых заданий для каждого дня с исправленным процентом.",
            "trigger": "I have 2 pay periods worth of jobs and realized I miscalculated the tax rate. the only way to fix this is to make new jobs",
            "jtbd": "Корректировка налоговых ставок для уже созданных заданий",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["tax-config", "edit-limitation"]
        }
    ],
    "3580541958": [
        {
            "text": "Точное отслеживание часов помогает фрилансеру не занижать стоимость работы и проводить аналитику эффективности по типам заданий.",
            "trigger": "I can keep track of all my jobs and keep it down to an accuracy that allows me to be honest with my clients. allows me to put notations on my various type of jobs so I can later do analytics on my proficiency",
            "jtbd": "Анализ производительности и честное выставление счетов в консалтинге",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["job-analytics", "profitability", "proficiency-tracking"]
        }
    ],
    "3464207346": [
        {
            "text": "Приложение не поддерживает разные почасовые ставки для разных дней недели (£8 пн-пт, £12 сб, £15 вс) — это базовые ставки, не переработки.",
            "trigger": "I earn £8ph on Monday to Friday but £12ph on Saturdays and £15ph on Sundays. These different pay rates aren't overtime",
            "jtbd": "Отслеживание почасовых ставок, различающихся по дням недели",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["pay-rate-schedule", "day-based-pricing"]
        }
    ],
    "3462037691": [
        {
            "text": "Приложение не позволяет устанавливать разные почасовые ставки для разных дней недели и сохранять их отдельно.",
            "trigger": "need to be able to adjust pay per day. Sat/sun hour rates etc also adjust and save hourly rates separately",
            "jtbd": "Управление почасовыми ставками для разных дней недели",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["pay-rate-schedule", "day-based-pricing"]
        }
    ],
    "3425857845": [],  # request
    "3380088169": [],  # generic praise
    "3297902267": [],  # generic praise
    "3290791982": [],  # generic praise
    "3155833861": [
        {
            "text": "Приложение позволяет предварительно установить повторяющиеся времена входа-выхода и перерывов, что экономит ручной ввод для предсказуемого графика.",
            "trigger": "you could even automatically enter those times (including breaks) if you have predictable times",
            "jtbd": "Ускорение отслеживания повторяющегося графика работы",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["automation", "schedule-template"]
        }
    ],
    "3095577113": [
        {
            "text": "Приложение не позволяет устанавливать разные почасовые ставки в одном задании в зависимости от дня недели, что требует создания дублей одного задания.",
            "trigger": "the pay changes depending on whether it's monday to friday, saturday, or sunday. I've needed to create multiple versions of the same job",
            "jtbd": "Управление почасовыми ставками для разных дней недели в одном задании",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["pay-rate-schedule", "job-duplication"]
        }
    ],
    "2983363194": [],  # request
    "2781776621": [
        {
            "text": "Приложение допускает только 21 запись в бесплатной версии, что не покрывает даже месяц работы для некоторых пользователей.",
            "trigger": "you can only set 21 entries in it before you are forced to by premium. That doesn't even cover me for a month of work",
            "jtbd": "Отслеживание всех часов работы в месяц",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["entry-limit", "paywall"]
        }
    ],
    "2780574242": [
        {
            "text": "После обновления приложения теги пользователя исчезли из доступных для новых заданий, хотя они остаются в старых записях.",
            "trigger": "Most of my tags I've spent years perfecting have now vanished. They still appear on historical entries but are no longer available to add to new jobs",
            "jtbd": "Сохранение пользовательских тегов при обновлении приложения",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["data-loss", "upgrade-regression"]
        }
    ]
}

def build_results(observations_dict, reviews):
    """Build full results with persona and observations."""
    results = []
    for review in reviews:
        rid = review["review_id"]
        obs_list = observations_dict.get(rid, [])

        result = {
            "review_id": rid,
            "rating": review["rating"],
            "persona": {
                "tenure": None,
                "primary_use": None,
                "engagement": None,
                "trial_path": None
            },
            "emotional_tone": None,
            "competitor_mentions": [],
            "observations": obs_list
        }
        results.append(result)

    return results

def process_file(filepath, observations_dict, output_dir="extract/out"):
    """Load reviews and build full output."""
    with open(filepath, 'r') as f:
        content = f.read()

    idx = content.find("REVIEWS TO PROCESS:")
    reviews_json = content[idx + len("REVIEWS TO PROCESS:"):].strip()
    reviews = json.loads(reviews_json)

    results = build_results(observations_dict, reviews)

    basename = Path(filepath).name.replace('.txt', '.json')
    outpath = Path(output_dir) / basename
    outpath.parent.mkdir(parents=True, exist_ok=True)

    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump({"results": results}, f, ensure_ascii=False)

    obs_count = sum(len(r.get('observations', [])) for r in results)
    print(f"{basename}: {len(reviews)} reviews, {obs_count} observations")

if __name__ == "__main__":
    process_file(
        "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0009.txt",
        OBSERVATIONS_0009
    )
    process_file(
        "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0010.txt",
        OBSERVATIONS_0010
    )
