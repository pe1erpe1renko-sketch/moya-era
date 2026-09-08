"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { peekAfterPay, takeAfterPay } from "@/lib/returnTo";

/**
 * Куда после оплаты. Если человек пришёл с замка в разборе — главная
 * кнопка ведёт обратно в разбор; кабинет — второй.
 */
export function AfterPayLinks() {
  const router = useRouter();
  const [back, setBack] = useState<string | null>(null);
  useEffect(() => {
    setBack(peekAfterPay());
  }, []);
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {back && (
        <button
          type="button"
          onClick={() => router.push(takeAfterPay() ?? back)}
          className="qc-focus inline-flex h-12 items-center rounded-[12px] bg-accent px-6 text-[16px] font-medium text-primary-foreground"
        >
          Вернуться к разбору
        </button>
      )}
      <Link href="/cabinet" className={`qc-focus inline-flex h-12 items-center rounded-[12px] px-6 text-[16px] ${back ? "border border-border text-text-primary" : "bg-accent font-medium text-primary-foreground"}`}>
        В кабинет
      </Link>
    </div>
  );
}
