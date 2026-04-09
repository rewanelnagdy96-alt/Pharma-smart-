import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, where, orderBy, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation } from '../lib/i18n';
import { DeletedItem } from '../models/types';
import { Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeletedItems() {
  const { t } = useTranslation();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'deletedItems'),
      orderBy('deletedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedItem));
      setDeletedItems(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deletedItems');
    });

    return () => unsubscribe();
  }, []);

  const handleRestore = async (item: DeletedItem) => {
    try {
      // Restore to original collection
      await setDoc(doc(db, item.collectionName, item.originalId), item.data);
      // Remove from deletedItems
      await deleteDoc(doc(db, 'deletedItems', item.id!));
      toast.success(t('restore') + ' ✓');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, item.collectionName);
      toast.error('Error restoring item');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deletedItems', id));
      toast.success(t('deleted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deletedItems/${id}`);
      toast.error('Error deleting');
    }
  };

  const getDisplayName = (item: DeletedItem) => {
    const data = item.data;
    if (data.name) return data.name;
    if (data.medicineName) return data.medicineName;
    if (data.description) return data.description;
    if (data.entityName) return `${data.entityName} - ${data.amount}`;
    return 'Item';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{t('recentlyDeleted')}</h2>

      <div className="space-y-3">
        {deletedItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">{getDisplayName(item)}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.collectionName} • {new Date(item.deletedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleRestore(item)} 
                className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                title={t('restore')}
              >
                <RotateCcw size={18} />
              </button>
              <button 
                onClick={() => handlePermanentDelete(item.id!)} 
                className="text-rose-600 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                title={t('deletePermanently')}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        
        {deletedItems.length === 0 && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            {t('noDeletedItems')}
          </div>
        )}
      </div>
    </div>
  );
}
