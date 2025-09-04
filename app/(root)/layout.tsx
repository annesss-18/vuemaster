import Link from 'next/link'
import { ReactNode } from 'react'
import Image from 'next/image'

const RootLayout = ({ children }: { children: ReactNode }) => {
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