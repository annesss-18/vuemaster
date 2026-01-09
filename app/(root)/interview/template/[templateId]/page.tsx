import { getTemplateById } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import CompanyLogo from "@/components/CompanyLogo";
import StartSessionButton from "@/components/StartSessionButton";
import { Briefcase, Clock, Target, ArrowLeft } from "lucide-react";
import Link from "next/link";

const TemplatePage = async ({ params }: { params: Promise<{ templateId: string }> }) => {
    const { templateId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect('/sign-in');
    }

    const template = await getTemplateById(templateId);

    if (!template) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold text-light-100">Template Not Found</h1>
                <Link href="/interview" className="btn-primary">Go Back</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-6 space-y-8 animate-fadeIn">
            <Link href="/interview" className="text-primary-300 hover:text-primary-200 flex items-center gap-2 mb-6 transition-colors">
                <ArrowLeft className="size-4" />
                Back to Dashboard
            </Link>

            {/* Template Header Card */}
            <div className="card-border animate-slideInLeft">
                <div className="card !p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="relative group shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CompanyLogo
                                companyName={template.companyName || 'Unknown Company'}
                                size={80}
                                className="relative rounded-full size-20 ring-4 ring-primary-400/30 shadow-2xl"
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h1 className="text-3xl font-bold text-white">{template.role} Interview</h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-200/60 border border-primary-400/20">
                                    <Briefcase className="size-3 text-primary-300" />
                                    <span className="text-xs font-medium text-light-200 capitalize">{template.level}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-200/60 border border-primary-400/20">
                                    <Target className="size-3 text-accent-300" />
                                    <span className="text-xs font-medium text-light-200 capitalize">{template.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details & Tech Stack */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="card-border animate-slideInUp" style={{ animationDelay: "0.1s" }}>
                        <div className="card !p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-light-100">Job Description</h2>
                            <div className="prose prose-invert max-w-none text-light-300 text-sm leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                                {template.jobDescription}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-border animate-slideInUp" style={{ animationDelay: "0.2s" }}>
                        <div className="card !p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-light-100">Tech Stack</h2>
                            <DisplayTechIcons techStack={template.techStack || []} />
                        </div>
                    </div>

                    <div className="card-border animate-slideInUp" style={{ animationDelay: "0.3s" }}>
                        <div className="card !p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-light-100">Ready?</h2>
                            <p className="text-sm text-light-300">
                                Start your AI-powered mock interview session now. Ensure your microphone is ready.
                            </p>
                            <StartSessionButton templateId={template.id} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TemplatePage;
