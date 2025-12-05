import dayjs from 'dayjs';
import Image from 'next/image';
import React from 'react';
import { getRandomInterviewCover } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './ui/button';
import DisplayTechIcons from './DisplayTechIcons';
import { getFeedbackByInterviewId } from '@/lib/actions/general.action';

const InterviewCard = async ({ id, userId, role, type, techstack, createdAt }: InterviewCardProps) => {
    const feedback = userId && id ? await getFeedbackByInterviewId({ interviewId: id, userId }) : null;
    const normalisedType = /mix/gi.test(type) ? "Mixed" : type;
    const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY');

    return (
        <div className="card-border w-[360px] max-sm:w-full min-h-96">
            <div className="card-interview">
                <div>
                    <div className="absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg bg-light-400">
                        <p className="badge-text">{normalisedType}</p>
                    </div>
                    <Image src = {getRandomInterviewCover()} alt="cover" width={90} height={90} className="rounded-full object-fit size-[90px]"/>
                    <h3 className="mt-5 capitalize">{role} Interview</h3>
                    <div className="flex flex-row gap-5 mt-3">
                        <div className="flex flex-row gap-2">
                            <Image src="/calendar.svg" alt="calendar" width={20} height={20}/>
                            <p className="text-sm text-gray-500">{formattedDate}</p>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                            <Image src="/star.svg" alt="star" width={20} height={20}/>
                            <p>{feedback?.totalScore || '--'}/100</p>
                        </div>
                    </div>
                    <p className="line-clamp-2 mt-5">
                        {feedback ? feedback.finalAssessment : "No feedback available yet. Complete the interview to improve your skills."}
                    </p>
                </div>
                <div className="flex flex-row justify-between">
                    <DisplayTechIcons techStack={techstack} />
                    <Button className ="btn-primary">
                        <Link href={feedback ? `/interview/${id}/feedback` : `/interview/${id}`}>
                            {feedback ? "View Feedback" : "Take Interview"}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default InterviewCard