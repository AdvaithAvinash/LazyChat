import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

/**
 * @react-native-firebase auto-initializes from google-services.json /
 * GoogleService-Info.plist, so there is no manual firebase.initializeApp()
 * call here. See README.md for project setup steps.
 */
export const firebaseAuth = auth();
export const firestoreDb = firestore();
export const realtimeDb = database();
export const firebaseMessaging = messaging();

export const Timestamp = firestore.Timestamp;
export const FieldValue = firestore.FieldValue;
export const ServerValue = database.ServerValue;
