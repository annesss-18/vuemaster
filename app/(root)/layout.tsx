import Link from 'next/link'
import { ReactNode } from 'react'
import Image from 'next/image'
import { is } from 'zod/v4/locales';
import { isAuthenticated } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect('/sign-in');
  }

  return (
    <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Logo" width={30} height={30}></Image>
          <h2 className="text-primary-100 font-bold">vuemaster</h2>
        </Link>
      </nav>
      {children}
    </div>
  )
}

export default RootLayout