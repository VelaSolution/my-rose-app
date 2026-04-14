"use client";
import { useState, useEffect } from "react";
import { HQRole, SurveyItem, SurveyQuestion, SurveyResponse } from "@/app/hq/types";
import { sb, today } from "@/app/hq/utils";
import SurveyList from "@/app/hq/components/survey/SurveyList";
import SurveyCreate from "@/app/hq/components/survey/SurveyCreate";
import SurveyAnswer from "@/app/hq/components/survey/SurveyAnswer";
import SurveyResult from "@/app/hq/components/survey/SurveyResult";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

type View = "list" | "create" | "answer" | "result";

export default function SurveyTab({ userId, userName, myRole, flash }: Props) {
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);

  // Create form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  // Answer form
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const loadSurveys = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const todayStr = today();
        const mapped = data.map((d: any) => ({
          id: d.id,
          title: d.title ?? "",
          description: d.description ?? "",
          author: d.author ?? "",
          deadline: d.deadline ?? "",
          status: d.status ?? "진행중",
          questions: d.questions ?? [],
          responses: d.responses ?? 0,
          date: d.created_at?.slice(0, 10) ?? todayStr,
        }));

        const expiredIds: string[] = [];
        for (const survey of mapped) {
          if (survey.deadline < todayStr && survey.status !== "마감") {
            survey.status = "마감";
            expiredIds.push(survey.id);
          }
        }
        if (expiredIds.length > 0) {
          for (const id of expiredIds) {
            await s.from("hq_surveys").update({ status: "마감" }).eq("id", id);
          }
        }

        setSurveys(mapped);
      }
    } catch (e) {
      console.error("SurveyTab loadSurveys error:", e);
    }
  };

  const loadResponses = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_survey_responses").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (data) {
        setResponses(data.map((d: any) => ({
          id: d.id,
          surveyId: d.survey_id ?? "",
          answers: d.answers ?? {},
          respondent: d.respondent ?? "",
          date: d.created_at?.slice(0, 10) ?? today(),
        })));
      }
    } catch (e) {
      console.error("SurveyTab loadResponses error:", e);
    }
  };

  const loadTeamCount = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { count } = await s.from("hq_team").select("*", { count: "exact", head: true });
      setTeamCount(count ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadSurveys();
    loadResponses();
    loadTeamCount();
  }, []);

  const createSurvey = async () => {
    if (!title.trim()) { flash("제목을 입력하세요"); return; }
    if (questions.length === 0) { flash("질문을 추가하세요"); return; }
    if (!deadline) { flash("마감일을 설정하세요"); return; }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_surveys").insert({
        title: title.trim(),
        description: desc.trim(),
        author: userName,
        deadline,
        status: deadline > today() ? "진행중" : "마감",
        questions,
        responses: 0,
      });
      if (error) throw error;
      await loadSurveys();
      flash("설문이 생성되었습니다");
      setTitle(""); setDesc(""); setDeadline(""); setQuestions([]);
      setView("list");
    } catch (e) {
      console.error("createSurvey error:", e);
      flash("설문 생성 실패");
    }
  };

  const openAnswer = (id: string) => {
    const already = responses.find(r => r.surveyId === id && r.respondent === userName);
    if (already) { flash("이미 참여한 설문입니다"); return; }
    setSelectedId(id);
    setAnswers({});
    setView("answer");
  };

  const submitAnswer = async () => {
    if (!selectedId) return;
    const survey = surveys.find(s => s.id === selectedId);
    if (!survey) return;
    for (const q of survey.questions) {
      const a = answers[q.id];
      if (!a || (Array.isArray(a) && a.length === 0) || (typeof a === "string" && !a.trim())) {
        flash("모든 질문에 답변해 주세요"); return;
      }
    }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_survey_responses").insert({
        survey_id: selectedId,
        respondent: userName,
        answers,
      });
      if (error) throw error;
      await s.from("hq_surveys").update({ responses: (survey.responses ?? 0) + 1 }).eq("id", selectedId);
      await loadSurveys();
      await loadResponses();
      flash("설문 제출 완료");
      setView("list");
    } catch (e) {
      console.error("submitAnswer error:", e);
      flash("설문 제출 실패");
    }
  };

  const openResult = (id: string) => {
    setSelectedId(id);
    setView("result");
  };

  const selected = surveys.find(s => s.id === selectedId);
  const surveyResponses = responses.filter(r => r.surveyId === selectedId);

  const exportCsv = () => {
    if (!selected) return;
    const headers = ["응답자", "날짜", ...selected.questions.map(q => q.question)];
    const rows = surveyResponses.map(r => {
      const row = [r.respondent, r.date];
      for (const q of selected.questions) {
        const a = r.answers[q.id];
        row.push(Array.isArray(a) ? a.join("; ") : String(a ?? ""));
      }
      return row;
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `설문결과_${selected.title}_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash("CSV 다운로드 완료");
  };

  const responseRate = (surveyResCount: number) => {
    if (teamCount === 0) return null;
    const pct = Math.round((surveyResCount / teamCount) * 100);
    return { pct, total: teamCount };
  };

  // ---- VIEWS ----
  if (view === "create") {
    return (
      <SurveyCreate
        title={title} setTitle={setTitle}
        desc={desc} setDesc={setDesc}
        deadline={deadline} setDeadline={setDeadline}
        questions={questions} setQuestions={setQuestions}
        onBack={() => setView("list")}
        onSubmit={createSurvey}
      />
    );
  }

  if (view === "answer" && selected) {
    return (
      <SurveyAnswer
        survey={selected}
        answers={answers}
        setAnswers={setAnswers}
        onBack={() => setView("list")}
        onSubmit={submitAnswer}
      />
    );
  }

  if (view === "result" && selected) {
    return (
      <SurveyResult
        survey={selected}
        responses={surveyResponses}
        responseRate={responseRate(surveyResponses.length)}
        onBack={() => setView("list")}
        onExportCsv={exportCsv}
      />
    );
  }

  // ---- LIST VIEW ----
  return (
    <SurveyList
      surveys={surveys}
      responses={responses}
      userName={userName}
      responseRate={responseRate}
      onOpenCreate={() => setView("create")}
      onOpenAnswer={openAnswer}
      onOpenResult={openResult}
    />
  );
}
