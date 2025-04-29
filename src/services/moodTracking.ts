import { auth, db } from "../components/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  Timestamp,
  DocumentData 
} from "firebase/firestore";

export interface MoodEntry {
  id: string;
  timestamp: Date;
  userId: string;
  mood: 'verySad' | 'sad' | 'neutral' | 'happy' | 'veryHappy';
  intensity: number;
  notes?: string;
}

/**
 * Save a new mood entry to Firestore
 * @param moodData The mood data to save
 * @returns The ID of the newly created document
 */
export async function saveMoodEntry(
  moodData: Omit<MoodEntry, 'id' | 'userId'>
): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated when saving mood entry');
      throw new Error('User not authenticated');
    }

    // Check if Firestore is initialized correctly
    if (!db) {
      console.error('Firestore not initialized');
      throw new Error('Firestore not initialized');
    }

    try {
      const moodCollection = collection(db, 'moodEntries');
      const docRef = await addDoc(moodCollection, {
        ...moodData,
        userId: user.uid,
        timestamp: Timestamp.fromDate(moodData.timestamp),
      });

      return docRef.id;
    } catch (dbError) {
      console.error('Firestore error when saving mood:', dbError);
      throw new Error('Database error when saving mood');
    }
  } catch (error) {
    console.error('Error saving mood entry:', error);
    throw error;
  }
}

/**
 * Get recent mood entries for the current user
 * @param count Number of entries to retrieve
 * @returns Array of mood entries
 */
export async function getRecentMoodEntries(count = 10): Promise<MoodEntry[]> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const moodCollection = collection(db, 'moodEntries');
    const moodQuery = query(
      moodCollection,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    );

    const querySnapshot = await getDocs(moodQuery);
    const entries: MoodEntry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        userId: data.userId,
        timestamp: data.timestamp.toDate(),
        mood: data.mood,
        intensity: data.intensity,
        notes: data.notes,
      });
    });

    return entries;
  } catch (error) {
    console.error('Error getting mood entries:', error);
    throw error;
  }
}

/**
 * Get mood statistics for the current user
 * @param days Number of days to analyze
 * @returns Statistics about mood patterns
 */
export async function getMoodStats(days = 30): Promise<{
  mostFrequentMood: string;
  averageIntensity: number;
  moodCounts: Record<string, number>;
  moodTrend: 'improving' | 'worsening' | 'stable';
}> {
  try {
    const entries = await getRecentMoodEntries(100); // Get a large sample
    
    // Filter to only entries within the specified time range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const recentEntries = entries.filter(entry => entry.timestamp >= startDate);
    
    if (recentEntries.length === 0) {
      return {
        mostFrequentMood: 'neutral',
        averageIntensity: 5,
        moodCounts: {},
        moodTrend: 'stable'
      };
    }
    
    // Count occurrences of each mood
    const moodCounts: Record<string, number> = {};
    let intensitySum = 0;
    
    recentEntries.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      intensitySum += entry.intensity;
    });
    
    // Find most frequent mood
    let mostFrequentMood = 'neutral';
    let maxCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        mostFrequentMood = mood;
        maxCount = count;
      }
    });
    
    // Calculate average intensity
    const averageIntensity = intensitySum / recentEntries.length;
    
    // Determine trend by comparing first and second half
    const midpoint = Math.floor(recentEntries.length / 2);
    const firstHalf = recentEntries.slice(midpoint); // More recent entries
    const secondHalf = recentEntries.slice(0, midpoint); // Older entries
    
    const moodValues = {
      'verySad': 1,
      'sad': 2,
      'neutral': 3,
      'happy': 4,
      'veryHappy': 5
    };
    
    const firstHalfAvg = firstHalf.reduce((sum, entry) => 
      sum + moodValues[entry.mood as keyof typeof moodValues], 0) / firstHalf.length;
      
    const secondHalfAvg = secondHalf.length ? secondHalf.reduce((sum, entry) => 
      sum + moodValues[entry.mood as keyof typeof moodValues], 0) / secondHalf.length : firstHalfAvg;
    
    let moodTrend: 'improving' | 'worsening' | 'stable' = 'stable';
    
    if (firstHalfAvg - secondHalfAvg > 0.5) {
      moodTrend = 'improving';
    } else if (secondHalfAvg - firstHalfAvg > 0.5) {
      moodTrend = 'worsening';
    }
    
    return {
      mostFrequentMood,
      averageIntensity,
      moodCounts,
      moodTrend
    };
  } catch (error) {
    console.error('Error getting mood stats:', error);
    return {
      mostFrequentMood: 'neutral',
      averageIntensity: 5,
      moodCounts: {},
      moodTrend: 'stable'
    };
  }
}

export default {
  saveMoodEntry,
  getRecentMoodEntries,
  getMoodStats
}; 