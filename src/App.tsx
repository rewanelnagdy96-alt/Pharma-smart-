import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Shortages from './pages/Shortages';
import Ledger from './pages/Ledger';
import Shifts from './pages/Shifts';
import Invoices from './pages/Invoices';
import DeletedItems from './pages/DeletedItems';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="shortages" element={<Shortages />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="deleted" element={<DeletedItems />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
