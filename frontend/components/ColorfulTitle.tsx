"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/**
 * ColorfulTitle – per-letter hover rainbow effect.
 * Each letter gets a random vivid HSL color on hover, then slowly fades back.
 * Inspired by Coolors.co – works with any text.
 */

function getRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 30) + 60; // 60–90 %
  const lightness = Math.floor(Math.random() * 20) + 35;  // 35–55 %
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function Letter({ char }: { char: string }) {
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  function handleEnter() {
    const color = getRandomColor();
    setHoverColor(color);
    setFading(false);

    setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setHoverColor(null);
        setFading(false);
      }, 2000);
    }, 3000);
  }

  return (
    <motion.span
      style={{
        display: "inline-block",
        whiteSpace: "pre",
        transition: fading
          ? "color 2.4s cubic-bezier(0.4, 0, 0.2, 1)"
          : "color 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
        color: hoverColor ?? "inherit",
      }}
      animate={{
        scale: hoverColor && !fading ? 1.08 : 1,
        textShadow: hoverColor && !fading ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
      }}
      transition={{
        scale: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
        textShadow: { duration: 0.25 },
      }}
      onMouseEnter={handleEnter}
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

export default function ColorfulTitle({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const words = children.split(" ");
  return (
    <span className={className} style={{ display: "inline" }}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} style={{ display: "inline" }}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {word.split("").map((char, charIndex) => (
              <Letter key={charIndex} char={char} />
            ))}
          </span>
          {wordIndex < words.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
