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

const authFormSchema = (type: "sign-in" | "sign-up") => z.object({
  name: type === 'sign-up' ? z.string().min(3, 'Name must be at least 3 characters') : z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const AuthForm = ({ type }: { type: "sign-in" | "sign-up" }) => {
  const router = useRouter();
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
    try {
      if (type === "sign-up") {
        const { name, email, password } = values;
        const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Authentication failed: ${errorMessage}`);
    }
  }

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={32} />
          <h2 className="text-primary-100">vuemaster</h2>
        </div>
        <h3>Practice job interviews with AI</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-4 form">
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" type="text" {...field} className="input" />
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
                  <FormLabel className="label">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Your email" type="email" {...field} className="input" />
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
                  <FormLabel className="label">Password</FormLabel>
                  <FormControl>
                    <Input placeholder="Your password" type="password" {...field} className="input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="btn" type="submit">{isSignIn ? "Sign In" : "Create Account"}</Button>
          </form>
        </Form>
        <p className="text-center">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}
          <Link href={isSignIn ? "/sign-up" : "/sign-in"} className="font-bold text-user-primary ml-1">
            {isSignIn ? "Sign Up" : "Sign In"}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AuthForm