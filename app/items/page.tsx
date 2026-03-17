"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";

type StockByLocation = {
  locationId: number;
  locationName: string;
  quantity: number;
};

type Item = {
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

const emptyForm: ItemFormData = {
  itemId: "",
  description: "",
  category: "",
  subcategory: "",
  color: "",
  finish: "",
  gauge: "",
  unit: "ea",
  notes: "",
  dimensions: "",
};

function ItemForm({
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Item ID *</label>
          <Input {...field("itemId")} required placeholder="e.g. STL-1001" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Unit</label>
          <Input {...field("unit")} placeholder="ea" />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Description *</label>
        <Input {...field("description")} required placeholder="Item description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Category *</label>
          <Input {...field("category")} required placeholder="e.g. Steel" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Subcategory</label>
          <Input {...field("subcategory")} placeholder="Optional" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Color</label>
          <Input {...field("color")} placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Finish</label>
          <Input {...field("finish")} placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Gauge</label>
          <Input {...field("gauge")} placeholder="Optional" />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Dimensions</label>
        <Input {...field("dimensions")} placeholder="Optional" />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
        <Input {...field("notes")} placeholder="Optional" />
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

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/items");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const matchQ =
        !q ||
        item.itemId.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subcategory?.toLowerCase().includes(q) ?? false);
      const matchCat = !categoryFilter || item.category === categoryFilter;
      return matchQ && matchCat;
    });
  }, [items, searchQuery, categoryFilter]);

  async function handleAdd(data: ItemFormData) {
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed to create item");
        return;
      }
      setAddModalOpen(false);
      fetchItems();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEdit(data: ItemFormData) {
    if (!editItem) return;
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch(`/api/items/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed to update item");
        return;
      }
      setEditItem(null);
      fetchItems();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(item: Item) {
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchItems();
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Items</h1>
        <Button onClick={() => { setFormError(""); setAddModalOpen(true); }}>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-500 text-white placeholder:text-zinc-500 rounded px-3 py-2 pl-8 text-sm outline-none transition-colors"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium w-10"></th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Item ID</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Color / Finish</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Gauge</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Unit</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Stock</th>
                <th className="px-4 py-3 text-zinc-400 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-900/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/items/${item.id}`)}
                  >
                    <td className="px-4 py-3">
                      {item.profileImage ? (
                        <img
                          src={`/ext-profiles/${item.profileImage}`}
                          alt=""
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-zinc-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{item.itemId}</td>
                    <td className="px-4 py-3 text-white font-medium">{item.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{item.category}</Badge>
                      {item.subcategory && (
                        <span className="ml-1 text-zinc-500 text-xs">{item.subcategory}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {[item.color, item.finish].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item.gauge ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                      {item.totalStock}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => {
                            setFormError("");
                            setEditItem(item);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => setDeleteConfirm(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Item">
        <ItemForm
          initial={emptyForm}
          onSubmit={handleAdd}
          onCancel={() => setAddModalOpen(false)}
          loading={formLoading}
          error={formError}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Item">
        {editItem && (
          <ItemForm
            initial={{
              itemId: editItem.itemId,
              description: editItem.description,
              category: editItem.category,
              subcategory: editItem.subcategory ?? "",
              color: editItem.color ?? "",
              finish: editItem.finish ?? "",
              gauge: editItem.gauge ?? "",
              unit: editItem.unit,
              notes: editItem.notes ?? "",
              dimensions: editItem.dimensions ?? "",
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            loading={formLoading}
            error={formError}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Item">
        {deleteConfirm && (
          <div>
            <p className="text-zinc-300 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{deleteConfirm.description}</span>?
              This will also delete all stock records for this item.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
