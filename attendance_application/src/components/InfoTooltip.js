// InfoTooltip.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import "./InfoTooltip.css";
 
export default function InfoTooltip({ text = "", mobileToggle = true, placement: forcedPlacement = null }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0, placement: "right" });
  const containerRef          = useRef(null);
 
  const computeCoords = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect          = el.getBoundingClientRect();
    const tooltipWidth  = 260;
    const tooltipHeight = 36;
    const gap           = 10;
 
    // use forced placement if provided, otherwise auto-detect
    const placement = forcedPlacement
      ? forcedPlacement
      : (window.innerWidth - rect.right < tooltipWidth + gap ? "left" : "right");
 
    let top  = rect.top + rect.height / 2 - tooltipHeight / 2;
    let left = placement === "right"
      ? rect.right + gap
      : rect.left - tooltipWidth - gap;
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
    setCoords({ top, left, placement });
  }, [forcedPlacement]);
 
  const show = useCallback(() => { computeCoords(); setVisible(true);  }, [computeCoords]);
  const hide = useCallback(() => setVisible(false), []);
 
  // attach hover listeners to the closest card ancestor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const card = el.closest('.stat-card, .analytics-card, .gateway-card, .event-item-card, .stat-card-glass');
    if (!card) return;
    card.addEventListener('mouseenter', show);
    card.addEventListener('mouseleave', hide);
    return () => {
      card.removeEventListener('mouseenter', show);
      card.removeEventListener('mouseleave', hide);
    };
  }, [show, hide]);
 
  // recompute on scroll/resize while visible
  useEffect(() => {
    if (!visible) return;
    window.addEventListener("resize", computeCoords);
    window.addEventListener("scroll", computeCoords, true);
    return () => {
      window.removeEventListener("resize", computeCoords);
      window.removeEventListener("scroll", computeCoords, true);
    };
  }, [visible, computeCoords]);
 
  // close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setVisible(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);
 
  const toggle = () => {
    if (!visible) { computeCoords(); setVisible(true); }
    else setVisible(false);
  };
 
  const tooltip = visible
    ? ReactDOM.createPortal(
        <div
          className={`tooltip-text show ${coords.placement}`}
          role="tooltip"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>,
        document.body
      )
    : null;
 
  return (
    <>
      <span
        className="info-tooltip-container"
        ref={containerRef}
        tabIndex={0}
        role="button"
        aria-label={text ? `Info: ${text}` : "More info"}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          if (mobileToggle) { e.stopPropagation(); toggle(); }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        }}
      >
        {/* hover is handled by the parent card via closest() */}
      </span>
      {tooltip}
    </>
  );
}