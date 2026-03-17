"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CountSession = {
  id: number;
  name: string | null;
  locationId: number | null;
  locationName: string | null;
  status: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
  createdByName: string | null;
  entryCount: number;
};

type Location = {
  id: number;
  name: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CountPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocationId, setNewLocationId] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CountSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/count");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch {
        /* ignore */
      }
    }
    fetchLocations();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const body: { name?: string; locationId?: number } = {};
      if (newName.trim()) body.name = newName.trim();
      if (newLocationId) body.locationId = parseInt(newLocationId, 10);

      const res = await fetch("/api/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        setNewName("");
        setNewLocationId("");
        router.push(`/count/${created.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(s: CountSession) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/count/${s.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        fetchSessions();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Inventory Count</h1>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4" />
          New Count Session
        </Button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No count sessions yet.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowNewModal(true)}
          >
            Create first session
          </Button>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    Entries
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/count/${s.id}`)}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {s.name ?? (
                        <span className="text-zinc-500 italic">Unnamed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {s.locationName ?? (
                        <span className="text-zinc-600">All locations</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={s.status === "open" ? "success" : "default"}
                        className="capitalize"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {s.entryCount}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {s.status === "open" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
                          title="Cancel session"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Count Modal */}
      <Modal
        open={showNewModal}
        onClose={() => {
          setShowNewModal(false);
          setNewName("");
          setNewLocationId("");
        }}
        title="New Count Session"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Session Name{" "}
              <span className="text-zinc-600">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Q1 2026 Count"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Location{" "}
              <span className="text-zinc-600">(optional — filters stock)</span>
            </label>
            <Select
              value={newLocationId}
              onChange={(e) => setNewLocationId(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1"
            >
              {creating ? "Creating..." : "Create Session"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewModal(false);
                setNewName("");
                setNewLocationId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Cancel Session"
      >
        <p className="text-zinc-300 mb-4">
          Cancel session{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.name ?? "Unnamed"}
          </span>
          ? This will close it without applying any changes.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={() => deleteTarget && handleDelete(deleteTarget)}
            disabled={deleting}
            className="flex-1"
          >
            {deleting ? "Cancelling..." : "Cancel Session"}
          </Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Keep Open
          </Button>
        </div>
      </Modal>
    </div>
  );
}
