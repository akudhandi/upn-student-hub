"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FilterTabs,
  Modal,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
} from "@/components/admin-ui";

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
};

type CategoryListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: CategoryItem[] };
};

type ModuleTab = "marketplace" | "service" | "event";

const MODULE_TABS: ReadonlyArray<{ value: ModuleTab; label: string }> = [
  { value: "marketplace", label: "Marketplace" },
  { value: "service", label: "Services" },
  { value: "event", label: "Events" },
];

export default function AdminCategoriesPage() {
  const [tab, setTab] = useState<ModuleTab>("marketplace");
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async (type: ModuleTab, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<CategoryListResponse>(`/v1/admin/categories?type=${type}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat kategori. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and tab change
    void loadItems(tab, controller.signal);
    return () => {
      controller.abort();
    };
  }, [tab, loadItems]);

  function refresh() {
    void loadItems(tab);
  }

  function openAdd() {
    setEditing(null);
    setName("");
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(item: CategoryItem) {
    setEditing(item);
    setName(item.name);
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setActionError("Nama kategori wajib diisi.");
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      if (editing) {
        await apiFetch(`/v1/admin/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim() }),
        });
      } else {
        await apiFetch("/v1/admin/categories", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), type: tab }),
        });
      }
      setModalOpen(false);
      refresh();
    } catch {
      setActionError("Gagal menyimpan kategori. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: CategoryItem) {
    if (!window.confirm(`Hapus kategori "${item.name}"?`)) return;
    try {
      setBusyId(item.id);
      setActionError(null);
      await apiFetch(`/v1/admin/categories/${item.id}`, { method: "DELETE" });
      refresh();
    } catch {
      setActionError("Gagal menghapus kategori. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(item: CategoryItem) {
    try {
      setBusyId(item.id);
      setActionError(null);
      await apiFetch(`/v1/admin/categories/${item.id}/toggle`, { method: "PATCH" });
      setItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, is_active: !c.is_active } : c)));
    } catch {
      setActionError("Gagal mengubah status kategori. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Category Management</h1>
          <p className="mt-1 max-w-[600px] text-sm text-slate-500">
            Master data kategori per modul: tambah, ubah, hapus, dan aktif/nonaktifkan.
          </p>
        </div>
        <Button onClick={openAdd}>+ Tambah Kategori</Button>
      </div>

      <div className="mt-4">
        <FilterTabs ariaLabel="Filter kategori berdasarkan modul" options={MODULE_TABS} value={tab} onChange={setTab} />
      </div>

      {actionError && !modalOpen && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat kategori" columns={4} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty title="Belum ada kategori" description="Tambahkan kategori pertama untuk modul ini." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Slug</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">{item.slug}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill tone={item.is_active ? "green" : "slate"}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => openEdit(item)} aria-label={`Ubah ${item.name}`}>Edit</Button>
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => void handleToggle(item)} aria-label={`${item.is_active ? "Nonaktifkan" : "Aktifkan"} ${item.name}`}>
                          {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => void handleDelete(item)} aria-label={`Hapus ${item.name}`}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? "Ubah kategori" : "Tambah kategori"}
          description={`Modul: ${MODULE_TABS.find((t) => t.value === tab)?.label}`}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={(e) => void handleSave(e)}>
            {actionError && (
              <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError}
              </div>
            )}
            <Label htmlFor="category-name">Nama kategori</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Buku Kuliah" className="mt-1.5" maxLength={100} />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
