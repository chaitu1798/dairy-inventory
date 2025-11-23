'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../utils/api';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/signup', { email, password });
            if (res.data.user) {
                router.push('/login');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Signup failed');
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-center text-gray-900">Sign Up</h2>
            {error && <div className="p-3 text-red-500 bg-red-100 rounded">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    Sign Up
                </button>
            </form>
            <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                    Login
                </Link>
            </p>
        </div>
    );
}
