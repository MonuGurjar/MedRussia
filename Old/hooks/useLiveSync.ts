
import { useState, useEffect, useRef } from 'react';
import { getAllFeedback, getAllStudents } from '../services/db';
import { FeedbackEntry, User } from '../types';

export const useLiveSync = (isEnabled: boolean) => {
  const [data, setData] = useState<{
    feedback: FeedbackEntry[] | null;
    students: User[] | null;
    lastSynced: number;
  }>({
    feedback: null,
    students: null,
    lastSynced: Date.now(),
  });

  // Refs to hold previous data strings for comparison without triggering re-renders
  const prevFeedbackStr = useRef<string>('');
  const prevStudentsStr = useRef<string>('');

  useEffect(() => {
    if (!isEnabled) return;

    const fetchData = async () => {
      try {
        const [feedback, students] = await Promise.all([
          getAllFeedback(),
          getAllStudents()
        ]);

        const newFeedbackStr = JSON.stringify(feedback);
        const newStudentsStr = JSON.stringify(students);

        let hasChanges = false;
        const updates: any = {};

        // Compare Feedback
        if (newFeedbackStr !== prevFeedbackStr.current) {
          prevFeedbackStr.current = newFeedbackStr;
          updates.feedback = feedback;
          hasChanges = true;
        }

        // Compare Students
        if (newStudentsStr !== prevStudentsStr.current) {
          prevStudentsStr.current = newStudentsStr;
          updates.students = students;
          hasChanges = true;
        }

        if (hasChanges) {
          setData(prev => ({
            ...prev,
            ...updates,
            lastSynced: Date.now()
          }));
        }
      } catch (error) {
        console.error("Live Sync Error:", error);
      }
    };

    // Initial fetch when enabled
    fetchData();

    const intervalId = setInterval(fetchData, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [isEnabled]);

  return data;
};
