import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Workspace } from '@/pages/Workspace';
import { HowItWasBuilt } from '@/pages/HowItWasBuilt';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Workspace />} />
          <Route path="how-it-was-built" element={<HowItWasBuilt />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
