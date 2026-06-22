"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BoltIcon from "./BoltIcon";
import { tokensWord } from "@/lib/tokenConfig";

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  ref: string | null;
  balanceAfter: number;
  createdAt: string;
};

const TYPE_NOUN: Record<string, string> = { app: "приложение", idea: "идею", category: "категорию" };

function describe(r: LedgerRow): { icon: string; label: string } {
  if (r.reason === "unlock") {
    const [type, ...rest] = (r.ref ?? "").split(":");
    const slug = rest.join(":");
    return { icon: type === "category" ? "🗂️" : type === "idea" ? "💡" : "📱", label: `Открыл ${TYPE_NOUN[type] ?? "контент"} · ${slug}` };
  }
  if (r.reason === "purchase") {
    const src = (r.ref ?? "").startsWith("tg:") ? "Telegram Stars" : (r.ref ?? "").startsWith("yk:") ? "карта" : "покупка";
    return { icon: "💳", label: `Покупка энергии · ${src}` };
  }
  if (r.reason === "signup") return { icon: "🎁", label: "Грант за регистрацию" };
  if (r.reason === "comp") return { icon: "⭐", label: "Начисление (комп)" };
  if (r.reason === "admin") return { icon: "🛠️", label: "Начисление (админ)" };
  return { icon: "•", label: r.reason };
}

// Admin: a balance chip that opens a token-history popup for one user. `display`
// overrides the chip content (e.g. ∞ for unlimited users) while keeping the same
// clickable popup, so the owner can inspect a lifetime/friend account's ledger too.
export default function TokenHistory({ userId, balance, name, display }: { userId: string; balance: number; name: string; display?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [paid, setPaid] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch(`/api/admin/ledger?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setRows(d.ledger ?? []);
        setPaid(d.paidUnlocks ?? 0);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const spent = (rows ?? []).filter((r) => r.delta < 0).reduce((s, r) => s + r.delta, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRows(null);
          setOpen(true);
        }}
        className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-footnote font-semibold tabular-nums text-[var(--color-text-brand)] transition-colors hover:border-[var(--color-border-strong)]"
        title="История энергии"
      >
        {display ?? <span className="inline-flex items-center gap-1"><BoltIcon size={12} /> {balance}</span>}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)] sm:rounded-[var(--radius-2xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
              <div className="min-w-0">
                <div className="truncate text-callout font-semibold text-[var(--color-text-primary)]">{name}</div>
                <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
                  Баланс <BoltIcon size={11} className="inline" /> {balance} · потрачено {Math.abs(spent)} · платных открытий {paid}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                aria-label="Закрыть"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {rows === null ? (
                <p className="py-10 text-center text-caption text-[var(--color-text-tertiary)]">Загружаем…</p>
              ) : rows.length === 0 ? (
                <p className="py-10 text-center text-caption text-[var(--color-text-tertiary)]">
                  Операций пока нет.
                </p>
              ) : (
                rows.map((r) => {
                  const { icon, label } = describe(r);
                  const pos = r.delta >= 0;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 hover:bg-[var(--color-surface-card-subtle)]">
                      <span className="text-[16px] leading-none">{icon}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-footnote text-[var(--color-text-primary)]">{label}</span>
                        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
                          {new Date(r.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "")} · баланс {r.balanceAfter}
                        </span>
                      </span>
                      <span className={`shrink-0 text-footnote font-semibold tabular-nums ${pos ? "text-[#4ade80]" : "text-[var(--color-text-secondary)]"}`}>
                        {pos ? "+" : ""}
                        {r.delta} {tokensWord(Math.abs(r.delta))}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
