'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/client'
import Link from 'next/link'
import { LogIn, PlayCircle, Loader2 } from 'lucide-react'

interface AuthAwareStartButtonProps {
    templateId: string
}

export default function AuthAwareStartButton({ templateId }: AuthAwareStartButtonProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user)
        })
        return () => unsubscribe()
    }, [])

    const returnUrl = encodeURIComponent(`/interview/template/${templateId}`)

    // Loading state
    if (isAuthenticated === null) {
        return (
            <div className="w-full flex items-center justify-center gap-2 bg-primary-500/50 text-white font-bold py-3 px-4 rounded-lg">
                <Loader2 className="size-5 animate-spin" />
                Loading...
            </div>
        )
    }

    // Authenticated: Go directly to protected template page
    if (isAuthenticated) {
        return (
            <>
                <Link
                    href={`/interview/template/${templateId}`}
                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    <PlayCircle className="size-5" />
                    Start Interview
                </Link>
                <p className="text-xs text-light-400 text-center">
                    You&apos;re signed in and ready to practice!
                </p>
            </>
        )
    }

    // Not authenticated: Show sign-in prompt
    return (
        <>
            <p className="text-sm text-light-300">
                Sign in to start your AI-powered mock interview session.
            </p>
            <Link
                href={`/sign-in?returnUrl=${returnUrl}`}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                <LogIn className="size-5" />
                Sign In to Start
            </Link>
            <p className="text-xs text-light-400 text-center">
                Don&apos;t have an account?{' '}
                <Link href={`/sign-up?returnUrl=${returnUrl}`} className="text-primary-300 hover:text-primary-200">
                    Sign up free
                </Link>
            </p>
        </>
    )
}
