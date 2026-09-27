import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Arts from "./pages/entities/Arts";
import Authors from "./pages/entities/Authors";
import Publishers from "./pages/entities/Publishers";
import BooksList from "./pages/books/BooksList";
import BookForm from "./pages/books/BookForm";
import AllBooksReport from "./pages/reports/AllBooksReport";
import BooksByArtReport from "./pages/reports/BooksByArtReport";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route path="/arts" element={<Arts />} />
        <Route path="/authors" element={<Authors />} />
        <Route path="/publishers" element={<Publishers />} />

        <Route path="/books" element={<BooksList />} />
        <Route path="/books/new" element={<BookForm />} />
        <Route path="/books/:id/edit" element={<BookForm />} />

        <Route path="/reports/all-books" element={<AllBooksReport />} />
        <Route path="/reports/books-by-art" element={<BooksByArtReport />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
