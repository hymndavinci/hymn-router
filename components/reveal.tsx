/**
 * Reveal — wrapper animasi scroll: elemen mulai tersembunyi
 * (opacity 0, geser 14px ke bawah) lalu muncul saat masuk viewport.
 *
 * Hanya transform + opacity (tanpa layout shift), satu kali (tidak
 * berulang). Hormati prefers-reduced-motion: langsung terlihat.
 */

"use client";

import { useEffect, useRef, useState } from "react";

type RevealTag = "div" | "li" | "section";

export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  /** transition-delay dalam ms, untuk stagger (maks ~150). */
  delay?: number;
  className?: string;
  as?: RevealTag;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      className={`reveal${visible ? " reveal-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
