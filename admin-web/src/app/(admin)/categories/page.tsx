"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ModalShell from "@/components/admin/ModalShell";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  toggleAdminCategory,
  updateAdminCategory,
  type CategoryItem,
  type CategoryType,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";

const LOAD_ERROR =
  "Gagal memuat master kategori. Pastikan backend berjalan lalu coba lagi.";

const MODULE_TABS: ReadonlyArray<{ value: CategoryType; label: string }> = [
  { value: "marketplace", label: "Marketplace" },
  { value: "service", label: "Jasa Mahasiswa" },
  { value: "lost_found", label: "Lost & Found" },
  { value: "event", label: "Event Kampus" },
];

function CategoryFormModal({
  editing,
  defaultType,
  saving,
  error,
  onSave,
  onClose,
}: {
  editing: CategoryItem | null;
  defaultType: CategoryType;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");

  const moduleLabel =
    MODULE_TABS.find((t) => t.value === defaultType)?.label ?? defaultType;

  return (
    <ModalShell
      ariaLabel={editing ? "Ubah Kategori" : "Tambah Kategori"}
      onClose={onClose}
      busy={saving}
      size="md"
    >
      <h3 className="font-display text-base font-semibold text-[#141416]">
        {editing ? "Ubah Kategori" : "Tambah Kategori Baru"}
      </h3>
      <p className="mt-1 text-xs text-[#6E6A66]">
        Modul: <span className="font-semibold text-[#141416]">{moduleLabel}</span>
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3 py-2 text-xs font-medium text-[#A62D2D]"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name);
        }}
        className="mt-4 space-y-4"
      >
        <div>
          <label
            htmlFor="category-name"
            className="mb-1.5 block text-xs font-semibold text-[#57534E]"
          >
            Nama Kategori
          </label>
          <input
            id="category-name"
            type="text"
            required
            maxLength={100}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Elektronik & Gadget"
            className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function CategoriesAdminPage() {
  const [tab, setTab] = useState<CategoryType>("marketplace");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<CategoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminCategories({ page, type: tab }, { signal: controller.signal }).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setError(null);
        setResult(data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      controller.abort();
    };
  }, [page, tab, retryKey]);

  async function reload() {
    const data = await getAdminCategories({ page, type: tab });
    if (data.data.length === 0 && data.current_page > 1) {
      setPage(data.current_page - 1);
    } else {
      setError(null);
      setResult(data);
    }
  }

  async function handleSave(rawName: string) {
    const trimmed = rawName.trim();
    if (!trimmed) {
      setModalError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      if (editing) {
        await updateAdminCategory(editing.id, { name: trimmed });
      } else {
        await createAdminCategory({ name: trimmed, type: tab });
      }
      setModalOpen(false);
      setEditing(null);
      await reload();
    } catch (err) {
      setModalError(
        extractAdminError(
          err,
          "Gagal menyimpan kategori. Pastikan nama belum terpakai.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: CategoryItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await toggleAdminCategory(item.id);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((c) => (c.id === item.id ? updated : c)),
            }
          : prev,
      );
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal mengubah status kategori. Coba lagi."),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    setActionError(null);
    try {
      await deleteAdminCategory(confirmDelete.id);
      setConfirmDelete(null);
      await reload();
    } catch (err) {
      setConfirmDelete(null);
      setActionError(
        extractAdminError(err, "Gagal menghapus kategori. Coba lagi."),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#787470]">
            Sistem
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
            Master Data Categories
          </h2>
          <p className="mt-1 text-sm text-[#6E6A66]">
            Kelola taksonomi kategori per modul: tambah, ubah nama, aktif/nonaktifkan, atau hapus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#141416] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] sm:self-auto"
        >
          <span aria-hidden="true" className="text-sm leading-none">
            +
          </span>
          Tambah Kategori
        </button>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
        >
          {actionError}
        </p>
      )}

      <section className="rounded-2xl border border-[#E5E0DA] bg-white p-4">
        <div
          role="tablist"
          aria-label="Filter modul kategori"
          className="flex flex-wrap gap-1.5"
        >
          {MODULE_TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#141416] text-white"
                    : "bg-[#EFECE8] text-[#57534E] hover:bg-[#E5E0DA] hover:text-[#141416]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E5E0DA] bg-white">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!result}
          loadingLabel="Memuat kategori"
          skeletonRows={4}
          skeletonHeightClass="h-14"
          empty={Boolean(result && result.data.length === 0)}
          emptyTitle="Belum ada kategori"
          emptyMessage="Tambahkan kategori pertama untuk modul ini."
        >
          {result && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F2EEEA] bg-[#FAF8F6] text-xs font-semibold tracking-wider text-[#6E6A66] uppercase">
                      <th className="px-4 py-3.5 font-medium">Nama Kategori</th>
                      <th className="px-4 py-3.5 font-medium">Slug</th>
                      <th className="px-4 py-3.5 font-medium">Modul</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EEEA] text-sm">
                    {result.data.map((cat) => (
                      <tr key={cat.id} className="transition hover:bg-[#FAF8F6]">
                        <td className="px-4 py-4 font-semibold text-[#141416]">
                          {cat.name}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[#6E6A66]">
                          {cat.slug}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#EFECE8] px-2.5 py-0.5 text-xs font-semibold text-[#57534E]">
                            {MODULE_TABS.find((t) => t.value === cat.type)?.label ??
                              cat.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            label={cat.is_active ? "Aktif" : "Nonaktif"}
                            tone={cat.is_active ? "green" : "slate"}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === cat.id}
                              onClick={() => {
                                setEditing(cat);
                                setModalError(null);
                                setModalOpen(true);
                              }}
                              className="rounded-full border border-[#DFD9D2] bg-white px-3 py-1 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busyId === cat.id}
                              onClick={() => handleToggle(cat)}
                              className="rounded-full border border-[#DFD9D2] bg-white px-3 py-1 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
                            >
                              {cat.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === cat.id}
                              onClick={() => setConfirmDelete(cat)}
                              className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-[#A62D2D] transition hover:bg-[#FADADA] disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={result.current_page}
                lastPage={result.last_page}
                total={result.total}
                onPage={setPage}
              />
            </>
          )}
        </TableState>
      </section>

      {modalOpen && (
        <CategoryFormModal
          key={editing ? `edit-${editing.id}` : `new-${tab}`}
          editing={editing}
          defaultType={tab}
          saving={saving}
          error={modalError}
          onSave={handleSave}
          onClose={() => {
            if (!saving) {
              setModalOpen(false);
              setEditing(null);
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus kategori?"
          message={`Kategori "${confirmDelete.name}" akan dihapus dari sistem.`}
          confirmLabel="Hapus"
          danger
          busy={busyId === confirmDelete.id}
          onConfirm={handleDelete}
          onCancel={() => {
            if (busyId === null) setConfirmDelete(null);
          }}
        />
      )}
    </main>
  );
}
