import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Medicine } from '../models/types';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { convertArabicToEnglishNumbers } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Inventory() {
  const { t } = useTranslation();
  const { searchQuery } = useAppStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [boxQty, setBoxQty] = useState('');
  const [stripQty, setStripQty] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'medicines'),
      orderBy('name')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
      setMedicines(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medicines');
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !boxQty || !price) return;
    
    try {
      const med: Medicine = {
        name,
        boxQty: Number(convertArabicToEnglishNumbers(boxQty)),
        stripQty: Number(convertArabicToEnglishNumbers(stripQty)) || 0,
        minBoxQty: 3, // Default low stock alert threshold
        price: Number(convertArabicToEnglishNumbers(price)),
        authorUid: auth.currentUser?.uid || 'local-user',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'medicines'), med);
      toast.success(t('save'));
      setShowAdd(false);
      setName(''); setBoxQty(''); setStripQty(''); setPrice('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medicines');
      toast.error('Error');
    }
  };

  const updateQty = async (id: string, field: 'boxQty' | 'stripQty', delta: number, current: number) => {
    const newValue = Math.max(0, current + delta);
    try {
      await updateDoc(doc(db, 'medicines', id), { [field]: newValue });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `medicines/${id}`);
      toast.error('Error updating quantity');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const medToDelete = medicines.find(m => m.id === deleteId);
      if (medToDelete) {
        const deletedItem: any = {
          originalId: deleteId,
          collectionName: 'medicines',
          data: medToDelete,
          deletedAt: new Date().toISOString(),
          authorUid: auth.currentUser?.uid || 'local-user'
        };
        await addDoc(collection(db, 'deletedItems'), deletedItem);
      }
      await deleteDoc(doc(db, 'medicines', deleteId));
      toast.success(t('deleted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `medicines/${deleteId}`);
      toast.error('Error deleting');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredMeds = medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 relative min-h-[80vh]"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('inventory')}</h2>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} 
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-3 mb-6 overflow-hidden"
          >
            <input
              type="text" placeholder={t('medicineName')} value={name} onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
            />
            <div className="flex gap-2">
              <input
                type="text" inputMode="decimal" placeholder={t('box')} value={boxQty} onChange={e => setBoxQty(e.target.value)}
                className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
              />
              <input
                type="text" inputMode="decimal" placeholder={t('strip')} value={stripQty} onChange={e => setStripQty(e.target.value)}
                className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              />
            </div>
            <input
              type="text" inputMode="decimal" placeholder={t('price')} value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
            />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium">{t('cancel')}</button>
              <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">{t('add')}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredMeds.map(med => {
            const isLowStock = med.boxQty < (med.minBoxQty || 3);
            return (
              <motion.div 
                key={med.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border ${isLowStock ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-100 dark:border-slate-700'} flex flex-col gap-3 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{med.name}</h3>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{med.price.toFixed(2)} {t('currency')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isLowStock && (
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl">{t('lowStock')}</span>
                    )}
                    <button onClick={() => setDeleteId(med.id!)} className="text-slate-400 hover:text-rose-500 p-1 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">{t('box')}</span>
                    <button onClick={() => updateQty(med.id!, 'boxQty', -1, med.boxQty)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"><Minus size={16}/></button>
                    <span className="w-8 text-center font-bold text-slate-800 dark:text-white">{med.boxQty}</span>
                    <button onClick={() => updateQty(med.id!, 'boxQty', 1, med.boxQty)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"><Plus size={16}/></button>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">{t('strip')}</span>
                    <button onClick={() => updateQty(med.id!, 'stripQty', -1, med.stripQty)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"><Minus size={16}/></button>
                    <span className="w-8 text-center font-bold text-slate-800 dark:text-white">{med.stripQty}</span>
                    <button onClick={() => updateQty(med.id!, 'stripQty', 1, med.stripQty)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"><Plus size={16}/></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-10"
      >
        <Plus size={28} />
      </button>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('deleteConfirm')}</h3>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition-colors">{t('no')}</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors">{t('yes')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
