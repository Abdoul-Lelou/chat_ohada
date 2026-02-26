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
  Navigation,
  Shield
} from 'lucide-react';
import { experimental_useObject } from '@ai-sdk/react';
import { z } from 'zod';
import Auth from '@/components/Auth';
import Toast from '@/components/Toast';
import PdfUploader from '@/components/PdfUploader';
import { createClient } from '@/lib/supabase/client';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { UserManagementOverview } from '@/components/admin/UserManagementOverview';
import ProfileMenu from '@/components/ProfileMenu';

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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const { submit, object, isLoading: isStreaming, error: chatError } = experimental_useObject({
    api: '/api/chat',
    fetch: async (url, init) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        }
      });
      if (res.status === 429) {
        throw new Error("QUOTA_EXCEEDED");
      }
      if (!res.ok) {
        throw new Error("HTTP_ERROR");
      }
      return res;
    },
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
      // Nettoyage console: on ne leak pas les erreurs brutes en prod
      const isQuota = error.message === "QUOTA_EXCEEDED" || error.message?.includes('429');
      if (!isQuota) {
        console.error("Chat Interaction Error:", error.message || error);
      }

      const exactMessage = isQuota
        ? "La limite de génération de réponses a été atteinte temporairement.\nVeuillez attendre quelques instants avant de réessayer ou contacter l’administrateur du service."
        : "Désolé, une erreur technique est survenue.";

      showToast("Erreur lors de la génération", "error");
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: exactMessage,
      }]);
    }
  });

  // Persistance de la session via Supabase
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;
        if (profile) {
          setUser(profile);
          setIsAdmin(profile.role === 'admin');
        }

        // Priorité Supabase pour l'historique
        const { data: userHistory } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;
        if (userHistory && userHistory.length > 0) {
          setChatSessions(userHistory);
          setMessages(userHistory[0].messages || []);
          setCurrentSessionId(userHistory[0].id);
          return; // Supabase a priorité, on ne charge pas le localStorage
        }
      }

      // Fallback localStorage uniquement si pas de données Supabase
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
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setMessages([]);
        setChatSessions([]);
        setCurrentSessionId(crypto.randomUUID());
        localStorage.removeItem('ohada-chat-sessions');
      }
    });

    return () => {
      isMounted = false;
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


  // Scroll behavior now handled directly in handleSubmit and via UI structure
  // Remontée automatique en haut gérée à la soumission.

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleLogin = (userData: any, admin: boolean) => {
    setUser(userData);
    setIsAdmin(admin);
    setActiveTab(admin ? 'dashboard' : 'chat');
    setUser(userData);
    setIsAdmin(admin);
    setActiveTab(admin ? 'dashboard' : 'chat');
    showToast(admin ? 'Bienvenue Administrateur !' : `Bienvenue ${userData?.first_name || 'Utilisateur'} !`);
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

    // Ajout à la session actuelle : on "append" le message, on ne reset SURTOUT PAS.
    setMessages(prev => [...prev, userMessage]);

    // Scroll to top as requested
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Anti-scroll bug: Remonter le chat (scroll bottom via scrollHeight)
    // Cela garantit que la nouvelle question et le loader d'analyse sont visibles.
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);

    // Call the streaming API
    try {
      submit({ prompt: currentInput });
    } catch (err) {
      console.error(err);
    }
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
            <button className="btn btn-auth-primary w-full flex items-center justify-center gap-2" onClick={clearHistory}>
              <Plus className="w-4 h-4" /> NOUVEAU CHAT
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatSessions.map(session => (
              <div key={session.id} className="group relative">
                <button
                  onClick={() => {
                    setMessages(session.messages);
                    setCurrentSessionId(session.id);
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm truncate transition-colors pr-10 ${currentSessionId === session.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-[#2d2f39] text-gray-300'}`}
                >
                  {session.title}
                </button>
                {/* BOUTON SUPPRIMER (POUBELLE) */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { error } = await supabase.from('chat_history').delete().eq('id', session.id);
                    if (!error) {
                      setChatSessions(prev => prev.filter(s => s.id !== session.id));
                      if (currentSessionId === session.id) clearHistory();
                      showToast("Discussion supprimée", "success");
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
              {/* LIENS UTILISATEUR ET ADMIN AVEC FILTRE DE RÔLE STRICT */}
              {user?.role !== 'admin' && user?.role !== 'super_admin' ? (
                <>
                  <button className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Assistant</button>
                  <button className={`nav-tab ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>Abonnement</button>
                </>
              ) : user?.role === 'super_admin' ? (
                <>
                  <button className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Assistant</button>
                  <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Tableau de bord</button>
                  <button className={`nav-tab ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>Base de Connaissances</button>
                  <button className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Utilisateurs</button>
                  <button className={`nav-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>Système</button>
                </>
              ) : (
                <>
                  <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Tableau de bord</button>
                  <button className={`nav-tab ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>Base de Connaissances</button>
                  <button className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Utilisateurs</button>
                </>
              )}
            </div>
          </div>

          <div className="header-right gap-4">
            {!isAdmin && activeTab === 'chat' && (
              <button className="header-btn" onClick={clearHistory}>
                <Trash2 className="w-4 h-4" />
                <span className="hidden lg:inline">Effacer</span>
              </button>
            )}

            <div className="h-8 w-[1px] bg-white/10 hidden md:block mx-1"></div>

            <ProfileMenu user={user} onLogout={logout} />
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className={`main-content ${isAdmin ? 'full-width' : ''}`}>

          {/* USER VIEWS */}
          {!isAdmin && (
            <>
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  {/* ZONE DES MESSAGES - STYLE GEMINI */}
                  <div ref={chatContainerRef} className="chat-area flex-1 overflow-y-auto p-6 pb-32 flex flex-col gap-6 scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.chat-area::-webkit-scrollbar { display: none; }`}</style>

                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 h-full">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <Scale className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold font-headline text-primary">Comment puis-je vous aider ?</h2>
                        <p className="text-text-gray max-w-sm">Posez votre question sur le droit des affaires OHADA en Guinée.</p>
                      </div>
                    ) : (
                      <>
                        {/* ORDRE CHRONOLOGIQUE STRICT - MODE FOCUS SI STREAMING */}
                        {messages
                          .filter((m, idx) => {
                            // En mode streaming, on ne montre que le dernier message de l'utilisateur
                            if (isStreaming) {
                              return idx === messages.length - 1;
                            }
                            return true;
                          })
                          .map((m) => (
                            <div key={m.id} className={`message ${m.role === 'user' ? 'user' : 'assistant'}`}>
                              <div className="message-avatar">
                                {m.role === 'assistant' ? <Scale className="w-5 h-5 text-white" /> : ((user?.firstName?.[0] || '?') + (user?.lastName?.[0] || '?')).toUpperCase()}
                              </div>
                              <div className="message-content">
                                <div className="message-bubble">{m.content}</div>

                                {/* DATA JURIDIQUE : TABLE CASE ET ANALYSE */}
                                {m.role === 'assistant' && m.data && (
                                  <div className="mt-4 space-y-4">
                                    {(m.data.checklist || m.data.risks) && (
                                      <div className="info-cards">
                                        {m.data.checklist?.map((item: string, i: number) => (
                                          <div key={i} className="info-card">
                                            <div className="info-card-header success flex items-center gap-2">
                                              <Check className="w-4 h-4" /> ACTION {i + 1}
                                            </div>
                                            <p className="p-3 text-sm">{item}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {m.data.similar_cases?.length > 0 && (
                                      <div className="jurisprudence-section p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <div className="jurisprudence-header flex items-center gap-2 mb-3 font-bold text-primary">
                                          <FileText className="w-4 h-4" /> PRÉCÉDENTS (TABLE CASE)
                                        </div>
                                        {m.data.similar_cases.map((c: any, i: number) => (
                                          <div key={i} className="bg-white p-3 rounded-lg shadow-sm mb-2 border-l-4 border-primary">
                                            <div className="font-bold text-sm">{c.title}</div>
                                            <div className="text-xs text-text-gray mt-1 italic">{c.reason}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {/* CHARGEMENT CENTRÉ IMMÉDIAT ET VISIBLE */}
                        {isStreaming && !object?.assistant_message && !object?.data && (
                          <div className="flex flex-1 items-center justify-center min-h-[300px]">
                            <div className="flex flex-col items-center gap-4 border border-primary/20 bg-primary/5 p-8 rounded-2xl shadow-sm">
                              <Scale className="w-10 h-10 text-primary animate-pulse" />
                              <div className="loading-spinner">
                                <span></span><span></span><span></span>
                              </div>
                              <span className="text-sm font-medium text-primary uppercase tracking-widest">Analyse juridique en cours...</span>
                            </div>
                          </div>
                        )}

                        {/* STREAMING : LA RÉPONSE EN TRAIN DE S'ÉCRIRE */}
                        {isStreaming && (object?.assistant_message || object?.data) && (
                          <div className="message assistant">
                            <div className="message-avatar"><Scale className="w-5 h-5 text-white" /></div>
                            <div className="message-content">
                              <div className="message-bubble">
                                {object?.assistant_message}
                              </div>
                              {/* Données structurées en temps réel pendant le streaming */}
                              {object?.data && (
                                <div className="mt-4 space-y-4">
                                  {(object.data.checklist || object.data.risks) && (
                                    <div className="info-cards">
                                      {object.data.checklist?.map((item: string | undefined, i: number) => (
                                        item ? (
                                          <div key={`checklist-${i}`} className="info-card">
                                            <div className="info-card-header success flex items-center gap-2">
                                              <Check className="w-4 h-4" /> ACTION {i + 1}
                                            </div>
                                            <p className="p-3 text-sm">{item}</p>
                                          </div>
                                        ) : null
                                      ))}
                                    </div>
                                  )}
                                  {object.data.similar_cases && object.data.similar_cases.length > 0 && (
                                    <div className="jurisprudence-section p-4 bg-primary/5 rounded-xl border border-primary/10">
                                      <div className="jurisprudence-header flex items-center gap-2 mb-3 font-bold text-primary">
                                        <FileText className="w-4 h-4" /> PRÉCÉDENTS (TABLE CASE)
                                      </div>
                                      {object.data.similar_cases.map((c: any, i: number) => (
                                        <div key={i} className="bg-white p-3 rounded-lg shadow-sm mb-2 border-l-4 border-primary">
                                          <div className="font-bold text-sm">{c.title}</div>
                                          <div className="text-xs text-text-gray mt-1 italic">{c.reason}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AFFICHAGE DE L'ERREUR (NON PERSISTANT) */}
                        {chatError && (
                          <div className="flex flex-col items-center gap-3 p-4 mx-auto max-w-2xl bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 font-bold">
                              <AlertTriangle className="w-5 h-5" />
                              <span>Attention</span>
                            </div>
                            <p className="text-sm text-center whitespace-pre-wrap font-medium">
                              {chatError.message === "QUOTA_EXCEEDED" || chatError.message?.includes('429')
                                ? "Désolé, la limite de requêtes a été atteinte. Veuillez patienter une minute ou contacter l'administrateur pour passer au plan supérieur."
                                : "⚠️ Une erreur technique est survenue. Veuillez rafraîchir la page."}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {/* FIN DE ZONE DE CHAT */}
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
                      <button
                        className="btn btn-auth-primary w-full"
                        onClick={() => alert("Changement de plan contactez: support@ohadadvisor.com")}
                      >
                        Changer de plan
                      </button>
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
                <div className="tab-content active p-6 max-w-7xl mx-auto">
                  <div className="section-header mb-8">
                    <h2 className="text-3xl font-bold font-headline tracking-tight text-primary">Vue d'ensemble</h2>
                    <p className="text-text-gray mt-2">Suivi en temps réel de l'activité de la plateforme.</p>
                  </div>
                  <DashboardOverview user={user} />
                </div>
              )}
              {activeTab === 'users' && (
                <div className="tab-content active p-6">
                  <UserManagementOverview user={user} />
                </div>
              )}
              {activeTab === 'knowledge' && (
                <div className="tab-content active">
                  <div className="section-header">
                    <h2 className="section-title">Base de Connaissances</h2>
                  </div>
                  <div className="table-container mt-4 p-4 border rounded-md bg-white">
                    <p className="text-text-gray mb-4">Utilisez ce module pour indexer de nouveaux documents dans la base vectorielle (Embeddings).</p>
                    <PdfUploader />
                  </div>
                </div>
              )}
              {activeTab === 'config' && user?.role === 'super_admin' && (
                <div className="tab-content active p-6">
                  <div className="section-header mb-8">
                    <h2 className="text-3xl font-bold font-headline tracking-tight text-primary">Configuration Système</h2>
                    <p className="text-text-gray mt-2">Paramètres globaux de la plateforme (Super Admin uniquement).</p>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                      <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Module de Configuration</h3>
                    <p className="text-sm text-gray-500 max-w-sm">Ce module sera bientôt disponible pour la gestion des quotas globaux et des paramètres API.</p>
                  </div>
                </div>
              )}
              {activeTab === 'chat' && user?.role === 'super_admin' && (
                <div className="tab-content active p-0 h-full">
                  {/* Reuse chat logic if superadmin wants to chat */}
                  {/* This is a simple fallback, in a real app we might refactor chat to a component */}
                  <div className="flex items-center justify-center h-full text-text-gray italic">
                    L'interface Assistant est accessible via le rôle Utilisateur. (Redirection...)
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Zone de texte chatbot */}
        {
          !isAdmin && activeTab === 'chat' && (
            <div className="input-area px-6">
              <div className="max-w-[900px] mx-auto">
                <form onSubmit={handleSubmit} className="input-wrapper">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question sur le droit OHADA..."
                    disabled={isLoading || isStreaming}
                  />
                  <button type="submit" className="send-btn" disabled={isLoading || isStreaming || !input.trim()}>
                    <Send className="w-6 h-6 text-white" />
                  </button>
                </form>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
}
