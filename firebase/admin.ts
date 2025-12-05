import { cert, getApps, initializeApp} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const initFirebaseAdmin = () => {
    const apps = getApps();

    if (!apps.length) {
        // Build a service account object from env vars if present, otherwise
        // fall back to the local JSON file included in the repo.
        let serviceAccount: any | undefined;

        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
            serviceAccount = {
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
            };
        } else {
            try {
                // Path relative to this file (repo root -> one level up)
                // Use require so this also works at runtime in Node.
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                serviceAccount = require('../vuemaster-556cc-firebase-adminsdk-fbsvc-894496430a.json');
            } catch (err) {
                throw new Error(
                    'Firebase service account not found. Provide FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL and FIREBASE_PROJECT_ID env vars, or add the service account JSON to the project root.'
                );
            }
        }

        // The admin SDK expects the key to be named `private_key` (snake_case).
        initializeApp({
            credential: cert(serviceAccount),
        });
    }
    return {
        auth: getAuth(),
        db: getFirestore()
    }
}

export const {auth, db} = initFirebaseAdmin();