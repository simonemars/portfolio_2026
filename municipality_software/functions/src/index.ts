import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Compute AI urgency score when a report is created
export const computeUrgency = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    // Simple heuristic: base score + upvotes bonus
    const baseScore = 50; // Base urgency score
    const upvoteBonus = Math.log10(data.upvotes + 1) * 20;
    const aiScore = Math.min(100, baseScore + upvoteBonus);

    await snap.ref.update({ aiScore });
  });

// Handle voting on reports
export const voteReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { reportId } = data;
  const userId = context.auth.uid;

  if (!reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'Report ID is required');
  }

  try {
    const reportRef = db.collection('reports').doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Report not found');
    }

    const reportData = reportDoc.data();
    if (!reportData) {
      throw new functions.https.HttpsError('not-found', 'Report data not found');
    }

    // Check if report is public
    if (!reportData.isPublic) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot vote on private reports');
    }

    // Check if user already voted
    if (reportData.voters && reportData.voters.includes(userId)) {
      throw new functions.https.HttpsError('already-exists', 'User has already voted on this report');
    }

    // Rate limiting: check if user voted recently
    const userVotesRef = db.collection('userVotes').doc(userId);
    const userVotesDoc = await userVotesRef.get();
    
    if (userVotesDoc.exists) {
      const userVotes = userVotesDoc.data();
      const lastVoteTime = userVotes?.lastVoteTime?.toDate();
      const now = new Date();
      
      if (lastVoteTime && (now.getTime() - lastVoteTime.getTime()) < 60000) { // 1 minute
        throw new functions.https.HttpsError('resource-exhausted', 'Rate limit: Please wait before voting again');
      }
    }

    // Update report with new vote
    const newVoters = reportData.voters || [];
    newVoters.push(userId);
    
    await reportRef.update({
      upvotes: admin.firestore.FieldValue.increment(1),
      voters: newVoters,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user's last vote time
    await userVotesRef.set({
      lastVoteTime: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Recompute AI score
    const newUpvotes = (reportData.upvotes || 0) + 1;
    const baseScore = 50;
    const upvoteBonus = Math.log10(newUpvotes + 1) * 20;
    const aiScore = Math.min(100, baseScore + upvoteBonus);

    await reportRef.update({ aiScore });

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process vote');
  }
});

// Send notifications when report status changes
export const notifyOnStatusChange = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!beforeData || !afterData) return;

    // Check if status changed
    if (beforeData.status === afterData.status) return;

    const reportId = context.params.reportId;
    const newStatus = afterData.status;

    // Get all users to notify (author + voters)
    const usersToNotify = new Set<string>();
    usersToNotify.add(afterData.authorId);
    
    if (afterData.voters) {
      afterData.voters.forEach((voterId: string) => usersToNotify.add(voterId));
    }

    // Get user tokens and send notifications
    const tokens: string[] = [];
    for (const userId of usersToNotify) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.pushToken) {
            tokens.push(userData.pushToken);
          }
        }
      } catch (error) {
        console.error(`Failed to get user ${userId}:`, error);
      }
    }

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'Report Status Updated',
          body: `Report "${afterData.description.substring(0, 50)}..." is now ${newStatus.replace('_', ' ')}`,
        },
        data: {
          reportId,
          status: newStatus,
        },
        tokens,
      };

      try {
        await admin.messaging().sendMulticast(message);
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    }
  });

// Save push token for notifications
export const savePushToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token } = data;
  const userId = context.auth.uid;

  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Push token is required');
  }

  try {
    await db.collection('users').doc(userId).update({
      pushToken: token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to save push token');
  }
});

// Delete user account and all associated data (GDPR compliance)
export const deleteAccountData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    // Delete user's reports
    const reportsSnapshot = await db.collection('reports')
      .where('authorId', '==', userId)
      .get();

    const batch = db.batch();
    
    // Delete report documents
    reportsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete user document
    batch.delete(db.collection('users').doc(userId));

    // Delete user votes
    batch.delete(db.collection('userVotes').doc(userId));

    await batch.commit();

    // Delete user's photos from storage
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `reports/${userId}/`,
    });

    if (files.length > 0) {
      await Promise.all(files.map(file => file.delete()));
    }

    // Delete the Firebase Auth user
    await admin.auth().deleteUser(userId);

  } catch (error) {
    console.error('Failed to delete user data:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account data');
  }
}); 