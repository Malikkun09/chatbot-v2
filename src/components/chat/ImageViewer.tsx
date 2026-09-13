"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";

export interface ViewerImage {
  src: string;
  alt: string;
}

export function ImageViewer({
  image,
  onClose,
}: {
  image: ViewerImage | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [image?.src]);

  useEffect(() => {
    if (!image) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [image, onClose]);

  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="image-viewer-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="image-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={image.alt || "Image"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-viewer-bar">
          <p className="image-viewer-title">{image.alt}</p>
          <div className="image-viewer-actions">
            <button type="button" className="ghost-btn" onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>
              −
            </button>
            <button type="button" className="ghost-btn" onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>
              +
            </button>
            <button type="button" className="icon-btn" aria-label="Close image" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>
        <div
          className="image-viewer-stage"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
