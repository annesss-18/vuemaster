// app/(public)/layout.tsx
import React from 'react'
import { ReactNode } from 'react'
import Image from 'next/image'
import PublicNavigation from '@/components/PublicNavigation'

const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="root-layout">
      {/* Public Navigation */}
      <PublicNavigation />

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
                src="/icon.png"
                alt="IntervoxAI"
                width={16}
                height={16}
              />
            </div>
            <span className="text-sm font-semibold text-light-300">
              Powered by AI
            </span>
          </div>
          <p className="text-xs text-light-400">
            © 2026 IntervoxAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
