"use server";
import { feedbackSchema } from "@/constants";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { generateObject } from "ai";
import { logger } from "../logger";
import { Query } from 'firebase-admin/firestore';
import { CreateFeedbackParams, Feedback, GetFeedbackByInterviewIdParams, GetLatestInterviewsParams, Interview, InterviewTemplate, SessionCardData, TemplateCardData } from "@/types";
import { FieldPath } from 'firebase-admin/firestore';

/**
 * In-memory template cache for reducing Firestore reads.
 * 
 * ⚠️ PRODUCTION NOTE: This in-memory cache does NOT work across multiple 
 * serverless instances. For production deployments with horizontal scaling,
 * consider using:
 * 
 * 1. Redis/Upstash:
 *    import { Redis } from "@upstash/redis";
 *    const redis = Redis.fromEnv();
 *    await redis.set(`template:${id}`, JSON.stringify(template), { ex: 300 });
 *    const cached = await redis.get(`template:${id}`);
 * 
 * 2. Next.js unstable_cache (for static/SSR data):
 *    import { unstable_cache } from 'next/cache';
 *    const getTemplateById = unstable_cache(
 *      async (id) => { ... },
 *      ['template'],
 *      { revalidate: 300 }
 *    );
 */
const templateCache = new Map<string, { data: InterviewTemplate; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
    try {
        // Fetch all sessions for user
        const sessionsSnapshot = await db
            .collection('interview_sessions')
            .where('userId', '==', userId)
            .orderBy('startedAt', 'desc')
            .get();

        if (sessionsSnapshot.empty) {
            return [];
        }

        // Fetch all referenced templates
        const templateIds = new Set<string>();
        sessionsSnapshot.docs.forEach(doc => {
            const templateId = doc.data().templateId;
            if (templateId) templateIds.add(templateId);
        });

        const templatePromises = Array.from(templateIds).map(id =>
            db.collection('interview_templates').doc(id).get()
        );

        const templateDocs = await Promise.all(templatePromises);

        const templateMap = new Map<string, FirebaseFirestore.DocumentData>();
        templateDocs.forEach(doc => {
            if (doc.exists) {
                templateMap.set(doc.id, doc.data()!);
            }
        });

        const interviews: Interview[] = [];

        for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionData = sessionDoc.data();
            const templateData = templateMap.get(sessionData.templateId);

            if (templateData) {
                interviews.push({
                    id: sessionDoc.id,
                    userId: sessionData.userId,
                    createdAt: sessionData.startedAt,
                    status: sessionData.status,
                    resumeText: sessionData.resumeText,
                    role: templateData.role,
                    level: templateData.level,
                    questions: templateData.baseQuestions || [],
                    techstack: templateData.techStack || [],
                    jobDescription: templateData.jobDescription || '',
                    companyName: templateData.companyName,
                    type: templateData.type,
                    finalized: sessionData.status === 'completed',
                } as Interview);
            }
        }

        return interviews;

    } catch (error) {
        logger.error('Error fetching user sessions:', error);
        return null;
    }
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<InterviewTemplate[] | null> {
    const { limit = 20 } = params; // userId param is not strictly needed for public fetch

    try {
        const templatesSnapshot = await db
            .collection('interview_templates')
            .where('isPublic', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        if (templatesSnapshot.empty) {
            return [];
        }

        // Return raw templates, not mapped "Interview" objects, for better type safety in the UI
        return templatesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as InterviewTemplate[];

    } catch (error) {
        logger.error('Error fetching public templates:', error);
        return null;
    }
}

export async function getInterviewsById(
    id: string,
    userId?: string
): Promise<Interview | null> {
    return await getSessionById(id, userId);
}

export async function getFeedbackByInterviewId(params: GetFeedbackByInterviewIdParams): Promise<Feedback | null> {
    const { interviewId, userId } = params;

    const feedback = await db.collection('feedback')
        .where('interviewId', '==', interviewId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

    if (feedback.empty) { return null; }

    const feedbackDoc = feedback.docs[0]!;
    return {
        ...feedbackDoc.data(),
        id: feedbackDoc.id
    } as Feedback;

}

export async function getPublicTemplates(limit: number = 20): Promise<TemplateCardData[]> {
    try {
        const snapshot = await db
            .collection('interview_templates')
            .where('isPublic', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                role: data.role,
                companyName: data.companyName || 'Unknown Company',
                companyLogoUrl: data.companyLogoUrl,
                level: data.level,
                type: data.type,
                techStack: data.techStack || [],
                usageCount: data.usageCount || 0,
                avgScore: data.avgScore || 0,
                createdAt: data.createdAt,
                isOwnedByUser: false, // Public templates
            } as TemplateCardData;
        });
    } catch (error) {
        logger.error('Error fetching public templates:', error);
        return [];
    }
}

export async function getUserTemplates(userId: string): Promise<TemplateCardData[]> {
    try {
        const snapshot = await db
            .collection('interview_templates')
            .where('creatorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                role: data.role,
                companyName: data.companyName || 'Unknown Company',
                companyLogoUrl: data.companyLogoUrl,
                level: data.level,
                type: data.type,
                techStack: data.techStack || [],
                usageCount: data.usageCount || 0,
                avgScore: data.avgScore || 0,
                createdAt: data.createdAt,
                isOwnedByUser: true, // ✅ User owns these
            } as TemplateCardData;
        });
    } catch (error) {
        logger.error('Error fetching user templates:', error);
        return [];
    }
}

export async function getUserSessions(userId: string): Promise<SessionCardData[]> {
    try {
        const sessionsSnapshot = await db
            .collection('interview_sessions')
            .where('userId', '==', userId)
            .orderBy('startedAt', 'desc')
            .get();

        if (sessionsSnapshot.empty) {
            return [];
        }

        // Collect unique template IDs
        const templateIds = new Set<string>();
        sessionsSnapshot.docs.forEach(doc => {
            const templateId = doc.data().templateId;
            if (templateId) templateIds.add(templateId);
        });

        if (templateIds.size === 0) {
            return [];
        }

        // Fetch templates in batches (Firestore 'in' supports up to 10 items)
        const templateMap = new Map<string, FirebaseFirestore.DocumentData>();
        const templateIdArray = Array.from(templateIds);

        // Process in batches of 10
        for (let i = 0; i < templateIdArray.length; i += 10) {
            const batch = templateIdArray.slice(i, i + 10);

            const templateDocs = await db
                .collection('interview_templates')
                .where(FieldPath.documentId(), 'in', batch)
                .get();

            templateDocs.docs.forEach(doc => {
                if (doc.exists) {
                    templateMap.set(doc.id, doc.data());
                }
            });
        }

        // Map sessions to view model
        const sessions: SessionCardData[] = [];

        for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionData = sessionDoc.data();
            const templateData = templateMap.get(sessionData.templateId);

            if (!templateData) {
                logger.warn(`Template ${sessionData.templateId} not found for session ${sessionDoc.id}`);
                continue;
            }

            sessions.push({
                id: sessionDoc.id,
                // From template
                role: templateData.role,
                companyName: templateData.companyName || 'Unknown Company',
                companyLogoUrl: templateData.companyLogoUrl,
                level: templateData.level,
                type: templateData.type,
                techStack: templateData.techStack || [],
                // From session
                status: sessionData.status,
                startedAt: sessionData.startedAt,
                completedAt: sessionData.completedAt,
                finalScore: sessionData.finalScore,
                hasResume: !!sessionData.resumeText,
            });
        }

        return sessions;

    } catch (error) {
        logger.error('Error fetching user sessions:', error);
        return [];
    }
}

export async function getSessionById(
    sessionId: string,
    userId?: string
): Promise<Interview | null> {
    try {
        const sessionDoc = await db.collection('interview_sessions').doc(sessionId).get();

        if (!sessionDoc.exists) {
            logger.warn(`Session ${sessionId} not found`);
            return null;
        }

        const sessionData = sessionDoc.data();
        if (!sessionData) return null;

        // Verify ownership if userId provided
        if (userId && sessionData.userId !== userId) {
            logger.warn(`Unauthorized access attempt to session ${sessionId} by user ${userId}`);
            return null;
        }

        // Fetch template (single query, not in loop)
        const templateDoc = await db
            .collection('interview_templates')
            .doc(sessionData.templateId)
            .get();

        if (!templateDoc.exists) {
            logger.error(`Template ${sessionData.templateId} not found for session ${sessionId}`);
            return null;
        }

        const templateData = templateDoc.data();
        if (!templateData) return null;

        // Map to Interview view model
        return {
            id: sessionId,
            userId: sessionData.userId,
            createdAt: sessionData.startedAt,
            status: sessionData.status,
            resumeText: sessionData.resumeText,

            // From template
            role: templateData.role,
            companyName: templateData.companyName || 'Unknown Company',
            companyLogoUrl: templateData.companyLogoUrl,
            level: templateData.level,
            questions: templateData.baseQuestions || [],
            techstack: templateData.techStack || [],
            jobDescription: templateData.jobDescription || '',
            type: templateData.type,
            finalized: sessionData.status === 'completed',
        } as Interview;

    } catch (error) {
        logger.error(`Error fetching session ${sessionId}:`, error);
        return null;
    }
}

export async function getSessionsWithFeedback(userId: string): Promise<SessionCardData[]> {
    try {
        const sessions = await getUserSessions(userId);

        // Filter completed sessions
        const completedSessionIds = sessions
            .filter(s => s.status === 'completed')
            .map(s => s.id);

        if (completedSessionIds.length === 0) {
            return sessions;
        }

        // Fetch feedback in batches (Firestore 'in' supports up to 10 items)
        const feedbackMap = new Map<string, number>();

        for (let i = 0; i < completedSessionIds.length; i += 10) {
            const batch = completedSessionIds.slice(i, i + 10);

            const feedbackDocs = await db
                .collection('feedback')
                .where('interviewId', 'in', batch)
                .where('userId', '==', userId)
                .get();

            feedbackDocs.docs.forEach(doc => {
                const data = doc.data();
                feedbackMap.set(data.interviewId, data.totalScore);
            });
        }

        // Merge feedback scores into sessions
        return sessions.map(session => ({
            ...session,
            finalScore: feedbackMap.get(session.id) || session.finalScore,
        }));

    } catch (error) {
        logger.error('Error fetching sessions with feedback:', error);
        return [];
    }
}

export async function getTemplateById(templateId: string): Promise<InterviewTemplate | null> {
    try {
        // Check cache first
        const cached = templateCache.get(templateId);
        if (cached && cached.expires > Date.now()) {
            logger.info(`Cache hit for template ${templateId}`);
            return cached.data;
        }

        // Fetch from Firestore
        const doc = await db.collection('interview_templates').doc(templateId).get();

        if (!doc.exists) {
            return null;
        }

        const template = {
            id: doc.id,
            ...doc.data()
        } as InterviewTemplate;

        // Update cache
        templateCache.set(templateId, {
            data: template,
            expires: Date.now() + CACHE_TTL,
        });

        return template;
    } catch (error) {
        logger.error('Error fetching template:', error);
        return null;
    }
}

export async function clearTemplateCache(templateId?: string): Promise<void> {
    if (templateId) {
        templateCache.delete(templateId);
    } else {
        templateCache.clear();
    }
}

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript } = params;

    try {
        const formattedTranscript = transcript
            .map((sentence: { role: string; content: string }) =>
                `-${sentence.role}: ${sentence.content}`
            )
            .join('\n');

        logger.info(`Generating feedback for interview ${interviewId}...`);

        const genResult = await generateObject({
            model: google('gemini-3-pro-preview'),
            schema: feedbackSchema,
            prompt: `
You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.

Transcript:
${formattedTranscript}

Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
- **Communication Skills**: Clarity, articulation, structured responses.
- **Technical Knowledge**: Understanding of key concepts for the role.
- **Problem-Solving**: Ability to analyze problems and propose solutions.
- **Cultural & Role Fit**: Alignment with company values and job role.
- **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
            `,
            system: "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
        });

        // Validate AI output with Zod
        const validationResult = feedbackSchema.safeParse(genResult.object);

        if (!validationResult.success) {
            logger.error('AI generated invalid feedback structure:', validationResult.error);

            // ✅ FIXED: Use .issues instead of .errors
            validationResult.error.issues.forEach((err) => {
                logger.error(`Validation error at ${err.path.join('.')}: ${err.message}`);
            });

            throw new Error('AI generated feedback in invalid format. Please try again.');
        }

        const validatedFeedback = validationResult.data;

        // Extract category scores safely from validated data
        const categoryScoresArray = [
            {
                name: 'Communication Skills',
                score: validatedFeedback.categoryScores.communicationSkills.score,
                comment: validatedFeedback.categoryScores.communicationSkills.comment,
            },
            {
                name: 'Technical Knowledge',
                score: validatedFeedback.categoryScores.technicalKnowledge.score,
                comment: validatedFeedback.categoryScores.technicalKnowledge.comment,
            },
            {
                name: 'Problem Solving',
                score: validatedFeedback.categoryScores.problemSolving.score,
                comment: validatedFeedback.categoryScores.problemSolving.comment,
            },
            {
                name: 'Cultural Fit',
                score: validatedFeedback.categoryScores.culturalFit.score,
                comment: validatedFeedback.categoryScores.culturalFit.comment,
            },
            {
                name: 'Confidence and Clarity',
                score: validatedFeedback.categoryScores.confidenceAndClarity.score,
                comment: validatedFeedback.categoryScores.confidenceAndClarity.comment,
            },
        ];

        // Store feedback in Firestore
        const feedbackDoc = await db.collection('feedback').add({
            interviewId,
            userId,
            totalScore: validatedFeedback.totalScore,
            categoryScores: validatedFeedback.categoryScores,
            categoryScoresArray,
            strengths: validatedFeedback.strengths,
            areasForImprovement: validatedFeedback.areasForImprovement,
            finalAssessment: validatedFeedback.finalAssessment,
            createdAt: new Date().toISOString(),
        });

        logger.info(`✅ Feedback created successfully: ${feedbackDoc.id}`);

        return {
            success: true,
            feedbackId: feedbackDoc.id,
        };

    } catch (error) {
        logger.error("Error creating feedback:", error);

        if (error instanceof Error) {
            return {
                success: false,
                message: error.message,
            };
        }

        return {
            success: false,
            message: 'Failed to generate feedback. Please try again.',
        };
    }
}