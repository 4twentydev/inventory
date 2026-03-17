"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Package, Plus, Minus, ArrowLeftRight, Edit, Search } from "lucide-react";
import Drawer from "@/components/ui/drawer";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";

type StockByLocation = {
  locationId: number;
  locationName: string;
  quantity: number;
};

type ItemResult = {
  id: number;
  itemId: string;
  description: string;
  category: string;
  subcategory?: string;
  color?: string;
  finish?: string;
  gauge?: string;
  unit: string;
  notes?: string;
  profileImage?: string;
  dimensions?: string;
  totalStock: number;
  stockByLocation: StockByLocation[];
};

type Movement = {
  id: number;
  type: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  fromLocation?: string;
  toLocation?: string;
  userName?: string;
};

type ItemDetail = ItemResult & {
  createdAt: string;
  updatedAt: string;
  movements: Movement[];
};

type LocationOption = {
  id: number;
  name: string;
};

type ActionType = "add" | "remove" | "transfer" | null;

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [action, setAction] = useState<ActionType>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  // Action form state
  const [actionLocationId, setActionLocationId] = useState("");
  const [actionFromLocationId, setActionFromLocationId] = useState("");
  const [actionQuantity, setActionQuantity] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  // Fetch locations for action forms
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) =>
        setLocations(data.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name }))),
      )
      .catch(() => {});
  }, []);

  async function openDrawer(item: ItemResult) {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setAction(null);
    setActionError("");
    try {
      const res = await fetch(`/api/items/${item.id}`);
      const data = await res.json();
      setSelectedItem(data);
    } catch {
      setSelectedItem(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedItem(null);
      setAction(null);
      setActionError("");
    }, 300);
  }

  function openAction(type: ActionType) {
    setAction(type);
    setActionLocationId("");
    setActionFromLocationId("");
    setActionQuantity("");
    setActionNotes("");
    setActionError("");
  }

  async function submitAction() {
    if (!selectedItem) return;
    const qty = parseInt(actionQuantity);
    if (isNaN(qty) || qty <= 0) {
      setActionError("Quantity must be a positive number");
      return;
    }

    const body: Record<string, unknown> = {
      type: action,
      itemId: selectedItem.id,
      quantity: qty,
      notes: actionNotes || undefined,
    };

    if (action === "add") {
      if (!actionLocationId) {
        setActionError("Select a location");
        return;
      }
      body.toLocationId = parseInt(actionLocationId);
    } else if (action === "remove") {
      if (!actionLocationId) {
        setActionError("Select a location");
        return;
      }
      body.fromLocationId = parseInt(actionLocationId);
    } else if (action === "transfer") {
      if (!actionFromLocationId || !actionLocationId) {
        setActionError("Select both from and to locations");
        return;
      }
      body.fromLocationId = parseInt(actionFromLocationId);
      body.toLocationId = parseInt(actionLocationId);
    }

    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Failed");
        return;
      }
      // Refresh drawer data and search results
      const [refreshed] = await Promise.all([
        fetch(`/api/items/${selectedItem.id}`).then((r) => r.json()),
        fetchResults(query),
      ]);
      setSelectedItem(refreshed);
      setAction(null);
    } catch {
      setActionError("Request failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item ID, description, category, color, gauge..."
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500
              text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 pl-10 text-base outline-none transition-colors"
          />
        </div>
      </div>

      {/* Status */}
      {loading && (
        <p className="text-zinc-500 text-sm mb-4">Searching...</p>
      )}
      {!loading && results.length === 0 && (
        <p className="text-zinc-500 text-sm mb-4">No items found.</p>
      )}
      {!loading && results.length > 0 && (
        <p className="text-zinc-500 text-sm mb-4">{results.length} item{results.length !== 1 ? "s" : ""}</p>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-auto pb-2">
        {results.map((item) => (
          <div
            key={item.id}
            onClick={() => openDrawer(item)}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-pointer rounded-lg overflow-hidden transition-colors flex flex-col"
          >
            {/* Image / placeholder */}
            {item.profileImage ? (
              <img
                src={`/ext-profiles/${item.profileImage}`}
                alt={item.description}
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-zinc-800 flex items-center justify-center">
                <Package className="w-10 h-10 text-zinc-600" />
              </div>
            )}

            {/* Content */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                  {item.itemId}
                </span>
                <Badge variant="outline">{item.category}</Badge>
              </div>

              <p className="font-medium text-sm text-white leading-snug">{item.description}</p>

              {/* Attribute chips */}
              {(item.color || item.finish || item.gauge) && (
                <div className="flex flex-wrap gap-1">
                  {item.color && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {item.color}
                    </span>
                  )}
                  {item.finish && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {item.finish}
                    </span>
                  )}
                  {item.gauge && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {item.gauge}
                    </span>
                  )}
                </div>
              )}

              {item.dimensions && (
                <p className="text-xs text-zinc-400">{item.dimensions}</p>
              )}

              {/* Stock */}
              <div className="mt-auto pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Total Stock</span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {item.totalStock} <span className="text-zinc-500 font-normal">{item.unit}</span>
                  </span>
                </div>
                {item.stockByLocation.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.stockByLocation.map((s) => (
                      <span
                        key={s.locationId}
                        className="text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded"
                        title={s.locationName}
                      >
                        {s.locationName}: {s.quantity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={selectedItem?.itemId ?? "Item Details"}
      >
        {drawerLoading ? (
          <div className="p-6 text-zinc-500">Loading...</div>
        ) : selectedItem ? (
          <div className="flex flex-col">
            {/* Profile image */}
            {selectedItem.profileImage ? (
              <img
                src={`/ext-profiles/${selectedItem.profileImage}`}
                alt={selectedItem.description}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-zinc-800 flex items-center justify-center">
                <Package className="w-16 h-16 text-zinc-600" />
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {selectedItem.description}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary">{selectedItem.category}</Badge>
                  {selectedItem.subcategory && (
                    <Badge variant="outline">{selectedItem.subcategory}</Badge>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Item ID</p>
                  <p className="font-mono text-white">{selectedItem.itemId}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Unit</p>
                  <p className="text-white">{selectedItem.unit}</p>
                </div>
                {selectedItem.color && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">Color</p>
                    <p className="text-white">{selectedItem.color}</p>
                  </div>
                )}
                {selectedItem.finish && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">Finish</p>
                    <p className="text-white">{selectedItem.finish}</p>
                  </div>
                )}
                {selectedItem.gauge && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-0.5">Gauge</p>
                    <p className="text-white">{selectedItem.gauge}</p>
                  </div>
                )}
                {selectedItem.dimensions && (
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs mb-0.5">Dimensions</p>
                    <p className="text-white">{selectedItem.dimensions}</p>
                  </div>
                )}
                {selectedItem.notes && (
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs mb-0.5">Notes</p>
                    <p className="text-white">{selectedItem.notes}</p>
                  </div>
                )}
              </div>

              {/* Stock by location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-zinc-300">Stock</h4>
                  <span className="text-lg font-bold text-white">
                    {selectedItem.totalStock}{" "}
                    <span className="text-sm font-normal text-zinc-400">{selectedItem.unit}</span>
                  </span>
                </div>
                {selectedItem.stockByLocation.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No stock recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                        <th className="text-left pb-1 font-normal">Location</th>
                        <th className="text-right pb-1 font-normal">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.stockByLocation.map((s) => (
                        <tr key={s.locationId} className="border-b border-zinc-800/50">
                          <td className="py-1.5 text-zinc-300">{s.locationName}</td>
                          <td className="py-1.5 text-right font-mono text-white">{s.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Action buttons */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openAction("add")}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openAction("remove")}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Remove Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openAction("transfer")}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = `/items/${selectedItem.id}`;
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Item
                  </Button>
                </div>
              </div>

              {/* Inline action form */}
              {action && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
                  <h5 className="text-sm font-medium text-white capitalize">
                    {action === "add" ? "Add Stock" : action === "remove" ? "Remove Stock" : "Transfer Stock"}
                  </h5>

                  {action === "transfer" && (
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">From Location</label>
                      <Select
                        value={actionFromLocationId}
                        onChange={(e) => setActionFromLocationId(e.target.value)}
                      >
                        <option value="">Select location...</option>
                        {selectedItem.stockByLocation.map((s) => (
                          <option key={s.locationId} value={s.locationId}>
                            {s.locationName} ({s.quantity} {selectedItem.unit})
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">
                      {action === "remove" ? "Location" : action === "transfer" ? "To Location" : "Location"}
                    </label>
                    <Select
                      value={actionLocationId}
                      onChange={(e) => setActionLocationId(e.target.value)}
                    >
                      <option value="">Select location...</option>
                      {action === "remove"
                        ? selectedItem.stockByLocation.map((s) => (
                            <option key={s.locationId} value={s.locationId}>
                              {s.locationName} ({s.quantity} {selectedItem.unit})
                            </option>
                          ))
                        : locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={actionQuantity}
                      onChange={(e) => setActionQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Notes (optional)</label>
                    <Input
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>

                  {actionError && (
                    <p className="text-red-400 text-xs">{actionError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={submitAction}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Saving..." : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAction(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Movements */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Recent Movements</h4>
                {selectedItem.movements.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No movements recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItem.movements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start gap-3 py-2 border-b border-zinc-800 text-sm"
                      >
                        <div className="shrink-0 pt-0.5">{movementTypeBadge(m.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-white font-medium">
                              {m.quantity}
                            </span>
                            {m.fromLocation && (
                              <span className="text-zinc-500 text-xs">
                                from {m.fromLocation}
                              </span>
                            )}
                            {m.toLocation && (
                              <span className="text-zinc-500 text-xs">
                                to {m.toLocation}
                              </span>
                            )}
                          </div>
                          {m.notes && (
                            <p className="text-zinc-400 text-xs mt-0.5 truncate">{m.notes}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-zinc-600 text-xs">{formatDate(m.createdAt)}</span>
                            {m.userName && (
                              <span className="text-zinc-600 text-xs">by {m.userName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-zinc-500">Failed to load item.</div>
        )}
      </Drawer>
    </div>
  );
}
