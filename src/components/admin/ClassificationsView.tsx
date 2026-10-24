import React, { useState } from 'react';
import { Tag, Plus, Edit, Trash2, CheckCircle2, Save, X } from 'lucide-react';
import { ClassificationCode } from '../../types';
import { storage } from '../../utils/storage';

export const ClassificationsView: React.FC = () => {
  const [classifications, setClassifications] = useState<ClassificationCode[]>(
    storage.getClassifications()
  );
  const [editingItem, setEditingItem] = useState<ClassificationCode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setClassifications(storage.getClassifications());
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setEditingItem({
      id: `cls_${Date.now()}`,
      code: '',
      name: '',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ClassificationCode) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.code.trim() || !editingItem.name.trim()) {
      alert('Kode dan nama klasifikasi wajib diisi.');
      return;
    }

    const cleanCode = editingItem.code.trim().toUpperCase();
    const updated = {
      ...editingItem,
      code: cleanCode,
      name: editingItem.name.trim(),
    };

    storage.saveClassification(updated);
    setClassifications(storage.getClassifications());
    setIsModalOpen(false);
    setAlertMsg(`Kode klasifikasi ${cleanCode} berhasil disimpan.`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {alertMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{alertMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Manajemen Kode Klasifikasi</h2>
          <p className="text-xs text-slate-400 mt-1">
            Daftar kode klasifikasi sertifikat (misal: RLN = Relawan, PLT = Pelatihan, SEM = Seminar) yang digunakan dalam penomoran otomatis.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Klasifikasi Baru</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Kode Klasifikasi</th>
                <th className="py-3 px-4">Nama Klasifikasi</th>
                <th className="py-3 px-4">Keterangan / Peruntukan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {classifications.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-300 text-sm">
                    {item.code}
                  </td>
                  <td className="py-3.5 px-4 text-white font-semibold">{item.name}</td>
                  <td className="py-3.5 px-4 text-slate-400">{item.description || '-'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      title="Ubah Klasifikasi"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
              <h3 className="text-sm font-bold text-white">
                {editingItem.code ? `Edit Klasifikasi: ${editingItem.code}` : 'Tambah Klasifikasi Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kode Singkat (Huruf Kapital, e.g. RLN, PLT) *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.code}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })
                  }
                  placeholder="RLN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Klasifikasi Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Relawan"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keterangan / Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  placeholder="Diperuntukkan bagi peserta penggiat dan relawan..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cls_active"
                  checked={editingItem.isActive}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, isActive: e.target.checked })
                  }
                  className="rounded border-slate-700 text-amber-500 w-4 h-4"
                />
                <label htmlFor="cls_active" className="text-xs text-slate-300">
                  Status Kode Aktif
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Simpan Klasifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
