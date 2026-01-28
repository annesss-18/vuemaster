'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { auth } from '@/firebase/client'
import { signOut } from 'firebase/auth'
import { toast } from 'sonner'

export default function Navigation() {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      // Sign out from Firebase Client
      await signOut(auth)

      // Call server to clear session cookie
      await fetch('/api/auth/signout', { method: 'POST' })

      // Redirect to sign-in
      router.push('/sign-in')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  return (
    <nav className="sticky top-0 z-50 mb-12">
      <div className="card-border rounded-2xl animate-slideInLeft">
        <div className="card rounded-2xl p-4 backdrop-blur-xl bg-dark-50/95">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative size-12 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src="/icon.png"
                    alt="IntervoxAI Logo"
                    width={24}
                    height={24}
                    className="relative z-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                  IntervoxAI
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
              <Link
                href="/create"
                className="hidden sm:flex items-center gap-3 px-6 py-3 min-h-[48px] rounded-full bg-primary-500/10 border border-primary-400/30 hover:bg-primary-500/20 hover:border-primary-400/50 transition-all duration-300 group"
              >
                <Sparkles className="size-4 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm font-semibold text-primary-200">New Interview</span>
              </Link>

              <button
                className="flex items-center gap-3 px-6 py-3 min-h-[48px] rounded-full bg-dark-200/60 border border-light-400/20 hover:border-destructive-100/50 hover:bg-destructive-100/10 transition-all duration-300 group"
                onClick={handleSignOut}
              >
                <LogOut className="size-4 text-light-400 group-hover:text-destructive-100 transition-colors duration-300" />
                <span className="text-sm font-semibold text-light-300 group-hover:text-destructive-100 transition-colors duration-300 max-sm:hidden">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}