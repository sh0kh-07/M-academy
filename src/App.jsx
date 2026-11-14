import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Courses from './pages/Courses.jsx';
import CoursePage from './pages/CoursePage.jsx';
import Results from './pages/Results.jsx';
import Nigina from './pages/Nigina.jsx';
import { News, NewsPost } from './pages/News.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

// the admin panel is a separate bundle, fetched only when someone opens /admin
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

/** Every page of the site. To add one: create it in src/pages and list it here (and in NAV in Layout.jsx). */
function Site() {
  return (
    <Layout>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:slug" element={<CoursePage />} />
      <Route path="/results" element={<Results />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:slug" element={<NewsPost />} />
      <Route path="/nigina" element={<Nigina />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<Site />} />
    </Routes>
  );
}
