"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { METRIKA_ID } from "@/lib/env";

/** Яндекс.Метрика. Включается переменной NEXT_PUBLIC_METRIKA_ID. */
export function Metrika() {
  const pathname = usePathname();

  useEffect(() => {
    if (!METRIKA_ID || !window.ym) return;
    window.ym(Number(METRIKA_ID), "hit", window.location.href);
  }, [pathname]);

  if (!METRIKA_ID) return null;

  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${Number(METRIKA_ID)}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false, defer:true });`}
    </Script>
  );
}
