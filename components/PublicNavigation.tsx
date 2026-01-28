'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, LogIn, UserPlus, LogOut, LayoutDashboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function PublicNavigation() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user)
        })
        return () => unsubscribe()
    }, [])

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            await fetch('/api/auth/signout', { method: 'POST' })
            router.push('/')
            toast.success('Signed out successfully')
        } catch (error) {
            console.error('Sign out error:', error)
            toast.error('Failed to sign out')
        }
    }

    return (
        <nav className="sticky top-0 z-50 mb-12">
            <div className="card-border rounded-2xl animate-slideInLeft">
                <div className="card rounded-2xl p-4 backdrop-blur-xl bg-dark-50/95">
                    <div className="flex items-center justify-between">
                        {/* Logo Section */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative size-12 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Image
                                        src="/logo.svg"
                                        alt="VueMaster Logo"
                                        width={24}
                                        height={24}
                                        className="relative z-10"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                                    vuemaster
                                </h2>
                                <div className="px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-400/30">
                                    <span className="text-[10px] font-bold text-primary-300">AI</span>
                                </div>
                            </div>
                        </Link>

                        {/* Navigation Items */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/explore"
                                className="text-sm font-medium text-light-300 hover:text-primary-300 transition-colors px-4"
                            >
                                Explore
                            </Link>

                            {/* Show loading state briefly, then auth-appropriate buttons */}
                            {isAuthenticated === null ? (
                                // Loading state - show nothing or a placeholder
                                <div className="w-24 h-10" />
                            ) : isAuthenticated ? (
                                // Authenticated: Show Dashboard & Sign Out
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-500/20 border border-primary-400/30 hover:bg-primary-500/30 hover:border-primary-400/50 transition-all duration-300 group"
                                    >
                                        <LayoutDashboard className="size-4 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                                        <span className="text-sm font-semibold text-primary-200">
                                            Dashboard
                                        </span>
                                    </Link>

                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark-200/60 border border-light-400/20 hover:border-destructive-100/50 hover:bg-destructive-100/10 transition-all duration-300 group"
                                    >
                                        <LogOut className="size-4 text-light-400 group-hover:text-destructive-100 transition-colors duration-300" />
                                        <span className="text-sm font-semibold text-light-300 group-hover:text-destructive-100 transition-colors duration-300 max-sm:hidden">
                                            Sign Out
                                        </span>
                                    </button>
                                </>
                            ) : (
                                // Not authenticated: Show Sign In & Sign Up
                                <>
                                    <Link
                                        href="/sign-in"
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark-200/60 border border-light-400/20 hover:border-primary-400/50 hover:bg-primary-500/10 transition-all duration-300 group"
                                    >
                                        <LogIn className="size-4 text-light-400 group-hover:text-primary-300 transition-colors duration-300" />
                                        <span className="text-sm font-semibold text-light-300 group-hover:text-primary-200 transition-colors duration-300">
                                            Sign In
                                        </span>
                                    </Link>

                                    <Link
                                        href="/sign-up"
                                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-500/20 border border-primary-400/30 hover:bg-primary-500/30 hover:border-primary-400/50 transition-all duration-300 group"
                                    >
                                        <UserPlus className="size-4 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                                        <span className="text-sm font-semibold text-primary-200">
                                            Sign Up
                                        </span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}

