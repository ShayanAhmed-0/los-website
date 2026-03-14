"use client";

import { useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function Accordion({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-medium text-[#2563eb] underline transition-colors hover:bg-gray-100"
      >
        {title}
        <span className="text-gray-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-gray-200 px-4 py-3">{children}</div>}
    </div>
  );
}
