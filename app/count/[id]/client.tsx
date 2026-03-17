"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckSquare, Search, Plus, X } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CountEntry = {
  id: number;
  sessionId: number;
  itemId: number;
  locationId: number | null;
  systemQty: number;
  countedQty: number | null;
  notes: string | null;
  item: {
    itemId: string;
    description: string;
    category: string;
    unit: string;
  };
  locationName?: string;
  variance: number | null;
};

type CountSession = {
  id: number;
  name: string | null;
  locationId: number | null;
  locationName?: string;
  status: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
};

type Location = {
  id: number;
  name: string;
};

type ItemResult = {
  id: number;
  itemId: string;
  description: string;
  category: string;
  unit: string;
  stockByLocation: Array<{
    locationId: number;
    locationName: string;
    quantity: number;
  }>;
};

export default function CountClient({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<CountSession | null>(null);
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    adjusted: number;
  } | null>(null);
  const [commitError, setCommitError] = useState("");

  // Add item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<ItemResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemResult | null>(null);
  const [addLocationId, setAddLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [adding, setAdding] = useState(false);

  // Debounce saving per entry
  const savingSet = useRef<Set<number>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/count/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/count");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setEntries(data.entries);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) setLocations(await res.json());
      } catch {
        /* ignore */
      }
    }
    fetchLocations();
  }, []);

  async function handleCountedQtyBlur(entry: CountEntry, value: string) {
    if (value === "" || value === String(entry.countedQty ?? "")) return;
    const countedQty = parseInt(value, 10);
    if (isNaN(countedQty) || countedQty < 0) return;

    savingSet.current.add(entry.id);
    setSavingIds(new Set(savingSet.current));

    try {
      const res = await fetch(`/api/count/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, countedQty }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, countedQty, variance: countedQty - e.systemQty }
              : e,
          ),
        );
      }
    } finally {
      savingSet.current.delete(entry.id);
      setSavingIds(new Set(savingSet.current));
    }
  }

  async function handleCommit() {
    setCommitting(true);
    setCommitError("");
    try {
      const res = await fetch(`/api/count/${id}/commit`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCommitResult({ adjusted: data.adjusted });
        setSession((prev) => (prev ? { ...prev, status: "closed" } : prev));
      } else {
        const err = await res.json();
        setCommitError(err.error ?? "Failed to commit");
      }
    } finally {
      setCommitting(false);
    }
  }

  async function handleAddSearch() {
    if (!addSearch.trim()) return;
    setAddSearching(true);
    try {
      const res = await fetch(
        `/api/items/search?q=${encodeURIComponent(addSearch.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAddResults(data.slice(0, 20));
      }
    } finally {
      setAddSearching(false);
    }
  }

  async function handleAddEntry() {
    if (!selectedItem) return;
    setAdding(true);
    try {
      const locationId = addLocationId ? parseInt(addLocationId, 10) : null;

      // Get current stock qty for system qty
      let systemQty = 0;
      if (locationId) {
        const found = selectedItem.stockByLocation.find(
          (s) => s.locationId === locationId,
        );
        systemQty = found?.quantity ?? 0;
      }

      const res = await fetch(`/api/count/${id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          locationId,
          systemQty,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setAddSearch("");
        setAddResults([]);
        setSelectedItem(null);
        setAddLocationId("");
        fetchData();
      }
    } finally {
      setAdding(false);
    }
  }

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.item.itemId.toLowerCase().includes(q) ||
      e.item.description.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalItems = entries.length;
  const itemsCounted = entries.filter((e) => e.countedQty !== null).length;
  const itemsWithVariance = entries.filter(
    (e) => e.countedQty !== null && e.variance !== null && e.variance !== 0,
  ).length;
  const totalVariance = entries.reduce((sum, e) => sum + (e.variance ?? 0), 0);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-zinc-500">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/count")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {session.name ?? "Unnamed Session"}
              </h1>
              <Badge
                variant={session.status === "open" ? "success" : "default"}
                className="capitalize"
              >
                {session.status}
              </Badge>
            </div>
            {session.locationName && (
              <p className="text-zinc-500 text-sm mt-0.5">
                {session.locationName}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {session.status === "open" && (
            <Button
              variant="outline"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )}
          <Button
            onClick={handleCommit}
            disabled={committing || session.status === "closed"}
          >
            <CheckSquare className="w-4 h-4" />
            {committing
              ? "Committing..."
              : session.status === "closed"
                ? "Committed"
                : "Commit Count"}
          </Button>
        </div>
      </div>

      {commitResult && (
        <div className="mb-4 px-4 py-3 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-sm">
          Count committed. {commitResult.adjusted} item
          {commitResult.adjusted !== 1 ? "s" : ""} adjusted.
        </div>
      )}

      {commitError && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {commitError}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Items", value: totalItems },
          { label: "Items Counted", value: itemsCounted },
          { label: "With Variance", value: itemsWithVariance },
          {
            label: "Total Variance",
            value: totalVariance >= 0 ? `+${totalVariance}` : totalVariance,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
          >
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by item ID or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {entries.length === 0
            ? "No items in this session."
            : "No items match your search."}
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">
                    Item ID
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Location
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">
                    System Qty
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium whitespace-nowrap">
                    Counted Qty
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((entry) => (
                  <CountRow
                    key={entry.id}
                    entry={entry}
                    disabled={session.status === "closed"}
                    saving={savingIds.has(entry.id)}
                    onBlur={handleCountedQtyBlur}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddSearch("");
          setAddResults([]);
          setSelectedItem(null);
          setAddLocationId("");
        }}
        title="Add Item to Count"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {!selectedItem ? (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by item ID or description..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSearch()}
                />
                <Button
                  variant="outline"
                  onClick={handleAddSearch}
                  disabled={addSearching}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {addResults.length > 0 && (
                <div className="border border-zinc-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  {addResults.map((item) => (
                    <button
                      key={item.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <span className="font-mono text-xs text-zinc-400 block">
                        {item.itemId}
                      </span>
                      <span className="text-white text-sm">
                        {item.description}
                      </span>
                      <span className="text-zinc-500 text-xs ml-2">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {addSearching && (
                <p className="text-zinc-500 text-sm">Searching...</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-start justify-between bg-zinc-800 rounded-lg px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-zinc-400">
                    {selectedItem.itemId}
                  </p>
                  <p className="text-white font-medium">
                    {selectedItem.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Location
                </label>
                <Select
                  value={addLocationId}
                  onChange={(e) => setAddLocationId(e.target.value)}
                >
                  <option value="">No specific location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {(() => {
                        const s = selectedItem.stockByLocation.find(
                          (sl) => sl.locationId === loc.id,
                        );
                        return s ? ` (${s.quantity} on hand)` : "";
                      })()}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleAddEntry}
                  disabled={adding}
                  className="flex-1"
                >
                  {adding ? "Adding..." : "Add to Count"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddSearch("");
                    setAddResults([]);
                    setSelectedItem(null);
                    setAddLocationId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function CountRow({
  entry,
  disabled,
  saving,
  onBlur,
}: {
  entry: CountEntry;
  disabled: boolean;
  saving: boolean;
  onBlur: (entry: CountEntry, value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(
    entry.countedQty !== null ? String(entry.countedQty) : "",
  );

  // Keep local value in sync if entry changes from parent
  useEffect(() => {
    setLocalValue(entry.countedQty !== null ? String(entry.countedQty) : "");
  }, [entry.countedQty]);

  const variance = localValue !== ""
    ? parseInt(localValue, 10) - entry.systemQty
    : entry.variance;

  const hasVariance = variance !== null && variance !== 0;
  const isCounted = localValue !== "" || entry.countedQty !== null;

  return (
    <tr className="hover:bg-zinc-900/30 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">
        {entry.item.itemId}
      </td>
      <td className="px-4 py-3 text-white">{entry.item.description}</td>
      <td className="px-4 py-3 text-zinc-400">{entry.item.category}</td>
      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
        {entry.locationName ?? <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-4 py-3 text-right font-mono text-zinc-400">
        {entry.systemQty}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end items-center gap-1.5">
          {saving && (
            <span className="text-xs text-zinc-500">saving...</span>
          )}
          <input
            type="number"
            min={0}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => onBlur(entry, e.target.value)}
            disabled={disabled}
            placeholder="—"
            className="w-24 text-right bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-white text-base font-mono
              focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-zinc-600
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
        {variance === null ? (
          <span className="text-zinc-600">—</span>
        ) : hasVariance ? (
          <span className="text-red-400">
            {variance > 0 ? "+" : ""}
            {variance}
          </span>
        ) : isCounted ? (
          <span className="text-green-400">0</span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
    </tr>
  );
}
