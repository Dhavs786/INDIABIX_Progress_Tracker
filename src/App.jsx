import React, { useState, useEffect, useRef } from "react";
import {
  Calculator,
  Brain,
  MessageSquare,
  Code,
  Cpu,
  Globe,
  Search,
  Clock,
  Check,
  X,
  AlertCircle,
  Bookmark,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Home,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  BookOpen,
  Save,
  RefreshCw,
  Award,
  BookMarked,
  Sparkles,
  Info,
  Settings
} from "lucide-react";
import { categories, getIndiaBixUrl } from "./data/syllabus";

// Icon mapping dictionary
const iconMap = {
  Calculator,
  Brain,
  MessageSquare,
  Code,
  Cpu,
  Globe,
  Settings
};

export default function App() {
  // --- STATE ---
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem("indiabix_tracker_progress");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === "object" ? parsed : {};
      }
    } catch (e) {
      console.error("Failed to parse indiabix_tracker_progress:", e);
    }
    return {};
  });

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem("indiabix_tracker_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === "object" ? parsed : {};
      }
    } catch (e) {
      console.error("Failed to parse indiabix_tracker_logs:", e);
    }
    return {};
  });

  const [lastSession, setLastSession] = useState(() => {
    try {
      const saved = localStorage.getItem("indiabix_tracker_last_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === "object" ? parsed : null;
      }
    } catch (e) {
      console.error("Failed to parse indiabix_tracker_last_session:", e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "settings", or "topicId"
  const [activeQuestion, setActiveQuestion] = useState(null); // 1-based index or null
  const [expandedCategories, setExpandedCategories] = useState({ aptitude: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [questionFilter, setQuestionFilter] = useState("all"); // "all", "correct", "incorrect", "bookmark", "inprogress", "unsolved"

  // Stopwatch state for active question
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef(null);

  // Buffer state for active question notes to prevent localStorage lag
  const [noteBuffer, setNoteBuffer] = useState("");
  const [notification, setNotification] = useState(null);

  // --- LOCALSTORAGE SYNC ---
  useEffect(() => {
    localStorage.setItem("indiabix_tracker_progress", JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem("indiabix_tracker_logs", JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (lastSession) {
      localStorage.setItem("indiabix_tracker_last_session", JSON.stringify(lastSession));
    } else {
      localStorage.removeItem("indiabix_tracker_last_session");
    }
  }, [lastSession]);

  // --- TIMER EFFECT ---
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  // --- AUTO-SAVE TIMER AND NOTES ON QUESTION SWITCH ---
  const saveCurrentTimerAndNotes = (prevQuestionNum, prevTopicId) => {
    if (!prevTopicId || !prevQuestionNum) return;

    setProgress((prevProgress) => {
      const topicData = prevProgress[prevTopicId] || {};
      const qData = topicData[prevQuestionNum] || {};

      // If note buffer has changed or timer has accumulated, merge them in
      const updatedQData = {
        ...qData,
        notes: noteBuffer,
        timeSpent: (qData.timeSpent || 0) + timer,
        lastModified: new Date().toISOString()
      };

      return {
        ...prevProgress,
        [prevTopicId]: {
          ...topicData,
          [prevQuestionNum]: updatedQData
        }
      };
    });

    // Save timer seconds to log for active logs heatmap/charts
    if (timer > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      setLogs((prevLogs) => {
        const dayLog = prevLogs[todayStr] || { solved: 0, seconds: 0 };
        return {
          ...prevLogs,
          [todayStr]: {
            ...dayLog,
            seconds: dayLog.seconds + timer
          }
        };
      });
    }

    setTimer(0);
  };

  // --- UTILITY: NOTIFICATION SHOW ---
  const triggerNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- ACCORDION CATEGORY TOGGLE ---
  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // --- FIND ACTIVE TOPIC DETAILS ---
  const findTopicById = (id) => {
    for (const cat of categories) {
      for (const subcat of cat.subcategories) {
        const topic = subcat.topics.find((t) => t.id === id);
        if (topic) return { topic, subcat, cat };
      }
    }
    return null;
  };

  const activeTopicInfo = activeTab !== "dashboard" && activeTab !== "settings" ? findTopicById(activeTab) : null;

  // --- RESOLVE CURRENT TOPIC STATS ---
  const getTopicStats = (topicId, totalQuestionsCount) => {
    const topicProgress = progress[topicId] || {};
    let correct = 0;
    let incorrect = 0;
    let bookmarks = 0;
    let inprogress = 0;

    Object.keys(topicProgress).forEach((q) => {
      const status = topicProgress[q]?.status;
      if (status === "correct") correct++;
      else if (status === "incorrect") incorrect++;
      else if (status === "bookmark") bookmarks++;
      else if (status === "inprogress") inprogress++;
    });

    const solved = correct + incorrect;
    const progressPercent = totalQuestionsCount > 0 ? Math.round((solved / totalQuestionsCount) * 100) : 0;

    return { solved, correct, incorrect, bookmarks, inprogress, progressPercent };
  };

  // --- GLOBAL STATS CALCULATOR ---
  const getGlobalStats = () => {
    let totalQuestions = 0;
    let correct = 0;
    let incorrect = 0;
    let bookmarks = 0;
    let inprogress = 0;
    let totalSeconds = 0;

    // Sum overall preset counts
    categories.forEach((cat) => {
      cat.subcategories.forEach((subcat) => {
        subcat.topics.forEach((topic) => {
          totalQuestions += topic.defaultCount;
        });
      });
    });

    // Sum actual progress state
    Object.keys(progress).forEach((topicId) => {
      const topicProgress = progress[topicId] || {};
      if (topicProgress && typeof topicProgress === "object") {
        Object.keys(topicProgress).forEach((qNum) => {
          const qData = topicProgress[qNum];
          if (qData && typeof qData === "object") {
            if (qData.status === "correct") correct++;
            else if (qData.status === "incorrect") incorrect++;
            else if (qData.status === "bookmark") bookmarks++;
            else if (qData.status === "inprogress") inprogress++;

            if (qData.timeSpent) totalSeconds += qData.timeSpent;
          }
        });
      }
    });

    const solved = correct + incorrect;
    const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
    const completionPercent = totalQuestions > 0 ? Math.round((solved / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      solved,
      correct,
      incorrect,
      bookmarks,
      inprogress,
      totalSeconds,
      accuracy,
      completionPercent
    };
  };

  const globalStats = getGlobalStats();

  // --- ACTIVATE TOPIC / QUESTION RESUMING ---
  const handleSelectTopic = (topicId) => {
    // If active question was open, save timer and notes first
    if (activeQuestion && activeTopicInfo) {
      saveCurrentTimerAndNotes(activeQuestion, activeTopicInfo.topic.id);
    }
    setActiveTab(topicId);
    setActiveQuestion(null);
    setTimerRunning(false);
    setTimer(0);
    setNoteBuffer("");
    setQuestionFilter("all");
    setShowSidebar(false);
  };

  const handleSelectQuestion = (qNum) => {
    if (activeTopicInfo) {
      // Save current question before switching
      if (activeQuestion && activeQuestion !== qNum) {
        saveCurrentTimerAndNotes(activeQuestion, activeTopicInfo.topic.id);
      }
      setActiveQuestion(qNum);
      const existingData = progress[activeTopicInfo.topic.id]?.[qNum] || {};
      setNoteBuffer(existingData.notes || "");
      setTimer(0);
      setTimerRunning(true);
    }
  };

  // --- SAVE NOTES ---
  const handleSaveNotes = () => {
    if (!activeTopicInfo || !activeQuestion) return;
    setProgress((prev) => {
      const topicData = prev[activeTopicInfo.topic.id] || {};
      const qData = topicData[activeQuestion] || {};
      return {
        ...prev,
        [activeTopicInfo.topic.id]: {
          ...topicData,
          [activeQuestion]: {
            ...qData,
            notes: noteBuffer,
            lastModified: new Date().toISOString()
          }
        }
      };
    });
    triggerNotification("Notes saved successfully!");
  };

  // --- SET QUESTION STATUS ---
  const handleSetStatus = (statusName) => {
    if (!activeTopicInfo || !activeQuestion) return;

    const topicId = activeTopicInfo.topic.id;
    const catId = activeTopicInfo.cat.id;
    const subcatId = activeTopicInfo.subcat.id;
    const qNum = activeQuestion;

    setProgress((prev) => {
      const topicData = prev[topicId] || {};
      const qData = topicData[qNum] || {};

      // If resetting status to unsolved (empty)
      if (statusName === "unsolved") {
        const updated = { ...topicData };
        delete updated[qNum];
        return {
          ...prev,
          [topicId]: updated
        };
      }

      return {
        ...prev,
        [topicId]: {
          ...topicData,
          [qNum]: {
            ...qData,
            status: statusName,
            notes: noteBuffer,
            timeSpent: (qData.timeSpent || 0) + timer,
            lastModified: new Date().toISOString()
          }
        }
      };
    });

    // Logging daily solve counters (only count if transitioning to solved status)
    if (statusName === "correct" || statusName === "incorrect") {
      const todayStr = new Date().toISOString().split("T")[0];
      setLogs((prevLogs) => {
        const dayLog = prevLogs[todayStr] || { solved: 0, seconds: 0 };
        return {
          ...prevLogs,
          [todayStr]: {
            ...dayLog,
            solved: dayLog.solved + 1,
            seconds: dayLog.seconds + timer
          }
        };
      });
    }

    // Set last session marker
    setLastSession({
      topicId,
      categoryId: catId,
      subcategoryId: subcatId,
      questionNum: qNum,
      timestamp: new Date().toISOString()
    });

    setTimer(0);
    triggerNotification(`Question ${qNum} marked as ${statusName}!`);
  };

  // --- PRESETS FOR QUICK TEMPLATES ---
  const applyNoteTemplate = (templateType) => {
    const templates = {
      formula: "Formula Used:\n👉 \n\nKey Concepts:\n👉 \n\nCalculations:\n👉 ",
      mistake: "Mistake Reason:\n❌ \n\nCorrect Approach:\n✅ \n\nKeep in Mind:\n⚠️ ",
      shortcut: "Shortcut Method:\n💡 \n\nStandard Method:\n📝 \n\nTime saved: ~"
    };
    setNoteBuffer((prev) => (prev ? prev + "\n\n" + templates[templateType] : templates[templateType]));
  };

  // --- JUMP TO NEXT UNSOLVED ---
  const handleJumpToNextUnsolved = () => {
    if (!activeTopicInfo) return;
    const topicId = activeTopicInfo.topic.id;
    const totalCount = activeTopicInfo.topic.defaultCount;
    const topicProgress = progress[topicId] || {};

    for (let i = 1; i <= totalCount; i++) {
      const status = topicProgress[i]?.status;
      if (!status || status === "inprogress") {
        handleSelectQuestion(i);
        return;
      }
    }
    triggerNotification("All questions solved in this topic!", "info");
  };

  // --- IMPORT / EXPORT DATA ---
  const handleExportData = () => {
    const dataStr = JSON.stringify({ progress, logs, lastSession }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `indiabix_progress_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerNotification("Data exported successfully!");
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.progress) {
          setProgress(imported.progress);
          setLogs(imported.logs || {});
          setLastSession(imported.lastSession || null);
          triggerNotification("Progress imported successfully!", "success");
        } else {
          triggerNotification("Invalid backup file structure.", "error");
        }
      } catch (err) {
        triggerNotification("Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to clear ALL study progress? This cannot be undone.")) {
      setProgress({});
      setLogs({});
      setLastSession(null);
      localStorage.clear();
      setActiveTab("dashboard");
      setActiveQuestion(null);
      triggerNotification("All tracker data has been reset.", "info");
    }
  };

  // --- TIMER HELPER FORMAT ---
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatHours = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  // --- SEARCH FINDER ---
  const searchResults = [];
  if (searchQuery.trim().length > 0) {
    const query = searchQuery.toLowerCase();
    categories.forEach((cat) => {
      cat.subcategories.forEach((subcat) => {
        subcat.topics.forEach((topic) => {
          if (
            topic.name.toLowerCase().includes(query) ||
            subcat.name.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query)
          ) {
            searchResults.push({
              topic,
              subcat,
              cat
            });
          }
        });
      });
    });
  }

  // --- CHART RENDERING HELPER (LAST 7 DAYS ACTIVITY) ---
  const getChartData = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayLog = logs[dateStr] || { solved: 0, seconds: 0 };
      list.push({
        date: dateStr,
        dayName,
        solved: dayLog.solved,
        minutes: Math.round(dayLog.seconds / 60)
      });
    }
    return list;
  };
  const chartData = getChartData();
  const maxSolved = Math.max(...chartData.map((d) => d.solved), 1);

  // Determine active category card progress lists
  const renderCategoryCards = () => {
    return categories.map((cat) => {
      let catTotal = 0;
      let catSolved = 0;
      cat.subcategories.forEach((subcat) => {
        subcat.topics.forEach((topic) => {
          catTotal += topic.defaultCount;
          const stats = getTopicStats(topic.id, topic.defaultCount);
          catSolved += stats.solved;
        });
      });
      const percent = catTotal > 0 ? Math.round((catSolved / catTotal) * 100) : 0;
      const IconComp = iconMap[cat.icon] || Cpu;

      return (
        <div
          key={cat.id}
          onClick={() => {
            toggleCategory(cat.id);
            setExpandedCategories((prev) => ({ ...prev, [cat.id]: true }));
          }}
          className="bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-5 hover:bg-slate-900/60 cursor-pointer transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/25 transition-colors">
                <IconComp size={20} />
              </div>
              <h3 className="font-semibold text-slate-200 group-hover:text-slate-100">{cat.name}</h3>
            </div>
            <span className="text-xs text-indigo-400 font-medium px-2 py-1 bg-indigo-500/5 rounded-full border border-indigo-500/10">
              {percent}% Done
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Solved Questions</span>
              <span className="font-mono text-slate-300">
                {catSolved} / {catTotal}
              </span>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* --- FLOATING NOTIFICATION BANNER --- */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-xl transition-all duration-300 transform translate-y-0 ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : notification.type === "info"
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}
        >
          {notification.type === "error" ? (
            <X size={18} />
          ) : notification.type === "info" ? (
            <Info size={18} />
          ) : (
            <Check size={18} />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* --- SIDEBAR PANEL --- */}
      <aside
        className={`w-72 md:w-80 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-xl flex flex-col z-30 transition-all duration-300 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static h-full`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Award size={18} className="animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide">BIXTracker</span>
              <span className="text-[10px] text-indigo-400 block -mt-1 font-mono">companion app</span>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 hover:bg-slate-800 rounded text-slate-400"
            onClick={() => setShowSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Progress Radial */}
        <div className="p-5 border-b border-slate-800/60 bg-slate-900/10">
          <div className="flex items-center gap-4 bg-slate-800/30 rounded-xl p-3 border border-slate-800">
            {/* SVG Doughnut */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-slate-800 fill-none"
                  strokeWidth="3.5"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-indigo-500 fill-none transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - globalStats.completionPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-slate-200">
                {globalStats.completionPercent}%
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Overall Progress</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {globalStats.solved} <span className="text-xs font-normal text-slate-500">/ {globalStats.totalQuestions} solved</span>
              </p>
            </div>
          </div>
        </div>

        {/* Categories / Topics Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categories.map((cat) => {
            const isExpanded = expandedCategories[cat.id];
            const IconComp = iconMap[cat.icon] || Cpu;

            return (
              <div key={cat.id} className="space-y-1.5">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800/40 rounded-lg transition-all text-sm font-semibold group"
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp size={16} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span>{cat.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Subcategories & Topics */}
                {isExpanded && (
                  <div className="pl-4 border-l border-slate-850 space-y-3 pt-1 pb-2">
                    {cat.subcategories.map((subcat) => (
                      <div key={subcat.id} className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider pl-2.5 block">
                          {subcat.name}
                        </span>

                        <div className="space-y-0.5 mt-1">
                          {subcat.topics.map((topic) => {
                            const stats = getTopicStats(topic.id, topic.defaultCount);
                            const isActive = activeTab === topic.id;

                            return (
                              <button
                                key={topic.id}
                                onClick={() => handleSelectTopic(topic.id)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center justify-between ${
                                  isActive
                                    ? "bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500 pl-2 font-medium"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                                }`}
                              >
                                <span className="truncate pr-2">{topic.name}</span>
                                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                                  {stats.solved}/{topic.defaultCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col gap-2.5">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-all ${
              activeTab === "settings"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Settings size={15} />
            <span>Settings & Backup</span>
          </button>
          
          <div className="text-[10px] text-slate-500 text-center font-medium border-t border-slate-900/60 pt-2 flex items-center justify-center gap-1">
            <span>Created with</span>
            <span className="text-rose-500 animate-pulse">❤️</span>
            <span>by</span>
            <span className="text-slate-400 hover:text-indigo-400 font-semibold transition-colors duration-200">Dharav Antani</span>
          </div>
        </div>
      </aside>

      {/* --- MAIN DISPLAY CONTAINER --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* --- GLOBAL HEADER --- */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/25 flex items-center justify-between px-6 z-15">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-300"
            >
              <Menu size={20} />
            </button>

            {/* Title / Back home */}
            {activeTab !== "dashboard" ? (
              <button
                onClick={() => {
                  if (activeQuestion && activeTopicInfo) {
                    saveCurrentTimerAndNotes(activeQuestion, activeTopicInfo.topic.id);
                  }
                  setActiveTab("dashboard");
                  setActiveQuestion(null);
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg"
              >
                <Home size={13} />
                <span>Dashboard</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg text-indigo-400 font-mono">
                <Sparkles size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
                <span>IndiaBIX Practice Companion</span>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search topics (e.g. Trains, Syllogism)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
        </header>

        {/* --- MAIN WORKSPACE SCROLL --- */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {/* SEARCH RESULTS VIEW */}
          {searchQuery.trim().length > 0 ? (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Search size={20} className="text-indigo-400" />
                  <span>Search Results for "{searchQuery}"</span>
                </h2>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear search
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-12 text-center bg-slate-900/20 border border-slate-800 rounded-xl">
                  <AlertCircle className="mx-auto text-slate-600 mb-2" size={32} />
                  <p className="text-slate-400 text-sm">No matching topics found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(({ topic, subcat, cat }) => {
                    const stats = getTopicStats(topic.id, topic.defaultCount);
                    return (
                      <div
                        key={topic.id}
                        onClick={() => {
                          setSearchQuery("");
                          handleSelectTopic(topic.id);
                        }}
                        className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:border-indigo-500/40 hover:bg-slate-900/80 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                            <span>{cat.name}</span>
                            <span>•</span>
                            <span>{subcat.name}</span>
                          </div>
                          <h4 className="font-semibold text-slate-200 text-sm">{topic.name}</h4>
                          <span className="text-xs font-mono text-slate-400 mt-1 block">
                            {stats.solved} / {topic.defaultCount} questions solved
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded font-medium">
                            {stats.progressPercent}%
                          </span>
                          <ArrowRight size={16} className="text-slate-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === "dashboard" ? (
            /* --- DASHBOARD VIEW --- */
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Quick Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, Study Session!
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Track your IndiaBIX progress, log notes, and review tricky questions.
                  </p>
                </div>
              </div>

              {/* Resume Card & Weekly Chart Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resume Session Card */}
                <div className="lg:col-span-1 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/25 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-indigo-950/15 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-indigo-500/15 transition-all"></div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 inline-block mb-3">
                      Resume Study
                    </span>

                    {lastSession ? (
                      <div>
                        {(() => {
                          const details = findTopicById(lastSession.topicId);
                          if (!details) return null;
                          return (
                            <>
                              <h3 className="font-bold text-lg text-white group-hover:text-indigo-200 transition-colors">
                                {details.topic.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                                {details.subcat.name}
                              </p>
                              <div className="flex items-center gap-2 mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800/80 px-3 py-2 rounded-lg w-fit">
                                <BookOpen size={15} className="text-indigo-400" />
                                <span className="font-semibold font-mono">Question {lastSession.questionNum}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-lg text-white">No active session</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Select any topic from the sidebar menu to begin tracking!
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (lastSession) {
                        handleSelectTopic(lastSession.topicId);
                        setTimeout(() => handleSelectQuestion(lastSession.questionNum), 100);
                      } else {
                        // Jump to arithmetic numbers as default
                        handleSelectTopic("numbers");
                      }
                    }}
                    className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <span>{lastSession ? "Jump Back In" : "Start Practice"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Weekly Chart Card */}
                <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">Solved Questions History</h3>
                      <p className="text-[11px] text-slate-400">Activity map for the past week</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded"></div>
                        <span>Solved Count</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="h-32 flex items-end justify-between gap-2 px-2 mt-2">
                    {chartData.map((d, index) => {
                      const barHeight = `${(d.solved / maxSolved) * 80}%`;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-slate-900 border border-slate-800 text-[10px] text-slate-200 px-2 py-1 rounded shadow-xl font-mono transition-transform duration-200 z-10 text-center pointer-events-none">
                            <span className="font-bold block">{d.solved} Solved</span>
                            <span className="text-slate-400">{d.minutes}m spent</span>
                          </div>

                          {/* Bar Graphic */}
                          <div className="w-full bg-slate-800/50 rounded-t-md h-24 flex items-end overflow-hidden">
                            <div
                              className="bg-indigo-500 w-full rounded-t-md group-hover:bg-indigo-400 transition-all duration-500"
                              style={{ height: d.solved > 0 ? barHeight : "4px" }}
                            ></div>
                          </div>

                          {/* X label */}
                          <span className="text-[10px] text-slate-500 font-bold mt-2 font-mono group-hover:text-slate-300">
                            {d.dayName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 shadow-md">
                  <p className="text-xs text-slate-400 font-medium">Total Solved</p>
                  <p className="text-xl md:text-2xl font-bold text-white mt-1 font-mono">
                    {globalStats.solved}{" "}
                    <span className="text-xs font-normal text-slate-500">/ {globalStats.totalQuestions}</span>
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${globalStats.completionPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 shadow-md">
                  <p className="text-xs text-slate-400 font-medium">Accuracy Rate</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-1 font-mono">
                    {globalStats.accuracy}%
                  </p>
                  <p className="text-[10px] text-slate-500 mt-3 font-semibold uppercase">
                    {globalStats.correct} Correct / {globalStats.incorrect} Incorrect
                  </p>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 shadow-md">
                  <p className="text-xs text-slate-400 font-medium">Total Study Time</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-400 mt-1 font-mono">
                    {formatHours(globalStats.totalSeconds)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-3 font-semibold uppercase">
                    Active timing logged
                  </p>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 shadow-md">
                  <p className="text-xs text-slate-400 font-medium">Bookmarked Qs</p>
                  <p className="text-xl md:text-2xl font-bold text-purple-400 mt-1 font-mono">
                    {globalStats.bookmarks}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-3 font-semibold uppercase">
                    Saved for future review
                  </p>
                </div>
              </div>

              {/* Category Showcase Cards */}
              <div className="space-y-4 pt-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <BookMarked size={18} className="text-indigo-400" />
                  <span>Syllabus Category Progress</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderCategoryCards()}
                </div>
              </div>

              {/* Dashboard Credit Footer */}
              <div className="border-t border-slate-900 pt-6 pb-2 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <span>Created with</span>
                  <span className="text-rose-500 animate-pulse">❤️</span>
                  <span>by</span>
                  <span className="text-slate-350 hover:text-indigo-400 font-semibold transition-colors duration-250">Dharav Antani</span>
                </div>
                <p className="text-[10px] text-slate-600 font-mono">BIXTracker © {new Date().getFullYear()} — All rights reserved.</p>
              </div>
            </div>
          ) : activeTab === "settings" ? (
            /* --- SETTINGS / BACKUP VIEW --- */
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Settings & Data Backup
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Manage your progress trackers, export backups, or reset your local database.
                </p>
              </div>

              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
                <div>
                  <h3 className="font-bold text-slate-200 text-sm mb-1">Import / Export Workspace</h3>
                  <p className="text-xs text-slate-500">
                    Export your tracking history as a local JSON file to save your progress, or import a previous backup file to restore it.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={handleExportData}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Export Backup (.json)</span>
                    </button>

                    <label className="flex-1 border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none">
                      <Upload size={15} />
                      <span>Import Backup (.json)</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div>
                  <h3 className="font-bold text-rose-400 text-sm mb-1">Reset Tracker</h3>
                  <p className="text-xs text-slate-500">
                    Completely erase all progress markers, time metrics, saved questions, logs, and bookmarks. This operation cannot be reversed.
                  </p>

                  <button
                    onClick={handleResetData}
                    className="mt-4 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>Erase All Data</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* --- TOPIC WORKSPACE VIEW --- */
            activeTopicInfo && (
              <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
                {/* Left Side: Question Grid & Stats */}
                <div className="flex-1 space-y-5">
                  {/* Topic Header Card */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                          <span>{activeTopicInfo.cat.name}</span>
                          <span>•</span>
                          <span>{activeTopicInfo.subcat.name}</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">{activeTopicInfo.topic.name}</h2>
                      </div>

                      <a
                        href={getIndiaBixUrl(
                          activeTopicInfo.cat.id,
                          activeTopicInfo.subcat.id,
                          activeTopicInfo.topic.id
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
                      >
                        <span>IndiaBIX Link</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    {/* Progress Bar Row */}
                    {(() => {
                      const stats = getTopicStats(
                        activeTopicInfo.topic.id,
                        activeTopicInfo.topic.defaultCount
                      );
                      return (
                        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                              <span>Topic Solved Progress</span>
                              <span className="font-semibold text-slate-200">
                                {stats.solved} / {activeTopicInfo.topic.defaultCount} ({stats.progressPercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.progressPercent}%` }}
                              ></div>
                            </div>
                          </div>

                          <button
                            onClick={handleJumpToNextUnsolved}
                            className="bg-indigo-600/10 hover:bg-indigo-600/20 active:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Jump to Unsolved</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Filter & Selector bar */}
                  <div className="flex items-center justify-between bg-slate-900/15 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                    <span className="text-slate-400 font-medium">Questions Grid</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Filter:</span>
                      {[
                        { id: "all", label: "All" },
                        { id: "correct", label: "Correct", color: "text-emerald-400" },
                        { id: "incorrect", label: "Incorrect", color: "text-rose-400" },
                        { id: "bookmark", label: "Bookmarks", color: "text-purple-400" },
                        { id: "inprogress", label: "In Progress", color: "text-amber-400" },
                        { id: "unsolved", label: "Unsolved", color: "text-slate-400" }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setQuestionFilter(f.id)}
                          className={`px-2 py-1 rounded transition-all font-medium ${
                            questionFilter === f.id
                              ? "bg-slate-800 text-slate-100"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className={f.color}>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Buttons Matrix Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                    {Array.from({ length: activeTopicInfo.topic.defaultCount }).map((_, i) => {
                      const qNum = i + 1;
                      const qState = progress[activeTopicInfo.topic.id]?.[qNum] || {};
                      const isSel = activeQuestion === qNum;

                      // Filter validation
                      if (questionFilter === "correct" && qState.status !== "correct") return null;
                      if (questionFilter === "incorrect" && qState.status !== "incorrect") return null;
                      if (questionFilter === "bookmark" && qState.status !== "bookmark") return null;
                      if (questionFilter === "inprogress" && qState.status !== "inprogress") return null;
                      if (questionFilter === "unsolved" && qState.status) return null;

                      // Style resolution
                      let styleClasses = "border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200";
                      let IndicatorComp = null;

                      if (qState.status === "correct") {
                        styleClasses = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
                        IndicatorComp = <Check size={8} strokeWidth={4} />;
                      } else if (qState.status === "incorrect") {
                        styleClasses = "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20";
                        IndicatorComp = <X size={8} strokeWidth={4} />;
                      } else if (qState.status === "bookmark") {
                        styleClasses = "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20";
                        IndicatorComp = <Bookmark size={8} />;
                      } else if (qState.status === "inprogress") {
                        styleClasses = "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse";
                        IndicatorComp = <Clock size={8} />;
                      }

                      if (isSel) {
                        styleClasses += " ring-2 ring-indigo-500 border-transparent scale-105";
                      }

                      return (
                        <button
                          key={qNum}
                          onClick={() => handleSelectQuestion(qNum)}
                          className={`h-11 rounded-xl flex flex-col items-center justify-center relative font-semibold font-mono text-xs transition-all duration-200 cursor-pointer ${styleClasses}`}
                        >
                          <span>{qNum}</span>
                          {IndicatorComp && (
                            <span className="absolute bottom-1 flex items-center justify-center">
                              {IndicatorComp}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Active Question Details Workspace */}
                <div className="w-full lg:w-96 flex-shrink-0">
                  {activeQuestion ? (
                    <div className="bg-slate-900/35 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg relative overflow-hidden">
                      {/* Active indicator */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-base">
                          Question {activeQuestion} Details
                        </h3>
                        <a
                          href={getIndiaBixUrl(
                            activeTopicInfo.cat.id,
                            activeTopicInfo.subcat.id,
                            activeTopicInfo.topic.id,
                            activeQuestion
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 rounded"
                        >
                          <span>QA Page</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>

                      {/* Navigation buttons: Prev and Next */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            if (activeQuestion > 1) {
                              handleSelectQuestion(activeQuestion - 1);
                            }
                          }}
                          disabled={activeQuestion <= 1}
                          className="flex-1 bg-slate-800/60 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-800/60 text-slate-200 disabled:text-slate-500 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700/30"
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>
                        <button
                          onClick={() => {
                            if (activeQuestion < activeTopicInfo.topic.defaultCount) {
                              handleSelectQuestion(activeQuestion + 1);
                            }
                          }}
                          disabled={activeQuestion >= activeTopicInfo.topic.defaultCount}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white disabled:text-indigo-400/60 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Next Question</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Status selectors */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          Mark Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSetStatus("correct")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              progress[activeTopicInfo.topic.id]?.[activeQuestion]?.status === "correct"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold"
                                : "bg-slate-800/40 text-slate-400 border-slate-850 hover:bg-slate-800/80"
                            }`}
                          >
                            <Check size={13} strokeWidth={3} />
                            <span>Correct</span>
                          </button>

                          <button
                            onClick={() => handleSetStatus("incorrect")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              progress[activeTopicInfo.topic.id]?.[activeQuestion]?.status === "incorrect"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold"
                                : "bg-slate-800/40 text-slate-400 border-slate-850 hover:bg-slate-800/80"
                            }`}
                          >
                            <X size={13} strokeWidth={3} />
                            <span>Incorrect</span>
                          </button>

                          <button
                            onClick={() => handleSetStatus("bookmark")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              progress[activeTopicInfo.topic.id]?.[activeQuestion]?.status === "bookmark"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/40 font-bold"
                                : "bg-slate-800/40 text-slate-400 border-slate-850 hover:bg-slate-800/80"
                            }`}
                          >
                            <Bookmark size={13} />
                            <span>Bookmark</span>
                          </button>

                          <button
                            onClick={() => handleSetStatus("inprogress")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              progress[activeTopicInfo.topic.id]?.[activeQuestion]?.status === "inprogress"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/40 font-bold"
                                : "bg-slate-800/40 text-slate-400 border-slate-850 hover:bg-slate-800/80"
                            }`}
                          >
                            <Clock size={13} />
                            <span>In Progress</span>
                          </button>
                        </div>

                        {progress[activeTopicInfo.topic.id]?.[activeQuestion]?.status && (
                          <button
                            onClick={() => handleSetStatus("unsolved")}
                            className="w-full text-center text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase tracking-wider py-1 mt-1 transition-colors"
                          >
                            Clear marked status
                          </button>
                        )}
                      </div>

                      {/* Timer details */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                            <Clock size={16} />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">
                              Solving Timer
                            </span>
                            <span className="text-xl font-mono font-bold text-white mt-0.5 block">
                              {formatTime(timer)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setTimerRunning(!timerRunning)}
                            className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-lg text-indigo-400 transition-colors"
                          >
                            {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button
                            onClick={() => setTimer(0)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            My Notes / Scratchpad
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => applyNoteTemplate("formula")}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded transition-all"
                            >
                              + Formula
                            </button>
                            <button
                              onClick={() => applyNoteTemplate("mistake")}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded transition-all"
                            >
                              + Mistake
                            </button>
                            <button
                              onClick={() => applyNoteTemplate("shortcut")}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 rounded transition-all"
                            >
                              + Shortcut
                            </button>
                          </div>
                        </div>

                        <textarea
                          placeholder="Write down formulas, key takeaways, solutions or explanations here..."
                          value={noteBuffer}
                          onChange={(e) => setNoteBuffer(e.target.value)}
                          rows={6}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-all font-mono"
                        />

                        <button
                          onClick={handleSaveNotes}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                        >
                          <Save size={14} />
                          <span>Save Notes</span>
                        </button>
                      </div>

                      {/* Summary stats for active question */}
                      {progress[activeTopicInfo.topic.id]?.[activeQuestion] && (
                        <div className="text-[10px] text-slate-500 space-y-0.5 font-semibold pt-1 border-t border-slate-850">
                          <p>
                            Accumulated Time:{" "}
                            <span className="text-slate-400 font-mono">
                              {formatTime(
                                progress[activeTopicInfo.topic.id]?.[activeQuestion]?.timeSpent || 0
                              )}
                            </span>
                          </p>
                          <p>
                            Last Updated:{" "}
                            <span className="text-slate-400 font-mono">
                              {new Date(
                                progress[activeTopicInfo.topic.id]?.[activeQuestion]?.lastModified
                              ).toLocaleString()}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-900/10 border border-slate-800/80 border-dashed rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center justify-center h-64">
                      <Award size={36} className="text-slate-700 mb-3" />
                      <h4 className="font-bold text-slate-400 text-sm">Select a Question</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Click on any question square in the grid to view note buffers, set status timers, and see discussion page options.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
