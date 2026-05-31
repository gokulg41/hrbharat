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

// Strict schema validation definition
const loginSchema = zod.object({
  email: zod.string().email('Invalid email structure definition'),
  password: zod.string().min(1, 'Password field required execution validation data'),
});

type LoginValues = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // UI Tab State (Visual tracking helper for user clarity)
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

    // 2. Dynamic Authorization Routing Split Engine
    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("Could not retrieve your structural account profile details.");
        setLoading(false);
        return;
      }

      // Safe normalization to catch any casing inconsistencies (e.g., 'Admin' vs 'admin')
      const normalizedRole = profile.role.toLowerCase();

      // 3. Forward users based strictly on their true database parameters
      if (normalizedRole === 'admin' || normalizedRole === 'owner' || normalizedRole === 'manager') {
        // Management core goes straight to the primary administration control deck
        router.push('/admin');
      } else if (normalizedRole === 'employee') {
        // Standard workforce personnel drop right into the punch-clock terminal layout
        router.push('/employee');
      } else {
        // Fallback safety boundary wall
        setError(`Unauthorized terminal workspace target for role: ${profile.role}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-teal-700 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Access HRBharat</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign into your secure corporate portal framework
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow rounded-3xl sm:px-10">
          
          {/* SLIDING ROLE INTERFACE SELECTOR TRACK */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => { setLoginType('owner'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                loginType === 'owner' 
                  ? 'bg-white text-teal-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              💼 Employer / Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('employee'); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                loginType === 'employee' 
                  ? 'bg-white text-teal-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏃 Employee Portal
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-600 rounded-xl animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Registered Corporate Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Account Password" type="password" {...register('password')} error={errors.password?.message} />
            
            <Button type="submit" disabled={loading} className="mt-6 w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition-all shadow-md">
              {loading ? 'Validating Token Handshake...' : 'Verify & Launch Workspace'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 font-medium">
            New organization setup? <Link href="/register" className="text-teal-700 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}