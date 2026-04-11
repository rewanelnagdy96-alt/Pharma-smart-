import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Search, ArrowLeftRight, FileText, Package } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  type: 'ledger' | 'invoice' | 'inventory';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  path: string;
}

export default function GlobalSearch() {
  const { t, isRtl } = useTranslation();
  const { searchQuery, setSearchQuery } = useAppStore();
  const navigate = useNavigate();
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Data stores
  const [ledgerNames, setLedgerNames] = useState<Set<string>>(new Set());
  const [invoiceCompanies, setInvoiceCompanies] = useState<Set<string>>(new Set());
  const [inventoryItems, setInventoryItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch unique ledger entities (limit to recent 200 to prevent performance issues)
    const qLedger = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(200));
    const unsubLedger = onSnapshot(qLedger, (snapshot) => {
      const names = new Set<string>();
      snapshot.forEach(doc => names.add(doc.data().entityName));
      setLedgerNames(names);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Fetch unique invoice companies
    const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(100));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const companies = new Set<string>();
      snapshot.forEach(doc => companies.add(doc.data().companyId));
      setInvoiceCompanies(companies);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'invoices'));

    // Fetch inventory items
    const qInventory = query(collection(db, 'medicines'), orderBy('createdAt', 'desc'), limit(200));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      const items = new Set<string>();
      snapshot.forEach(doc => items.add(doc.data().name));
      setInventoryItems(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'medicines'));

    return () => {
      unsubLedger();
      unsubInvoices();
      unsubInventory();
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const newSuggestions: SearchSuggestion[] = [];

    // Filter Ledger
    Array.from(ledgerNames).forEach(name => {
      if (name.toLowerCase().includes(queryLower)) {
        newSuggestions.push({
          id: `ledger-${name}`,
          type: 'ledger',
          title: name,
          subtitle: 'العملاء والمديونيات',
          icon: ArrowLeftRight,
          path: '/ledger'
        });
      }
    });

    // Filter Invoices
    Array.from(invoiceCompanies).forEach(company => {
      if (company.toLowerCase().includes(queryLower)) {
        newSuggestions.push({
          id: `invoice-${company}`,
          type: 'invoice',
          title: company,
          subtitle: 'الفواتير والشركات',
          icon: FileText,
          path: '/invoices'
        });
      }
    });

    // Filter Inventory
    Array.from(inventoryItems).forEach(item => {
      if (item.toLowerCase().includes(queryLower)) {
        newSuggestions.push({
          id: `inventory-${item}`,
          type: 'inventory',
          title: item,
          subtitle: 'المخزون والأدوية',
          icon: Package,
          path: '/inventory'
        });
      }
    });

    setSuggestions(newSuggestions.slice(0, 10)); // Limit to top 10
  }, [searchQuery, ledgerNames, invoiceCompanies, inventoryItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery('');
    setIsFocused(false);
    navigate(suggestion.path);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-3 sm:right-4' : 'left-3 sm:left-4'}`} size={18} />
      <input
        type="text"
        placeholder="ابحث عن عميل، مديونية، فاتورة، أو دواء..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className={`w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white transition-colors ${isRtl ? 'pr-10 sm:pr-12 pl-4' : 'pl-10 sm:pl-12 pr-4'}`}
      />

      {/* Suggestions Dropdown */}
      {isFocused && searchQuery.trim() !== '' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    onClick={() => handleSelect(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <suggestion.icon size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white text-sm">
                        {suggestion.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {suggestion.subtitle}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
              لا توجد نتائج مطابقة لبحثك
            </div>
          )}
        </div>
      )}
    </div>
  );
}
