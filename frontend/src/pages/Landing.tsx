import { Link } from 'react-router-dom';
import { PackageSearch, Zap, CheckCircle2, BrainCircuit, BarChart3, ShieldCheck, ChevronRight } from 'lucide-react';

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const Landing = () => (
  <div className="min-h-screen bg-bg text-text-1 font-sans">
    {/* Header */}
    <header className="fixed top-0 w-full bg-surface/80 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="text-xl font-bold text-accent">Supply IA</div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-text-2">
          {['#como-funciona', '#funcionalidades', '#planos'].map(href => (
            <a key={href} href={href} className="hover:text-text-1 transition-colors">{href.slice(1).charAt(0).toUpperCase() + href.slice(2)}</a>
          ))}
        </nav>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm font-medium text-text-2 hover:text-text-1 transition-colors">Entrar</Link>
          <Link to="/cadastro" className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-opacity-90 transition-colors">Começar grátis</Link>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 className="text-5xl font-bold leading-tight mb-6">O estoque que se reabastece <span className="text-accent">sozinho</span>.</h1>
        <p className="text-lg text-text-2 mb-8 leading-relaxed">Elimine a ruptura de estoque e o trabalho manual. O Supply IA prevê suas necessidades, cota com fornecedores no Telegram e usa IA para ranquear a melhor oferta.</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/cadastro" className="px-6 py-3 bg-accent text-white font-medium rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-colors">Começar grátis <ChevronRight size={18} /></Link>
          <a href="#planos" className="px-6 py-3 bg-surface border border-border text-text-1 font-medium rounded-xl hover:bg-surface-2 transition-colors">Ver planos</a>
        </div>
      </div>
      <div className="bg-accent-bg rounded-3xl p-8 flex items-center justify-center min-h-48">
        <div className="text-center"><div className="text-6xl mb-4">📦</div><p className="text-accent font-semibold">Dashboard de Estoque</p><p className="text-text-2 text-sm mt-1">Monitoramento em tempo real</p></div>
      </div>
    </section>

    {/* Stats */}
    <section className="py-12 bg-surface border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-sm font-medium text-text-3 uppercase tracking-wider mb-8">Para micro e pequenos negócios</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[['10-12%', 'de ruptura média no varejo'], ['42%', 'das vendas perdidas por falta de produto'], ['90%', 'do tempo economizado em cotações']].map(([v, l]) => (
            <div key={v}><p className="text-4xl font-bold text-accent mb-2">{v}</p><p className="text-text-2">{l}</p></div>
          ))}
        </div>
      </div>
    </section>

    {/* Problema vs Solução */}
    <section className="py-20 px-6 max-w-6xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-12">Pare de perder vendas por desorganização</h2>
      <div className="grid md:grid-cols-2 gap-8 text-left">
        <div className="bg-red-bg p-8 rounded-2xl border border-red/20">
          <h3 className="text-danger font-semibold mb-4 flex items-center gap-2"><XIcon /> Como é hoje</h3>
          <ul className="space-y-3 text-text-2">{['Controle no caderno ou planilhas', 'Horas perdidas em cotações manuais', 'Cliente vai embora sem o produto'].map(t => <li key={t}>• {t}</li>)}</ul>
        </div>
        <div className="bg-green-bg p-8 rounded-2xl border border-green/20">
          <h3 className="text-green font-semibold mb-4 flex items-center gap-2"><CheckCircle2 /> Com o Supply IA</h3>
          <ul className="space-y-3 text-text-2">{['Sistema avisa quando o estoque está baixo', 'Cotações disparadas em 1 segundo', 'Aprovação em 1 clique com comparativo'].map(t => <li key={t}>• {t}</li>)}</ul>
        </div>
      </div>
    </section>

    {/* Como funciona */}
    <section id="como-funciona" className="py-20 bg-surface border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-16">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: PackageSearch, title: '1. Monitora', desc: 'Acompanha o estoque e identifica o ponto de pedido automaticamente.' },
            { icon: Zap, title: '2. Cota', desc: 'Dispara pedidos de cotação via Telegram para seus fornecedores.' },
            { icon: BrainCircuit, title: '3. IA Estrutura', desc: 'Lê o texto livre do fornecedor e extrai preço, prazo e condições.' },
            { icon: CheckCircle2, title: '4. Você Aprova', desc: 'Veja o comparativo e gere a ordem de compra com 1 clique.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="w-16 h-16 mx-auto bg-accent-bg text-accent rounded-2xl flex items-center justify-center mb-6"><Icon size={32} /></div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-text-2">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Planos */}
    <section id="planos" className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-16">Planos que crescem com você</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm flex flex-col">
          <h3 className="text-xl font-semibold mb-2">Free</h3>
          <p className="text-3xl font-bold mb-6">R$ 0<span className="text-sm text-text-2 font-normal">/mês</span></p>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-text-2">
            {['Até 10 produtos', 'Até 2 fornecedores por item', '5 cotações/mês'].map(t => <li key={t} className="flex gap-2"><CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />{t}</li>)}
          </ul>
          <Link to="/cadastro" className="w-full py-3 text-center bg-surface-2 hover:bg-border text-text-1 font-medium rounded-xl transition-colors">Começar grátis</Link>
        </div>
        <div className="bg-accent-bg p-8 rounded-3xl border-2 border-accent shadow-md flex flex-col relative md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold">Mais popular</div>
          <h3 className="text-xl font-semibold mb-2">Pro</h3>
          <p className="text-3xl font-bold mb-6 text-accent">R$ 79<span className="text-sm text-text-2 font-normal">/mês</span></p>
          <ul className="space-y-3 mb-8 flex-1 text-sm">
            {['100 produtos', '5 fornecedores/item', 'Cotações ilimitadas', 'IA para estruturar respostas', 'Comparativo ranqueado', 'Histórico completo'].map(t => <li key={t} className="flex gap-2"><CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />{t}</li>)}
          </ul>
          <Link to="/cadastro" className="w-full py-3 text-center bg-accent text-white font-medium rounded-xl hover:bg-opacity-90 transition-colors">Assinar Pro</Link>
        </div>
        <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm flex flex-col">
          <h3 className="text-xl font-semibold mb-2">Business</h3>
          <p className="text-3xl font-bold mb-6">R$ 189,99<span className="text-sm text-text-2 font-normal">/mês</span></p>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-text-2">
            {['Produtos ilimitados', 'Fornecedores ilimitados', 'Tudo do Pro', 'Exportação de relatórios', 'Até 5 usuários'].map(t => <li key={t} className="flex gap-2"><ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" />{t}</li>)}
          </ul>
          <Link to="/cadastro" className="w-full py-3 text-center bg-surface-2 hover:bg-border text-text-1 font-medium rounded-xl transition-colors">Falar com vendas</Link>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 bg-accent text-center px-6">
      <h2 className="text-3xl font-bold text-white mb-6">Pronto para automatizar suas compras?</h2>
      <Link to="/cadastro" className="inline-block px-8 py-4 bg-white text-accent font-bold rounded-xl hover:bg-surface transition-colors shadow-lg">Comece grátis hoje</Link>
    </section>

    <footer className="bg-surface py-8 border-t border-border text-center text-text-2 text-sm">
      <p>© 2026 Supply IA. Todos os direitos reservados.</p>
    </footer>
  </div>
);
