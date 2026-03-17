"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, KeyRound, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type User = {
  id: number;
  name: string;
  role: "admin" | "user";
  createdAt: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminClient() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "user">("user");
  const [addPin, setAddPin] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Reset PIN Modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401 || res.status === 403) {
        router.push("/search");
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAddUser() {
    setAddError("");
    if (!addName.trim()) {
      setAddError("Name is required.");
      return;
    }
    if (!addPin.trim()) {
      setAddError("PIN is required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), pin: addPin, role: addRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to create user.");
        return;
      }
      setShowAddModal(false);
      setAddName("");
      setAddPin("");
      setAddRole("user");
      fetchUsers();
    } finally {
      setAdding(false);
    }
  }

  async function handleResetPin() {
    setResetError("");
    if (!resetPin.trim()) {
      setResetError("PIN is required.");
      return;
    }
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: resetPin }),
      });
      if (!res.ok) {
        const err = await res.json();
        setResetError(err.error ?? "Failed to reset PIN.");
        return;
      }
      setResetTarget(null);
      setResetPin("");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error ?? "Failed to delete user.");
        return;
      }
      setDeleteTarget(null);
      fetchUsers();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin — Users</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No users found.</p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {user.name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.role === "admin" ? "primary" : "default"}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetTarget(user);
                          setResetPin("");
                          setResetError("");
                        }}
                        title="Reset PIN"
                      >
                        <KeyRound className="w-4 h-4" />
                        Reset PIN
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteError("");
                        }}
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddName("");
          setAddPin("");
          setAddRole("user");
          setAddError("");
        }}
        title="Add User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
            <Input
              placeholder="Full name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Role</label>
            <Select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as "admin" | "user")}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">PIN</label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="4-digit PIN"
              maxLength={8}
              value={addPin}
              onChange={(e) => setAddPin(e.target.value)}
            />
          </div>
          {addError && (
            <p className="text-red-400 text-sm">{addError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleAddUser}
              disabled={adding}
              className="flex-1"
            >
              {adding ? "Creating..." : "Create User"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setAddName("");
                setAddPin("");
                setAddRole("user");
                setAddError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setResetPin("");
          setResetError("");
        }}
        title={`Reset PIN — ${resetTarget?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              New PIN
            </label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="New 4-digit PIN"
              maxLength={8}
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPin()}
            />
          </div>
          {resetError && (
            <p className="text-red-400 text-sm">{resetError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleResetPin}
              disabled={resetting}
              className="flex-1"
            >
              {resetting ? "Saving..." : "Save PIN"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setResetPin("");
                setResetError("");
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
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        title="Delete User"
      >
        <p className="text-zinc-300 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.name}
          </span>
          ? This cannot be undone.
        </p>
        {deleteError && (
          <p className="text-red-400 text-sm mb-3">{deleteError}</p>
        )}
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1"
          >
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError("");
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
