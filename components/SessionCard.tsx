// components/SessionCard.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dayjs from 'dayjs';
import { Button } from './ui/button';
import DisplayTechIcons from './DisplayTechIcons';
import { getCompanyLogoOrDefault } from '@/lib/company-utils';
import {
    Calendar,
    ArrowRight,
    TrendingUp,
    Building2,
    Star,
    CheckCircle2,
    Clock,
    FileText,
    Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionCardData } from '@/types';

interface SessionCardProps {
    session: SessionCardData;
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
    const formattedStartDate = dayjs(session.startedAt).format('MMM D, YYYY');
    const formattedCompletedDate = session.completedAt
        ? dayjs(session.completedAt).format('MMM D, YYYY')
        : null;

    const logoUrl = session.companyLogoUrl || getCompanyLogoOrDefault(session.companyName);

    const isCompleted = session.status === 'completed';
    const isInProgress = session.status === 'active';

    // Score color coding
    const getScoreColor = (score?: number) => {
        if (!score) return 'text-light-400';
        if (score >= 80) return 'text-success-100';
        if (score >= 60) return 'text-warning-200';
        return 'text-destructive-100';
    };

    const scoreColor = getScoreColor(session.finalScore);

    // Link destination based on status
    const linkHref = isCompleted
        ? `/interview/session/${session.id}/feedback`
        : `/interview/session/${session.id}`;

    const buttonText = isCompleted
        ? 'View Feedback'
        : isInProgress
            ? 'Continue Interview'
            : 'Start Interview';

    const buttonIcon = isCompleted
        ? <CheckCircle2 className="size-4" />
        : <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />;

    return (
        <div className="card-border w-full max-w-[380px] min-h-[450px] animate-fadeIn">
            <div className="card-interview">
                {/* Status Badge */}
                <div className="absolute top-0 right-0 w-fit">
                    <div className={cn(
                        "badge-text !rounded-tl-none !rounded-br-3xl backdrop-blur-md",
                        isCompleted && "!bg-success-100/20 !border-success-100/30 !text-success-100",
                        isInProgress && "!bg-warning-200/20 !border-warning-200/30 !text-warning-200"
                    )}>{isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Setup'}
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-4">
                    {/* Company Logo */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-300/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Image
                            src={logoUrl}
                            alt={`${session.companyName} logo`}
                            width={100}
                            height={100}
                            className="relative rounded-full object-cover size-[100px] ring-4 ring-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-400/50 bg-white p-4"
                            unoptimized
                        />
                    </div>

                    {/* Title & Company */}
                    <div className="space-y-2">
                        <h3 className="capitalize bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent font-bold text-xl">
                            {session.role}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-light-300">
                            <Building2 className="size-4 text-primary-300" />
                            <span className="font-medium">{session.companyName}</span>
                        </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Date */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                            <Calendar className="size-4 text-primary-300" />
                            <span className="text-light-200 font-medium">
                                {isCompleted && formattedCompletedDate ? formattedCompletedDate : formattedStartDate}
                            </span>
                        </div>

                        {/* Score (if completed) */}
                        {isCompleted && (
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm",
                                scoreColor
                            )}>
                                <Star className="size-4 fill-current" />
                                <span className="font-bold">
                                    {session.finalScore ?? '--'}
                                </span>
                                <span className="text-light-400 font-medium">/100</span>
                            </div>
                        )}
                    </div>

                    {/* Info Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Level */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                            <TrendingUp className="size-4 text-accent-300" />
                            <span className="text-light-200 font-medium">{session.level}</span>
                        </div>

                        {/* Resume Indicator */}
                        {session.hasResume && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-info-100/10 border border-info-100/30">
                                <FileText className="size-4 text-info-100" />
                                <span className="text-info-100 font-medium text-xs">Resume Added</span>
                            </div>
                        )}

                        {/* In Progress Indicator */}
                        {isInProgress && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-200/10 border border-warning-200/30 animate-pulse">
                                <Clock className="size-4 text-warning-200" />
                                <span className="text-warning-200 font-medium text-xs">Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="relative z-10 flex-1">
                    <p className="text-sm text-light-200 leading-relaxed line-clamp-3">
                        {isCompleted
                            ? `Completed ${session.type.toLowerCase()} interview for ${session.role}. ${session.finalScore
                                ? `Achieved a score of ${session.finalScore}/100. View detailed feedback to see your strengths and areas for improvement.`
                                : 'Feedback is being generated. Check back soon for your detailed performance report.'
                            }`
                            : isInProgress
                                ? `Continue your ${session.type.toLowerCase()} interview. Your progress has been saved, and you can pick up where you left off.`
                                : `Ready to start your ${session.type.toLowerCase()} interview for ${session.role} position. ${session.hasResume
                                    ? 'Your resume has been uploaded and will be used to personalize the questions.'
                                    : 'Consider uploading your resume for a more personalized experience.'
                                }`
                        }
                    </p>
                </div>

                {/* Footer Actions */}
                <div className="relative z-10 flex flex-row justify-between items-center pt-4 border-t border-primary-400/10">
                    {/* Tech Stack */}
                    <div className="flex-1">
                        <DisplayTechIcons techStack={session.techStack} />
                    </div>

                    {/* Action Button */}
                    <Link href={linkHref}>
                        <Button className={cn(
                            "group !px-6 !py-3.5 !min-h-[48px]",
                            isCompleted ? "btn-secondary" : "btn-primary"
                        )}>
                            <span>{buttonText}</span>
                            {buttonIcon}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SessionCard;