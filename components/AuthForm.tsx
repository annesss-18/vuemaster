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
import { useRouter } from "next/navigation"
import { auth } from "@/firebase/client"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { signIn, signUp } from "@/lib/actions/auth.action"
import { logger } from "@/lib/logger"
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

const authFormSchema = (type: "sign-in" | "sign-up") => z.object({
  name: type === 'sign-up' ? z.string().min(3, 'Name must be at least 3 characters') : z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const AuthForm = ({ type }: { type: "sign-in" | "sign-up" }) => {
  const router = useRouter();
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
        router.push('/');
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      
      // Parse Firebase authentication errors
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error instanceof Error) {
        const errorCode = (error as any).code;
        
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
                href={isSignIn ? "/sign-up" : "/sign-in"}
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

export default AuthForm