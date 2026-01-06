import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

interface Question {
  id: string;
  category: string;
  clue: string;
  acceptedAnswers: string[];
  displayAnswer: string;
  createdBy: string;
  createdAt: string;
}

interface AdminScreenProps {
  onBack: () => void;
}

export function AdminScreen({ onBack }: AdminScreenProps) {
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Form state
  const [formData, setFormData] = useState({
    id: "",
    category: "",
    clue: "",
    acceptedAnswers: "",
    displayAnswer: "",
  });

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/questions?page=1&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formData.id,
          category: formData.category,
          clue: formData.clue,
          acceptedAnswers: formData.acceptedAnswers.split(",").map((a) => a.trim()),
          displayAnswer: formData.displayAnswer,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create question");
      }

      // Reset form and refresh
      setFormData({ id: "", category: "", clue: "", acceptedAnswers: "", displayAnswer: "" });
      setShowCreateForm(false);
      fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const updateData: any = {};
      if (formData.category) updateData.category = formData.category;
      if (formData.clue) updateData.clue = formData.clue;
      if (formData.acceptedAnswers) updateData.acceptedAnswers = formData.acceptedAnswers.split(",").map((a) => a.trim());
      if (formData.displayAnswer) updateData.displayAnswer = formData.displayAnswer;

      const response = await fetch(`${API_URL}/api/admin/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update question");
      }

      // Reset form and refresh
      setFormData({ id: "", category: "", clue: "", acceptedAnswers: "", displayAnswer: "" });
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete question");
      }

      fetchQuestions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      id: question.id,
      category: question.category,
      clue: question.clue,
      acceptedAnswers: question.acceptedAnswers.join(", "),
      displayAnswer: question.displayAnswer,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingQuestion(null);
    setFormData({ id: "", category: "", clue: "", acceptedAnswers: "", displayAnswer: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Back to Game
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Create/Edit Form */}
        {(showCreateForm || editingQuestion) && (
          <div className="mb-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <h2 className="text-2xl font-bold mb-4">
              {editingQuestion ? "Edit Question" : "Create New Question"}
            </h2>
            <form onSubmit={editingQuestion ? handleUpdate : handleCreate} className="space-y-4">
              {!editingQuestion && (
                <div>
                  <label className="block text-sm font-medium mb-2">Question ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="q_unique_id"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                    required={!editingQuestion}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Science, History, etc."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  required={!editingQuestion}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Clue</label>
                <textarea
                  value={formData.clue}
                  onChange={(e) => setFormData({ ...formData, clue: e.target.value })}
                  placeholder="The question clue..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg h-32"
                  required={!editingQuestion}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Accepted Answers (comma-separated)</label>
                <input
                  type="text"
                  value={formData.acceptedAnswers}
                  onChange={(e) => setFormData({ ...formData, acceptedAnswers: e.target.value })}
                  placeholder="answer1, answer2, answer3"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  required={!editingQuestion}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Display Answer</label>
                <input
                  type="text"
                  value={formData.displayAnswer}
                  onChange={(e) => setFormData({ ...formData, displayAnswer: e.target.value })}
                  placeholder="The main answer to display"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  required={!editingQuestion}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition"
                >
                  {loading ? "Saving..." : editingQuestion ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    cancelEdit();
                  }}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create button */}
        {!showCreateForm && !editingQuestion && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-6 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition font-semibold"
          >
            + Create New Question
          </button>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Questions ({questions.length})</h2>
          {loading && questions.length === 0 ? (
            <p className="text-center text-gray-400">Loading...</p>
          ) : (
            questions.map((question) => (
              <div
                key={question.id}
                className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-purple-600 rounded-full text-sm font-semibold">
                        {question.category}
                      </span>
                      <span className="text-sm text-gray-400">{question.id}</span>
                    </div>
                    <p className="text-lg mb-3">{question.clue}</p>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-semibold">Display Answer:</span> {question.displayAnswer}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Accepted:</span>{" "}
                        {question.acceptedAnswers.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(question)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
