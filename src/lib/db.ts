import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { UserProfile, AdaptedLesson, ActivityLog, FillLettersLesson } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Saves or updates a user profile in Firestore
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, "users", profile.uid);
    await setDoc(userDocRef, profile, { merge: true });
  } catch (error) {
    console.error("Error saving user profile to Firestore:", error);
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
  }
}

/**
 * Retrieves a user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Generates a unique 6-character linking code for a tutor
 */
export function generateTeacherCode(displayName: string): string {
  const prefix = displayName
    ? displayName.trim().substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X")
    : "TUT";
  const paddedPrefix = prefix.padEnd(3, "X");
  const randomNum = Math.floor(100 + Math.random() * 900); // 3 random digits
  return `${paddedPrefix}${randomNum}`;
}

/**
 * Links a student to a tutor using the tutor's code
 */
export async function linkStudentToTeacher(
  studentUid: string, 
  code: string
): Promise<{ success: boolean; teacherName?: string; error?: string }> {
  try {
    const cleanCode = code.trim().toUpperCase();
    
    // Find the tutor with this code
    let querySnapshot;
    try {
      const q = query(
        collection(db, "users"), 
        where("code", "==", cleanCode)
      );
      querySnapshot = await getDocs(q);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "users");
    }
    
    if (querySnapshot.empty) {
      return { success: false, error: "Código não encontrado. Verifique com seu Tutor!" };
    }
    
    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data() as UserProfile;
    
    // Update student doc
    const studentDocRef = doc(db, "users", studentUid);
    try {
      await updateDoc(studentDocRef, {
        linkedTeacherUid: teacherData.uid
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${studentUid}`);
    }
    
    return { 
      success: true, 
      teacherName: teacherData.displayName 
    };
  } catch (error: any) {
    console.error("Error linking student:", error);
    return { success: false, error: "Ocorreu um erro ao tentar vincular: " + error.message };
  }
}

/**
 * Gets all students linked to a specific teacher
 */
export async function getLinkedStudents(teacherUid: string): Promise<UserProfile[]> {
  try {
    const q = query(
      collection(db, "users"), 
      where("role", "==", "aluno"), 
      where("linkedTeacherUid", "==", teacherUid)
    );
    
    const querySnapshot = await getDocs(q);
    const students: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      students.push(docSnap.data() as UserProfile);
    });
    return students;
  } catch (error) {
    console.error("Error fetching linked students:", error);
    handleFirestoreError(error, OperationType.LIST, "users");
  }
}

/**
 * Saves a lesson created by a teacher
 */
export async function createTeacherLesson(
  teacherUid: string, 
  lesson: AdaptedLesson
): Promise<void> {
  try {
    const lessonDocRef = doc(db, "lessons", lesson.id);
    await setDoc(lessonDocRef, {
      ...lesson,
      createdByUid: teacherUid
    });
  } catch (error) {
    console.error("Error saving teacher lesson:", error);
    handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
  }
}

/**
 * Fetches all lessons created by a student's linked teacher
 */
export async function getTeacherLessons(teacherUid: string): Promise<AdaptedLesson[]> {
  try {
    const q = query(
      collection(db, "lessons"), 
      where("createdByUid", "==", teacherUid)
    );
    
    const querySnapshot = await getDocs(q);
    const lessons: AdaptedLesson[] = [];
    querySnapshot.forEach((docSnap) => {
      lessons.push(docSnap.data() as AdaptedLesson);
    });
    return lessons;
  } catch (error) {
    console.error("Error fetching teacher lessons:", error);
    handleFirestoreError(error, OperationType.LIST, "lessons");
  }
}

/**
 * Saves a FillLettersLesson created by a teacher
 */
export async function createFillLettersLesson(
  teacherUid: string, 
  lesson: FillLettersLesson
): Promise<void> {
  try {
    const lessonDocRef = doc(db, "fill_letters_lessons", lesson.id);
    await setDoc(lessonDocRef, {
      ...lesson,
      createdByUid: teacherUid
    });
  } catch (error) {
    console.error("Error saving fill letters lesson:", error);
    handleFirestoreError(error, OperationType.WRITE, `fill_letters_lessons/${lesson.id}`);
  }
}

/**
 * Fetches all FillLettersLessons created by a teacher or available
 */
export async function getFillLettersLessons(teacherUid?: string): Promise<FillLettersLesson[]> {
  try {
    let q;
    if (teacherUid) {
      q = query(
        collection(db, "fill_letters_lessons"), 
        where("createdByUid", "==", teacherUid)
      );
    } else {
      q = query(collection(db, "fill_letters_lessons"));
    }
    
    const querySnapshot = await getDocs(q);
    const lessons: FillLettersLesson[] = [];
    querySnapshot.forEach((docSnap) => {
      lessons.push(docSnap.data() as FillLettersLesson);
    });
    return lessons;
  } catch (error) {
    console.error("Error fetching fill letters lessons:", error);
    handleFirestoreError(error, OperationType.LIST, "fill_letters_lessons");
  }
}

/**
 * Saves a student's lesson completion log to Firestore
 */
export async function saveActivityLog(log: ActivityLog): Promise<void> {
  try {
    const logDocRef = doc(db, "activityLogs", log.id);
    await setDoc(logDocRef, log);
  } catch (error) {
    console.error("Error saving activity log:", error);
    handleFirestoreError(error, OperationType.WRITE, `activityLogs/${log.id}`);
  }
}

/**
 * Fetches all activity logs for a specific student
 */
export async function getStudentActivityLogs(studentUid: string): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, "activityLogs"),
      where("studentUid", "==", studentUid)
    );
    const querySnapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as ActivityLog);
    });
    // Sort by completedAt descending
    return logs.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch (error) {
    console.error("Error fetching student activity logs:", error);
    handleFirestoreError(error, OperationType.LIST, "activityLogs");
  }
}

