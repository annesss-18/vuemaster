// components/DisplayTechIcons.tsx
import React from 'react'
import { cn, getTechLogos } from '@/lib/utils';
import Image from 'next/image';
import type { TechIconProps } from '@/types';

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
    const techIcons = getTechLogos(techStack || []);
    return (
        <div className="flex flex-row">
            {techIcons.slice(0, 3).map(({ tech, url }, index) => (
                <div
                    key={tech}
                    className={cn(
                        "tech-icon-wrapper relative bg-dark-300 rounded-full p-2 flex-center",
                        index >= 1 && "-ml-2"
                    )}
                >
                    <Image src={url} alt={tech} width={50} height={50} className='size-6' unoptimized />
                </div>
            ))}
        </div>
    )
}

export default DisplayTechIcons