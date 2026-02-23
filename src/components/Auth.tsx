'use client';

import React, { useState } from 'react';
import { Scale, User, Layout, ChevronRight, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuthProps {
    onLogin: (user: any, isAdmin: boolean) => void;
}

export default function Auth({ onLogin }: AuthProps) {
    const [currentPage, setCurrentPage] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const showPage = (page: 'login' | 'register') => {
        setCurrentPage(page);
        setError(null);
    };

    const fetchProfile = async (userId: string) => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return profile;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const email = (document.getElementById('loginEmail') as HTMLInputElement).value;
        const password = (document.getElementById('loginPassword') as HTMLInputElement).value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const profile = await fetchProfile(data.user.id);
                // Fallback if profile doesn't exist yet or error
                const userData = profile || {
                    id: data.user.id,
                    email: data.user.email,
                    firstName: 'Utilisateur',
                    lastName: '',
                    plan: 'free',
                    role: 'user'
                };

                onLogin(userData, userData.role === 'admin');
            }
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de la connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const email = (document.getElementById('registerEmail') as HTMLInputElement).value;
        const password = (document.getElementById('registerPassword') as HTMLInputElement).value;
        const firstName = (document.getElementById('firstName') as HTMLInputElement).value;
        const lastName = (document.getElementById('lastName') as HTMLInputElement).value;
        const organization = (document.getElementById('organization') as HTMLInputElement).value;

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        organization: organization,
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                // Create profile if not created by trigger (optional, depending on DB setup)
                // For now, we assume a trigger handles it or we just proceed.
                // If specific metadata flow is needed:
                /* 
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    first_name: firstName, 
                    last_name: lastName,
                    organization,
                    role: 'user',
                    plan: 'free'
                });
                */

                // Auto login after sign up if session exists
                if (data.session) {
                    const userData = {
                        id: data.user.id,
                        email: data.user.email,
                        firstName,
                        lastName,
                        organization,
                        plan: 'free',
                        role: 'user'
                    };
                    onLogin(userData, false);
                } else {
                    setError('Compte créé ! Veuillez vérifier votre email pour confirmer.');
                    setIsLoading(false); // Stay on page to show message
                    return;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de l\'inscription.');
        } finally {
            setIsLoading(false);
        }
    };

    if (currentPage === 'login') {
        return (
            <div className="auth-container" id="loginPage">
                <div className="auth-box">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <Scale className="w-9 h-9 text-white" />
                        </div>
                        <h1>OHADA Legal Advisor</h1>
                        <p>Assistance Juridique • Guinée</p>
                    </div>
                    <div className="auth-title">
                        <h2>Bienvenue</h2>
                        <p>Connectez-vous à votre espace juridique</p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="loading-spinner">
                                <span></span><span></span><span></span>
                            </div>
                            <p className="mt-4 text-text-gray text-sm">Connexion en cours...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-error-red text-sm rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}
                            <form id="loginForm" onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label className="form-label">Adresse email</label>
                                    <input type="email" className="form-input" id="loginEmail" placeholder="vous@cabinet.gn" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mot de passe</label>
                                    <input type="password" className="form-input" id="loginPassword" placeholder="••••••••" required />
                                </div>
                                <div className="form-checkbox">
                                    <input type="checkbox" id="rememberMe" />
                                    <label htmlFor="rememberMe">Se souvenir de moi</label>
                                </div>
                                <button type="submit" className="btn btn-auth-primary">Se connecter</button>
                            </form>

                            {/* <div className="auth-divider"><span>Ou</span></div> */}

                            {/* <p className="auth-switch">
                                Pas de compte ? <a onClick={() => showPage('register')} className="cursor-pointer">Créer un compte</a>
                            </p> */}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container" id="registerPage">
            <div className="auth-box">
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <Scale className="w-9 h-9 text-white" />
                    </div>
                    <h1>OHADA Legal Advisor</h1>
                    <p>Assistance Juridique • Guinée</p>
                </div>
                <div className="auth-title">
                    <h2>Créer un compte</h2>
                    <p>Rejoignez notre plateforme juridique</p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="loading-spinner">
                            <span></span><span></span><span></span>
                        </div>
                        <p className="mt-4 text-text-gray text-sm">Création du compte...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-error-red text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        <form id="registerForm" onSubmit={handleRegister}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Prénom</label>
                                    <input type="text" className="form-input" id="firstName" placeholder="Mamadou" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nom</label>
                                    <input type="text" className="form-input" id="lastName" placeholder="Diallo" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" id="registerEmail" placeholder="vous@cabinet.gn" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Organisation</label>
                                <input type="text" className="form-input" id="organization" placeholder="Cabinet juridique" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mot de passe</label>
                                <input type="password" className="form-input" id="registerPassword" placeholder="Minimum 8 caractères" required />
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" id="acceptTerms" required />
                                <label htmlFor="acceptTerms">J'accepte les <a href="#">conditions d'utilisation</a></label>
                            </div>
                            <button type="submit" className="btn btn-auth-primary">Créer mon compte</button>
                        </form>
                        {/* <p className="auth-switch">
                            Déjà un compte ? <a onClick={() => showPage('login')} className="cursor-pointer">Se connecter</a>
                        </p> */}
                    </>
                )}
            </div>
        </div>
    );
}
