import { useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppState } from '@/types';

export const useFirestoreSync = (
  user: User | null,
  state: AppState,
  onRemoteUpdate: (state: AppState) => void,
) => {
  const isRemoteUpdate = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  // Firestore-ში შენახვა (ლოკალური ცვლილებისას)
  const syncToFirestore = useCallback(
    async (newState: AppState) => {
      if (!user || isRemoteUpdate.current) return;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          data: JSON.stringify(newState),
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error('Firestore sync error:', err);
      }
    },
    [user],
  );

  // პირველი ჩატვირთვა — Firestore-დან წაკითხვა
  useEffect(() => {
    if (!user) {
      // გამოსვლისას listener გაწყვეტა
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      return;
    }

    const loadAndListen = async () => {
      // ჯერ Firestore-დან წავიკითხოთ
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const remote = JSON.parse(snap.data().data) as AppState;
          isRemoteUpdate.current = true;
          onRemoteUpdate(remote);
          // ცოტა ხანში flag-ს ვხსნით
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 500);
        } else {
          // პირველი ავტორიზაცია — ლოკალური მონაცემების ატვირთვა
          await setDoc(doc(db, 'users', user.uid), {
            data: JSON.stringify(state),
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Firestore initial load error:', err);
      }

      // რეალ-ტაიმ listener სხვა მოწყობილობიდან ცვლილებებისთვის
      const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) return;
        const remote = JSON.parse(snap.data().data) as AppState;
        isRemoteUpdate.current = true;
        onRemoteUpdate(remote);
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 500);
      });

      unsubRef.current = unsub;
    };

    loadAndListen();

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { syncToFirestore, isRemoteUpdate: isRemoteUpdate.current };
};
