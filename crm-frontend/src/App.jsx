import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  UserPlus, Users, Building, Phone, Mail, RefreshCw, 
  LayoutGrid, List, GripVertical, DollarSign, TrendingUp, Target, 
  MessageSquare, X, Send, Search, Download, Trash2, Edit3, LogOut, Lock, 
  Share2, CheckCircle, AlertCircle, KeyRound, Moon, Sun
} from 'lucide-react';

const API_URL = 'https://crm-lju4.onrender.com/api/v1';

const COLUNAS_KANBAN = [
  { id: 'novo', titulo: 'Novo Lead', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', indicator: 'bg-blue-500' },
  { id: 'contato', titulo: 'Em Contato', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', indicator: 'bg-amber-500' },
  { id: 'proposta', titulo: 'Proposta Enviada', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', indicator: 'bg-purple-500' },
  { id: 'fechado', titulo: 'Fechado / Ganho', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', indicator: 'bg-emerald-500' },
];

export default function App() {
  // Autenticação
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [usuario, setUsuario] = useState(() => {
    try {
      const item = localStorage.getItem('usuario');
      return item && item !== 'undefined' ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  });
  const [modoAuth, setModoAuth] = useState('login'); // 'login', 'registro' ou 'verificar_codigo'
  const [authForm, setAuthForm] = useState({ nome: '', email: '', senha: '', empresa: '' });
  const [codigoOtp, setCodigoOtp] = useState('');
  const [emailPendente, setEmailPendente] = useState('');
  const [authErro, setAuthErro] = useState('');
  const [authSucesso, setAuthSucesso] = useState('');
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCodigo, setResetCodigo] = useState('');
  const [resetNovaSenha, setResetNovaSenha] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('crm-theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('crm-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Dashboard & Leads
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'lista', 'integracoes'
  const [busca, setBusca] = useState('');

  // Modais
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [leadEditando, setLeadEditando] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  const [form, setForm] = useState({ nome: '', email: '', telefone: '', empresa: '', valor: '' });

  // Configurar Header de Autenticação Global no Axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchLeads();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthErro('');
    setAuthSucesso('');

    if (modoAuth === 'login') {
      try {
        const res = await axios.post(`${API_URL}/auth/login`, {
          email: authForm.email.trim(),
          senha: authForm.senha,
        });
        const { token, usuario } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));

        setToken(token);
        setUsuario(usuario);
      } catch (error) {
        if (error.response?.status === 403) {
          setEmailPendente(error.response.data.email || authForm.email.trim());
          setModoAuth('verificar_codigo');
          setAuthErro('Sua conta ainda não foi verificada. Insira o código enviado por e-mail.');
        } else if (error.response?.status === 401) {
          setAuthErro('E-mail ou senha incorretos.');
        } else if (error.response?.status === 503) {
          setAuthErro('O servidor está iniciando. Aguarde alguns segundos e tente novamente.');
        } else if (!error.response) {
          setAuthErro('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
        } else {
          setAuthErro(error.response?.data?.error || 'Erro ao realizar login.');
        }
      }
    } else if (modoAuth === 'registro') {
      try {
        const res = await axios.post(`${API_URL}/auth/registrar`, {
          nome: authForm.nome,
          email: authForm.email.trim(),
          senha: authForm.senha,
        });

        setEmailPendente(res.data.email || authForm.email.trim());
        setAuthSucesso(res.data.message || 'Código enviado para o seu e-mail!');
        setModoAuth('verificar_codigo');
      } catch (error) {
        if (error.response?.status === 503) {
          setAuthErro('O servidor está iniciando. Aguarde alguns segundos e tente novamente.');
        } else if (!error.response) {
          setAuthErro('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
        } else {
          setAuthErro(error.response?.data?.error || 'Erro ao realizar cadastro.');
        }
      }
    }
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setAuthErro('');
    setAuthSucesso('');

    try {
      const res = await axios.post(`${API_URL}/auth/verificar`, {
        email: emailPendente,
        codigo: codigoOtp,
      });
      const { token, usuario } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      setToken(token);
      setUsuario(usuario);
    } catch (error) {
      setAuthErro(error.response?.data?.error || 'Código incorreto ou expirado.');
    }
  };

  const handleReenviarCodigo = async () => {
    setAuthErro('');
    setAuthSucesso('');
    setReenviandoCodigo(true);
    try {
      const res = await axios.post(`${API_URL}/auth/reenviar-codigo`, { email: emailPendente });
      setAuthSucesso(res.data.message || 'Código reenviado!');
    } catch (error) {
      setAuthErro(error.response?.data?.error || 'Erro ao reenviar código.');
    } finally {
      setReenviandoCodigo(false);
    }
  };

  const handleSolicitarReset = async (e) => {
    e.preventDefault();
    setAuthErro('');
    setAuthSucesso('');
    try {
      const res = await axios.post(`${API_URL}/auth/esqueci-senha`, { email: resetEmail });
      setAuthSucesso(res.data.message || 'Código enviado!');
      setModoAuth('redefinir_senha');
    } catch (error) {
      setAuthErro(error.response?.data?.error || 'Erro ao solicitar redefinição.');
    }
  };

  const handleRedefinirSenha = async (e) => {
    e.preventDefault();
    setAuthErro('');
    setAuthSucesso('');
    try {
      const res = await axios.post(`${API_URL}/auth/redefinir-senha`, {
        email: resetEmail,
        codigo: resetCodigo,
        nova_senha: resetNovaSenha,
      });
      setAuthSucesso(res.data.message || 'Senha redefinida! Faça login.');
      setModoAuth('login');
      setResetCodigo('');
      setResetNovaSenha('');
    } catch (error) {
      setAuthErro(error.response?.data?.error || 'Código inválido ou expirado.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken('');
    setUsuario(null);
    setLeads([]);
  };

  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/leads`);
      setLeads(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const leadsFiltrados = useMemo(() => {
    if (!busca.trim()) return leads;
    const termo = busca.toLowerCase();
    return leads.filter(l => 
      l.nome?.toLowerCase().includes(termo) ||
      l.email?.toLowerCase().includes(termo) ||
      l.empresa?.toLowerCase().includes(termo)
    );
  }, [leads, busca]);

  const metricas = useMemo(() => {
    const totalLeads = leadsFiltrados.length;
    const totalPipeline = leadsFiltrados.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
    const leadsFechados = leadsFiltrados.filter(l => l.status === 'fechado');
    const valorFechado = leadsFechados.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
    const taxaConversao = totalLeads > 0 ? ((leadsFechados.length / totalLeads) * 100).toFixed(1) : 0;

    return { totalLeads, totalPipeline, valorFechado, taxaConversao };
  }, [leadsFiltrados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.email) return;

    try {
      await axios.post(`${API_URL}/leads`, { ...form, valor: parseFloat(form.valor) || 0 });
      setForm({ nome: '', email: '', telefone: '', empresa: '', valor: '' });
      fetchLeads();
    } catch (error) {
      console.error('Erro ao cadastrar lead:', error);
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!leadEditando) return;

    try {
      await axios.put(`${API_URL}/leads/${leadEditando.id}`, {
        ...leadEditando,
        valor: parseFloat(leadEditando.valor) || 0
      });
      setLeadEditando(null);
      fetchLeads();
    } catch (error) {
      console.error('Erro ao editar lead:', error);
    }
  };

  const handleDeletarLead = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta oportunidade?")) return;

    try {
      await axios.delete(`${API_URL}/leads/${id}`);
      fetchLeads();
      if (leadSelecionado?.id === id) setLeadSelecionado(null);
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
    }
  };

  const handleMoverStatus = async (id, novoStatus) => {
    try {
      setLeads(prev => prev.map(l => String(l.id) === String(id) ? { ...l, status: novoStatus } : l));
      await axios.put(`${API_URL}/leads/${id}/status`, { status: novoStatus });
    } catch (error) {
      fetchLeads();
    }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    handleMoverStatus(draggableId, destination.droppableId);
  };

  const abrirChatLead = async (lead) => {
    setLeadSelecionado(lead);
    setCarregandoMensagens(true);
    try {
      const response = await axios.get(`${API_URL}/leads/${lead.id}/mensagens`);
      setMensagens(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar chat:', error);
    } finally {
      setCarregandoMensagens(false);
    }
  };

  const handleEnviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !leadSelecionado) return;

    try {
      const payload = { lead_id: leadSelecionado.id, texto: novaMensagem, autor: usuario?.nome || 'Atendente' };
      const res = await axios.post(`${API_URL}/mensagens`, payload);
      setMensagens(prev => [...prev, res.data.data]);
      setNovaMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const exportarCSV = () => {
    const headers = ["ID", "Nome", "Email", "Telefone", "Empresa", "Status", "Valor (R$)"];
    const rows = leadsFiltrados.map(l => [
      l.id, `"${l.nome}"`, `"${l.email}"`, `"${l.telefone || ''}"`, `"${l.empresa || ''}"`, `"${l.status}"`, l.valor || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_crm_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    // TELA DE LOGIN / CADASTRO / VERIFICAÇÃO OTP / RECUPERAÇÃO DE SENHA
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 antialiased">
        <button
          type="button"
          onClick={() => setDarkMode(value => !value)}
          className="fixed top-5 right-5 z-10 border border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-100 p-2.5 rounded-full cursor-pointer"
          aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
              {(modoAuth === 'verificar_codigo' || modoAuth === 'redefinir_senha') ? <KeyRound className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              CRM Pipeline Pro
            </h1>
            <p className="text-xs text-slate-400">
              {modoAuth === 'login' && 'Entre com sua conta para acessar seus leads'}
              {modoAuth === 'registro' && 'Crie sua conta para começar gratuitamente'}
              {modoAuth === 'verificar_codigo' && `Insira o código de 6 dígitos enviado para ${emailPendente}`}
              {modoAuth === 'esqueci_senha' && 'Informe seu e-mail para receber um código de redefinição'}
              {modoAuth === 'redefinir_senha' && `Insira o código enviado para ${resetEmail} e sua nova senha`}
            </p>
          </div>

          {authErro && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {authErro}
            </div>
          )}

          {authSucesso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> {authSucesso}
            </div>
          )}

          {modoAuth === 'verificar_codigo' && (
            <form onSubmit={handleVerificarCodigo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Código de Verificação (OTP)</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  required 
                  value={codigoOtp} 
                  onChange={e => setCodigoOtp(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-blue-400 focus:outline-none focus:border-blue-500" 
                  placeholder="000000" 
                />
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition">
                Verificar e Entrar
              </button>

              <button 
                type="button" 
                onClick={handleReenviarCodigo} 
                disabled={reenviandoCodigo}
                className="w-full text-center text-xs text-blue-400 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reenviandoCodigo ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </form>
          )}

          {modoAuth === 'esqueci_senha' && (
            <form onSubmit={handleSolicitarReset} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">E-mail</label>
                <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="seu@email.com" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition">
                Enviar código de redefinição
              </button>
            </form>
          )}

          {modoAuth === 'redefinir_senha' && (
            <form onSubmit={handleRedefinirSenha} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Código recebido por e-mail</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  required 
                  value={resetCodigo} 
                  onChange={e => setResetCodigo(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-blue-400 focus:outline-none focus:border-blue-500" 
                  placeholder="000000" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nova senha</label>
                <input type="password" required value={resetNovaSenha} onChange={e => setResetNovaSenha(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition">
                Redefinir senha
              </button>
            </form>
          )}

          {(modoAuth === 'login' || modoAuth === 'registro') && (
            <form onSubmit={handleAuth} className="space-y-4">
              {modoAuth === 'registro' && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nome Completo</label>
                    <input type="text" required value={authForm.nome} onChange={e => setAuthForm({...authForm, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="Seu Nome" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Empresa</label>
                    <input type="text" value={authForm.empresa} onChange={e => setAuthForm({...authForm, empresa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="Nome da Sua Empresa" />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">E-mail</label>
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="seu@email.com" />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Senha</label>
                <input type="password" required value={authForm.senha} onChange={e => setAuthForm({...authForm, senha: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>

              {modoAuth === 'login' && (
                <button type="button" onClick={() => { setModoAuth('esqueci_senha'); setAuthErro(''); setAuthSucesso(''); setResetEmail(authForm.email); }} className="text-xs text-blue-400 hover:underline cursor-pointer -mt-2 block">
                  Esqueceu a senha?
                </button>
              )}

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition">
                {modoAuth === 'login' ? 'Entrar no Sistema' : 'Criar Conta'}
              </button>
            </form>
          )}

          <div className="text-center border-t border-slate-800/80 pt-4 flex justify-center gap-4">
            {(modoAuth === 'verificar_codigo' || modoAuth === 'esqueci_senha' || modoAuth === 'redefinir_senha') ? (
              <button onClick={() => { setModoAuth('login'); setAuthErro(''); setAuthSucesso(''); }} className="text-xs text-blue-400 hover:underline cursor-pointer">
                Voltar para o Login
              </button>
            ) : (
              <button onClick={() => { setModoAuth(modoAuth === 'login' ? 'registro' : 'login'); setAuthErro(''); setAuthSucesso(''); }} className="text-xs text-blue-400 hover:underline cursor-pointer">
                {modoAuth === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PAINEL PRINCIPAL LOGADO
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans antialiased relative">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                CRM Pipeline Pro
              </h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">Bem-vindo, <span className="text-slate-200 font-semibold">{usuario?.nome}</span></p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Campo de Pesquisa */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Buscar lead..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 w-48"
              />
            </div>

            {/* Alternador de Visão */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Board
              </button>
              <button 
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'lista' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" /> Tabela
              </button>
              <button 
                onClick={() => setViewMode('integracoes')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'integracoes' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Share2 className="w-4 h-4 text-emerald-400" /> Canais Omnichannel
              </button>
            </div>

            <button onClick={exportarCSV} className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>

            <button onClick={handleLogout} className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl text-xs cursor-pointer transition">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(value => !value)}
              className="border border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-100 p-2 rounded-xl cursor-pointer"
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* MÓDULO OMNICHANNEL DE INTEGRAÇÕES */}
        {viewMode === 'integracoes' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Canais de Atendimento Conectados</h2>
              <p className="text-xs text-slate-400">Integre suas redes para receber leads automaticamente no Kanban</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* WhatsApp */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-sm flex items-center gap-2">📱 WhatsApp Business</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
                  </div>
                  <p className="text-xs text-slate-400">Receba mensagens do WhatsApp Cloud API diretamente como novos leads.</p>
                </div>
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-medium cursor-pointer transition">Configurar Webhook API</button>
              </div>

              {/* Instagram */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 font-bold text-sm flex items-center gap-2">📸 Instagram Direct</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">Pendente</span>
                  </div>
                  <p className="text-xs text-slate-400">Conecte sua conta Instagram Business para capturar conversas nos DMs.</p>
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-xs font-medium cursor-pointer transition">Conectar Meta Graph API</button>
              </div>

              {/* Facebook Messenger */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 font-bold text-sm flex items-center gap-2">💬 Facebook Messenger</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Desconectado</span>
                  </div>
                  <p className="text-xs text-slate-400">Integre com as Páginas do Facebook para sincronizar mensagens da Fanpage.</p>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-medium cursor-pointer transition">Conectar Facebook Page</button>
              </div>

              {/* TikTok */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-pink-400 font-bold text-sm flex items-center gap-2">🎵 TikTok for Business</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Desconectado</span>
                  </div>
                  <p className="text-xs text-slate-400">Capture leads instantaneamente a partir de anúncios Lead Generation do TikTok.</p>
                </div>
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-medium cursor-pointer transition">Conectar TikTok Ads API</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl flex items-center gap-4">
                <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20 text-blue-400"><Users className="w-6 h-6" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Oportunidades</p><h3 className="text-2xl font-bold">{metricas.totalLeads}</h3></div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl flex items-center gap-4">
                <div className="bg-purple-500/10 p-3.5 rounded-xl border border-purple-500/20 text-purple-400"><TrendingUp className="w-6 h-6" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Pipeline Aberto</p><h3 className="text-2xl font-bold">{formatarMoeda(metricas.totalPipeline)}</h3></div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20 text-emerald-400"><DollarSign className="w-6 h-6" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Vendas Realizadas</p><h3 className="text-2xl font-bold text-emerald-400">{formatarMoeda(metricas.valorFechado)}</h3></div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl flex items-center gap-4">
                <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 text-amber-400"><Target className="w-6 h-6" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Taxa de Conversão</p><h3 className="text-2xl font-bold">{metricas.taxaConversao}%</h3></div>
              </div>
            </div>

            {/* Form Cadastro */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-400">
                <UserPlus className="w-4 h-4 text-blue-400" /> Cadastrar Oportunidade
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <input type="text" required placeholder="Nome Completo *" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100" />
                <input type="email" required placeholder="E-mail *" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100" />
                <input type="text" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100" />
                <input type="text" placeholder="Empresa" value={form.empresa} onChange={(e) => setForm({...form, empresa: e.target.value})} className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100" />
                <input type="number" step="0.01" placeholder="Valor (R$)" value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100" />
                <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-md cursor-pointer">Adicionar Lead</button>
              </form>
            </div>

            {/* Board Kanban */}
            {viewMode === 'kanban' ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {COLUNAS_KANBAN.map((coluna) => {
                    const leadsDaColuna = leadsFiltrados.filter(l => (l.status || 'novo') === coluna.id);
                    const valorColuna = leadsDaColuna.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);

                    return (
                      <div key={coluna.id} className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 flex flex-col min-h-[520px]">
                        <div className="flex justify-between items-center mb-1 px-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${coluna.indicator}`} />
                            <h3 className="font-bold text-sm text-slate-200">{coluna.titulo}</h3>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${coluna.badge}`}>{leadsDaColuna.length}</span>
                        </div>

                        <div className="pb-3 mb-4 px-1 border-b border-slate-800/60">
                          <p className="text-[11px] font-medium text-slate-500">Total: <span className="text-slate-300 font-semibold">{formatarMoeda(valorColuna)}</span></p>
                        </div>

                        <Droppable droppableId={coluna.id}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 space-y-3 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800/30 ring-2 ring-blue-500/20 ring-dashed' : ''}`}>
                              {leadsDaColuna.map((lead, index) => (
                                <Draggable key={String(lead.id)} draggableId={String(lead.id)} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => abrirChatLead(lead)}
                                      className={`group bg-slate-900/90 border p-4 rounded-xl shadow-md transition-all relative select-none cursor-pointer ${
                                        snapshot.isDragging ? 'border-blue-500/80 shadow-2xl scale-[1.02] bg-slate-800' : 'border-slate-800 hover:border-blue-500/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h4 className="font-semibold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">
                                            {lead.nome}
                                          </h4>
                                          {lead.empresa && (
                                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                                              <Building className="w-3.5 h-3.5 text-slate-500" /> {lead.empresa}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                          <button onClick={() => setLeadEditando(lead)} className="text-slate-500 hover:text-blue-400 p-1 transition">
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button onClick={(e) => handleDeletarLead(lead.id, e)} className="text-slate-500 hover:text-rose-400 p-1 transition">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                          <GripVertical className="w-4 h-4 text-slate-600 shrink-0 ml-1" />
                                        </div>
                                      </div>

                                      <div className="mt-3 flex items-center justify-between">
                                        <span className="bg-slate-950 border border-slate-800/80 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400">
                                          {formatarMoeda(lead.valor)}
                                        </span>
                                        <span className="text-[10px] text-blue-400/80 font-medium group-hover:underline flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" /> Chat
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            ) : (
              /* Tabela */
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                <h2 className="text-lg font-bold mb-4 text-slate-200">Todos os Leads Cadastrados</h2>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Contato</th>
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Valor Estimado</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {leadsFiltrados.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{lead.nome}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">{lead.email}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-300">{lead.empresa || '-'}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400 text-xs">{formatarMoeda(lead.valor)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => abrirChatLead(lead)} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/30 text-xs cursor-pointer flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Chat
                            </button>
                            <button onClick={() => setLeadEditando(lead)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs cursor-pointer">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleDeletarLead(lead.id, e)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1.5 rounded-lg border border-rose-500/30 text-xs cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL DE EDIÇÃO */}
      {leadEditando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" /> Editar Lead
              </h3>
              <button onClick={() => setLeadEditando(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarEdicao} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nome Completo</label>
                <input type="text" required value={leadEditando.nome} onChange={e => setLeadEditando({...leadEditando, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">E-mail</label>
                <input type="email" required value={leadEditando.email} onChange={e => setLeadEditando({...leadEditando, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Telefone</label>
                <input type="text" value={leadEditando.telefone || ''} onChange={e => setLeadEditando({...leadEditando, telefone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Empresa</label>
                <input type="text" value={leadEditando.empresa || ''} onChange={e => setLeadEditando({...leadEditando, empresa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Valor Estimado (R$)</label>
                <input type="number" step="0.01" value={leadEditando.valor || ''} onChange={e => setLeadEditando({...leadEditando, valor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLeadEditando(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs cursor-pointer">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT LATERAL */}
      {leadSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" /> {leadSelecionado.nome}
                </h3>
                <p className="text-xs text-slate-400">{leadSelecionado.empresa || leadSelecionado.email}</p>
              </div>
              <button onClick={() => setLeadSelecionado(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50">
              {carregandoMensagens ? (
                <p className="text-slate-500 text-xs text-center py-4">Carregando...</p>
              ) : mensagens.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-xs">Nenhuma anotação registrada ainda.</p>
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div key={msg.ID || msg.id} className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span className="font-bold text-blue-400">{msg.autor || 'Atendente'}</span>
                      <span>{msg.CreatedAt ? new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{msg.texto}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleEnviarMensagem} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input type="text" placeholder="Escreva uma anotação..." value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}