// components/InterviewCard.tsx
import dayjs from 'dayjs';
import React from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import DisplayTechIcons from './DisplayTechIcons';
import CompanyLogo from './CompanyLogo';
import { Calendar, Star, ArrowRight, TrendingUp } from 'lucide-react';

// Define Interface for Feedback if not imported
interface FeedbackData {
    createdAt?: string | Date;
    totalScore: number;
    finalAssessment?: string;
}

interface InterviewCardProps {
    id: string;
    userId: string;
    role: string;
    type: string;
    techstack: string[];
    createdAt: Date;
    companyName?: string;
    isSession?: boolean;
    feedback?: FeedbackData | null;
}

const InterviewCard = ({ id, role, type, techstack, createdAt, companyName, isSession, feedback }: InterviewCardProps) => {
    // Removed async data fetching from here. Data is now passed via props.

    const normalisedType = /mix/gi.test(type) ? "Mixed" : type;
    const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY');
    const hasScore = feedback?.totalScore !== undefined;

    const scoreColor =
        !hasScore ? 'text-light-400' :
            feedback!.totalScore >= 80 ? 'text-success-100' :
                feedback!.totalScore >= 60 ? 'text-warning-200' :
                    'text-destructive-100';

    const linkHref = feedback
        ? `/interview/session/${id}/feedback`
        : isSession
            ? `/interview/session/${id}`
            : `/interview/template/${id}`;

    const buttonText = feedback ? "View Feedback" : isSession ? "Continue Interview" : "Start Interview";

    return (
        <div className="card-border w-[380px] max-sm:w-full min-h-[450px] animate-fadeIn">
            <div className="card-interview">
                <div className="absolute top-0 right-0 w-fit">
                    <div className="badge-text !rounded-tl-none !rounded-br-3xl backdrop-blur-md">
                        {normalisedType}
                    </div>
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-300/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CompanyLogo
                            companyName={companyName || 'Unknown Company'}
                            size={100}
                            className="relative rounded-full size-[100px] ring-4 ring-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-400/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="capitalize bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent font-bold">
                            {role} Interview
                        </h3>

                        <div className="flex flex-row items-center gap-4 text-sm">
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                                <Calendar className="size-4 text-primary-300" />
                                <span className="text-light-200 font-medium">{formattedDate}</span>
                            </div>

                            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm ${scoreColor}`}>
                                {hasScore && feedback ? (
                                    <>
                                        <Star className="size-4 fill-current" />
                                        <span className="font-bold">{feedback.totalScore}</span>
                                        <span className="text-light-400 font-medium">/100</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="size-4" />
                                        <span className="font-medium">--</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1">
                    <p className="line-clamp-3 text-light-200 leading-relaxed">
                        {feedback
                            ? feedback.finalAssessment
                            : "Ready to showcase your skills? Complete this interview to receive detailed feedback and improve your performance."
                        }
                    </p>
                </div>

                <div className="relative z-10 flex flex-row justify-between items-center pt-4 border-t border-primary-400/10">
                    <div className="flex-1">
                        <DisplayTechIcons techStack={techstack} />
                    </div>

                    <Button className="btn-primary group !px-6 !py-3.5 !min-h-[48px]">
                        <Link href={linkHref} className="flex items-center gap-3">
                            <span>{buttonText}</span>
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default InterviewCard;