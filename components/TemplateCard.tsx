// components/TemplateCard.tsx
import React from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Button } from './ui/button';
import DisplayTechIcons from './DisplayTechIcons';
import CompanyLogo from './CompanyLogo';
import {
    Calendar,
    Users,
    ArrowRight,
    TrendingUp,
    Building2,
    Star
} from 'lucide-react';
import type { TemplateCardData } from '@/types';

interface TemplateCardProps {
    template: TemplateCardData;
    showActions?: boolean; // Show edit/delete for owned templates
}

const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    showActions = false
}) => {
    const formattedDate = dayjs(template.createdAt).format('MMM D, YYYY');


    return (
        <div className="card-border w-full max-w-[380px] min-h-[450px] animate-fadeIn">
            <div className="card-interview">
                {/* Type Badge */}
                <div className="absolute top-0 right-0 w-fit">
                    <div className="badge-text !rounded-tl-none !rounded-br-3xl backdrop-blur-md">
                        {template.type}
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-4">
                    {/* Company Logo */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-300/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CompanyLogo
                            companyName={template.companyName}
                            logoUrl={template.companyLogoUrl}
                            size={100}
                            className="relative rounded-full size-[100px] ring-4 ring-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-400/50 bg-white p-4"
                        />
                    </div>

                    {/* Title & Company */}
                    <div className="space-y-2">
                        <h3 className="capitalize bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent font-bold text-xl">
                            {template.role}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-light-300">
                            <Building2 className="size-4 text-primary-300" />
                            <span className="font-medium">{template.companyName}</span>
                        </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Date */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                            <Calendar className="size-4 text-primary-300" />
                            <span className="text-light-200 font-medium">{formattedDate}</span>
                        </div>

                        {/* Level */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                            <TrendingUp className="size-4 text-accent-300" />
                            <span className="text-light-200 font-medium">{template.level}</span>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm">
                        {/* Usage Count */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-100/10 border border-success-100/30">
                            <Users className="size-4 text-success-100" />
                            <span className="text-success-100 font-semibold">
                                {template.usageCount} {template.usageCount === 1 ? 'use' : 'uses'}
                            </span>
                        </div>

                        {/* Average Score (if available) */}
                        {template.avgScore > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-200/10 border border-warning-200/30">
                                <Star className="size-4 text-warning-200 fill-current" />
                                <span className="text-warning-200 font-semibold">
                                    {template.avgScore.toFixed(0)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description Placeholder */}
                <div className="relative z-10 flex-1">
                    <p className="text-sm text-light-300 leading-relaxed line-clamp-3">
                        Practice {template.type.toLowerCase()} interview for {template.role} position
                        at {template.companyName}. Focus areas include {template.techStack.slice(0, 3).join(', ')}
                        {template.techStack.length > 3 && ` and ${template.techStack.length - 3} more`}.
                    </p>
                </div>

                {/* Footer Actions */}
                <div className="relative z-10 flex flex-row justify-between items-center pt-4 border-t border-primary-400/10">
                    {/* Tech Stack */}
                    <div className="flex-1">
                        <DisplayTechIcons techStack={template.techStack} />
                    </div>

                    {/* Action Button */}
                    <Link href={`/interview/template/${template.id}`}>
                        <Button className="btn-primary group !px-6 !py-3.5 !min-h-[48px]">
                            <span>Start Interview</span>
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TemplateCard;