"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Button from "@/components/ui/button";

type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
};

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx")) {
      setImportError("Only .xlsx files are supported.");
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setImportError("");
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setResult(null);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        setImportError(err.error ?? "Import failed");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setImportError("Import failed: " + String(err));
    } finally {
      setImporting(false);
    }
  }

  function handleExport(path: string) {
    window.location.href = path;
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Import / Export</h1>

      {/* Import Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Import Items</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Upload an .xlsx file to create or update items. Required columns:{" "}
          <span className="font-mono text-zinc-400">item_id</span>,{" "}
          <span className="font-mono text-zinc-400">description</span>,{" "}
          <span className="font-mono text-zinc-400">category</span>,{" "}
          <span className="font-mono text-zinc-400">unit</span>.
        </p>

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg px-6 py-12 text-center cursor-pointer transition-colors
            ${dragOver
              ? "border-blue-500 bg-blue-900/10"
              : selectedFile
                ? "border-zinc-600 bg-zinc-900"
                : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
            }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-green-500" />
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-zinc-500 text-sm">
                {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-zinc-600" />
              <p className="text-zinc-300 font-medium">
                Drop .xlsx file here or click to browse
              </p>
              <p className="text-zinc-600 text-sm">Only .xlsx files accepted</p>
            </div>
          )}
        </div>

        {importError && (
          <div className="mt-3 flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {selectedFile && !importing && !result && (
          <div className="mt-4">
            <Button onClick={handleImport} disabled={importing}>
              <Upload className="w-4 h-4" />
              Import File
            </Button>
          </div>
        )}

        {importing && (
          <p className="mt-4 text-zinc-400 text-sm">Importing...</p>
        )}

        {result && (
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 rounded px-3 py-2">
                <p className="text-zinc-500 text-xs mb-0.5">Created</p>
                <p className="text-white font-bold text-lg">{result.created}</p>
              </div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <p className="text-zinc-500 text-xs mb-0.5">Updated</p>
                <p className="text-white font-bold text-lg">{result.updated}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-yellow-400 text-sm font-medium mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {result.errors.length} error
                  {result.errors.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li
                      key={i}
                      className="text-xs text-zinc-400 font-mono bg-zinc-800 rounded px-2 py-1"
                    >
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
              }}
            >
              Import Another File
            </Button>
          </div>
        )}
      </section>

      {/* Export Section */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Export</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Download data as .xlsx spreadsheets.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Items Export</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  All items with their attributes. Use as a template for
                  imports.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("/api/export/items")}
            >
              <Download className="w-4 h-4" />
              Download Items
            </Button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <FileSpreadsheet className="w-8 h-8 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Stock Report</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Current stock quantities by item and location.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("/api/export/stock")}
            >
              <Download className="w-4 h-4" />
              Download Stock
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
