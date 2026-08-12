"use client";

import { useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export function SignaturePad({
  onChange,
  error,
  disabled,
}: {
  onChange: (dataUrl: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const resize = () => {
      const canvas = padRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const signatureCanvas = canvas.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = wrap.clientWidth;
      const height = 160;
      signatureCanvas.width = width * ratio;
      signatureCanvas.height = height * ratio;
      signatureCanvas.style.width = `${width}px`;
      signatureCanvas.style.height = `${height}px`;
      const ctx = signatureCanvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvas.clear();
      onChangeRef.current("");
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleEnd = () => {
    const canvas = padRef.current;
    if (!canvas || canvas.isEmpty()) {
      onChange("");
      return;
    }
    try {
      onChange(canvas.getTrimmedCanvas().toDataURL("image/png"));
    } catch {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    padRef.current?.clear();
    onChange("");
  };

  return (
    <div>
      <div
        ref={wrapRef}
        className={`overflow-hidden rounded-md border bg-white ${error ? "border-red-400" : "border-slate-300"}`}
      >
        <SignatureCanvas
          ref={padRef}
          penColor="#111827"
          backgroundColor="#ffffff"
          clearOnResize={false}
          onEnd={handleEnd}
          canvasProps={{
            className: `touch-none h-40 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`,
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[#475569]">Draw your signature with mouse or touch.</p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="text-xs font-medium text-[#1d4ed8] hover:underline disabled:text-slate-400"
        >
          Clear signature
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
