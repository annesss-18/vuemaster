// app/(public)/explore/page.tsx
import React from 'react'
import { getPublicTemplates } from '@/lib/actions/general.action'
import PublicTemplateCard from '@/components/PublicTemplateCard'
import { Globe, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const Explore = async () => {
    const publicTemplates = await getPublicTemplates(50);

    return (
        <div className="container-app py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-300/10 border border-accent-300/30 text-accent-300">
                    <Globe className="size-4" />
                    <span className="text-sm font-semibold">Community Library</span>
                </div>
                <h1 className="text-4xl font-bold text-white">Explore Interview Templates</h1>
                <p className="text-light-300">
                    Discover high-quality interview templates created by the community.
                    Select one to start your private practice session.
                </p>
            </div>

            {/* Search (Visual only for now) */}
            <div className="relative max-w-md mx-auto mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-light-400 size-5" />
                <Input
                    placeholder="Search by role or tech stack..."
                    className="pl-12 h-12 bg-dark-200/50 border-primary-400/20 rounded-full"
                />
            </div>

            {/* Grid */}
            {publicTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideInUp">
                    {publicTemplates.map((template) => (
                        <PublicTemplateCard
                            key={template.id}
                            template={template}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 border border-dashed border-light-400/20 rounded-2xl">
                    <p className="text-light-300">No public templates available yet. Be the first to share one!</p>
                </div>
            )}
        </div>
    )
}

export default Explore
