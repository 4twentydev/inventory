"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Package, Pencil, Trash2, Plus, Minus, ArrowLeftRight } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import Select from "@/components/ui/select";

type StockByLocation = {
  locationId: number;
  locationName: string;
  quantity: number;
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

type ItemDetail = {
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
  createdAt: string;
  updatedAt: string;
  totalStock: number;
  stockByLocation: StockByLocation[];
  movements: Movement[];
};

type LocationOption = {
  id: number;
  name: string;
};

type ItemFormData = {
  itemId: string;
  description: string;
  category: string;
  subcategory: string;
  color: string;
  finish: string;
  gauge: string;
  unit: string;
  notes: string;
  dimensions: string;
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

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = params.id;

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  type ActionType = "add" | "remove" | "transfer" | null;
  const [action, setAction] = useState<ActionType>(null);
  const [actionLocationId, setActionLocationId] = useState("");
  const [actionFromLocationId, setActionFromLocationId] = useState("");
  const [actionQuantity, setActionQuantity] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/items/${itemId}`);
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 404) { router.push("/items"); return; }
      const data = await res.json();
      setItem(data);
    } catch {
      router.push("/items");
    } finally {
      setLoading(false);
    }
  }, [itemId, router]);

  useEffect(() => {
    fetchItem();
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocations(data.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name }))))
      .catch(() => {});
  }, [fetchItem]);

  async function handleEdit(data: ItemFormData) {
    if (!item) return;
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed");
        return;
      }
      setEditModalOpen(false);
      fetchItem();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    router.push("/items");
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
    if (!item) return;
    const qty = parseInt(actionQuantity);
    if (isNaN(qty) || qty <= 0) {
      setActionError("Quantity must be a positive number");
      return;
    }

    const body: Record<string, unknown> = {
      type: action,
      itemId: item.id,
      quantity: qty,
      notes: actionNotes || undefined,
    };

    if (action === "add") {
      if (!actionLocationId) { setActionError("Select a location"); return; }
      body.toLocationId = parseInt(actionLocationId);
    } else if (action === "remove") {
      if (!actionLocationId) { setActionError("Select a location"); return; }
      body.fromLocationId = parseInt(actionLocationId);
    } else if (action === "transfer") {
      if (!actionFromLocationId || !actionLocationId) {
        setActionError("Select both locations");
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
      setAction(null);
      fetchItem();
    } catch {
      setActionError("Request failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-zinc-500">Loading...</div>
    );
  }

  if (!item) return null;

  const editInitial: ItemFormData = {
    itemId: item.itemId,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory ?? "",
    color: item.color ?? "",
    finish: item.finish ?? "",
    gauge: item.gauge ?? "",
    unit: item.unit,
    notes: item.notes ?? "",
    dimensions: item.dimensions ?? "",
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setFormError(""); setEditModalOpen(true); }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left: image + chips */}
        <div className="lg:col-span-1">
          {item.profileImage ? (
            <img
              src={`/ext-profiles/${item.profileImage}`}
              alt={item.description}
              className="w-full rounded-lg object-cover mb-4 max-h-64"
            />
          ) : (
            <div className="w-full h-48 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-16 h-16 text-zinc-600" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="primary">{item.category}</Badge>
            {item.subcategory && <Badge variant="outline">{item.subcategory}</Badge>}
            {item.color && <Badge variant="default">{item.color}</Badge>}
            {item.finish && <Badge variant="default">{item.finish}</Badge>}
            {item.gauge && <Badge variant="default">{item.gauge}</Badge>}
          </div>

          {item.dimensions && (
            <p className="text-xs text-zinc-400">{item.dimensions}</p>
          )}
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-white mb-1">{item.description}</h1>
          <p className="font-mono text-zinc-400 mb-4">{item.itemId}</p>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Unit</p>
              <p className="text-white">{item.unit}</p>
            </div>
            {item.color && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Color</p>
                <p className="text-white">{item.color}</p>
              </div>
            )}
            {item.finish && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Finish</p>
                <p className="text-white">{item.finish}</p>
              </div>
            )}
            {item.gauge && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Gauge</p>
                <p className="text-white">{item.gauge}</p>
              </div>
            )}
            {item.dimensions && (
              <div className="col-span-2">
                <p className="text-zinc-500 text-xs mb-0.5">Dimensions</p>
                <p className="text-white">{item.dimensions}</p>
              </div>
            )}
            {item.notes && (
              <div className="col-span-2">
                <p className="text-zinc-500 text-xs mb-0.5">Notes</p>
                <p className="text-white">{item.notes}</p>
              </div>
            )}
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Created</p>
              <p className="text-zinc-300">{formatDate(item.createdAt)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Updated</p>
              <p className="text-zinc-300">{formatDate(item.updatedAt)}</p>
            </div>
          </div>

          {/* Stock summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-300">Stock by Location</h3>
              <span className="text-lg font-bold text-white">
                {item.totalStock} <span className="text-sm font-normal text-zinc-400">{item.unit}</span>
              </span>
            </div>
            {item.stockByLocation.length === 0 ? (
              <p className="text-zinc-500 text-sm">No stock recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                    <th className="text-left pb-1 font-normal">Location</th>
                    <th className="text-right pb-1 font-normal">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {item.stockByLocation.map((s) => (
                    <tr key={s.locationId} className="border-b border-zinc-800/50">
                      <td className="py-2 text-zinc-300">{s.locationName}</td>
                      <td className="py-2 text-right font-mono text-white font-medium">{s.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => openAction("add")}>
              <Plus className="w-3.5 h-3.5" />
              Add Stock
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openAction("remove")}>
              <Minus className="w-3.5 h-3.5" />
              Remove Stock
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openAction("transfer")}>
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer
            </Button>
          </div>
        </div>
      </div>

      {/* Inline action form */}
      {action && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-8 max-w-md space-y-3">
          <h5 className="text-sm font-medium text-white capitalize">
            {action === "add" ? "Add Stock" : action === "remove" ? "Remove Stock" : "Transfer Stock"}
          </h5>

          {action === "transfer" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">From Location</label>
              <Select value={actionFromLocationId} onChange={(e) => setActionFromLocationId(e.target.value)}>
                <option value="">Select location...</option>
                {item.stockByLocation.map((s) => (
                  <option key={s.locationId} value={s.locationId}>
                    {s.locationName} ({s.quantity} {item.unit})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              {action === "remove" ? "Location" : action === "transfer" ? "To Location" : "Location"}
            </label>
            <Select value={actionLocationId} onChange={(e) => setActionLocationId(e.target.value)}>
              <option value="">Select location...</option>
              {(action === "remove" ? item.stockByLocation.map(s => ({ id: s.locationId, name: `${s.locationName} (${s.quantity} ${item.unit})` })) : locations).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
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

          {actionError && <p className="text-red-400 text-xs">{actionError}</p>}

          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={submitAction} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={actionLoading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Movement log */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Movement History</h3>
        {item.movements.length === 0 ? (
          <p className="text-zinc-500 text-sm">No movements recorded.</p>
        ) : (
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">From</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">To</th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Notes</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {item.movements.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3">{movementTypeBadge(m.type)}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.fromLocation ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.toLocation ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-white font-medium">{m.quantity}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-50 truncate">{m.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.userName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Item">
        <ItemEditForm
          initial={editInitial}
          onSubmit={handleEdit}
          onCancel={() => setEditModalOpen(false)}
          loading={formLoading}
          error={formError}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Item">
        <p className="text-zinc-300 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">{item.description}</span>?
          This will also delete all stock records.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
          <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

function ItemEditForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial: ItemFormData;
  onSubmit: (data: ItemFormData) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState<ItemFormData>(initial);

  function field(name: keyof ItemFormData) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Item ID *</label>
          <Input {...field("itemId")} required />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Unit</label>
          <Input {...field("unit")} />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Description *</label>
        <Input {...field("description")} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Category *</label>
          <Input {...field("category")} required />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Subcategory</label>
          <Input {...field("subcategory")} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Color</label>
          <Input {...field("color")} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Finish</label>
          <Input {...field("finish")} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Gauge</label>
          <Input {...field("gauge")} />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Dimensions</label>
        <Input {...field("dimensions")} />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
        <Input {...field("notes")} />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
