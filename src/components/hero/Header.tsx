"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { backend } from "@/lib/backend";
import { directions } from "@/lib/directions";
import { authHref, currentPath, leaveForAuth } from "@/lib/returnTo";
const logoAsset = "/images/logo.svg";

const LINKS = [
  { label: "Как это работает", href: "/#how" },
  { label: "Тарифы", href: "/tarify" },
];

/** Есть ли у авторизованного пользователя дата рождения в профиле. */
function useHasBirthDate() {
  const { user } = useAuth();
  const [hasBirth, setHasBirth] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setHasBirth(false);
      return;
    }
    backend.profiles.getOwner(user.id).then(({ data }) => {
      if (active) setHasBirth(Boolean(data?.birth_date));
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return hasBirth;
}

/** Куда ведёт пункт меню направления с учётом состояния пользователя. */
function useDirectionTarget() {
  const { isAuthenticated } = useAuth();
  const hasBirth = useHasBirthDate();

  return (d: (typeof directions)[number]) => {
    const toCabinet = isAuthenticated && (hasBirth || d.id === "humandesign");
    return { href: toCabinet ? `/cabinet/${d.id}` : d.path } as const;
  };
}

function isCurrent(pathname: string, d: (typeof directions)[number]) {
  return pathname === d.path || pathname === `/cabinet/${d.id}`;
}

function DirectionsMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const leaveTimer = useRef<number | null>(null);
  const target = useDirectionTarget();
  const pathname = usePathname();

  useEffect(() => {
    return () => {
      if (leaveTimer.current) {
        window.clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const focusItem = (i: number) => {
    const len = directions.length;
    const idx = (i + len) % len;
    itemsRef.current[idx]?.focus();
  };

  const handleEnter = () => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    leaveTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => focusItem(0));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => focusItem(0));
          }
        }}
        className="text-text-secondary hover:text-text-accent text-[15px] transition-colors"
      >
        Направления
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full grid grid-cols-2"
          style={{
            width: 560,
            maxWidth: "calc(100vw - 40px)",
            paddingTop: 32,
            paddingRight: 20,
            paddingBottom: 20,
            paddingLeft: 20,
            gap: 8,
            background: "rgba(3, 25, 30, 0.97)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            animation: "dirmenu-in 200ms ease-out",
          }}
        >
          {directions.map((d, i) => {
            const current = isCurrent(pathname, d);
            return (
              <Link
                key={d.id}
                {...target(d)}
                role="menuitem"
                ref={(el) => {
                  itemsRef.current[i] = el;
                }}
                onClick={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    focusItem(i + 1);
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    focusItem(i - 1);
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
                className="dir-menu-item block"
                style={{ padding: 12, borderRadius: 10 }}
              >
                <span
                  className="dir-menu-title flex items-center gap-2 font-display"
                  style={{
                    fontSize: "clamp(15px, 1.15vw, 18px)",
                    color: current ? "var(--text-accent)" : "var(--text-primary)",
                  }}
                >
                  {current && (
                    <span
                      aria-hidden="true"
                      className="inline-block shrink-0 rounded-full"
                      style={{ width: 6, height: 6, background: "var(--text-accent)" }}
                    />
                  )}
                  {d.title}
                </span>
                <span
                  className="block truncate text-text-secondary"
                  style={{ fontSize: "clamp(12px, 0.95vw, 14px)", marginTop: 3 }}
                >
                  {d.desc}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const { isAuthenticated, email, loading } = useAuth();
  const target = useDirectionTarget();
  const pathname = usePathname();
  const router = useRouter();

  const solid = scrolled || pathname !== "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b transition-all duration-300"
        style={{
          height: "var(--header-h)",
          paddingLeft: "clamp(20px, 4vw, 64px)",
          paddingRight: "clamp(20px, 4vw, 64px)",
          // Плотный фон, а не полупрозрачный с размытием: сквозь него
          // просвечивал текст страницы и путался с пунктами меню.
          // Прозрачной шапка остаётся только на самом верху главной —
          // там под ней звёздное небо первого экрана.
          background: solid ? "var(--bg-page)" : "transparent",
          borderColor: solid
            ? "color-mix(in srgb, var(--border) 40%, transparent)"
            : "transparent",
        }}
      >
        <Link href="/" className="flex items-center">
          <img
            src={logoAsset}
            alt="Моя Эра"
            className="w-auto"
            style={{ height: "clamp(44px, 3.6vw, 72px)" }}
          />
        </Link>

        <nav className="hidden items-center md:flex">
          <div className="flex items-center gap-8">
            <DirectionsMenu />
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-text-secondary hover:text-text-accent text-[15px] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="ml-[28px]">
            {loading ? null : isAuthenticated ? <AccountBlock email={email} /> : <LoginButton />}
          </div>
        </nav>

        <button
          type="button"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 flex-col items-center justify-center gap-[6px] md:hidden"
        >
          {open ? (
            <>
              <span className="block h-[2px] w-6 translate-y-[4px] rotate-45 bg-text-primary" />
              <span className="block h-[2px] w-6 -translate-y-[4px] -rotate-45 bg-text-primary" />
            </>
          ) : (
            <>
              <span className="block h-[2px] w-6 bg-text-primary" />
              <span className="block h-[2px] w-6 bg-text-primary" />
              <span className="block h-[2px] w-6 bg-text-primary" />
            </>
          )}
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-[99] flex flex-col items-center justify-center gap-6 md:hidden"
          style={{ background: "rgba(3, 25, 30, 0.97)" }}
        >
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-expanded={dirOpen}
              onClick={() => setDirOpen((v) => !v)}
              className="flex items-center gap-3 text-text-primary text-[20px]"
            >
              Направления
              <span className="text-text-accent">{dirOpen ? "−" : "+"}</span>
            </button>
            {dirOpen && (
              <div
                className="mt-4 flex flex-col self-start"
                style={{ paddingLeft: 20, gap: 16 }}
              >
                {directions.map((d) => {
                  const current = isCurrent(pathname, d);
                  return (
                    <Link
                      key={d.id}
                      {...target(d)}
                      onClick={() => {
                        setOpen(false);
                        setDirOpen(false);
                      }}
                      className="flex items-center gap-2 text-[17px]"
                      style={{ color: current ? "var(--text-accent)" : "var(--text-secondary)" }}
                    >
                      {current && (
                        <span
                          aria-hidden="true"
                          className="inline-block shrink-0 rounded-full"
                          style={{ width: 6, height: 6, background: "var(--text-accent)" }}
                        />
                      )}
                      {d.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-text-primary text-[20px]"
            >
              {l.label}
            </a>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                href="/cabinet"
                onClick={() => setOpen(false)}
                className="text-text-accent text-[20px]"
              >
                Мой кабинет
              </Link>
              <Link
                href="/nastavnik"
                onClick={() => setOpen(false)}
                className="text-text-primary text-[20px]"
              >
                Наставник
              </Link>
              <Link
                href="/podderzhka"
                onClick={() => setOpen(false)}
                className="text-text-primary text-[20px]"
              >
                Поддержка
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="text-text-secondary text-[20px]"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href={authHref("login", pathname)}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                leaveForAuth(router, "login", currentPath());
              }}
              className="text-text-accent text-[20px]"
            >
              Войти
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/**
 * «Войти» в шапке возвращает на ту же страницу: человек читает разбор
 * или пишет вопрос картам, входит — и продолжает там, где остановился.
 * С главной после входа — кабинет.
 */
function LoginButton() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Link
      href={authHref("login", pathname)}
      onClick={(e) => {
        e.preventDefault();
        leaveForAuth(router, "login", currentPath());
      }}
      className="flex items-center justify-center text-text-accent transition-colors"
      style={{
        height: "42px",
        paddingInline: "22px",
        borderRadius: "10px",
        border: "1px solid color-mix(in srgb, var(--text-accent) 50%, transparent)",
        fontSize: "clamp(14px, 1vw, 16px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--text-accent)";
        e.currentTarget.style.background = "rgba(122, 93, 168, 0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          "color-mix(in srgb, var(--text-accent) 50%, transparent)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      Войти
    </Link>
  );
}

async function signOut() {
  await backend.auth.signOut();
  window.location.href = "/";
}

function AccountBlock({ email }: { email: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const initial = (email ?? "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = () => setMenuOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-3"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-primary text-[15px]">
          {initial}
        </span>
        <span className="text-text-secondary text-[15px]">Профиль</span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] min-w-[180px] overflow-hidden border bg-surface-1"
          style={{ borderRadius: "12px", borderColor: "var(--border)" }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              router.push("/cabinet");
            }}
            className="block w-full px-4 py-3 text-left text-[15px] text-text-primary hover:text-text-accent"
          >
            Мой кабинет
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              router.push("/nastavnik");
            }}
            className="block w-full px-4 py-3 text-left text-[15px] text-text-primary hover:text-text-accent"
          >
            Наставник
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              router.push("/podderzhka");
            }}
            className="block w-full px-4 py-3 text-left text-[15px] text-text-primary hover:text-text-accent"
          >
            Поддержка
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
            className="block w-full px-4 py-3 text-left text-[15px] text-text-secondary hover:text-text-accent"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
