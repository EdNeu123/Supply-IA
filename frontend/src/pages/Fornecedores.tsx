import { Modal } from '@/components/ui/Modal';
import { Supplier } from '@/models/types';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Copy, Edit2, Link2, Plus, RefreshCw, Trash2, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const emptyForm = (): Partial<Supplier> => ({ name: '', whatsapp: '', email: '', productIds: [] });

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    active:  { label: 'Ativo',    className: 'bg-green-bg text-green',   icon: <CheckCircle2 size={12} /> },
    pending: { label: 'Pendente', className: 'bg-yellow-bg text-yellow', icon: <Clock size={12} /> },
    blocked: { label: 'Bloqueado',className: 'bg-red-bg text-danger',   icon: <XCircle size={12} /> },
  };
  const s = map[status] ?? map['pending'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>
      {s.icon}{s.label}
    </span>
  );
};

export const Fornecedores = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm());
  const [loadingLinkId, setLoadingLinkId] = useState<string | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Supplier>) =>
      editId ? supplierService.update(editId, data) : supplierService.create(data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(`Fornecedor ${editId ? 'atualizado' : 'criado'}!`);
      setIsOpen(false);
      if (data.inviteLink) {
        navigator.clipboard.writeText(data.inviteLink).catch(() => {});
        toast.info('Link de convite do Telegram copiado automaticamente!');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'Erro ao salvar fornecedor. Verifique se o backend está rodando.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Fornecedor excluído!'); },
    onError: () => toast.error('Erro ao excluir fornecedor.'),
  });

  const openModal = (s?: Supplier) => {
    setEditId(s?.id ?? null);
    setForm(s ? { ...s } : emptyForm());
    setIsOpen(true);
  };

  const toggleProduct = (pid: string) => {
    const ids = form.productIds ?? [];
    setForm({ ...form, productIds: ids.includes(pid) ? ids.filter(i => i !== pid) : [...ids, pid] });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success('Copiado!');
  };

  const handleGetInviteLink = async (s: Supplier) => {
    if (s.inviteLink) {
      copy(s.inviteLink);
      return;
    }
    setLoadingLinkId(s.id);
    try {
      const link = await supplierService.getInviteLink(s.id);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Link gerado e copiado! Envie ao fornecedor.');
    } catch {
      toast.error('Erro ao gerar link. Verifique o backend.');
    } finally {
      setLoadingLinkId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-text-1">Gestão de Fornecedores</h2>
          <p className="text-sm text-text-2 mt-0.5">Vincule produtos a cada fornecedor para que as cotações automáticas funcionem corretamente.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      {products.length === 0 && (
        <div className="p-4 bg-yellow-bg border border-yellow/30 rounded-xl text-sm text-yellow flex items-center gap-2">
          ⚠️ Cadastre produtos primeiro para poder vinculá-los aos fornecedores.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-text-2">Carregando...</p>
        ) : suppliers.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center p-16 bg-surface rounded-2xl border border-border">
            <Truck size={40} className="text-text-3 mb-3" />
            <p className="text-text-1 font-medium mb-1">Nenhum fornecedor cadastrado</p>
            <p className="text-text-2 text-sm">Adicione fornecedores e vincule-os aos produtos para ativar as cotações automáticas.</p>
          </div>
        ) : (
          suppliers.map(s => (
            <div key={s.id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text-1">{s.name}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-text-3 mt-0.5">Score: {s.reliabilityScore}/100</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openModal(s)} className="p-1.5 text-text-2 hover:text-accent rounded-lg hover:bg-accent-bg transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 text-text-2 hover:text-danger rounded-lg hover:bg-red-bg transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="text-xs text-text-2 space-y-1">
                {s.email    && <p><span className="text-text-3">E-mail:</span> {s.email}</p>}
                {s.whatsapp && <p><span className="text-text-3">Contato:</span> {s.whatsapp}</p>}
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-text-3 mb-1.5 uppercase tracking-wide">Produtos vinculados</p>
                {(s.productIds?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {s.productIds!.map(pid => {
                      const prod = products.find(p => p.id === pid);
                      return prod ? (
                        <span key={pid} className="px-2 py-0.5 bg-accent-bg text-accent text-xs rounded-full font-medium">
                          {prod.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-yellow flex items-center gap-1">
                    ⚠️ Nenhum produto vinculado — cotações não serão enviadas a este fornecedor.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                {s.status === 'active' ? (
                  <p className="text-xs text-green flex items-center gap-1">
                    <CheckCircle2 size={12} /> Telegram ativado — pronto para receber cotações.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-text-3 uppercase tracking-wide flex items-center gap-1">
                      <Link2 size={11} /> Link de ativação (Telegram)
                    </p>
                    {s.inviteLink && (
                      <div className="flex items-center gap-2 bg-surface-2 px-2 py-1.5 rounded-lg">
                        <input readOnly value={s.inviteLink} className="flex-1 bg-transparent text-xs text-text-2 outline-none truncate" />
                        <button onClick={() => copy(s.inviteLink!)} className="p-1 bg-surface text-text-2 hover:text-accent rounded">
                          <Copy size={13} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleGetInviteLink(s)}
                      disabled={loadingLinkId === s.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-bg text-accent border border-accent/30 rounded-xl text-xs font-medium hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                    >
                      {loadingLinkId === s.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : s.inviteLink ? (
                        <><Copy size={13} /> Copiar link de convite</>
                      ) : (
                        <><Link2 size={13} /> Gerar link de convite</>
                      )}
                    </button>
                    <p className="text-xs text-text-3">Envie este link para o fornecedor ativar o bot.</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-5">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-1 mb-1">Nome <span className="text-danger">*</span></label>
              <input type="text" required placeholder="Ex: Distribuidora Alpha"
                value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-1 mb-1">Contato</label>
                <input type="text" placeholder="+55 47 99999-9999"
                  value={form.whatsapp ?? ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-1 mb-1">E-mail</label>
                <input type="email" placeholder="vendas@fornecedor.com"
                  value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-1 focus:border-accent outline-none text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-1 mb-1">
              Produtos atendidos <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-3 mb-2">Selecione quais produtos este fornecedor pode fornecer. As cotações automáticas serão enviadas apenas quando um produto vinculado atingir o ponto de pedido.</p>
            {products.length === 0 ? (
              <p className="text-xs text-yellow p-3 bg-yellow-bg rounded-xl">Nenhum produto cadastrado ainda. Cadastre produtos primeiro.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                {products.map(p => {
                  const selected = (form.productIds ?? []).includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        selected ? 'bg-accent-bg text-accent font-medium' : 'text-text-1 hover:bg-surface-2'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'bg-accent border-accent' : 'border-border'
                      }`}>
                        {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto text-xs text-text-3 shrink-0">{p.sku}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {(form.productIds?.length ?? 0) === 0 && products.length > 0 && (
              <p className="text-xs text-yellow mt-1">⚠️ Selecione pelo menos um produto para que as cotações funcionem.</p>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-text-2 hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 min-w-[80px]">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};