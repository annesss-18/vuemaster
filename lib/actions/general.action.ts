"use server";
import { feedbackSchema } from "@/constants";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { generateObject } from "ai";
import { logger } from "../logger";
import { Query } from 'firebase-admin/firestore';
import { CreateFeedbackParams, Feedback, GetFeedbackByInterviewIdParams, GetLatestInterviewsParams, Interview, InterviewTemplate, SessionCardData, TemplateCardData } from "@/types";

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

// lib/actions/general.action.ts
export async function getInterviewsById(
    id: string,
    userId?: string
): Promise<Interview | null> {
    return await getSessionById(id, userId);
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

        if (userId && sessionData.userId !== userId) {
            logger.warn(`Unauthorized access attempt to session ${sessionId} by user ${userId}`);
            return null;
        }

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

        // Map template + session → Interview view model
        return {
            id: sessionId,
            userId: sessionData.userId,
            createdAt: sessionData.startedAt,
            status: sessionData.status,
            resumeText: sessionData.resumeText,

            // From template - include company data
            role: templateData.role,
            companyName: templateData.companyName || 'Unknown Company', // ✅ ADD
            companyLogoUrl: templateData.companyLogoUrl, // ✅ ADD
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

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript } = params;
    try {
        const formattedtranscript = transcript
            .map((sentence: { role: string; content: string }) =>
            (
                `-${sentence.role}: ${sentence.content}`
            )).join('');

        const genResult = await generateObject({
            model: google('gemini-2.5-flash-image'),
            schema: feedbackSchema,
            prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedtranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
            system:
                "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
        })

        // Safely extract and validate AI output, using defaults when needed
        const aiObj = (genResult as unknown as { object?: unknown })?.object as Record<string, unknown> | undefined ?? {};

        const totalScore = typeof aiObj.totalScore === 'number' ? aiObj.totalScore : 0;
        const categoryScores = typeof aiObj.categoryScores === 'object' && aiObj.categoryScores ? aiObj.categoryScores : {};
        const strengths = Array.isArray(aiObj.strengths) ? aiObj.strengths : [];
        const areasForImprovement = Array.isArray(aiObj.areasForImprovement) ? aiObj.areasForImprovement : [];
        const finalAssessment = typeof aiObj.finalAssessment === 'string' ? aiObj.finalAssessment : '';

        const getScore = (path: string[], fallbackScore = 0, fallbackComment = '') => {
            let cur: unknown = categoryScores as unknown;
            try {
                for (const p of path) {
                    if (cur && typeof cur === 'object') {
                        cur = (cur as Record<string, unknown>)[p];
                    } else {
                        cur = undefined;
                        break;
                    }
                }

                const scoreField = cur && typeof (cur as Record<string, unknown>)['score'] === 'number' ? (cur as Record<string, unknown>)['score'] as number : fallbackScore;
                const commentField = cur && typeof (cur as Record<string, unknown>)['comment'] === 'string' ? (cur as Record<string, unknown>)['comment'] as string : fallbackComment;
                return { score: scoreField, comment: commentField };
            } catch {
                return { score: fallbackScore, comment: fallbackComment };
            }
        };

        const categoryScoresArray = [
            { name: 'Communication Skills', ...getScore(['communicationSkills']) },
            { name: 'Technical Knowledge', ...getScore(['technicalKnowledge']) },
            { name: 'Problem Solving', ...getScore(['problemSolving']) },
            { name: 'Cultural Fit', ...getScore(['culturalFit']) },
            { name: 'Confidence and Clarity', ...getScore(['confidenceAndClarity']) },
        ];

        const feedback = await db.collection('feedback').add({
            interviewId,
            userId,
            totalScore,
            // store both forms: object for keyed access, array for ordered display
            categoryScores,
            categoryScoresArray,
            strengths,
            areasForImprovement,
            finalAssessment,
            createdAt: new Date().toISOString(),
        });
        return {
            success: true,
            feedbackId: feedback.id
        }
    }
    catch (error) {
        logger.error("Error creating feedback:", error);
        return {
            success: false
        }
    }
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

// lib/actions/general.action.ts

/**
 * Fetches templates with proper typing
 */
export async function getTemplateById(templateId: string): Promise<InterviewTemplate | null> {
    try {
        const doc = await db.collection('interview_templates').doc(templateId).get();

        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        } as InterviewTemplate;
    } catch (error) {
        logger.error('Error fetching template:', error);
        return null;
    }
}

/**
 * Fetches public templates for exploration
 */
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

/**
 * Fetches user's own templates
 */
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

/**
 * Fetches user's interview sessions with template data
 */
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

        // Map sessions to view model
        const sessions: SessionCardData[] = [];

        for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionData = sessionDoc.data();
            const templateData = templateMap.get(sessionData.templateId);

            if (!templateData) {
                logger.warn(`Template ${sessionData.templateId} not found for session ${sessionDoc.id}`);
                continue; // Skip sessions with missing templates
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

/**
 * Fetches sessions with feedback scores
 * Used in dashboard to show completed sessions
 */
export async function getSessionsWithFeedback(userId: string): Promise<SessionCardData[]> {
    try {
        const sessions = await getUserSessions(userId);

        // Fetch feedback for completed sessions
        const completedSessions = sessions.filter(s => s.status === 'completed');

        const feedbackPromises = completedSessions.map(async (session) => {
            const feedback = await getFeedbackByInterviewId({
                interviewId: session.id,
                userId
            });

            return {
                ...session,
                finalScore: feedback?.totalScore
            };
        });

        const sessionsWithFeedback = await Promise.all(feedbackPromises);

        // Merge back with non-completed sessions
        const nonCompleted = sessions.filter(s => s.status !== 'completed');

        return [...sessionsWithFeedback, ...nonCompleted];

    } catch (error) {
        logger.error('Error fetching sessions with feedback:', error);
        return [];
    }
}