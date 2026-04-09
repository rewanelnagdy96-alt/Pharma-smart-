import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, where, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Shortage } from '../models/types';
import { CheckCircle2, Sparkles, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { suggestAlternatives } from '../lib/gemini';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Shortages() {
  const { t } = useTranslation();
  const { searchQuery } = useAppStore();
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [activeTab, setActiveTab] = useState<'medicine' | 'supply'>('medicine');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [itemForm, setItemForm] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [formCategory, setFormCategory] = useState<'medicine' | 'supply'>('medicine');

  const [loadingAlternatives, setLoadingAlternatives] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'shortages'),
      where('isAvailable', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shortage));
      setShortages(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shortages');
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !auth.currentUser) return;
    
    try {
      const shortage: Shortage = {
        medicineName: newItemName.trim(),
        form: itemForm || undefined,
        isAvailable: false,
        category: formCategory,
        isUrgent,
        authorUid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'shortages'), shortage);
      toast.success(t('save') + ' ✓');
      setShowAdd(false);
      setNewItemName('');
      setItemForm('');
      setIsUrgent(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shortages');
      toast.error('Error adding shortage');
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !auth.currentUser) return;
    try {
      const shortageToDelete = shortages.find(s => s.id === deleteId);
      if (shortageToDelete) {
        const deletedItem: any = {
          originalId: deleteId,
          collectionName: 'shortages',
          data: shortageToDelete,
          deletedAt: new Date().toISOString(),
          authorUid: auth.currentUser.uid
        };
        await addDoc(collection(db, 'deletedItems'), deletedItem);
      }
      await deleteDoc(doc(db, 'shortages', deleteId));
      toast.success(t('deleted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shortages/${deleteId}`);
      toast.error('Error deleting');
    } finally {
      setDeleteId(null);
    }
  };

  const handleMarkAvailable = async (id: string) => {
    try {
      await updateDoc(doc(db, 'shortages', id), { isAvailable: true });
      toast.success(t('markAvailable') + ' ✓');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shortages/${id}`);
      toast.error('Failed to update');
    }
  };

  const handleSuggestAlternatives = async (id: string, medicineName: string) => {
    if (alternatives[id]) return;
    setLoadingAlternatives(id);
    try {
      const alts = await suggestAlternatives(medicineName);
      setAlternatives(prev => ({ ...prev, [id]: alts }));
    } catch (error) {
      toast.error('Failed to load alternatives');
    } finally {
      setLoadingAlternatives(null);
    }
  };

  const filteredShortages = shortages.filter(s => 
    s.category === activeTab && 
    s.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 relative min-h-[80vh]">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{t('shortages')}</h2>
      
      {/* Tabs */}
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('medicine')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'medicine' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {t('medicines')}
        </button>
        <button
          onClick={() => setActiveTab('supply')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'supply' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {t('supplies')}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-3 mb-6">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFormCategory('medicine')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${formCategory === 'medicine' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {t('medicines')}
            </button>
            <button
              type="button"
              onClick={() => setFormCategory('supply')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${formCategory === 'supply' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {t('supplies')}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text" placeholder={t('medicineName')} value={newItemName} onChange={e => setNewItemName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
            />
            {formCategory === 'medicine' && (
              <select
                value={itemForm}
                onChange={(e) => setItemForm(e.target.value)}
                className="w-1/3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              >
                <option value="">{t('form')}</option>
                <option value="tablets">{t('tablets')}</option>
                <option value="syrup">{t('syrup')}</option>
                <option value="capsules">{t('capsules')}</option>
                <option value="injection">{t('injection')}</option>
                <option value="drops">{t('drops')}</option>
                <option value="cream">{t('cream')}</option>
                <option value="other">{t('other')}</option>
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border ${isUrgent ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
            >
              <AlertCircle size={18} /> {t('urgent')}
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium">{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">{t('add')}</button>
          </div>
        </form>
      )}

      {filteredShortages.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          {t('noShortages')}
        </div>
      ) : (
        <AnimatePresence>
          {filteredShortages.map((shortage) => (
            <motion.div
              key={shortage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border ${shortage.isUrgent ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-100 dark:border-slate-700'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                    {shortage.medicineName}
                    {shortage.form && <span className="text-sm font-normal text-slate-500 ml-2">({t(shortage.form as any)})</span>}
                  </h3>
                  {shortage.isUrgent && <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold px-2 py-0.5 rounded-md">{t('urgent')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDeleteId(shortage.id!)} className="text-slate-400 hover:text-rose-500 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => handleMarkAvailable(shortage.id!)}
                    className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </div>
              
              {activeTab === 'medicine' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  {alternatives[shortage.id!] ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles size={14} className="text-blue-500" /> {t('alternatives')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {alternatives[shortage.id!].map((alt, idx) => (
                          <span key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2.5 py-1 rounded-lg font-medium border border-blue-100 dark:border-blue-800/50">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSuggestAlternatives(shortage.id!, shortage.medicineName)}
                      disabled={loadingAlternatives === shortage.id}
                      className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {loadingAlternatives === shortage.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {t('suggestAlternatives')}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-10"
      >
        <Plus size={28} />
      </button>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('deleteConfirm')}</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium">{t('no')}</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium">{t('yes')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
