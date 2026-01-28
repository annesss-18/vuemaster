// app/(public)/page.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Sparkles,
    ArrowRight,
    Mic,
    Brain,
    Target,
    TrendingUp,
    CheckCircle2,
    Zap,
    Users,
    Star
} from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="space-y-24">
            {/* Hero Section */}
            <section className="container-app text-center space-y-8 pt-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md animate-fadeIn">
                    <Sparkles className="size-4 text-primary-300 animate-pulse" />
                    <span className="text-sm font-semibold text-primary-200">AI-Powered Mock Interviews</span>
                </div>

                {/* Main Heading */}
                <div className="space-y-4 animate-slideInUp">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                        Practice. Speak.
                        <span className="block bg-gradient-to-r from-primary-200 via-accent-300 to-primary-300 bg-clip-text text-transparent">
                            Improve.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-light-300 max-w-2xl mx-auto leading-relaxed">
                        Real interviews. Real feedback. Faster growth. Master your technical interviews with AI-powered mock interviews that adapt to your skill level.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
                    <Link
                        href="/explore"
                        className="btn-primary text-lg px-8 py-4 group"
                    >
                        <span>Explore Interviews</span>
                        <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                        href="/sign-up"
                        className="flex items-center gap-2 px-8 py-4 rounded-full bg-dark-200/60 border border-light-400/20 hover:border-primary-400/50 hover:bg-primary-500/10 transition-all duration-300 text-light-200 font-semibold"
                    >
                        Get Started Free
                    </Link>
                </div>

                {/* Social Proof */}
                <div className="flex items-center justify-center gap-6 pt-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="size-8 rounded-full bg-gradient-to-r from-primary-400 to-accent-300 ring-2 ring-dark-100"
                                />
                            ))}
                        </div>
                        <span className="text-sm text-light-300">
                            <strong className="text-white">1,000+</strong> interviews completed
                        </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="size-4 text-warning-200 fill-current" />
                        ))}
                        <span className="text-sm text-light-300 ml-1">4.9/5 rating</span>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="container-app">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        How It Works
                    </h2>
                    <p className="text-light-300 max-w-xl mx-auto">
                        Get interview-ready in three simple steps
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            step: '01',
                            icon: Target,
                            title: 'Choose Your Interview',
                            description: 'Browse templates for your target role and company. Frontend, Backend, Full-Stack, and more.'
                        },
                        {
                            step: '02',
                            icon: Mic,
                            title: 'Practice with AI',
                            description: 'Have a real conversation with our AI interviewer. Speak naturally and answer technical questions.'
                        },
                        {
                            step: '03',
                            icon: TrendingUp,
                            title: 'Get Instant Feedback',
                            description: 'Receive detailed scoring and actionable tips to improve your responses and confidence.'
                        }
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="card-border animate-slideInUp"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="card !p-8 text-center space-y-4 h-full">
                                <div className="text-5xl font-bold bg-gradient-to-r from-primary-500/30 to-accent-300/30 bg-clip-text text-transparent">
                                    {item.step}
                                </div>
                                <div className="size-16 mx-auto rounded-2xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center">
                                    <item.icon className="size-8 text-primary-300" />
                                </div>
                                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                                <p className="text-light-300 text-sm leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="container-app">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        Why IntervoxAI?
                    </h2>
                    <p className="text-light-300 max-w-xl mx-auto">
                        The most realistic AI interview experience available
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Brain,
                            title: 'Powered by Gemini AI',
                            description: 'Advanced language model understands context and provides intelligent follow-up questions.'
                        },
                        {
                            icon: Mic,
                            title: 'Voice-Based Interviews',
                            description: 'Practice speaking your answers out loud, just like a real interview.'
                        },
                        {
                            icon: Zap,
                            title: 'Real-Time Feedback',
                            description: 'Get instant analysis of your responses with actionable improvement tips.'
                        },
                        {
                            icon: Target,
                            title: 'Role-Specific Questions',
                            description: 'Questions tailored to your target role, company, and tech stack.'
                        },
                        {
                            icon: Users,
                            title: 'Community Templates',
                            description: 'Access interview templates shared by the community for popular tech companies.'
                        },
                        {
                            icon: CheckCircle2,
                            title: 'Track Your Progress',
                            description: 'Review past sessions and watch your scores improve over time.'
                        }
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="group p-6 rounded-2xl bg-dark-200/30 border border-primary-400/10 hover:border-primary-400/30 hover:bg-dark-200/50 transition-all duration-300"
                        >
                            <div className="size-12 rounded-xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon className="size-6 text-primary-300" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-light-300 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container-app">
                <div className="card-border">
                    <div className="card !p-12 text-center space-y-6 bg-gradient-to-r from-primary-500/10 to-accent-300/10">
                        <div className="size-20 mx-auto rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl">
                            <Image
                                src="/icon.png"
                                alt="IntervoxAI"
                                width={40}
                                height={40}
                            />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                            Ready to Ace Your Interview?
                        </h2>
                        <p className="text-light-300 max-w-lg mx-auto">
                            Join thousands of developers who have improved their interview skills with IntervoxAI.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link
                                href="/sign-up"
                                className="btn-primary text-lg px-8 py-4 group"
                            >
                                <span>Start Practicing Free</span>
                                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                            <Link
                                href="/explore"
                                className="text-primary-300 hover:text-primary-200 font-semibold transition-colors"
                            >
                                Browse Templates →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
