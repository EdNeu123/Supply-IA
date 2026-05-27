import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit2, Trash2, Copy, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Supplier } from '@/models/types';

const emptyForm = (): Partial<Supplier> => ({ name: '', whatsapp: '', email: '', productIds: [] });

export const Fornecedores = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm());

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Supplier>) => editId ? supplierService.update(editId, data) : supplierService.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(`Fornecedor ${editId ? 'atualizado' : 'criado'}!`);
      setIsOpen(false);
      if (data.inviteLink) { navigator.clipboard.writeText(data.inviteLink); toast.success('Link de convite copiado!'); }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Fornecedor excluído!'); },
  });

  const openModal = (s?: Supplier) => { setEditId(s?.id ?? null); setForm(s ? { ...s } : emptyForm()); setIsOpen(true); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copiado!'); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-1">Gestão de Fornecedores</h2>
        <button onClick={() => openModal()} className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-colors">
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? <p className="text-text-2">Carregando...</p>
          : suppliers.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center p-12 bg-surface rounded-2xl border border-border">
              <Truck size={48} className="text-text-3 mb-4" /><p className="text-text-2">Nenhum fornecedor cadastrado.</p>
            </div>
          ) : suppliers.map(s => (
          <div key={s.id} className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => openModal(s)} className="p-2 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors"><Edit2 size={16} /></button>
              <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 text-text-2 hover:text-danger rounded-lg hover:bg-red-bg transition-colors"><Trash2 size={16} /></button>
            </div>
            <div><h3 className="text-lg font-medium text-text-1">{s.name}</h3><p className="text-sm text-text-2">Score: {s.reliabilityScore}/100</p></div>
            <div className="text-sm space-y-1 text-text-2">
              <p><strong>Email:</strong> {s.email || '-'}</p>
              <p><strong>Status:</strong> <span className={s.status === 'active' ? 'text-green' : 'text-yellow'}>{s.status}</span></p>
            </div>
            {s.inviteLink && (
              <div className="mt-auto pt-4 border-t border-border">
                <p className="text-xs text-text-3 mb-2 font-medium">Link de Convite (Telegram):</p>
                <div className="flex items-center gap-2 bg-surface-2 p-2 rounded-lg">
                  <input type="text" readOnly value={s.inviteLink} className="flex-1 bg-transparent text-xs text-text-2 outline-none truncate" />
                  <button onClick={() => copy(s.inviteLink!)} className="p-1.5 bg-surface text-text-2 hover:text-accent rounded shadow-sm"><Copy size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          {[{ label: 'Nome', key: 'name', type: 'text', required: true },
            { label: 'WhatsApp', key: 'whatsapp', type: 'text' },
            { label: 'E-mail', key: 'email', type: 'email' }].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-text-1 mb-1">{label}</label>
              <input type={type} required={required} value={(form as any)[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none" />
            </div>
          ))}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 bg-accent text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
