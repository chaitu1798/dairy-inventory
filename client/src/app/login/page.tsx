'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../components/ui/Card';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const [serverError, setServerError] = useState('');
    const { login } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setServerError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            if (userCredential.user) {
                toast.success('Access granted. Welcome to Dairy OS.');
                login();
            }
        } catch (err: unknown) {
            console.warn('Login attempt failed:', err);

            const firebaseError = err as { code?: string; message?: string };
            let errorMessage = 'Login failed. Please check your credentials.';
            if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password identity.';
            } else if (firebaseError.code === 'auth/network-request-failed') {
                errorMessage = 'Network connectivity issue detected.';
            } else if (firebaseError.message) {
                errorMessage = firebaseError.message;
            }

            setServerError(errorMessage);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('reason') === 'session_expired') {
                toast.error('Session expired. Please re-authenticate.');
                window.history.replaceState({}, '', '/login');
            }
        }
    }, []);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-primary/20 selection:text-primary animate-in fade-in duration-1000">
            {/* High-end Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-400/10 rounded-full blur-[120px] animate-pulse delay-700" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-400/5 rounded-full blur-[100px]" />
                
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563EB 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative z-10 w-full max-w-[440px] px-6">
                {/* Brand Header */}
                <div className="text-center mb-10 group">
                    <div className="mx-auto w-16 h-16 gradient-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-6 transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 hover-lift">
                        <Sparkles className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 font-heading mb-2">
                        Dairy <span className="text-primary italic">OS</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-sm tracking-tight">
                        INTELLIGENT INVENTORY MANAGEMENT
                    </p>
                </div>

                <Card isGlass className="border-none shadow-2xl bg-white/80 backdrop-blur-2xl ring-1 ring-white/50" isHoverable={false}>
                    <CardHeader className="pb-6 pt-8 text-center sm:text-left">
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Operator Login</CardTitle>
                        <CardDescription className="text-slate-500 font-bold">
                            Enter credentials to access secure terminal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {serverError && (
                            <div className="p-4 mb-6 text-xs text-rose-600 bg-rose-50/80 backdrop-blur-md rounded-xl border border-rose-100 font-black uppercase tracking-widest animate-in slide-in-from-top-2" role="alert">
                                {serverError}
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                            <Input
                                label="Work Email"
                                type="email"
                                {...register('email')}
                                error={errors.email}
                                placeholder="operator@dairy-os.com"
                                startAdornment={<Mail className="w-4 h-4 text-slate-400" />}
                                className="bg-white/50 border-slate-200 h-12 text-base"
                            />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[13px] font-bold text-slate-700">Access Key</label>
                                    <Link href="#" className="text-xs font-black text-primary hover:text-blue-700 transition-colors uppercase tracking-wider">
                                        Recovery
                                    </Link>
                                </div>
                                <Input
                                    label=""
                                    type="password"
                                    {...register('password')}
                                    error={errors.password}
                                    placeholder="••••••••••••"
                                    startAdornment={<Lock className="w-4 h-4 text-slate-400" />}
                                    className="bg-white/50 border-slate-200 h-12 text-base"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="gradient"
                                className="w-full h-14 text-lg font-black rounded-2xl mt-4 shadow-xl shadow-blue-500/20"
                                isLoading={isSubmitting}
                            >
                                {isSubmitting ? 'Authenticating...' : 'Sign In'}
                                {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 p-8 rounded-b-2xl">
                        <p className="text-sm text-slate-500 font-bold text-center">
                            New facility?{' '}
                            <Link href="/signup" className="text-primary font-black hover:text-blue-700 transition-all">
                                Provision Workspace
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
                
                <div className="mt-12 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                        Dairy OS Enterprise v4.0 • Secured by AES-256
                    </p>
                </div>
            </div>
        </div>
    );
}
