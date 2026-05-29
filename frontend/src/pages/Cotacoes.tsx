import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rfqService, quoteService, purchaseOrderService } from '@/services/apiServices';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Check, MessageSquare } from 'lucide-react';

export const Cotacoes = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);
  const [sim, setSim] = useState({ supplierId: '', rawReply: '' });

  const { data: rfqs = [] } = useQuery({ queryKey: ['rfqs'], queryFn: rfqService.list });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: quoteService.list });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const simulateMutation = useMutation({
    mutationFn: quoteService.simulate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('IA estruturou a resposta!'); setModalOpen(false); },
  });

  const approveMutation = useMutation({
    mutationFn: purchaseOrderService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Ordem de compra gerada!'); },
  });

  const ranked = (rfqId: string) =>
    quotes.filter(q => q.rfqId === rfqId && q.status === 'answered').sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-1">Comparativo de Cotações</h2>
      {rfqs.length === 0 ? <p className="text-text-2">Nenhuma cotação em andamento.</p>
        : rfqs.map(rfq => {
          const product = products.find(p => p.id === rfq.productId);
          const rfqQuotes = ranked(rfq.id);
          return (
            <div key={rfq.id} className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-text-1">{product?.name || 'Produto'}</h3>
                  <p className="text-sm text-text-2">{new Date(rfq.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => { setSelectedRfq(rfq.id); setModalOpen(true); }}
                  className="bg-surface-2 text-text-1 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-border transition-colors text-sm font-medium">
                  <MessageSquare size={16} /> Simular Resposta
                </button>
              </div>
              {rfqQuotes.length === 0
                ? <div className="p-4 bg-surface-2 rounded-xl text-text-2 text-sm">Aguardando respostas...</div>
                : (
                  <div className="overflow-hidden border border-border rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-2 text-text-2 border-b border-border">
                        <tr>{['Rank', 'Fornecedor', 'Preço Unit.', 'Prazo', 'Ação'].map(h =>
                          <th key={h} className={`px-4 py-3 ${h === 'Ação' ? 'text-right' : ''}`}>{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rfqQuotes.map((q, i) => {
                          const sup = suppliers.find(s => s.id === q.supplierId);
                          return (
                            <tr key={q.id} className={i === 0 ? 'bg-green-bg bg-opacity-20' : ''}>
                              <td className="px-4 py-3 font-medium">#{i + 1}</td>
                              <td className="px-4 py-3">{sup?.name}</td>
                              <td className="px-4 py-3">{q.unitPrice ? `R$ ${q.unitPrice.toFixed(2)}` : '-'}</td>
                              <td className="px-4 py-3">{q.leadTimeDays ? `${q.leadTimeDays} dias` : '-'}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => approveMutation.mutate({ quoteId: q.id, productId: q.productId, supplierId: q.supplierId, qty: q.minQty || 10, total: (q.unitPrice || 0) * (q.minQty || 10) })}
                                  className="bg-accent text-white px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto hover:bg-opacity-90 transition-colors">
                                  <Check size={14} /> Aprovar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          );
        })}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Simular Resposta (Plano B)">
        <form onSubmit={e => { e.preventDefault(); simulateMutation.mutate({ rfqId: selectedRfq!, ...sim }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <select required value={sim.supplierId} onChange={e => setSim({ ...sim, supplierId: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-surface outline-none">
              <option value="">Selecione...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto Livre</label>
            <textarea required rows={4} placeholder="Ex: Consigo fazer a R$ 12,50, entrego em 3 dias."
              value={sim.rawReply} onChange={e => setSim({ ...sim, rawReply: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-surface outline-none resize-none" />
          </div>
          <button type="submit" disabled={simulateMutation.isPending} className="w-full bg-accent text-white py-2 rounded-xl font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50">
            {simulateMutation.isPending ? 'Processando...' : 'Estruturar com IA'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
