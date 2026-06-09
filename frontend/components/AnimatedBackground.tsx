"use client";

export default function AnimatedBackground() {
  return (
    <div className="bg-canvas" aria-hidden="true">
      <div className="bg-grid" />
      <div className="bg-dot bg-dot-1" />
      <div className="bg-dot bg-dot-2" />
      <div className="bg-dot bg-dot-3" />
      <div className="bg-dot bg-dot-4" />
      <div className="bg-sparkle bg-sparkle-1" />
      <div className="bg-sparkle bg-sparkle-2" />
      <div className="bg-sparkle bg-sparkle-3" />
    </div>
  );
}
