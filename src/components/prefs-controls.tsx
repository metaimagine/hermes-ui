"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang, ThemeMode, UiMessages } from "@/lib/ui/i18n";

async function savePreference(name: string, value: string) {
  await fetch("/api/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, value }),
  });
}

export function PrefsControls({ lang, theme, messages }: { lang: Lang; theme: ThemeMode; messages: UiMessages }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLang(next: Lang) {
    startTransition(async () => {
      await savePreference("lang", next);
      router.refresh();
    });
  }

  function setTheme(next: ThemeMode) {
    startTransition(async () => {
      await savePreference("theme", next);
      router.refresh();
    });
  }

  return (
    <div className="prefs-row">
      <div className="segmented-control" aria-label="Language switcher">
        <button className={lang === "zh" ? "segment active" : "segment"} onClick={() => setLang("zh")} disabled={isPending}>{messages.common.chinese}</button>
        <button className={lang === "en" ? "segment active" : "segment"} onClick={() => setLang("en")} disabled={isPending}>{messages.common.english}</button>
      </div>
      <div className="segmented-control" aria-label="Theme switcher">
        <button className={theme === "dark" ? "segment active" : "segment"} onClick={() => setTheme("dark")} disabled={isPending}>{messages.common.dark}</button>
        <button className={theme === "light" ? "segment active" : "segment"} onClick={() => setTheme("light")} disabled={isPending}>{messages.common.light}</button>
      </div>
    </div>
  );
}
