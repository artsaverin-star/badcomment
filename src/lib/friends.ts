import friends from "@/data/friends.json";

// "Друзья" — комп-доступ без оплаты. Список ведётся вручную в
// src/data/friends.json: telegram-ник, telegram id или email (любой из них).
// Друг получает полный премиум-доступ бессрочно и статус «Друг» в меню аккаунта.
// Хранится файлом, а не в БД, — чтобы выдавать доступ без миграций (просто
// добавить строку и задеплоить).
const SET = new Set((friends as string[]).map((s) => s.trim().toLowerCase()).filter(Boolean));

export function isFriendIdentity(u: {
  telegramId?: string | null;
  username?: string | null;
  email?: string | null;
}): boolean {
  if (!SET.size) return false;
  for (const v of [u.telegramId, u.username, u.email]) {
    if (v && SET.has(String(v).trim().toLowerCase())) return true;
  }
  return false;
}
