"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useRef } from "react";

type Props = HTMLMotionProps<"div"> & {
  glow?: boolean;
  as?: "div" | "section" | "article";
};

export function SpotlightCard({
  children,
  className = "",
  glow = false,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={[
        "spotlight rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]",
        "transition-colors duration-200 hover:border-[var(--border-strong)]",
        glow ? "ring-gradient" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
