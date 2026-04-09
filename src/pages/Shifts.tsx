import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { ShiftTransaction } from '../models/types';
import { Plus, Edit2 } from 'lucide-react';
import { convertArabicToEnglishNumbers } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Shifts() {
  const { t } = useTranslation();
  const { searchQuery } = useAppStore();
  const [transactions, setTransactions] = useState<ShiftTransaction[]>([]);
  const [activeShift, setActiveShift] = useState<number>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [trxType, setTrxType] = useState<'income' | 'expense'>('income');

  useEffect(() => {
    // Get today's start date for filtering (simple approach)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'shiftTransactions'),
      where('createdAt', '>=', today.toISOString()),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftTransaction));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shiftTransactions');
    });

    return () => unsubscribe();
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(convertArabicToEnglishNumbers(amount));
    if (!parsedAmount || !description) return;
    
    try {
      if (editId) {
        await updateDoc(doc(db, 'shiftTransactions', editId), {
          amount: parsedAmount,
          type: trxType,
          description
        });
        toast.success(t('update') + ' ✓');
      } else {
        const trx: ShiftTransaction = {
          shiftNumber: activeShift,
          amount: parsedAmount,
          type: trxType,
          description,
          authorUid: auth.currentUser?.uid || 'local-user',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'shiftTransactions'), trx);
        toast.success(t('save') + ' ✓');
      }
      setShowAdd(false);
      setEditId(null);
      setAmount(''); setDescription(''); setTrxType('income');
    } catch (error) {
      handleFirestoreError(error, editId ? OperationType.UPDATE : OperationType.CREATE, 'shiftTransactions');
      toast.error('Error saving transaction');
    }
  };

  const handleEdit = (trx: ShiftTransaction) => {
    setEditId(trx.id!);
    setAmount(trx.amount.toString());
    setDescription(trx.description);
    setTrxType(trx.type || 'income');
    setShowAdd(true);
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditId(null);
    setAmount('');
    setDescription('');
    setTrxType('income');
  };

  const currentShiftTransactions = transactions.filter(t => t.shiftNumber === activeShift && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const shiftIncome = currentShiftTransactions.filter(t => (t.type || 'income') === 'income').reduce((sum, t) => sum + t.amount, 0);
  const shiftExpense = currentShiftTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const shiftTotal = shiftIncome - shiftExpense;
  
  const dailyTotal = transactions.filter(t => (t.type || 'income') === 'income').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4 relative min-h-[80vh]">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('shifts')}</h2>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('dailyNet')}</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{dailyTotal.toFixed(2)} {t('currency')}</p>
        </div>
      </div>

      {/* Shift Selector */}
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6">
        {[1, 2, 3, 4].map(shiftNum => (
          <button
            key={shiftNum}
            onClick={() => setActiveShift(shiftNum)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeShift === shiftNum ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t(`shift${shiftNum}` as any)}
          </button>
        ))}
      </div>

      {/* Shift Total */}
      <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-lg mb-6 flex justify-between items-center">
        <div>
          <p className="text-emerald-100 font-medium">{t('total')} (Net)</p>
          <h3 className="text-3xl font-bold">{shiftTotal.toFixed(2)} {t('currency')}</h3>
        </div>
        <div className="text-right">
          <p className="text-emerald-100 text-sm">{t('in')}: {shiftIncome.toFixed(2)} {t('currency')}</p>
          <p className="text-emerald-100 text-sm">{t('out')}: {shiftExpense.toFixed(2)} {t('currency')}</p>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddOrUpdate} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-4 mb-6">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTrxType('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${trxType === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {t('income')}
            </button>
            <button
              type="button"
              onClick={() => setTrxType('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${trxType === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {t('expense')}
            </button>
          </div>
          <input
            type="text" inputMode="decimal" placeholder={t('amount')} value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
          />
          <input
            type="text" placeholder={t('description')} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleCancel} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium">{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">{editId ? t('update') : t('add')}</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {currentShiftTransactions.map(trx => (
          <div key={trx.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">{trx.description}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(trx.createdAt).toLocaleTimeString()}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-bold ${(trx.type || 'income') === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {(trx.type || 'income') === 'income' ? '+' : '-'}{trx.amount.toFixed(2)} {t('currency')}
              </div>
              <button onClick={() => handleEdit(trx)} className="text-slate-400 hover:text-blue-500 transition-colors p-2">
                <Edit2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {currentShiftTransactions.length === 0 && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            {t('noShiftTransactions')}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-10"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
