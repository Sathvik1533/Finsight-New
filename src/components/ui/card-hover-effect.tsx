"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export const HoverEffect = ({
  items,
  className,
}: {
  items: { title: string; description: string; icon?: React.ReactNode }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2", className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-[#00d4aa]/[0.07] block rounded-xl border border-[#00d4aa]/20"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 h-full relative z-10 transition-colors group-hover:border-[#00d4aa]/20">
            {item.icon && (
              <div className="mb-3 w-9 h-9 rounded-lg bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center text-[#00d4aa]">
                {item.icon}
              </div>
            )}
            <h3 className="font-space font-semibold text-white text-sm mb-1.5">{item.title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
