import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { rfqService, movimentacaoService } from '@/services/apiServices';
import { Package, AlertTriangle, Truck, FileText, ArrowUpCircle, ArrowDownCircle, ChevronRight, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Semaforo } from '@/components/ui/Semaforo';

export const Dashboard = () => {
  const { data: products  = [] } = useQuery({ queryKey: ['products'],      queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'],     queryFn: supplierService.list });
  const { data: rfqs      = [] } = useQuery({ queryKey: ['rfqs'],          queryFn: rfqService.list });
  const { data: movs      = [] } = useQuery({ queryKey: ['movimentacoes'], queryFn: movimentacaoService.list });

  const criticos = products.filter(p => p.status === 'critico');
  const alertas  = products.filter(p => p.status === 'alerta');
  const rfqsAbertos = rfqs.filter(r => r.status === 'sent' || r.status === 'partial');
  const ultimasMovs = movs.slice(0, 5);

  const chartData = [...products]
    .sort((a, b) => {
      const pctA = a.reorderPoint > 0 ? a.currentStock / a.reorderPoint : 99;
      const pctB = b.reorderPoint > 0 ? b.currentStock / b.reorderPoint : 99;
      return pctA - pctB;
    })
    .slice(0, 7)
    .map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      estoque: p.currentStock,
      ponto: p.reorderPoint,
      status: p.status,
    }));

  const getColor = (s: string) =>
    s === 'critico' ? 'var(--red)' : s === 'alerta' ? 'var(--yellow)' : 'var(--green)';

  const stats = [
    { label: 'Total de Produtos',  value: products.length,       icon: Package,       cls: 'bg-accent-bg text-accent',   to: '/app/produtos' },
    { label: 'Itens Críticos',     value: criticos.length,       icon: AlertTriangle, cls: 'bg-red-bg text-danger',      to: '/app/produtos' },
    { label: 'Itens em Alerta',    value: alertas.length,        icon: AlertTriangle, cls: 'bg-yellow-bg text-yellow',   to: '/app/produtos' },
    { label: 'Fornecedores',       value: suppliers.length,      icon: Truck,         cls: 'bg-surface-2 text-text-2',   to: '/app/fornecedores' },
    { label: 'Cotações Abertas',   value: rfqsAbertos.length,    icon: FileText,      cls: 'bg-accent-bg text-accent',   to: '/app/cotacoes' },
  ];

  return (
    <div className="space-y-6">

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, cls, to }) => (
          <Link key={label} to={to}
            className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-3 shadow-sm hover:border-accent transition-colors group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-2 truncate">{label}</p>
              <p className="text-2xl font-bold text-text-1 leading-tight">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Linha 2: gráfico + alertas críticos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-1">Estoque vs. Ponto de Pedido</h3>
            <Link to="/app/produtos" className="text-xs text-accent flex items-center gap-1 hover:underline">Ver todos <ChevronRight size={12} /></Link>
          </div>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-text-3 text-sm">Nenhum produto cadastrado ainda.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{ borderRadius: '10px', border: '1px solid var(--border)', fontSize: 12 }}
                    formatter={(v: any, name: string) => [v + ' un', name === 'estoque' ? 'Estoque' : 'Ponto de pedido']}
                  />
                  <Bar dataKey="ponto" fill="var(--border-2)" radius={[4, 4, 0, 0]} name="ponto" />
                  <Bar dataKey="estoque" radius={[4, 4, 0, 0]} name="estoque">
                    {chartData.map((entry, i) => <Cell key={i} fill={getColor(entry.status)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-text-3 mt-2">Barras cinzas = ponto de pedido. Cores = status do estoque.</p>
        </div>

        {/* Itens críticos e em alerta */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-text-1">Requer Atenção</h3>
            <span className="text-xs bg-red-bg text-danger px-2 py-0.5 rounded-full font-semibold">
              {criticos.length + alertas.length}
            </span>
          </div>
          <div className="divide-y divide-border max-h-56 overflow-y-auto">
            {[...criticos, ...alertas].length === 0 ? (
              <div className="px-5 py-8 text-center text-text-3 text-sm">
                ✅ Tudo em ordem!
              </div>
            ) : [...criticos, ...alertas].map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-1 truncate">{p.name}</p>
                  <p className="text-xs text-text-3">{p.currentStock} / {p.reorderPoint} un</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Semaforo status={p.status} />
                  <Link to="/app/cotacoes" title="Disparar cotação">
                    <Send size={13} className="text-text-3 hover:text-accent transition-colors" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {(criticos.length + alertas.length) > 0 && (
            <div className="px-5 py-3 border-t border-border">
              <Link to="/app/movimentacoes" className="text-xs text-accent flex items-center gap-1 hover:underline">
                Registrar movimentação <ChevronRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Linha 3: últimas movimentações */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-text-1">Últimas Movimentações</h3>
          <Link to="/app/movimentacoes" className="text-xs text-accent flex items-center gap-1 hover:underline">
            Ver todas <ChevronRight size={12} />
          </Link>
        </div>
        {ultimasMovs.length === 0 ? (
          <div className="px-6 py-8 text-center text-text-3 text-sm">
            Nenhuma movimentação ainda.{' '}
            <Link to="/app/movimentacoes" className="text-accent hover:underline">Registrar agora</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ultimasMovs.map(m => {
              const prod = products.find(p => p.id === m.productId);
              return (
                <div key={m.id} className="flex items-center gap-4 px-6 py-3 hover:bg-surface-2 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.tipo === 'entrada' ? 'bg-green-bg text-green' : 'bg-red-bg text-danger'
                  }`}>
                    {m.tipo === 'entrada' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-1 truncate">{prod?.name ?? m.productId}</p>
                    <p className="text-xs text-text-3">{m.motivo || (m.tipo === 'entrada' ? 'Entrada' : 'Saída')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-green' : 'text-danger'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un
                    </p>
                    <p className="text-xs text-text-3">
                      {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
