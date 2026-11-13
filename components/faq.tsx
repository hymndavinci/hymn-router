/** FAQ accordion — 2 kolom di desktop, satu kolom di mobile. */

"use client";

import { useState } from "react";
import Reveal from "@/components/reveal";

export type FaqItem = { q: string; a: string };

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-x-12 gap-y-0 md:grid-cols-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={item.q} delay={Math.min(i * 50, 150)} className="border-b-2 border-black">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-[16px] font-bold text-black">{item.q}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white text-[18px] font-bold text-black shadow-brutal-xs transition-transform ${
                  isOpen ? "rotate-45 bg-yellow" : ""
                }`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <p className="pb-5 pr-10 text-[15px] leading-relaxed text-muted">
                {item.a}
              </p>
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
