'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../utils/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../components/ui/Card';

const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
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
            const res = await api.post('/auth/signup', data);
            if (res.data.user) {
                toast.success('Account created successfully! Please sign in.');
                router.push('/login');
            }
        } catch (err) {
            console.warn('Signup error:', err);
            const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
            const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Signup failed. Please try again.';
            setServerError(errorMessage);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
                        <span className="text-white font-bold text-2xl">D</span>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                    <CardDescription>
                        Enter your email below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {serverError && (
                        <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium" role="alert">
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
                            placeholder="Min. 6 characters"
                        />
                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating account...' : 'Create account'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline ml-1">
                        Sign in
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
