import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { startSmoothScroll, stopSmoothScroll } from '../lib/scroll.js';
import { AuthProvider, useAuth } from './auth.jsx';
import { BootError, Splash, ToastProvider } from './ui.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import CoursesList from './pages/CoursesList.jsx';
import CourseEdit from './pages/CourseEdit.jsx';
import CategoriesList from './pages/CategoriesList.jsx';
import TeachersList from './pages/TeachersList.jsx';
import NewsList from './pages/NewsList.jsx';
import NewsEdit from './pages/NewsEdit.jsx';
import LeadsList from './pages/LeadsList.jsx';
import StudentsList from './pages/StudentsList.jsx';
import Statistics from './pages/Statistics.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import MusicList from './pages/MusicList.jsx';
import FounderEdit from './pages/FounderEdit.jsx';
import SocialsList from './pages/SocialsList.jsx';
import './admin.css';

/*
  Admin panel at /admin. Loaded on demand (see App.jsx), so site visitors never download it.
  To add a section: create a page in ./pages, add a <Route> below and an item to NAV in AdminLayout.jsx.
*/

function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'error') return <BootError />;
  if (status === 'guest') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  return children;
}

export default function AdminApp() {
  // plain native scrolling, no indexing; the site gets its smooth scroll back on the way out
  useEffect(() => {
    stopSmoothScroll();
    document.documentElement.classList.add('is-admin');
    const robots = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.append(robots);
    return () => {
      robots.remove();
      document.documentElement.classList.remove('is-admin');
      startSmoothScroll();
    };
  }, []);

  return (
    <AuthProvider>
      <div className="adm">
        <ToastProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<LeadsList />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="courses" element={<CoursesList />} />
              <Route path="courses/new" element={<CourseEdit />} />
              <Route path="courses/:id" element={<CourseEdit />} />
              <Route path="categories" element={<CategoriesList kind="course" />} />
              <Route path="teachers" element={<TeachersList />} />
              <Route path="news" element={<NewsList />} />
              <Route path="news-categories" element={<CategoriesList kind="news" />} />
              <Route path="news/new" element={<NewsEdit />} />
              <Route path="news/:id" element={<NewsEdit />} />
              <Route path="music" element={<MusicList />} />
              <Route path="founder" element={<FounderEdit />} />
              <Route path="socials" element={<SocialsList />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </div>
    </AuthProvider>
  );
}
