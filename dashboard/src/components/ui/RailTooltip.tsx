"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const DELAY_MS = 50;

export function RailTooltip({
  label,
  children,
  side = "right",
}: {
  label: string;
  children: React.ReactNode;
  side?: "right" | "bottom";
}) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), DELAY_MS);
  }, []);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <PortalTooltip label={label} side={side} anchorRef={containerRef} />,
        document.body
      )}
    </div>
  );
}

function PortalTooltip({
  label,
  side,
  anchorRef,
}: {
  label: string;
  side: "right" | "bottom";
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    if (side === "right") {
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
      });
    } else {
      setPos({
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
      });
    }
  }, [anchorRef, side]);

  const isRight = side === "right";
  const style: React.CSSProperties = isRight
    ? { top: pos.top, left: pos.left, transform: "translateY(-50%)" }
    : { top: pos.top, left: pos.left, transform: "translateX(-50%)" };

  return (
    <div
      role="tooltip"
      className="rail-tooltip-in fixed z-[60] pointer-events-none px-2.5 py-1.5 rounded-lg bg-dash-surface-2 border border-dash-border-subtle shadow-[var(--dash-shadow)] text-xs font-medium text-dash-text whitespace-nowrap"
      style={style}
    >
      {label}
    </div>
  );
}
