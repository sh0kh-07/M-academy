import { Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Courses from './pages/Courses.jsx';
import Results from './pages/Results.jsx';
import Nigina from './pages/Nigina.jsx';
import { News, NewsPost } from './pages/News.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

/** Every page of the site. To add one: create it in src/pages and list it here (and in NAV in Layout.jsx). */
export default function App() {
  return (
    <Layout>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/results" element={<Results />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:slug" element={<NewsPost />} />
      <Route path="/nigina" element={<Nigina />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
    </Layout>
  );
}
