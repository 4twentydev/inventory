"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Pencil, Trash2, Package } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import Drawer from "@/components/ui/drawer";

type LocationWithStats = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  itemCount: number;
  totalStock: number;
};

type LocationDetail = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  totalStock: number;
  itemCount: number;
  items: Array<{
    stockId: number;
    quantity: number;
    itemDbId: number;
    itemId: string;
    description: string;
    category: string;
    subcategory: string | null;
    color: string | null;
    finish: string | null;
    gauge: string | null;
    unit: string;
    profileImage: string | null;
  }>;
};

type LocationFormData = {
  name: string;
  description: string;
};

function LocationForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial: LocationFormData;
  onSubmit: (data: LocationFormData) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState<LocationFormData>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          placeholder="e.g. Shelf A, Bay 3"
        />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Description</label>
        <Input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional"
        />
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

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationWithStats | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LocationWithStats | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Drawer for location detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<LocationDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  async function fetchLocations() {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(loc: LocationWithStats) {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerDetail(null);
    try {
      const res = await fetch(`/api/locations/${loc.id}`);
      const data = await res.json();
      setDrawerDetail(data);
    } catch {
      setDrawerDetail(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleAdd(data: LocationFormData) {
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed");
        return;
      }
      setAddModalOpen(false);
      fetchLocations();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEdit(data: LocationFormData) {
    if (!editLocation) return;
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch(`/api/locations/${editLocation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed");
        return;
      }
      setEditLocation(null);
      fetchLocations();
    } catch {
      setFormError("Request failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(loc: LocationWithStats) {
    setDeleteError("");
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error ?? "Failed to delete");
        return;
      }
      setDeleteConfirm(null);
      fetchLocations();
    } catch {
      setDeleteError("Request failed");
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Locations</h1>
        <Button onClick={() => { setFormError(""); setAddModalOpen(true); }}>
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : locations.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No locations yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 cursor-pointer transition-colors group"
              onClick={() => openDetail(loc)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{loc.name}</h3>
                    {loc.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{loc.description}</p>
                    )}
                  </div>
                </div>
                <div
                  className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Edit"
                    onClick={() => { setFormError(""); setEditLocation(loc); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Delete"
                    onClick={() => { setDeleteError(""); setDeleteConfirm(loc); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  <Package className="w-3 h-3 mr-1 inline-block" />
                  {loc.itemCount} item{loc.itemCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="default">
                  {loc.totalStock} total
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Location">
        <LocationForm
          initial={{ name: "", description: "" }}
          onSubmit={handleAdd}
          onCancel={() => setAddModalOpen(false)}
          loading={formLoading}
          error={formError}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editLocation} onClose={() => setEditLocation(null)} title="Edit Location">
        {editLocation && (
          <LocationForm
            initial={{ name: editLocation.name, description: editLocation.description ?? "" }}
            onSubmit={handleEdit}
            onCancel={() => setEditLocation(null)}
            loading={formLoading}
            error={formError}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Location">
        {deleteConfirm && (
          <div>
            <p className="text-zinc-300 mb-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{deleteConfirm.name}</span>?
            </p>
            {deleteConfirm.totalStock > 0 && (
              <p className="text-yellow-400 text-sm mb-3">
                This location has {deleteConfirm.totalStock} units of stock. Remove all stock before deleting.
              </p>
            )}
            {deleteError && <p className="text-red-400 text-xs mb-3">{deleteError}</p>}
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

      {/* Location detail drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerDetail?.name ?? "Location"}
      >
        {drawerLoading ? (
          <div className="p-6 text-zinc-500">Loading...</div>
        ) : drawerDetail ? (
          <div className="p-6 space-y-6">
            <div>
              {drawerDetail.description && (
                <p className="text-zinc-400 text-sm mb-3">{drawerDetail.description}</p>
              )}
              <div className="flex gap-3">
                <div className="bg-zinc-800 rounded-lg px-4 py-3 text-center">
                  <p className="text-xl font-bold text-white">{drawerDetail.itemCount}</p>
                  <p className="text-xs text-zinc-500">Items</p>
                </div>
                <div className="bg-zinc-800 rounded-lg px-4 py-3 text-center">
                  <p className="text-xl font-bold text-white">{drawerDetail.totalStock}</p>
                  <p className="text-xs text-zinc-500">Total Stock</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Items at this location</h4>
              {drawerDetail.items.length === 0 ? (
                <p className="text-zinc-500 text-sm">No items stocked here.</p>
              ) : (
                <div className="space-y-2">
                  {drawerDetail.items.map((item) => (
                    <div
                      key={item.stockId}
                      className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3 cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => router.push(`/items/${item.itemDbId}`)}
                    >
                      {item.profileImage ? (
                        <img
                          src={`/ext-profiles/${item.profileImage}`}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-zinc-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-400">{item.itemId}</span>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-white truncate mt-0.5">{item.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-white">{item.quantity}</p>
                        <p className="text-xs text-zinc-500">{item.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-zinc-500">Failed to load location.</div>
        )}
      </Drawer>
    </div>
  );
}
