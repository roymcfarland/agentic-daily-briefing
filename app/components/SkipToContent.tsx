"use client";

export default function SkipToContent() {
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(e) => {
        const mainEl = document.getElementById("main");
        if (!mainEl) return;
        e.preventDefault();
        const reduceMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mainEl.scrollIntoView({
          behavior: reduceMotion ? "instant" : "smooth",
          block: "start",
        });
        mainEl.focus({ preventScroll: true });
      }}
    >
      Skip to content
    </a>
  );
}
