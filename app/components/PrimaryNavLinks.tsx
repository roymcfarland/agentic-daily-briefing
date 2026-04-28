"use client";

import { useCallback, useLayoutEffect, useState } from "react";

const SECTION_IDS = ["beats", "how", "anatomy", "manifesto"] as const;

const LINE_FR = 0.32;

function pickActiveSection(): (typeof SECTION_IDS)[number] | null {
  const lineY = window.scrollY + window.innerHeight * LINE_FR;
  let current: (typeof SECTION_IDS)[number] | null = null;

  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const topAbs = window.scrollY + el.getBoundingClientRect().top;
    if (lineY + 64 >= topAbs) {
      current = id;
    }
  }

  return current;
}

export default function PrimaryNavLinks() {
  const [active, setActive] = useState<(typeof SECTION_IDS)[number] | null>(
    null,
  );

  const update = useCallback(() => {
    setActive(pickActiveSection());
  }, []);

  useLayoutEffect(() => {
    let raf = 0;
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("hashchange", update);

    const ro = new ResizeObserver(onScrollOrResize);
    const main = document.getElementById("main");
    if (main) {
      ro.observe(main);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("hashchange", update);
      ro.disconnect();
    };
  }, [update]);

  const items: { id: (typeof SECTION_IDS)[number]; label: string }[] = [
    { id: "beats", label: "Beats" },
    { id: "how", label: "How it works" },
    { id: "anatomy", label: "Anatomy" },
    { id: "manifesto", label: "Manifesto" },
  ];

  return (
    <>
      {items.map(({ id, label }) => {
        const current = active === id;
        return (
          <a key={id} href={`#${id}`} aria-current={current ? "true" : undefined}>
            {label}
          </a>
        );
      })}
    </>
  );
}
