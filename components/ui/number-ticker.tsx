"use client";

import { animate, useInView, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect, useRef } from "react";

type Props = {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
};

export function NumberTicker({ value, format, duration = 1.2, className }: Props) {
  const mv = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [inView, value, duration, mv]);

  const text = useTransform(mv, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString(),
  );

  return (
    <motion.span ref={ref} className={["tabular", className].filter(Boolean).join(" ")}>
      {text}
    </motion.span>
  );
}
