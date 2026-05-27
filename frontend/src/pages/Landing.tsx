import { BarChart3, Bell, BrainCircuit, CheckCircle2, ChevronRight, PackageSearch, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Landing = () => (
  <div className="min-h-screen bg-white text-gray-900 font-sans">

    {/* ── Header ── */}
    <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo ajustada */}
          <img src="/logo-icon.png" alt="Logo" className="h-12 w-auto object-contain" />
          <span className="text-xl font-bold text-gray-900">Supply <span className="text-teal-600">IA</span></span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
          <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
          <a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
          <a href="#planos" className="hover:text-gray-900 transition-colors">Planos</a>
        </nav>
        <div className="flex gap-3 items-center">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Entrar</Link>
          <Link to="/cadastro" className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors">
            Começar grátis
          </Link>
        </div>
      </div>
    </header>

    {/* ── Hero ── */}
    <section className="pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
            Inteligência Artificial aplicada ao estoque
          </div>
          <h1 className="text-5xl font-extrabold leading-tight text-gray-900 mb-6">
            Chega de perder venda por falta de produto.
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            O Supply IA monitora seu estoque, dispara cotações automáticas para fornecedores via Telegram e usa IA para estruturar as respostas — tudo sem você precisar fazer nada.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link to="/cadastro" className="px-7 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-teal-100">
              Experimentar grátis <ChevronRight size={18} />
            </Link>
            <a href="#como-funciona" className="px-7 py-3.5 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center text-base border border-gray-200">
              Ver como funciona
            </a>
          </div>
          <p className="text-sm text-gray-400">Sem cartão de crédito · Grátis para começar</p>
        </div>

        {/* Dashboard mock */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-teal-50 to-blue-50 rounded-3xl -z-10" />
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300" /><div className="w-3 h-3 rounded-full bg-yellow-300" /><div className="w-3 h-3 rounded-full bg-green-300" /></div>
              <span className="text-xs text-gray-400 ml-2">supply-ia.web.app</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'Produtos', v: '18', c: 'text-teal-600' },
                  { l: 'Em alerta', v: '2', c: 'text-amber-500' },
                  { l: 'Fornecedores', v: '5', c: 'text-blue-500' },
                ].map(c => (
                  <div key={c.l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${c.c}`}>{c.v}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Café em Grão 1kg', status: 'Atenção', color: 'bg-amber-100 text-amber-700' },
                  { name: 'Açúcar Refinado 5kg', status: 'Normal', color: 'bg-green-100 text-green-700' },
                  { name: 'Leite Integral 1L', status: 'Crítico', color: 'bg-red-100 text-red-700' },
                ].map(p => (
                  <div key={p.name} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.color}`}>{p.status}</span>
                  </div>
                ))}
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-start gap-3">
                <Bell size={16} className="text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-teal-800">Cotação automática disparada</p>
                  <p className="text-xs text-teal-600 mt-0.5">2 fornecedores receberam a RFQ via Telegram agora mesmo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Stats ── */}
    <section className="py-14 bg-gray-50 border-y border-gray-100">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {[
          { v: '10–12%', l: 'de ruptura média no varejo brasileiro', src: 'Fonte: ABRAS / Neogrid' },
          { v: '42%', l: 'das vendas perdidas por falta de produto', src: 'Fonte: NielsenIQ' },
          { v: '21,7M', l: 'micro e pequenas empresas no Brasil', src: 'Fonte: Sebrae' },
        ].map(s => (
          <div key={s.v}>
            <p className="text-4xl font-extrabold text-teal-600 mb-1">{s.v}</p>
            <p className="text-gray-600 text-sm mb-1">{s.l}</p>
            <p className="text-gray-400 text-xs">{s.src}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── Como funciona ── */}
    <section id="como-funciona" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Do alerta ao pedido em minutos</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Quatro etapas. Você só precisa aprovar no final.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: PackageSearch, n: '1', title: 'Monitora', desc: 'Calcula automaticamente o ponto de pedido de cada produto com base no seu consumo e lead time.' },
            { icon: Zap,           n: '2', title: 'Alerta e Cota', desc: 'Quando o estoque chega no limite, dispara cotações simultâneas para todos os fornecedores via Telegram.' },
            { icon: BrainCircuit,  n: '3', title: 'IA Interpreta', desc: 'O fornecedor responde em texto livre. A IA extrai preço, prazo, quantidade mínima e condições.' },
            { icon: CheckCircle2,  n: '4', title: 'Você Aprova', desc: 'Comparativo ranqueado por preço e prazo. Aprove com 1 clique e gere a ordem de compra.' },
          ].map(({ icon: Icon, n, title, desc }) => (
            <div key={n} className="relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center font-bold text-sm mb-4">{n}</div>
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Funcionalidades ── */}
    <section id="funcionalidades" className="py-24 px-6 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Tudo que sua operação precisa</h2>
          <p className="text-gray-500 text-lg">Projetado para donos de negócio, não para analistas de TI.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Bell,         title: 'Alertas de estoque',      desc: 'Semáforo visual por produto. Sabe na hora quais itens precisam de atenção antes de acabar.' },
            { icon: Zap,          title: 'Cotação automática',      desc: 'Disparo automático ou manual via Telegram. Sem e-mail, sem ligação, sem planilha.' },
            { icon: BrainCircuit, title: 'IA que lê respostas',    desc: 'O fornecedor responde do jeito dele. A IA estrutura preço, prazo e condições em JSON.' },
            { icon: BarChart3,    title: 'Comparativo ranqueado',   desc: 'Melhor preço e prazo em destaque. Decida em segundos qual proposta aceitar.' },
            { icon: CheckCircle2, title: 'Ordem de compra',        desc: 'Aprovação em 1 clique gera a ordem de compra. Rastreie status até o recebimento.' },
            { icon: ShieldCheck,  title: 'Dados isolados e seguros', desc: 'Cada empresa vê só seus próprios dados. Autenticação Firebase com Google ou e-mail.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Problema vs Solução ── */}
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-12">Você ainda faz assim?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
            <h3 className="font-bold text-red-700 mb-5 text-lg">❌ O jeito manual</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              {[
                'Descobre a ruptura quando o cliente já foi embora',
                'Manda mensagem pra fornecedor e fica esperando',
                'Organiza preços no olho ou em planilha',
                'Compra na pressa, paga mais caro',
                'Não tem histórico para comparar',
              ].map(t => <li key={t} className="flex items-start gap-2"><span className="text-red-400 mt-0.5">•</span>{t}</li>)}
            </ul>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-8">
            <h3 className="font-bold text-teal-700 mb-5 text-lg">✅ Com o Supply IA</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              {[
                'Sistema avisa antes de chegar no limite',
                'Cotação vai automática para todos os fornecedores',
                'IA extrai preço e prazo de qualquer resposta',
                'Você escolhe o melhor e aprova em 1 clique',
                'Histórico completo de cada fornecedor',
              ].map(t => <li key={t} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-teal-500 mt-0.5 shrink-0" />{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* ── Planos ── */}
    <section id="planos" className="py-24 px-6 bg-gray-50 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Planos simples e transparentes</h2>
          <p className="text-gray-500 text-lg">Comece grátis. Faça upgrade só quando precisar.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Free</h3>
              <p className="text-4xl font-extrabold text-gray-900 mb-1">R$ 0<span className="text-base text-gray-400 font-normal">/mês</span></p>
              <p className="text-sm text-gray-400">Para começar sem compromisso</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
              {['Até 10 produtos', 'Até 2 fornecedores por item', '5 cotações automáticas/mês', 'Dashboard com semáforo'].map(t =>
                <li key={t} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-teal-500 shrink-0" />{t}</li>)}
            </ul>
            <Link to="/cadastro" className="w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors">Começar grátis</Link>
          </div>

          <div className="bg-teal-600 rounded-2xl p-8 flex flex-col relative shadow-xl shadow-teal-100">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Mais popular</div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <p className="text-4xl font-extrabold text-white mb-1">R$ 79<span className="text-base text-teal-200 font-normal">/mês</span></p>
              <p className="text-sm text-teal-200">Para negócios em crescimento</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-teal-100">
              {['Até 100 produtos', 'Até 5 fornecedores por item', 'Cotações ilimitadas', 'IA para estruturar respostas', 'Comparativo ranqueado', 'Histórico de compras'].map(t =>
                <li key={t} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-teal-300 shrink-0" />{t}</li>)}
            </ul>
            <Link to="/cadastro" className="w-full py-3 text-center bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors">Assinar Pro</Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Business</h3>
              <p className="text-4xl font-extrabold text-gray-900 mb-1">R$ 189<span className="text-base text-gray-400 font-normal">/mês</span></p>
              <p className="text-sm text-gray-400">Para operações maiores</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
              {['Produtos e fornecedores ilimitados', 'Tudo do plano Pro', 'Até 5 usuários por conta', 'Relatórios e exportação', 'Suporte prioritário'].map(t =>
                <li key={t} className="flex items-center gap-2"><ShieldCheck size={14} className="text-teal-500 shrink-0" />{t}</li>)}
            </ul>
            <Link to="/cadastro" className="w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors">Falar com vendas</Link>
          </div>
        </div>
      </div>
    </section>

    {/* ── CTA Final ── */}
    <section className="py-24 px-6 bg-teal-600">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">Pronto para automatizar suas compras?</h2>
        <p className="text-teal-100 text-lg mb-10">Configure em menos de 10 minutos. Sem instalação, sem contrato.</p>
        <Link to="/cadastro" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors shadow-xl text-lg">
          Criar conta grátis <ChevronRight size={20} />
        </Link>
        <p className="mt-5 text-teal-200 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
      </div>
    </section>

    {/* ── Footer ── */}
    <footer className="bg-gray-900 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Logo do Footer ajustada */}
          <img src="/logo-icon.png" alt="Logo" className="h-8 w-auto object-contain" />
          <span className="text-white font-bold text-lg">Supply IA</span>
        </div>
        <p className="text-gray-500 text-sm">© 2026 Supply IA. Todos os direitos reservados.</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <span className="hover:text-white cursor-pointer transition-colors">Termos</span>
          <span className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
          <span className="hover:text-white cursor-pointer transition-colors">Contato</span>
        </div>
      </div>
    </footer>
  </div>
);