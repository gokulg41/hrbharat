"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import Link from 'next/link';

// Login form schema
const loginSchema = zod.object({
  email: zod.string().email('Enter a valid email address.'),
  password: zod.string().min(1, 'Password is required.'),
});

type LoginValues = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Which login tab is active
  const [loginType, setLoginType] = useState<'owner' | 'employee'>('owner');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    setError(null);

    // 1. Authenticate credentials against Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Route the user based on their role
    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("We couldn't load your account profile. Please try again.");
        setLoading(false);
        return;
      }

      // Safe normalization to catch any casing inconsistencies (e.g., 'Admin' vs 'admin')
      const normalizedRole = profile.role.toLowerCase();

      // 3. Forward users based strictly on their true database parameters
      if (normalizedRole === 'admin' || normalizedRole === 'owner' || normalizedRole === 'manager') {
        // Management roles go to the admin dashboard
        router.push('/admin/dashboard');
      } else if (normalizedRole === 'employee') {
        // Employees go to their self-service portal
        router.push('/employee');
      } else {
        // Fallback safety boundary
        setError(`No portal is configured for the role: ${profile.role}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-brand selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Access HRBharat</h2>
        <p className="mt-2 text-sm text-ink-600">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-card py-8 px-4 border border-border-subtle shadow rounded-3xl sm:px-10">
          
          {/* ROLE TAB SELECTOR */}
          <div className="bg-surface-card-hover p-1 rounded-2xl flex items-center mb-6 border border-border-subtle">
            <button
              type="button"
              onClick={() => { setLoginType('owner'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                loginType === 'owner' 
                  ? 'bg-surface-card text-brand shadow-sm' 
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Employer / Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('employee'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                loginType === 'employee' 
                  ? 'bg-surface-card text-brand shadow-sm' 
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Employee Portal
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-status-danger-bg text-xs font-bold text-status-danger rounded-xl animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Registered Corporate Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Account Password" type="password" {...register('password')} error={errors.password?.message} />
            
            <Button type="submit" disabled={loading} className="mt-6 w-full py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-all shadow-md">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-600 font-medium">
            New organization setup? <Link href="/register" className="text-brand font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}