"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, ArrowLeftRight } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";

type MovementRow = {
  id: number;
  type: "add" | "remove" | "transfer" | "adjustment";
  quantity: number;
  notes: string | null;
  createdAt: string;
  itemDbId: number | null;
  itemId: string | null;
  itemDescription: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  userName: string | null;
};

function movementTypeBadge(type: string) {
  const variants: Record<string, "success" | "danger" | "primary" | "warning" | "default"> = {
    add: "success",
    remove: "danger",
    transfer: "primary",
    adjustment: "warning",
  };
  return (
    <Badge variant={variants[type] ?? "default"} className="capitalize">
      {type}
    </Badge>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MovementsPage() {
  const router = useRouter();
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    try {
      const res = await fetch(`/api/movements?${params.toString()}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setMovements(data);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, fromDate, toDate, router]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  async function handleExport() {
    setExportLoading(true);
    try {
      // Fetch all movements without filters for export
      const res = await fetch("/api/movements?limit=all");
      const data: MovementRow[] = await res.json();

      const xlsx = await import("xlsx");
      const rows = data.map((m) => ({
        Date: formatDate(m.createdAt),
        Type: m.type,
        "Item ID": m.itemId ?? "",
        Description: m.itemDescription ?? "",
        "From Location": m.fromLocation ?? "",
        "To Location": m.toLocation ?? "",
        Quantity: m.quantity,
        Notes: m.notes ?? "",
        User: m.userName ?? "",
      }));

      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Movements");
      xlsx.writeFile(wb, `movements-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Movements</h1>
        <Button variant="outline" onClick={handleExport} disabled={exportLoading}>
          <Download className="w-4 h-4" />
          {exportLoading ? "Exporting..." : "Export XLSX"}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
        >
          <option value="">All types</option>
          <option value="add">Add</option>
          <option value="remove">Remove</option>
          <option value="transfer">Transfer</option>
          <option value="adjustment">Adjustment</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {(typeFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTypeFilter(""); setFromDate(""); setToDate(""); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : movements.length === 0 ? (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No movements found.</p>
        </div>
      ) : (
        <>
          <p className="text-zinc-500 text-sm mb-3">{movements.length} movement{movements.length !== 1 ? "s" : ""}</p>
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 border-b border-zinc-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Item</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">From</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">To</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Notes</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {movementTypeBadge(m.type)}
                      </td>
                      <td className="px-4 py-3">
                        {m.itemId ? (
                          <button
                            onClick={() => m.itemDbId && router.push(`/items/${m.itemDbId}`)}
                            className="text-left hover:text-blue-400 transition-colors"
                          >
                            <span className="font-mono text-zinc-400 text-xs block">{m.itemId}</span>
                            <span className="text-white text-xs">{m.itemDescription}</span>
                          </button>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {m.fromLocation ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {m.toLocation ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {m.quantity}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">
                        {m.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {m.userName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
