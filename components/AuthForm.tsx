"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/firebase/client"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { signIn, signUp, googleAuthenticate } from "@/lib/actions/auth.action"
import { logger } from "@/lib/logger"
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState, Suspense } from "react"

const authFormSchema = (type: "sign-in" | "sign-up") => z.object({
  name: type === 'sign-up' ? z.string().min(3, 'Name must be at least 3 characters') : z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const AuthFormContent = ({ type }: { type: "sign-in" | "sign-up" }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);
  const formSchema = authFormSchema(type);
  const isSignIn = type === "sign-in";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      if (type === "sign-up") {
        const { name, email, password } = values;
        const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email
        });
        if (!result?.success) {
          toast.error(result?.message);
          return;
        }
        toast.success("Account created successfully!");
        router.push('/sign-in');
      } else {
        const { email, password } = values;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Sign in failed");
          return;
        }
        await signIn({ email, idToken });
        toast.success("Signed in successfully!");
        router.push(returnUrl);
      }
    } catch (error) {
      logger.error('Authentication error:', error);

      // Parse Firebase authentication errors
      let errorMessage = 'Authentication failed. Please try again.';

      if (error instanceof Error) {
        const errorCode = (error as { code?: string }).code;

        // Handle specific Firebase error codes
        switch (errorCode) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please sign in instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address. Please check and try again.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please sign up first.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password sign-in is not enabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
          default:
            // Use the error message from Firebase if available
            if (error.message) {
              // Clean up Firebase error messages (remove "Firebase: " prefix)
              errorMessage = error.message.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\s*\.?$/, '');
            }
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      if (!userCredential.user) {
        throw new Error('No user data returned from Google');
      }

      const idToken = await userCredential.user.getIdToken();
      const { uid, email, displayName } = userCredential.user;

      const result = await googleAuthenticate({
        uid,
        email: email || "",
        name: displayName || "Google User",
        idToken
      });

      if (result?.success) {
        toast.success("Signed in successfully!");
        router.push(returnUrl);
      } else {
        toast.error(result?.message || "Google Sign In failed");
      }
    } catch (error) {
      logger.error("Google Sign In Error", error);
      toast.error("Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6 bg-dark-100">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Header Section */}
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md">
            <Sparkles className="size-4 text-primary-300 animate-pulse" />
            <span className="text-sm font-semibold text-primary-200">AI-Powered Interview Practice</span>
          </div>

          <h1 className="text-4xl font-bold text-white">
            {isSignIn ? 'Welcome Back' : 'Get Started'}
          </h1>

          <p className="text-light-300">
            {isSignIn
              ? 'Sign in to continue your interview preparation journey'
              : 'Create your account and start practicing with AI'
            }
          </p>
        </div>

        {/* Auth Card */}
        <div className="card-border">
          <div className="card !p-8 space-y-8">
            {/* Logo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative size-16 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl">
                  <Image src="/logo.svg" alt="logo" height={32} width={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                vuemaster
              </h2>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {!isSignIn && (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="!text-light-200 !font-semibold flex items-center gap-2">
                          <User className="size-4 text-primary-300" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-light-400 pointer-events-none z-10" />
                            <Input
                              placeholder="John Doe"
                              type="text"
                              autoComplete="name"
                              {...field}
                              className="pl-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl transition-all duration-300 h-14 backdrop-blur-sm text-light-100 focus:border-primary-300 hover:border-primary-400/40"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-light-200 !font-semibold flex items-center gap-2">
                        <Mail className="size-4 text-primary-300" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-light-400 pointer-events-none z-10" />
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            autoComplete="email"
                            {...field}
                            className="pl-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl transition-all duration-300 h-14 backdrop-blur-sm text-light-100 focus:border-primary-300 hover:border-primary-400/40"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-light-200 !font-semibold flex items-center gap-2">
                        <Lock className="size-4 text-primary-300" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-light-400 pointer-events-none z-10" />
                          <Input
                            placeholder="••••••••"
                            type="password"
                            autoComplete={isSignIn ? "current-password" : "new-password"}
                            {...field}
                            className="pl-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl transition-all duration-300 h-14 backdrop-blur-sm text-light-100 focus:border-primary-300 hover:border-primary-400/40"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  className="w-full min-h-14 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold transition-all duration-300 hover:shadow-glow hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <span>{isSignIn ? 'Signing In...' : 'Creating Account...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{isSignIn ? "Sign In" : "Create Account"}</span>
                      <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-primary-400/20" />
                <span className="text-xs text-light-400 font-medium">OR</span>
                <div className="h-px flex-1 bg-primary-400/20" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                className="w-full min-h-14 rounded-2xl border border-gray-300 font-bold transition-all duration-300 hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span style={{ color: '#1f2937' }}>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary-400/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dark-50 px-4 text-light-400 font-semibold">
                  {isSignIn ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>

            {/* Switch Auth Type */}
            <div className="text-center">
              <Link
                href={isSignIn ? `/sign-up?returnUrl=${encodeURIComponent(returnUrl)}` : `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-dark-200/60 border border-primary-400/30 hover:border-primary-400/50 hover:bg-dark-200 transition-all duration-300 font-semibold text-primary-200 group"
              >
                <span>{isSignIn ? "Create New Account" : "Sign In Instead"}</span>
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-light-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
const AuthForm = ({ type }: { type: "sign-in" | "sign-up" }) => {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center bg-dark-100">
        <Loader2 className="size-8 animate-spin text-primary-300" />
      </div>
    }>
      <AuthFormContent type={type} />
    </Suspense>
  );
}

export default AuthForm