import React from 'react'
import Link from 'next/link'
import { ReactNode } from 'react'
import Image from 'next/image'
import { isAuthenticated } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';
import { Sparkles, LogOut } from 'lucide-react';

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect('/sign-in');
  }

  return (
    <div className="root-layout">
      {/* Enhanced Navigation */}
      <nav className="sticky top-0 z-50 mb-12">
        <div className="card-border !rounded-2xl animate-slideInLeft">
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
                
                <div className="flex items-center gap-2">
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
                  href="/interview"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-400/30 hover:bg-primary-500/20 hover:border-primary-400/50 transition-all duration-300 group"
                >
                  <Sparkles className="size-4 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm font-semibold text-primary-200">New Interview</span>
                </Link>
                
                <button 
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-light-400/20 hover:border-destructive-100/50 hover:bg-destructive-100/10 transition-all duration-300 group"
                  onClick={() => {
                    // Add sign out functionality
                    window.location.href = '/sign-in';
                  }}
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

      {/* Main Content */}
      <main className="animate-fadeIn">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-primary-400/10">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="size-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
              <Image 
                src="/logo.svg" 
                alt="VueMaster" 
                width={16} 
                height={16}
              />
            </div>
            <span className="text-sm font-semibold text-light-300">
              Powered by AI
            </span>
          </div>
          <p className="text-xs text-light-400">
            © 2024 VueMaster. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default RootLayout;