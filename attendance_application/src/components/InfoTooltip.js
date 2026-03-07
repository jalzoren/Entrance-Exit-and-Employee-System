// InfoTooltip.js
import React, { useEffect, useRef, useState } from "react";
import "./InfoTooltip.css";

export default function InfoTooltip({ text = "", mobileToggle = true }) {
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState("right"); // "right" or "left"
  const containerRef = useRef(null);

  const decidePlacement = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const tooltipEstimate = 240; // conservative width estimate
    setPlacement(spaceRight < tooltipEstimate ? "left" : "right");
  };

  useEffect(() => {
    decidePlacement();
    const onResize = () => decidePlacement();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [visible]);

  const show = () => {
    decidePlacement();
    setVisible(true);
  };
  const hide = () => setVisible(false);
  const toggle = () => setVisible((v) => !v);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  return (
    <span
      className="info-tooltip-container"
      ref={containerRef}
      // mouse events
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      // make the entire container the interactive element
      tabIndex={0}
      role="button"
      aria-label={text ? `Info: ${text}` : "More info"}
      onClick={(e) => {
        if (mobileToggle) {
          e.stopPropagation();
          toggle();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {/* No visual icon here — the container itself is the trigger */}
      <div
        className={`tooltip-text ${visible ? "show" : ""} ${
          placement === "left" ? "left" : "right"
        }`}
        role="tooltip"
        aria-hidden={!visible}
      >
        {text}
      </div>
    </span>
  );
}