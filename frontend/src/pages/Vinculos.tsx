import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';
import { productService } from '@/services/productService';
import { Search, X, Plus, Package, Truck, Link2 } from 'lucide-react';
import { toast } from 'sonner';

type SearchType = 'produto' | 'fornecedor';

export const Vinculos = () => {
  const qc = useQueryClient();
  const [searchType, setSearchType] = useState<SearchType>('produto');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  // Mutation para atualizar productIds do fornecedor
  const updateSupplier = useMutation({
    mutationFn: ({ id, productIds }: { id: string; productIds: string[] }) =>
      supplierService.update(id, { productIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: () => toast.error('Erro ao atualizar vínculo.'),
  });

  // Resultados filtrados pela busca
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    if (searchType === 'produto')
      return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [query, searchType, products, suppliers]);

  // Item selecionado
  const selectedProduct  = searchType === 'produto'    ? products.find(p => p.id === selected)  : null;
  const selectedSupplier = searchType === 'fornecedor' ? suppliers.find(s => s.id === selected) : null;

  // Vínculos do item selecionado
  const linkedSuppliers = selectedProduct
    ? suppliers.filter(s => (s.productIds ?? []).includes(selectedProduct.id))
    : [];
  const linkedProducts = selectedSupplier
    ? products.filter(p => (selectedSupplier.productIds ?? []).includes(p.id))
    : [];

  // Itens disponíveis para adicionar vínculo
  const availableSuppliers = selectedProduct
    ? suppliers.filter(s => !(s.productIds ?? []).includes(selectedProduct.id))
    : [];
  const availableProducts = selectedSupplier
    ? products.filter(p => !(selectedSupplier.productIds ?? []).includes(p.id))
    : [];

  const handleAddVinculo = (targetId: string) => {
    if (selectedProduct) {
      // Adiciona produto ao fornecedor
      const supplier = suppliers.find(s => s.id === targetId)!;
      const ids = [...(supplier.productIds ?? []), selectedProduct.id];
      updateSupplier.mutate({ id: supplier.id, productIds: ids });
      toast.success(`"${supplier.name}" vinculado a "${selectedProduct.name}"`);
    } else if (selectedSupplier) {
      // Adiciona produto ao fornecedor selecionado
      const ids = [...(selectedSupplier.productIds ?? []), targetId];
      updateSupplier.mutate({ id: selectedSupplier.id, productIds: ids });
      const prod = products.find(p => p.id === targetId);
      toast.success(`"${prod?.name}" vinculado a "${selectedSupplier.name}"`);
    }
  };

  const handleRemoveVinculo = (targetId: string) => {
    if (selectedProduct) {
      const supplier = suppliers.find(s => s.id === targetId)!;
      const ids = (supplier.productIds ?? []).filter(id => id !== selectedProduct.id);
      updateSupplier.mutate({ id: supplier.id, productIds: ids });
      toast.success('Vínculo removido.');
    } else if (selectedSupplier) {
      const ids = (selectedSupplier.productIds ?? []).filter(id => id !== targetId);
      updateSupplier.mutate({ id: selectedSupplier.id, productIds: ids });
      toast.success('Vínculo removido.');
    }
  };

  const handleSelect = (id: string) => {
    setSelected(id);
    setQuery('');
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text-1">Vínculos Produto × Fornecedor</h2>
        <p className="text-sm text-text-2 mt-0.5">
          Gerencie quais fornecedores atendem cada produto. As cotações automáticas respeitam esses vínculos.
        </p>
      </div>

      {/* Barra de busca */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        {/* Tipo de busca */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-2">Buscar por:</span>
          <div className="flex bg-surface-2 rounded-xl p-1 gap-1">
            {(['produto', 'fornecedor'] as SearchType[]).map(type => (
              <button
                key={type}
                onClick={() => { setSearchType(type); setQuery(''); setSelected(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  searchType === type
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-2 hover:text-text-1'
                }`}
              >
                {type === 'produto' ? <span className="flex items-center gap-1.5"><Package size={14} />Produto</span>
                                   : <span className="flex items-center gap-1.5"><Truck size={14} />Fornecedor</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Input de busca */}
        {!selected && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              placeholder={searchType === 'produto' ? 'Digite o nome ou SKU do produto...' : 'Digite o nome do fornecedor...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-1 focus:border-accent outline-none text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Resultados da busca */}
        {query && !selected && searchResults.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            {searchResults.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-accent-bg hover:text-accent transition-colors ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                {searchType === 'produto'
                  ? <><Package size={15} className="text-text-3 shrink-0" /><span className="font-medium">{(item as any).name}</span><span className="ml-auto text-text-3 text-xs">{(item as any).sku}</span></>
                  : <><Truck size={15} className="text-text-3 shrink-0" /><span className="font-medium">{(item as any).name}</span></>
                }
              </button>
            ))}
          </div>
        )}

        {query && !selected && searchResults.length === 0 && (
          <p className="text-sm text-text-3 text-center py-2">Nenhum resultado encontrado.</p>
        )}
      </div>

      {/* Tabela de vínculos — só aparece após selecionar */}
      {selected && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Header da tabela com item selecionado */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2">
            <div className="flex items-center gap-3">
              {selectedProduct
                ? <><Package size={18} className="text-accent" /><div><p className="font-semibold text-text-1">{selectedProduct.name}</p><p className="text-xs text-text-3">{selectedProduct.sku}</p></div></>
                : <><Truck size={18} className="text-accent" /><p className="font-semibold text-text-1">{selectedSupplier?.name}</p></>
              }
            </div>
            <button onClick={handleClear} className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-border">
              <X size={14} /> Nova busca
            </button>
          </div>

          {/* Tabela de vínculos existentes */}
          <table className="w-full text-sm text-left">
            <thead className="text-text-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">
                  {selectedProduct ? 'Fornecedor vinculado' : 'Produto vinculado'}
                </th>
                {selectedProduct && <th className="px-6 py-3 font-medium">Status</th>}
                <th className="px-6 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {selectedProduct && linkedSuppliers.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-6 text-center text-text-3">Nenhum fornecedor vinculado a este produto.</td></tr>
              )}
              {selectedSupplier && linkedProducts.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-6 text-center text-text-3">Nenhum produto vinculado a este fornecedor.</td></tr>
              )}

              {selectedProduct && linkedSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-text-3" />
                      <span className="font-medium text-text-1">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.status === 'active' ? 'bg-green-bg text-green' :
                      s.status === 'pending' ? 'bg-yellow-bg text-yellow' : 'bg-red-bg text-danger'
                    }`}>
                      {s.status === 'active' ? 'Ativo' : s.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleRemoveVinculo(s.id)}
                      className="text-text-2 hover:text-danger transition-colors flex items-center gap-1 ml-auto text-xs font-medium hover:bg-red-bg px-2 py-1 rounded-lg">
                      <X size={13} /> Remover
                    </button>
                  </td>
                </tr>
              ))}

              {selectedSupplier && linkedProducts.map(p => (
                <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-text-3" />
                      <div>
                        <p className="font-medium text-text-1">{p.name}</p>
                        <p className="text-xs text-text-3">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleRemoveVinculo(p.id)}
                      className="text-text-2 hover:text-danger transition-colors flex items-center gap-1 ml-auto text-xs font-medium hover:bg-red-bg px-2 py-1 rounded-lg">
                      <X size={13} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Adicionar novo vínculo */}
          {((selectedProduct && availableSuppliers.length > 0) || (selectedSupplier && availableProducts.length > 0)) && (
            <div className="px-6 py-4 border-t border-border bg-surface-2">
              <p className="text-xs font-semibold text-text-3 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Plus size={12} /> Adicionar vínculo
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct && availableSuppliers.map(s => (
                  <button key={s.id} onClick={() => handleAddVinculo(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-xl text-sm text-text-1 hover:border-accent hover:text-accent hover:bg-accent-bg transition-colors">
                    <Plus size={13} />
                    <Truck size={13} />
                    {s.name}
                  </button>
                ))}
                {selectedSupplier && availableProducts.map(p => (
                  <button key={p.id} onClick={() => handleAddVinculo(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-xl text-sm text-text-1 hover:border-accent hover:text-accent hover:bg-accent-bg transition-colors">
                    <Plus size={13} />
                    <Package size={13} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sem itens disponíveis para vincular */}
          {((selectedProduct && availableSuppliers.length === 0 && suppliers.length > 0) ||
            (selectedSupplier && availableProducts.length === 0 && products.length > 0)) && (
            <div className="px-6 py-4 border-t border-border bg-surface-2">
              <p className="text-xs text-text-3 flex items-center gap-1.5">
                <Link2 size={12} /> Todos os {selectedProduct ? 'fornecedores' : 'produtos'} já estão vinculados.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
