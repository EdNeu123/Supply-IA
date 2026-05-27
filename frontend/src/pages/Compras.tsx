import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderService } from '@/services/apiServices';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

export const Compras = () => {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: purchaseOrderService.list });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => purchaseOrderService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Status atualizado!'); },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-1">Gestão de Compras</h2>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>{['Data', 'Produto', 'Fornecedor', 'Total', 'Status', 'Ação'].map(h =>
              <th key={h} className={`px-6 py-4 font-medium ${h === 'Ação' ? 'text-right' : ''}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0
              ? <tr><td colSpan={6} className="text-center py-8 text-text-2">Nenhum pedido gerado.</td></tr>
              : orders.map(o => {
                const product = products.find(p => p.id === o.productId);
                const supplier = suppliers.find(s => s.id === o.supplierId);
                return (
                  <tr key={o.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-medium">{product?.name}</td>
                    <td className="px-6 py-4">{supplier?.name}</td>
                    <td className="px-6 py-4">R$ {o.total.toFixed(2)}</td>
                    <td className="px-6 py-4 capitalize text-accent font-medium">{o.status}</td>
                    <td className="px-6 py-4 text-right">
                      {o.status !== 'received' && (
                        <button onClick={() => statusMutation.mutate({ id: o.id, status: 'received' })}
                          className="text-text-2 hover:text-green flex items-center gap-1 ml-auto transition-colors">
                          <CheckCircle2 size={16} /> Receber
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
