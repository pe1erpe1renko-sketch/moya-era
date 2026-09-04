"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { METRIKA_ID } from "@/lib/env";
import { publicUrl } from "@/lib/chartUrl";

/**
 * Яндекс.Метрика. Включается переменной NEXT_PUBLIC_METRIKA_ID.
 *
 * АДРЕС ЧИСТИТСЯ ПЕРЕД ОТПРАВКОЙ. В адресе страницы может стоять имя
 * человека (?n= для числа судьбы) — это персональные данные, и в чужой
 * статистике им не место. `publicUrl` снимает такие параметры, остальной
 * адрес уходит как есть.
 *
 * `defer: true` в init обязателен: без него счётчик сам отправит первый
 * просмотр с настоящим, неочищенным адресом ещё до нашего вызова.
 */
export function Metrika() {
  const pathname = usePathname();

  useEffect(() => {
    if (!METRIKA_ID || !window.ym) return;
    window.ym(Number(METRIKA_ID), "hit", publicUrl(window.location.href), {
      // Откуда пришли — тоже адрес нашего сайта и тоже может нести имя.
      referer: publicUrl(document.referrer),
    });
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
