'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Scale,
  Trash2,
  Layout,
  Users,
  CreditCard,
  MessageSquare,
  LogOut,
  Plus,
  Search,
  Check,
  AlertTriangle,
  FileText,
  Navigation
} from 'lucide-react';
import { experimental_useObject } from '@ai-sdk/react';
import { z } from 'zod';
import Auth from '@/components/Auth';
import Toast from '@/components/Toast';
import PdfUploader from '@/components/PdfUploader';
import { createClient } from '@/lib/supabase/client';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  created_at?: string;
};

export default function OhadaChatPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'subscription' | 'dashboard' | 'users' | 'knowledge' | 'config'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const { submit, object, isLoading: isStreaming } = experimental_useObject({
    api: '/api/chat',
    schema: z.object({
      assistant_message: z.string(),
      data: z.object({
        similar_cases: z.array(z.object({
          case_id: z.string(),
          title: z.string(),
          reason: z.string()
        })).optional(),
        checklist: z.array(z.string()).optional(),
        risks: z.array(z.string()).optional(),
        directions: z.array(z.string()).optional()
      }).optional()
    }),
    onFinish({ object }) {
      if (object) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: object.assistant_message || '',
          data: object.data,
        }]);
      }
    },
    onError(error) {
      console.error("Erreur Chat:", error);
      showToast("Erreur lors de la génération de la réponse", "error");
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Désolé, une erreur technique est survenue.`,
      }]);
    }
  });

  // Persistance de la session via Supabase
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch profile if needed, or rely on local storage cache for speed? 
        // Better to fetch fresh data to be safe, but for now we can try to recover from local storage 
        // or just let the Auth component handle the initial login flow if we want to be strict.
        // However, typically we want to restore the user state if a session exists.

        // Let's try to get the profile from the DB to be sure
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser(profile);
          setIsAdmin(profile.role === 'admin');
          // If admin, maybe switch tab?
          if (profile.role === 'admin') {
            // Only switch if we are not already on a valid tab? 
            // actually, we might want to stay on chat if that's where they were.
            // But strictly speaking, the logic below handles the "login" event action.
          }
        }

        const { data: userHistory } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (userHistory && userHistory.length > 0) {
          setChatSessions(userHistory);
          // If we want to automatically load the most recent, we could:
          // setMessages(userHistory[0].messages);
          // setCurrentSessionId(userHistory[0].id);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setMessages([]);
        setChatSessions([]);
        setCurrentSessionId(crypto.randomUUID());
        localStorage.removeItem('ohada-chat-sessions');
      }
    });

    // Chat history persistence
    const savedSessions = localStorage.getItem('ohada-chat-sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatSessions(parsed);
          setMessages(parsed[0].messages || []);
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Local storage parse error", e);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      let sessionID = currentSessionId;
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!sessionID || !uuidV4Regex.test(sessionID)) {
        sessionID = crypto.randomUUID();
        setCurrentSessionId(sessionID);
      }

      const title = messages[0]?.content.substring(0, 30) + "..." || "Nouvelle conversation";

      setChatSessions(prev => {
        const existing = prev.find(s => s.id === sessionID);
        let updated: ChatSession[];
        if (existing) {
          updated = prev.map(s => s.id === sessionID ? { ...s, messages, title: existing.title !== "Nouvelle conversation" ? existing.title : title } : s);
        } else {
          updated = [{ id: sessionID as string, title, messages }, ...prev];
        }
        localStorage.setItem('ohada-chat-sessions', JSON.stringify(updated));

        if (user) {
          try {
            const cleanMessages = messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              data: m.data || null
            }));

            supabase.from('chat_history').upsert({
              id: sessionID,
              user_id: user.id,
              title: existing ? existing.title : title,
              messages: cleanMessages
            }).then(({ error }) => {
              if (error) console.error("Supabase Error:", JSON.stringify(error, null, 2));
            });
          } catch (err) {
            console.error("Supabase Try/Catch Error:", err);
          }
        }

        return updated;
      });
    }
  }, [messages]); // We only trigger on messages change


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, object]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = (userData: any, admin: boolean) => {
    setUser(userData);
    setIsAdmin(admin);
    setActiveTab(admin ? 'dashboard' : 'chat');
    // We don't need to manually set localStorage for user anymore if we rely on Supabase,
    // but the app uses 'user' state. 
    showToast(admin ? 'Bienvenue Administrateur !' : `Bienvenue ${userData?.firstName || 'Utilisateur'} !`);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setMessages([]);
    localStorage.removeItem('ohada-chat-history');
    showToast('Déconnexion réussie');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isLoading) return;

    const currentInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
    };

    setInput('');
    setMessages((prev) => [...prev, userMessage]);

    // Call the streaming API
    submit({ prompt: currentInput });
  };

  const clearHistory = () => {
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
    showToast('Nouvelle conversation démarrée');
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Auth onLogin={handleLogin} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-light-bg font-montserrat">
      {/* SIDEBAR FOR CHAT HISTORY */}
      {user && !isAdmin && activeTab === 'chat' && (
        <aside className="w-64 bg-[#1a1c23] border-r border-[#2d2f39] hidden md:flex flex-col text-white">
          <div className="p-4 border-b border-[#2d2f39]">
            <button
              className="btn btn-auth-primary w-full flex items-center justify-center gap-2"
              onClick={clearHistory}
            >
              <Plus className="w-4 h-4" /> NOUVEAU CHAT
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatSessions.map(session => (
              <button
                key={session.id}
                onClick={() => {
                  setMessages(session.messages);
                  setCurrentSessionId(session.id);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm truncate transition-colors ${currentSessionId === session.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-[#2d2f39] text-gray-300'}`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden relative">
        {/* TOAST SYSTEM */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* HEADER */}
        <header className={`header ${isAdmin ? 'header-admin' : ''}`}>
          <div className="header-left">
            <div className="header-logo"><Scale className="w-6 h-6 text-white" /></div>
            <div className="header-title">
              <h1 className="text-white">OHADA Legal Advisor</h1>
              <p className="text-white opacity-80 uppercase tracking-widest text-[10px]">Assistance Juridique • Guinée</p>
            </div>
          </div>

          <div className="header-center hidden md:flex">
            <div className="nav-tabs">
              {!isAdmin ? (
                <>
                  <button className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Assistant</button>
                  <button className={`nav-tab ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>Abonnement</button>
                </>
              ) : (
                <>
                  <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Tableau de bord</button>
                  <button className={`nav-tab ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>Base de Connaissances</button>
                  <button className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Utilisateurs</button>
                  <button className={`nav-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>Configuration</button>
                </>
              )}
            </div>
          </div>

          <div className="header-right">
            {!isAdmin && activeTab === 'chat' && (
              <button className="header-btn" onClick={clearHistory}>
                <Trash2 className="w-4 h-4" />
                <span>Effacer</span>
              </button>
            )}
            <button className="header-btn" onClick={logout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
            <div className="user-avatar bg-accent border-2 border-white/30 text-white font-bold h-10 w-10 rounded-full flex items-center justify-center">
              {user?.firstName?.[0] || '?'}{user?.lastName?.[0] || '?'}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className={`main-content ${isAdmin ? 'full-width' : ''}`}>

          {/* USER VIEWS */}
          {!isAdmin && (
            <>
              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  {/* <div className="chat-toolbar sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border-light p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <PdfUploader />
                    </div>
                  </div> */}

                  <div className="chat-area flex-1 overflow-y-auto p-6 pb-32">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 h-full">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <Scale className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold font-headline text-primary">Comment puis-je vous aider ?</h2>
                        <p className="text-text-gray max-w-sm">Posez votre question sur le droit des affaires OHADA en Guinée.</p>
                      </div>
                    ) : (
                      [...messages].reverse().map((m) => (
                        <div key={m.id} className={`message ${m.role === 'user' ? 'user' : 'assistant'}`}>
                          <div className="message-avatar">
                            {m.role === 'assistant' ? <Scale className="w-5 h-5 text-white" /> : ((user?.firstName?.[0] || '?') + (user?.lastName?.[0] || '?')).toUpperCase()}
                          </div>
                          <div className="message-content">
                            <div className="message-bubble">{m.content}</div>

                            {m.role === 'assistant' && m.data && (
                              <div className="mt-4 space-y-4">
                                {/* INFO CARDS */}
                                {(m.data.checklist || m.data.risks) && (
                                  <div className="info-cards">
                                    {m.data.checklist && m.data.checklist.length > 0 && (
                                      <div className="info-card">
                                        <div className="info-card-header success flex items-center gap-2">
                                          <Check className="w-4 h-4" /> CHECKLIST ACTIONS
                                        </div>
                                        <ul>
                                          {m.data.checklist.map((item: string, i: number) => (
                                            <li key={i}><span className="number">{i + 1}</span> {item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {m.data.risks && m.data.risks.length > 0 && (
                                      <div className="info-card warning-card">
                                        <div className="info-card-header warning flex items-center gap-2">
                                          <AlertTriangle className="w-4 h-4" /> RISQUES MAJEURS
                                        </div>
                                        <ul>
                                          {m.data.risks.map((item: string, i: number) => (
                                            <li key={i}><span className="warning-icon text-error-red">⚠</span> {item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* JURISPRUDENCE */}
                                {m.data.similar_cases && m.data.similar_cases.length > 0 && (
                                  <div className="jurisprudence-section">
                                    <div className="jurisprudence-header flex items-center gap-2">
                                      <FileText className="w-4 h-4" /> JURISPRUDENCE TROUVÉE
                                    </div>
                                    {m.data.similar_cases.map((c: any, i: number) => (
                                      <div key={i} className="jurisprudence-card mt-2">
                                        <div className="jurisprudence-title">{c.title}</div>
                                        <div className="jurisprudence-ref">REF: {c.case_id}</div>
                                        <div className="jurisprudence-text">{c.reason}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* INVESTIGATION */}
                                {m.data.directions && m.data.directions.length > 0 && (
                                  <div className="investigation-section flex items-center gap-2">
                                    <Navigation className="w-4 h-4" />
                                    <span>PISTES D'INVESTIGATION : {m.data.directions.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isStreaming && object && (
                      <div className="message assistant">
                        <div className="message-avatar"><Scale className="w-5 h-5 text-white" /></div>
                        <div className="message-content">
                          <div className="message-bubble">{object.assistant_message || '...'}</div>

                          {object.data && (
                            <div className="mt-4 space-y-4">
                              {/* INFO CARDS */}
                              {((object.data.checklist?.length ?? 0) > 0 || (object.data.risks?.length ?? 0) > 0) && (
                                <div className="info-cards">
                                  {object.data.checklist && object.data.checklist.length > 0 && (
                                    <div className="info-card">
                                      <div className="info-card-header success flex items-center gap-2">
                                        <Check className="w-4 h-4" /> CHECKLIST ACTIONS
                                      </div>
                                      <ul>
                                        {object.data.checklist.map((item: string | undefined, i: number) => (
                                          <li key={i}><span className="number">{i + 1}</span> {item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {object.data.risks && object.data.risks.length > 0 && (
                                    <div className="info-card warning-card">
                                      <div className="info-card-header warning flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> RISQUES MAJEURS
                                      </div>
                                      <ul>
                                        {object.data.risks.map((item: string | undefined, i: number) => (
                                          <li key={i}><span className="warning-icon text-error-red">⚠</span> {item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* JURISPRUDENCE */}
                              {object.data.similar_cases && object.data.similar_cases.length > 0 && (
                                <div className="jurisprudence-section">
                                  <div className="jurisprudence-header flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> JURISPRUDENCE TROUVÉE
                                  </div>
                                  {object.data.similar_cases.map((c: any, i: number) => (
                                    <div key={i} className="jurisprudence-card mt-2">
                                      <div className="jurisprudence-title">{c.title || '...'}</div>
                                      <div className="jurisprudence-ref">REF: {c.case_id || '...'}</div>
                                      <div className="jurisprudence-text">{c.reason || '...'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* INVESTIGATION */}
                              {object.data.directions && object.data.directions.length > 0 && (
                                <div className="investigation-section flex items-center gap-2">
                                  <Navigation className="w-4 h-4" />
                                  <span>PISTES D'INVESTIGATION : {object.data.directions.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(isLoading || (isStreaming && !object)) && (
                      <div className="message assistant">
                        <div className="message-avatar"><Scale className="w-5 h-5 text-white" /></div>
                        <div className="message-content">
                          <div className="message-bubble"><div className="loading-spinner"><span></span><span></span><span></span></div></div>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} style={{ float: 'left', clear: 'both' }} />
                  </div>

                </div>
              )}

              {/* SUBSCRIPTION TAB */}
              {activeTab === 'subscription' && (
                <div className="tab-content active">
                  <div className="section-header"><h2 className="section-title">Mon Abonnement</h2></div>
                  <div className="current-plan-card">
                    <div className="current-plan-badge">★ Plan actuel</div>
                    <div className="current-plan-name">Professionnel</div>
                    <div className="current-plan-price">250 000 GNF / mois</div>
                  </div>
                  <h3 className="text-xl font-bold mb-6">Plans disponibles</h3>
                  <div className="plans-grid">
                    <div className="plan-card">
                      <h3 className="plan-name">Gratuit</h3>
                      <div className="plan-price">0 GNF <span>/ toujours</span></div>
                      <ul className="plan-features-list">
                        <li><Check className="w-4 h-4" /> 10 requêtes par jour</li>
                        <li><Check className="w-4 h-4" /> Recherche de base</li>
                        <li className="disabled"><Check className="w-4 h-4" /> Jurisprudence CCJA</li>
                      </ul>
                      <button className="btn btn-outline w-full" disabled>Plan actuel</button>
                    </div>
                    <div className="plan-card popular">
                      <div className="popular-badge">Populaire</div>
                      <h3 className="plan-name">Professionnel</h3>
                      <div className="plan-price">250 000 GNF <span>/ mois</span></div>
                      <ul className="plan-features-list">
                        <li><Check className="w-4 h-4" /> Requêtes illimitées</li>
                        <li><Check className="w-4 h-4" /> Jurisprudence CCJA</li>
                        <li><Check className="w-4 h-4" /> Export documents</li>
                      </ul>
                      <button className="btn btn-auth-primary w-full">Changer de plan</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ADMIN VIEWS */}
          {isAdmin && (
            <>
              {activeTab === 'dashboard' && (
                <div className="tab-content active">
                  <div className="section-header"><h2 className="section-title">Tableau de bord</h2></div>
                  <div className="admin-stats">
                    <div className="stat-card">
                      <div className="stat-icon blue"><Users className="w-6 h-6" /></div>
                      <div className="stat-value">1,248</div>
                      <div className="stat-label">Utilisateurs totaux</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon blue"><Check className="w-6 h-6" /></div>
                      <div className="stat-value">842</div>
                      <div className="stat-label">Utilisateurs actifs</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon gold"><CreditCard className="w-6 h-6" /></div>
                      <div className="stat-value">312</div>
                      <div className="stat-label">Abonnés payants</div>
                    </div>
                  </div>
                  <div className="table-container mt-8">
                    <div className="table-header"><h3 className="table-title">Activité récente</h3></div>
                    <table className="data-table">
                      <thead><tr><th>Utilisateur</th><th>Action</th><th>Date</th></tr></thead>
                      <tbody>
                        <tr><td><strong>Mamadou D.</strong></td><td>Connexion</td><td className="text-text-gray">Il y a 5 min</td></tr>
                        <tr><td><strong>Fatoumata C.</strong></td><td>Requête OHADA</td><td className="text-text-gray">Il y a 15 min</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'users' && (
                <div className="tab-content active">
                  <div className="section-header">
                    <h2 className="section-title">Gestion des utilisateurs</h2>
                    <button className="btn btn-auth-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter</button>
                  </div>
                  <div className="table-container">
                    <div className="table-header">
                      <h3 className="table-title">Tous les utilisateurs</h3>
                      <div className="search-input"><Search className="w-4 h-4" /><input type="text" placeholder="Rechercher..." /></div>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Utilisateur</th><th>Organisation</th><th>Plan</th><th>Statut</th></tr></thead>
                      <tbody>
                        <tr>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">MD</div>
                              <div><h4 className="font-bold">Mamadou Diallo</h4><p className="text-xs text-text-gray">m.diallo@cabinet.gn</p></div>
                            </div>
                          </td>
                          <td>Cabinet Thiam</td>
                          <td><span className="plan-badge pro">Pro</span></td>
                          <td><span className="status-badge active">Actif</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'knowledge' && (
                <div className="tab-content active">
                  <div className="section-header">
                    <h2 className="section-title">Base de Connaissances</h2>
                    <button className="btn btn-auth-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Uploader Acte Uniforme</button>
                  </div>
                  <div className="table-container mt-4 p-4 border rounded-md bg-white">
                    <p className="text-text-gray mb-4">Utilisez ce module pour indexer de nouveaux documents dans la base vectorielle (Embeddings).</p>
                    <PdfUploader />
                  </div>
                </div>
              )}
              {activeTab === 'config' && (
                <div className="tab-content active">
                  <div className="section-header">
                    <h2 className="section-title">Configuration Système</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 border rounded-md bg-white">
                      <h3 className="font-bold mb-2">Paramètres Modèle LLM</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-text-gray mb-1">Modèle par défaut</label>
                          <select className="w-full border border-gray-200 p-2 rounded-md">
                            <option>gemini-3-flash-preview</option>
                            <option>gemini-1.5-pro-latest</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-text-gray mb-1">Seuil de similarité (Vector Matching)</label>
                          <input type="number" step="0.05" defaultValue={0.30} className="w-full border border-gray-200 p-2 rounded-md" />
                        </div>
                        <button className="btn btn-auth-primary mt-2">Sauvegarder</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Zone de texte chatbot */}
        {!isAdmin && activeTab === 'chat' && (
          <div className="input-area px-6">
            <div className="max-w-[900px] mx-auto">
              <form onSubmit={handleSubmit} className="input-wrapper">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question sur le droit OHADA..."
          
