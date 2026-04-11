import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where, orderBy, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { ShiftTransaction } from '../models/types';
import { Plus, Edit2, Calendar, Lock, Unlock } from 'lucide-react';
import { convertArabicToEnglishNumbers } from '../lib/utils';
import toast from 'react-hot-toast';
import PinModal from '../components/PinModal';

export default function Shifts() {
  const { t, isRtl } = useTranslation();
  const { searchQuery, isManagerUnlocked, setManagerUnlocked } = useAppStore();
  const [transactions, setTransactions] = useState<ShiftTransaction[]>([]);
  const [activeShift, setActiveShift] = useState<number>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  
  // Date state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Form state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Get start and end of the selected date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, 'shiftTransactions'),
      where('createdAt', '>=', startOfDay.toISOString()),
      where('createdAt', '<=', endOfDay.toISOString()),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftTransaction));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shiftTransactions');
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIncome = Number(convertArabicToEnglishNumbers(incomeAmount));
    const parsedExpense = Number(convertArabicToEnglishNumbers(expenseAmount));
    
    if (!parsedIncome && !parsedExpense) return;
    
    try {
      if (editId) {
        const isIncome = parsedIncome > 0;
        const amountToSave = isIncome ? parsedIncome : parsedExpense;
        const typeToSave = isIncome ? 'income' : 'expense';
        
        await updateDoc(doc(db, 'shiftTransactions', editId), {
          amount: amountToSave,
          type: typeToSave,
          description: description || (isIncome ? t('income') : t('expense'))
        });
        toast.success(t('update') + ' ✓');
      } else {
        const batch = writeBatch(db);
        
        // Use the selected date but current time for new entries
        const now = new Date();
        const entryDate = new Date(selectedDate);
        entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        
        if (parsedIncome > 0) {
          const incomeRef = doc(collection(db, 'shiftTransactions'));
          batch.set(incomeRef, {
            shiftNumber: activeShift,
            amount: parsedIncome,
            type: 'income',
            description: description || t('income'),
            authorUid: auth.currentUser?.uid || 'local-user',
            createdAt: entryDate.toISOString()
          });
        }
        
        if (parsedExpense > 0) {
          const expenseRef = doc(collection(db, 'shiftTransactions'));
          batch.set(expenseRef, {
            shiftNumber: activeShift,
            amount: parsedExpense,
            type: 'expense',
            description: description || t('expense'),
            authorUid: auth.currentUser?.uid || 'local-user',
            createdAt: entryDate.toISOString()
          });
        }
        
        await batch.commit();
        toast.success(t('save') + ' ✓');
      }
      setShowAdd(false);
      setEditId(null);
      setIncomeAmount(''); setExpenseAmount(''); setDescription('');
    } catch (error) {
      handleFirestoreError(error, editId ? OperationType.UPDATE : OperationType.CREATE, 'shiftTransactions');
      toast.error('Error saving transaction');
    }
  };

  const handleEdit = (trx: ShiftTransaction) => {
    setEditId(trx.id!);
    if ((trx.type || 'income') === 'income') {
      setIncomeAmount(trx.amount.toString());
      setExpenseAmount('');
    } else {
      setExpenseAmount(trx.amount.toString());
      setIncomeAmount('');
    }
    setDescription(trx.description);
    setShowAdd(true);
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditId(null);
    setIncomeAmount('');
    setExpenseAmount('');
    setDescription('');
  };

  const currentShiftTransactions = transactions.filter(t => t.shiftNumber === activeShift && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const shiftIncome = currentShiftTransactions.filter(t => (t.type || 'income') === 'income').reduce((sum, t) => sum + t.amount, 0);
  const shiftExpense = currentShiftTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const shiftTotal = shiftIncome - shiftExpense;
  
  const dailyTotal = transactions.filter(t => (t.type || 'income') === 'income').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 relative min-h-[80vh]">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('shifts')}</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 ${isRtl ? 'pr-10' : 'pl-10'}`}
            />
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="text-xs text-slate-500 dark:text-slate-400">{isToday ? t('dailyNet') : 'صافي اليوم'}</p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => isManagerUnlocked ? setManagerUnlocked(false) : setShowPinModal(true)}
              className="text-slate-400 hover:text-emerald-500 transition-colors"
            >
              {isManagerUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
            </button>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {isManagerUnlocked ? `${dailyTotal.toFixed(2)} ${t('currency')}` : '****'}
            </p>
          </div>
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
          <h3 className="text-3xl font-bold">
            {isManagerUnlocked ? `${shiftTotal.toFixed(2)} ${t('currency')}` : '****'}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-emerald-100 text-sm">
            {t('in')}: {isManagerUnlocked ? `${shiftIncome.toFixed(2)} ${t('currency')}` : '****'}
          </p>
          <p className="text-emerald-100 text-sm">
            {t('out')}: {isManagerUnlocked ? `${shiftExpense.toFixed(2)} ${t('currency')}` : '****'}
          </p>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddOrUpdate} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('income')}</label>
              <input
                type="text" inputMode="decimal" placeholder={t('amount')} value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)}
                className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('expense')}</label>
              <input
                type="text" inputMode="decimal" placeholder={t('amount')} value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                className="w-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none dark:text-white transition-colors"
              />
            </div>
          </div>
          <input
            type="text" placeholder={t('description')} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" 
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

      <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} />
    </div>
  );
}
