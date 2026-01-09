// components/DisplayTechIcons.tsx
import React from 'react'
import { cn } from '@/lib/utils';
import TechIcon from './TechIcon';
import type { TechIconProps } from '@/types';

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
    if (!techStack || !Array.isArray(techStack) || techStack.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-row">
            {techStack.slice(0, 3).map((tech, index) => (
                <div
                    key={tech}
                    className={cn(
                        "tech-icon-wrapper relative bg-dark-300 rounded-full p-2 flex-center",
                        index >= 1 && "-ml-2"
                    )}
                >
                    <TechIcon tech={tech} size={24} className="size-6" showTooltip />
                </div>
            ))}
        </div>
    )
}

export default DisplayTechIcons