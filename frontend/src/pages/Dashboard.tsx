import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { Package, AlertTriangle, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard = () => {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.list });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.list });

  const critical = products.filter(p => p.status === 'critico' || p.status === 'alerta');
  const chartData = products.slice(0, 5).map(p => ({ name: p.name, estoque: p.currentStock, status: p.status }));
  const getColor = (s: string) => s === 'critico' ? 'var(--red)' : s === 'alerta' ? 'var(--yellow)' : 'var(--green)';

  const stats = [
    { label: 'Total de Produtos', value: products.length, icon: Package, colorClass: 'bg-accent-bg text-accent' },
    { label: 'Itens em Alerta', value: critical.length, icon: AlertTriangle, colorClass: 'bg-red-bg text-danger' },
    { label: 'Fornecedores', value: suppliers.length, icon: Truck, colorClass: 'bg-surface-2 text-text-1' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(({ label, value, icon: Icon, colorClass }) => (
          <div key={label} className="bg-surface p-6 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}><Icon size={24} /></div>
            <div><p className="text-sm text-text-2">{label}</p><p className="text-2xl font-bold text-text-1">{value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-semibold text-text-1 mb-6">Níveis de Estoque (Top 5)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Bar dataKey="estoque" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={getColor(entry.status)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
