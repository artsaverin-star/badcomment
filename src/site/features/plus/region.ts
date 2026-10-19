// Who pays on the website. ЮKassa takes Russian cards and СБП, and App Store payments don't work
// in Russia; everyone else buys Plus in the iPhone app (owner, 2026-10-19). "In Russia" is read
// from the browser's time zone, not the IP: many people in Russia browse through a VPN, and
// sending them to the App Store would lose the sale. An unknown or generic zone (UTC, privacy
// browsers) counts as Russia, so only a known foreign zone moves a visitor to the app.

const RUSSIAN_TIME_ZONES = new Set([
  "Europe/Kaliningrad",
  "Europe/Moscow",
  "W-SU",
  "Europe/Simferopol",
  "Europe/Kirov",
  "Europe/Volgograd",
  "Europe/Astrakhan",
  "Europe/Saratov",
  "Europe/Ulyanovsk",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Barnaul",
  "Asia/Tomsk",
  "Asia/Novokuznetsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Chita",
  "Asia/Yakutsk",
  "Asia/Khandyga",
  "Asia/Vladivostok",
  "Asia/Ust-Nera",
  "Asia/Magadan",
  "Asia/Sakhalin",
  "Asia/Srednekolymsk",
  "Asia/Kamchatka",
  "Asia/Anadyr",
]);

/** True unless the time zone is a known one outside Russia. */
export function isRussianTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone || !timeZone.includes("/") || timeZone.startsWith("Etc/")) return true;
  return RUSSIAN_TIME_ZONES.has(timeZone);
}

/** The browser's verdict; on the server (no time zone to read) the visitor counts as in Russia. */
export function browserInRussia(): boolean {
  try {
    return isRussianTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return true;
  }
}
