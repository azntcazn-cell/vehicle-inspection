"use client";

import { useRef, useState } from "react";
import { uploadMediaFile } from "@/lib/upload-client";

const COLORS = ["#dc2626", "#111827", "#2563eb"];
const WIDTH = 736;
const HEIGHT = 983; // matches vehicle-diagram.jpg pixel dimensions

type Label = { id: number; x: number; y: number; text: string };
type Mode = "draw" | "label";

export function VehicleDiagram({
  initialImageUrl,
  initialLabels,
  onSavingChange,
}: {
  initialImageUrl?: string;
  initialLabels?: { x: number; y: number; text: string }[];
  onSavingChange?: (saving: boolean) => void;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const bgImageUrl = initialImageUrl || "/vehicle-diagram.jpg";

  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [hasMarks, setHasMarks] = useState(false);
  const [labels, setLabels] = useState<Label[]>(
    () => initialLabels?.map((l, i) => ({ id: Date.now() + i, ...l })) ?? []
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [diagramUrl, setDiagramUrl] = useState(initialImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  function getPos(clientX: number, clientY: number) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode === "label") {
      const pos = getPos(e.clientX, e.clientY);
      const id = Date.now();
      setLabels((prev) => [...prev, { id, x: pos.x, y: pos.y, text: "" }]);
      setEditingId(id);
      return;
    }
    drawing.current = true;
    lastPoint.current = getPos(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e.clientX, e.clientY);
    const last = lastPoint.current!;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPoint.current = pos;
    setHasMarks(true);
  }

  function handlePointerUp() {
    if (mode !== "draw" || !drawing.current) return;
    drawing.current = false;
    saveDiagram();
  }

  function commitLabel(id: number, text: string) {
    const trimmed = text.trim();
    setLabels((prev) =>
      trimmed
        ? prev.map((l) => (l.id === id ? { ...l, text: trimmed } : l))
        : prev.filter((l) => l.id !== id)
    );
    setEditingId(null);
    saveDiagram();
  }

  function removeLabel(id: number) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    if (editingId === id) setEditingId(null);
    saveDiagram();
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasMarks(false);
    setLabels([]);
    setEditingId(null);
    setDiagramUrl("");
  }

  async function saveDiagram() {
    setSaving(true);
    setSaveError(false);
    onSavingChange?.(true);
    try {
      const canvas = canvasRef.current!;

      const bg = new Image();
      bg.crossOrigin = "anonymous";
      bg.src = bgImageUrl;
      await new Promise((resolve, reject) => {
        bg.onload = resolve;
        bg.onerror = reject;
      });

      const out = document.createElement("canvas");
      out.width = WIDTH;
      out.height = HEIGHT;
      const octx = out.getContext("2d")!;
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, WIDTH, HEIGHT);
      octx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
      octx.drawImage(canvas, 0, 0);

      labels.forEach((label, i) => {
        if (!label.text.trim()) return;
        octx.beginPath();
        octx.arc(label.x, label.y, 10, 0, Math.PI * 2);
        octx.fillStyle = "#f59e0b";
        octx.fill();
        octx.strokeStyle = "#78350f";
        octx.lineWidth = 1.5;
        octx.stroke();
        octx.fillStyle = "#ffffff";
        octx.font = "bold 12px sans-serif";
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(String(i + 1), label.x, label.y);
      });

      const blob: Blob = await new Promise((resolve, reject) =>
        out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
      );
      const file = new File([blob], "vehicle-diagram.png", { type: "image/png" });
      const result = await uploadMediaFile(file);
      setDiagramUrl(result.url);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  const namedLabels = labels.filter((l) => l.text.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-neutral-300">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`px-3 py-1.5 text-sm font-medium ${
              mode === "draw" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
            }`}
          >
            ✏️ Draw
          </button>
          <button
            type="button"
            onClick={() => setMode("label")}
            className={`px-3 py-1.5 text-sm font-medium ${
              mode === "label" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
            }`}
          >
            📍 Label
          </button>
        </div>

        {mode === "draw" && (
          <>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Use ${c}`}
                className="h-6 w-6 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: color === c ? "#171717" : "transparent" }}
              />
            ))}
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              Pen size
              <input
                type="range"
                min={1}
                max={8}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
              />
            </label>
          </>
        )}

        <button
          type="button"
          onClick={clearCanvas}
          className="ml-auto text-sm text-neutral-500 hover:text-neutral-900"
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-neutral-400">
        {mode === "draw"
          ? "Draw on the diagram to mark any damage."
          : "Tap the diagram to drop a numbered pin and describe the damage."}
      </p>

      <div className="relative mx-auto w-full max-w-xs touch-none select-none overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgImageUrl}
          alt="Vehicle diagram"
          className="pointer-events-none w-full"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: mode === "draw" ? "crosshair" : "copy" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        <div className="pointer-events-none absolute inset-0">
          {labels.map((label, i) => (
            <button
              key={label.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(label.id);
              }}
              className="pointer-events-auto absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-800 bg-amber-500 text-[11px] font-bold text-white shadow"
              style={{
                left: `${(label.x / WIDTH) * 100}%`,
                top: `${(label.y / HEIGHT) * 100}%`,
              }}
            >
              {i + 1}
            </button>
          ))}

          {editingId != null &&
            (() => {
              const label = labels.find((l) => l.id === editingId);
              if (!label) return null;
              return (
                <input
                  key={label.id}
                  type="text"
                  autoFocus
                  placeholder="Describe damage…"
                  defaultValue={label.text}
                  onBlur={(e) => commitLabel(label.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="pointer-events-auto absolute w-32 -translate-x-1/2 rounded-md border border-amber-500 bg-white px-2 py-1 text-xs shadow focus:outline-none"
                  style={{
                    left: `${(label.x / WIDTH) * 100}%`,
                    top: `calc(${(label.y / HEIGHT) * 100}% - 32px)`,
                  }}
                />
              );
            })()}
        </div>
      </div>

      {namedLabels.length > 0 && (
        <ol className="flex flex-col gap-1 text-sm text-neutral-600">
          {labels.map((label, i) =>
            label.text.trim() ? (
              <li key={label.id} className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex-1">{label.text}</span>
                <button
                  type="button"
                  onClick={() => removeLabel(label.id)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ) : null
          )}
        </ol>
      )}

      <input type="hidden" name="diagramUrl" value={diagramUrl} readOnly />
      <input
        type="hidden"
        name="diagramLabels"
        value={JSON.stringify(namedLabels.map(({ x, y, text }) => ({ x, y, text })))}
        readOnly
      />
      {saveError ? (
        <p className="text-center text-sm text-red-600">
          Couldn&apos;t save the diagram — check your connection.{" "}
          <button
            type="button"
            onClick={saveDiagram}
            className="font-medium underline"
          >
            Retry
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-neutral-400">
          {saving
            ? "Saving diagram…"
            : (hasMarks || namedLabels.length > 0) && diagramUrl
              ? "Diagram saved."
              : ""}
        </p>
      )}
    </div>
  );
}
