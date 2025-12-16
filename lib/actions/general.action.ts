"use server";
import { feedbackSchema } from "@/constants";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { generateObject } from "ai";
import { logger } from "../logger";


export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
    const interview = await db.collection('interviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

    return interview.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({

        ...doc.data(),
        id: doc.id
    })) as Interview[]
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {
    const { userId, limit = 20 } = params;

    const interview = await db.collection('interviews')
        .orderBy('createdAt', 'desc')
        .where('finalized', '==', true)
        .where('userId', '!=', userId)
        .limit(limit)
        .get();

    return interview.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({

        ...doc.data(),
        id: doc.id
    })) as Interview[]
}

export async function getInterviewsById(
    id: string,
    userId?: string
): Promise<Interview | null> {
    const interviewDoc = await db
        .collection('interviews')
        .doc(id)
        .get();

    // Check if document exists
    if (!interviewDoc.exists) {
        return null;
    }

    const interviewData = interviewDoc.data();
    if (!interviewData) {
        return null;
    }

    // Authorization: User can access if they own it OR if it's finalized (public)
    if (userId && interviewData.userId !== userId && !interviewData.finalized) {
        return null; // Unauthorized access attempt
    }

    // Return complete interview object with ID
    return {
        ...interviewData,
        id: interviewDoc.id
    } as Interview;
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
            model: google('gemini-2.0-flash-001'),
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