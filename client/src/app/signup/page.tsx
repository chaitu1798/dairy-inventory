'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../components/ui/Card';
import { Mail, Lock, Sparkles, CheckCircle2, ShieldCheck, Globe } from 'lucide-react';

const signupSchema = z.object({
    email: z.string().email('Invalid business email identity.'),
    password: z.string().min(6, 'Access key must be at least 6 characters.'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const [serverError, setServerError] = useState('');
    const router = useRouter();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupFormData) => {
        setServerError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            if (userCredential.user) {
                toast.success('Workspace provisioned successfully.');
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            console.warn('Signup error:', err);
            let errorMessage = 'Provisioning failed. Please evaluate inputs.';

            if (err && typeof err === 'object' && 'code' in err) {
                const errorCode = (err as { code: string }).code;
                if (errorCode === 'auth/email-already-in-use') {
                    errorMessage = 'This email identity is already associated with a workspace.';
                } else if (errorCode === 'auth/weak-password') {
                    errorMessage = 'Access key complexity too low.';
                } else if (errorCode === 'auth/network-request-failed') {
                    errorMessage = 'Uplink failure. Check network infrastructure.';
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            setServerError(errorMessage);
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-primary/20 selection:text-primary animate-in fade-in duration-1000">
            {/* Professional Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[140px] animate-pulse delay-1000" />
                
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563EB 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative z-10 w-full max-w-[460px] px-6">
                {/* Hero Header */}
                <div className="text-center mb-10 group">
                    <div className="mx-auto w-16 h-16 gradient-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 hover-lift">
                        <Globe className="text-white w-8 h-8 rotate-12" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 font-heading mb-2">
                        Nexus <span className="text-primary italic">Dairy</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-xs tracking-[0.1em] uppercase">
                        Global Inventory Orchestration
                    </p>
                </div>

                <Card isGlass className="border-none shadow-2xl bg-white/80 backdrop-blur-2xl ring-1 ring-white/50" isHoverable={false}>
                    <CardHeader className="pb-6 pt-8 text-center sm:text-left">
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Initialize Workspace</CardTitle>
                        <CardDescription className="text-slate-500 font-bold">
                            Setup your operational hub in seconds.
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
                                label="Business Email"
                                type="email"
                                {...register('email')}
                                error={errors.email}
                                placeholder="name@your-dairy.farm"
                                startAdornment={<Mail className="w-4 h-4 text-slate-400" />}
                                className="bg-white/50 border-slate-200 h-12 text-base shadow-sm focus:shadow-md transition-all"
                            />
                            <Input
                                label="Secure Access Key"
                                type="password"
                                {...register('password')}
                                error={errors.password}
                                placeholder="Min. 8 characters highly recommended"
                                startAdornment={<Lock className="w-4 h-4 text-slate-400" />}
                                className="bg-white/50 border-slate-200 h-12 text-base shadow-sm focus:shadow-md transition-all"
                                helperText="In accordance with ISO/IEC 27001 policies"
                            />
                            
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="gradient"
                                    className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-blue-500/20"
                                    isLoading={isSubmitting}
                                >
                                    {isSubmitting ? 'Provisioning Infrastructure...' : 'Launch Workspace'}
                                    {!isSubmitting && <CheckCircle2 className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 p-8 rounded-b-2xl">
                        <p className="text-sm text-slate-500 font-bold text-center">
                            Already part of our network?{' '}
                            <Link href="/login" className="text-primary font-black hover:text-blue-700 transition-all">
                                Restore Session
                            </Link>
                        </p>
                    </CardFooter>
                </Card>

                <div className="mt-12 grid grid-cols-2 gap-4 px-2">
                    <div className="flex items-center gap-2.5 text-slate-400 group">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 ring-1 ring-emerald-500/10 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest leading-none">Military Encryption</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-400 group">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500 ring-1 ring-blue-500/10 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest leading-none">Smart Analytics</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
