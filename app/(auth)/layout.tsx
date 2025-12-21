import { isAuthenticated } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';
import {ReactNode} from 'react'

const AuthLayout = async ({ children }: { children : ReactNode }) => {

    const isUserAuthenticated = await isAuthenticated();
  
    if (isUserAuthenticated) {
      redirect('/');
    }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-dark-100">
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout