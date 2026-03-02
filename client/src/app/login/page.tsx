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
                toast.success('Welcome back!');
                login(userCredential.user);
            }
        } catch (err: any) {
            console.warn('Login attempt failed:', err);

            let errorMessage = 'Login failed. Please check your credentials.';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (err.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setServerError(errorMessage);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(globalThis.window?.location.search);
        if (params.get('reason') === 'session_expired') {
            toast.error('Your session has expired. Please log in again.');
            globalThis.window?.history.replaceState({}, '', '/login');
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
                        <span className="text-white font-bold text-2xl">D</span>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {serverError && (
                        <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium animate-pulse" role="alert">
                            {serverError}
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <Input
                            label="Email"
                            type="email"
                            {...register('email')}
                            error={errors.email}
                            placeholder="name@example.com"
                        />
                        <Input
                            label="Password"
                            type="password"
                            {...register('password')}
                            error={errors.password}
                            placeholder="••••••••"
                        />
                        <Button
                            type="submit"
                            className="w-full bg-sky-500 hover:bg-sky-600"
                            size="lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-primary font-medium hover:underline ml-1">
                        Register here
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
