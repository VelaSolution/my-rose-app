"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { HQRole, AttendanceRecord } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  "정상": "bg-emerald-50 text-emerald-700",
  "지각": "bg-amber-50 text-amber-700",
  "조퇴": "bg-orange-50 text-orange-700",
  "결근": "bg-red-50 text-red-700",
  "휴가": "bg-blue-50 text-blue-700",
  "출장": "bg-purple-50 text-purple-700",
};

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function diffHours(a: string, b: string, nextDay = false): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let diff = bh + bm / 60 - ah - am / 60;
  if (diff < 0 || nextDay) diff += 24; // 익일 퇴근
  return Math.max(0, +(diff.toFixed(1)));
}

function getMonthDates(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const dates: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// GPS 거리 계산 (Haversine formula, 미터 단위)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type OfficeLocation = { lat: number; lng: number; radius: number; wifiSSID?: string };

type TeamMember = { name: string; role: string };

// 분기 계산 유틸
function getQuarterDates(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3;
  const first = new Date(year, startMonth, 1);
  const last = new Date(year, startMonth + 3, 0);
  const dates: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

export default function AttendanceTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [now, setNow] = useState(new Date());
  const [memo, setMemo] = useState("");
  const [viewMode, setViewMode] = useState<"my" | "team">("my");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canViewTeam = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  // 검색 및 날짜 필터
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // 출근 기준 시간 설정
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [editStartTime, setEditStartTime] = useState(false);
  const [tempStartTime, setTempStartTime] = useState("09:00");

  // GPS/위치 기반 출퇴근
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [showOfficeSettings, setShowOfficeSettings] = useState(false);
  const [officeLat, setOfficeLat] = useState("");
  const [officeLng, setOfficeLng] = useState("");
  const [officeRadius, setOfficeRadius] = useState("200");
  const [officeWifiSSID, setOfficeWifiSSID] = useState("");
  const [currentWifi, setCurrentWifi] = useState<string | null>(null);

  const canEditOffice = myRole === "대표" || myRole === "이사";

  const loadWorkStartTime = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_settings").select("value").eq("key", "work_start_time").single();
      if (error) { console.error("hq_settings 로드 실패 (테이블 미생성?):", error.message); return; }
      if (data?.value) { setWorkStartTime(data.value); setTempStartTime(data.value); }
    } catch (e) { console.error("hq_settings 테이블 없음:", e); }
  };

  const saveWorkStartTime = async () => {
    const s = sb();
    if (!s) return;
    try {
      // 먼저 update 시도
      const { data: existing } = await s.from("hq_settings").select("key").eq("key", "work_start_time").single();
      let error;
      if (existing) {
        ({ error } = await s.from("hq_settings").update({ value: tempStartTime, updated_by: userName, updated_at: new Date().toISOString() }).eq("key", "work_start_time"));
      } else {
        ({ error } = await s.from("hq_settings").insert({ key: "work_start_time", value: tempStartTime, updated_by: userName, updated_at: new Date().toISOString() }));
      }
      if (error) { flash("저장 실패: " + error.message); return; }
      setWorkStartTime(tempStartTime);
      setEditStartTime(false);
      flash(`출근 기준 시간이 ${tempStartTime}으로 변경되었습니다`);
    } catch (e) {
      flash("저장 실패: hq_settings 테이블을 확인해주세요");
      console.error(e);
    }
  };

  // 사업장 위치 로드
  const loadOfficeLocation = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s.from("hq_settings").select("value").eq("key", "office_location").single();
      if (data?.value) {
        const loc = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setOfficeLocation(loc);
        setOfficeLat(String(loc.lat));
        setOfficeLng(String(loc.lng));
        setOfficeRadius(String(loc.radius));
        setOfficeWifiSSID(loc.wifiSSID || "");
      }
    } catch (e) { console.error("사업장 위치 로드 실패:", e); }
  };

  // 사업장 위치 저장
  const saveOfficeLocation = async () => {
    const s = sb();
    if (!s) return;
    const lat = parseFloat(officeLat);
    const lng = parseFloat(officeLng);
    const radius = parseInt(officeRadius);
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) { flash("위도, 경도, 반경을 올바르게 입력해주세요"); return; }
    const value = JSON.stringify({ lat, lng, radius, wifiSSID: officeWifiSSID.trim() || undefined });
    try {
      const { data: existing } = await s.from("hq_settings").select("key").eq("key", "office_location").single();
      let error;
      if (existing) {
        ({ error } = await s.from("hq_settings").update({ value, updated_by: userName, updated_at: new Date().toISOString() }).eq("key", "office_location"));
      } else {
        ({ error } = await s.from("hq_settings").insert({ key: "office_location", value, updated_by: userName, updated_at: new Date().toISOString() }));
      }
      if (error) { flash("저장 실패: " + error.message); return; }
      setOfficeLocation({ lat, lng, radius, wifiSSID: officeWifiSSID.trim() || undefined });
      setShowOfficeSettings(false);
      flash("사업장 위치가 저장되었습니다");
    } catch (e) {
      flash("저장 실패");
      console.error(e);
    }
  };

  // GPS 위치 가져오기
  const getGPSLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("GPS를 지원하지 않는 브라우저입니다")); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === 1) reject(new Error("위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요"));
          else if (err.code === 2) reject(new Error("위치 정보를 사용할 수 없습니다"));
          else reject(new Error("위치 요청 시간 초과"));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // WiFi 정보 확인 (가능한 경우)
  const checkWifi = () => {
    try {
      const conn = (navigator as any).connection;
      if (conn && conn.type === "wifi") {
        // WiFi SSID는 보안상 대부분의 브라우저에서 접근 불가
        // Network Information API는 type만 제공
        setCurrentWifi("WiFi 연결됨 (SSID 확인 불가 - 브라우저 제한)");
      } else if (conn) {
        setCurrentWifi(`${conn.type || "알 수 없음"} 연결`);
      } else {
        setCurrentWifi(null);
      }
    } catch {
      setCurrentWifi(null);
    }
  };

  // 위치 기반 출근
  const clockInWithGPS = async () => {
    if (todayRec?.clockIn) { flash("이미 출근 기록이 있습니다"); return; }
    setGpsLoading(true);
    try {
      const loc = await getGPSLocation();
      setUserLocation(loc);
      let distance: number | null = null;
      let isWithinRadius = false;
      if (officeLocation) {
        distance = haversineDistance(loc.lat, loc.lng, officeLocation.lat, officeLocation.lng);
        setDistanceToOffice(distance);
        isWithinRadius = distance <= officeLocation.radius;
      }

      const s = sb();
      if (!s) { setGpsLoading(false); return; }
      const time = now.toTimeString().slice(0, 5);
      const isLate = time > workStartTime;
      const timestamp = new Date().toISOString();

      // 사업장 외부 경고
      if (officeLocation && !isWithinRadius) {
        const ok = confirm(`사업장 외부에서 출근합니다 (거리: ${Math.round(distance!)}m). 계속하시겠습니까?`);
        if (!ok) { setGpsLoading(false); return; }
      }

      const { error } = await s.from("hq_attendance").upsert({
        user_id: userId, user_name: userName, date: todayStr,
        clock_in: timestamp, status: isLate ? "지각" : "정상", memo: memo.trim() || null,
        latitude: loc.lat, longitude: loc.lng,
      }, { onConflict: "user_id,date" });
      if (error) { flash("저장 실패: " + error.message); setGpsLoading(false); return; }
      const locationMsg = officeLocation
        ? isWithinRadius
          ? ` - 사업장 내 (${Math.round(distance!)}m)`
          : ` - 사업장 외부 (${Math.round(distance!)}m)`
        : "";
      flash(`위치 기반 출근 완료 (${time})${locationMsg}`);
      setMemo("");
      loadData();
    } catch (e: any) {
      flash(e.message || "위치 정보 획득 실패");
    }
    setGpsLoading(false);
  };

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Load data from Supabase
  const loadData = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s.from("hq_attendance").select("*").order("date", { ascending: false });
      if (data) {
        const toTime = (ts: string | null) => {
          if (!ts) return "";
          try { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; }
        };
        setRecords(data.map((r: any) => ({
          id: r.id, date: r.date, clockIn: toTime(r.clock_in), clockOut: toTime(r.clock_out),
          status: r.status || "정상", overtime: r.overtime || 0, memo: r.memo || "", userName: r.user_name || "",
          latitude: r.latitude ?? null, longitude: r.longitude ?? null,
        })));
      }
    } catch {}
    if (canViewTeam) {
      try {
        const { data: td } = await s.from("hq_team").select("name, role").order("created_at", { ascending: true });
        if (td) setTeamMembers(td as TeamMember[]);
      } catch {}
    }
  };

  useEffect(() => { loadData(); loadWorkStartTime(); loadOfficeLocation(); checkWifi(); }, []);

  const [editClockOut, setEditClockOut] = useState(false);
  const [editClockOutTime, setEditClockOutTime] = useState("");

  // 대표 전용: 출퇴근시간 수정
  const [editClockInId, setEditClockInId] = useState<string | null>(null);
  const [editClockInTime, setEditClockInTime] = useState("");
  const [editClockOutId, setEditClockOutId] = useState<string | null>(null);
  const [editClockOutTimeTeam, setEditClockOutTimeTeam] = useState("");

  // 본인 과거 퇴근시간 수정
  const [editPastClockOutId, setEditPastClockOutId] = useState<string | null>(null);
  const [editPastClockOutTime, setEditPastClockOutTime] = useState("");

  const updateClockIn = async (recId: string) => {
    if (!editClockInTime) return;
    const s = sb();
    if (!s) return;
    const rec = records.find(r => r.id === recId);
    if (!rec) return;
    const [h, m] = editClockInTime.split(":").map(Number);
    const d = new Date(`${rec.date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    const isLate = editClockInTime > workStartTime;
    const newStatus = isLate ? "지각" : (rec.status === "지각" ? "정상" : rec.status);
    const { error } = await s.from("hq_attendance").update({
      clock_in: d.toISOString(), status: newStatus,
    }).eq("id", recId);
    if (error) { flash("수정 실패: " + error.message); return; }
    flash(`출근 시간 수정 완료 (${editClockInTime})`);
    setEditClockInId(null);
    loadData();
  };

  const updateClockOutTeam = async (recId: string) => {
    if (!editClockOutTimeTeam) return;
    const s = sb();
    if (!s) return;
    const rec = records.find(r => r.id === recId);
    if (!rec) return;
    const [h, m] = editClockOutTimeTeam.split(":").map(Number);
    const d = new Date(`${rec.date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    const nextDay = editClockOutTimeTeam < rec.clockIn;
    const hours = diffHours(rec.clockIn, editClockOutTimeTeam, nextDay);
    const isEarly = !nextDay && editClockOutTimeTeam < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && rec.status !== "지각" ? "조퇴" : rec.status;
    const { error } = await s.from("hq_attendance").update({
      clock_out: d.toISOString(), overtime, status: newStatus,
    }).eq("id", recId);
    if (error) { flash("수정 실패: " + error.message); return; }
    flash(`퇴근 시간 수정 완료 (${editClockOutTimeTeam})`);
    setEditClockOutId(null);
    loadData();
  };

  // 본인 과거 퇴근시간 저장 (최대 7일 이내)
  const savePastClockOut = async (recId: string) => {
    if (!editPastClockOutTime) return;
    const s = sb();
    if (!s) return;
    const rec = records.find(r => r.id === recId);
    if (!rec) return;
    // 7일 이내 확인
    const recDate = new Date(`${rec.date}T00:00:00`);
    const nowDate = new Date();
    const diffDays = Math.floor((nowDate.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) { flash("7일이 지난 기록은 수정할 수 없습니다"); return; }
    const [h, m] = editPastClockOutTime.split(":").map(Number);
    const d = new Date(`${rec.date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    const nextDay = editPastClockOutTime < rec.clockIn;
    const hours = diffHours(rec.clockIn, editPastClockOutTime, nextDay);
    const isEarly = !nextDay && editPastClockOutTime < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && rec.status !== "지각" ? "조퇴" : rec.status;
    const { error } = await s.from("hq_attendance").update({
      clock_out: d.toISOString(), overtime, status: newStatus,
    }).eq("id", recId);
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`${rec.date} 퇴근시간 입력 완료 (${editPastClockOutTime})`);
    setEditPastClockOutId(null);
    setEditPastClockOutTime("");
    loadData();
  };

  const todayStr = today();
  // 오늘 출근 기록 또는 어제 미퇴근 기록 (익일 퇴근 대응)
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const todayRec = records.find(r => r.date === todayStr && r.userName === userName)
    || records.find(r => r.date === yesterdayStr && r.userName === userName && r.clockIn && !r.clockOut);
  const isNextDayClockOut = todayRec?.date === yesterdayStr;

  const clockIn = async () => {
    if (todayRec?.clockIn) { flash("이미 출근 기록이 있습니다"); return; }
    const s = sb();
    if (!s) return;
    const time = now.toTimeString().slice(0, 5);
    const isLate = time > workStartTime;
    const timestamp = new Date().toISOString();
    const { error } = await s.from("hq_attendance").upsert({
      user_id: userId, user_name: userName, date: todayStr,
      clock_in: timestamp, status: isLate ? "지각" : "정상", memo: memo.trim() || null,
    }, { onConflict: "user_id,date" });
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`출근 완료 (${time})`);
    setMemo("");
    loadData();
  };

  const clockOut = async () => {
    if (!todayRec) { flash("출근 기록이 없습니다"); return; }
    if (todayRec.clockOut) { flash("이미 퇴근 기록이 있습니다"); return; }
    const s = sb();
    if (!s) return;
    const time = now.toTimeString().slice(0, 5);
    const hours = diffHours(todayRec.clockIn, time, isNextDayClockOut);
    // 익일 퇴근이면 조퇴 아님
    const isEarly = !isNextDayClockOut && time < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && todayRec.status !== "지각" ? "조퇴" : todayRec.status;
    const timestamp = new Date().toISOString();
    const { error } = await s.from("hq_attendance").update({
      clock_out: timestamp, overtime, status: newStatus,
    }).eq("id", todayRec.id);
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`퇴근 완료 (${time}) - ${hours}시간 근무${isNextDayClockOut ? " (익일)" : ""}`);
    loadData();
  };

  const updateClockOut = async () => {
    if (!todayRec || !editClockOutTime) return;
    const s = sb();
    if (!s) return;
    const [h, m] = editClockOutTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    // 수정 시간이 출근보다 이르면 익일로 판단
    const editNextDay = isNextDayClockOut || editClockOutTime < todayRec.clockIn;
    const hours = diffHours(todayRec.clockIn, editClockOutTime, editNextDay);
    const isEarly = !editNextDay && editClockOutTime < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && todayRec.status !== "지각" ? "조퇴" : todayRec.status;
    const { error } = await s.from("hq_attendance").update({
      clock_out: d.toISOString(), overtime, status: newStatus,
    }).eq("id", todayRec.id);
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`퇴근 시간 수정 완료 (${editClockOutTime})`);
    setEditClockOut(false);
    loadData();
  };

  // Week records
  const weekDates = getWeekDates();
  const weekRecords = weekDates.map(d => records.find(r => r.date === d && r.userName === userName));

  // Monthly stats
  const monthDates = getMonthDates();
  const monthRecords = records.filter(r => monthDates.includes(r.date) && r.userName === userName);
  const totalWorkDays = monthRecords.filter(r => r.clockIn).length;
  const lateCount = monthRecords.filter(r => r.status === "지각").length;
  const overtimeTotal = monthRecords.reduce((a, r) => a + r.overtime, 0);
  const absenceCount = monthRecords.filter(r => r.status === "결근").length;

  const totalHoursToday = todayRec?.clockIn
    ? diffHours(todayRec.clockIn, todayRec.clockOut || now.toTimeString().slice(0, 5), isNextDayClockOut)
    : 0;

  // 미입력 퇴근시간: 출근했지만 퇴근 미입력 (7일 이내, 본인 기록, 오늘 제외)
  const missingClockOutRecords = useMemo(() => {
    const nowDate = new Date();
    return records.filter(r => {
      if (r.userName !== userName) return false;
      if (!r.clockIn || r.clockOut) return false;
      if (r.date === todayStr) return false;
      const recDate = new Date(`${r.date}T00:00:00`);
      const diffDays = Math.floor((nowDate.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 1;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, userName, todayStr]);

  // 전 직원 오늘 현황
  const todayAllRecords = records.filter(r => r.date === todayStr);
  const allNames = [...new Set([...teamMembers.map(m => m.name), ...todayAllRecords.map(r => r.userName)])];

  // 전 직원 이번 주 현황
  const teamWeekData = allNames.map(name => ({
    name,
    role: teamMembers.find(m => m.name === name)?.role ?? "",
    week: weekDates.map(d => records.find(r => r.date === d && r.userName === name)),
    monthStats: {
      workDays: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.clockIn).length,
      late: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.status === "지각").length,
      overtime: records.filter(r => monthDates.includes(r.date) && r.userName === name).reduce((a, r) => a + r.overtime, 0),
      absence: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.status === "결근").length,
    },
  }));

  // 필터 적용된 레코드
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (searchQuery && !r.userName.includes(searchQuery)) return false;
      if (filterStartDate && r.date < filterStartDate) return false;
      if (filterEndDate && r.date > filterEndDate) return false;
      return true;
    });
  }, [records, searchQuery, filterStartDate, filterEndDate]);

  const filteredTodayAllRecords = useMemo(() => {
    return todayAllRecords.filter(r => {
      if (searchQuery && !r.userName.includes(searchQuery)) return false;
      return true;
    });
  }, [todayAllRecords, searchQuery]);

  const filteredAllNames = useMemo(() => {
    if (!searchQuery) return allNames;
    return allNames.filter(name => name.includes(searchQuery));
  }, [allNames, searchQuery]);

  const filteredTeamWeekData = useMemo(() => {
    return teamWeekData.filter(tw => {
      if (searchQuery && !tw.name.includes(searchQuery)) return false;
      return true;
    });
  }, [teamWeekData, searchQuery]);

  const filteredCount = viewMode === "my"
    ? filteredRecords.filter(r => r.userName === userName).length
    : filteredRecords.length;

  // 분기별 통계 계산
  const currentYear = new Date().getFullYear();
  const currentQuarter = getCurrentQuarter();
  const quarterlyStats = useMemo(() => {
    return [1, 2, 3, 4].map(q => {
      const qDates = getQuarterDates(currentYear, q);
      const qRecords = records.filter(r => qDates.includes(r.date) && r.userName === userName);
      return {
        quarter: q,
        label: `${q}분기`,
        workDays: qRecords.filter(r => r.clockIn).length,
        late: qRecords.filter(r => r.status === "지각").length,
        earlyLeave: qRecords.filter(r => r.status === "조퇴").length,
        absence: qRecords.filter(r => r.status === "결근").length,
        leave: qRecords.filter(r => r.status === "휴가").length,
        overtime: qRecords.reduce((a, r) => a + r.overtime, 0),
        isCurrent: q === currentQuarter,
      };
    });
  }, [records, userName, currentYear, currentQuarter]);

  // 월별 리포트 출력
  const handlePrintReport = () => {
    const nowDate = new Date();
    const yyyy = nowDate.getFullYear();
    const mm = String(nowDate.getMonth() + 1).padStart(2, "0");
    const monthName = `${yyyy}년 ${Number(mm)}월`;
    const generatedDate = nowDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

    // 통계 계산
    const earlyLeaveCount = monthRecords.filter(r => r.status === "조퇴").length;
    const leaveCount = monthRecords.filter(r => r.status === "휴가").length;

    // 일별 상세 데이터
    const dailyRows = monthDates.map(d => {
      const rec = monthRecords.find(r => r.date === d);
      const dayOfWeek = new Date(d).toLocaleDateString("ko-KR", { weekday: "short" });
      const isWeekend = [0, 6].includes(new Date(d).getDay());
      if (!rec) {
        return { date: d, dayOfWeek, clockIn: "-", clockOut: "-", hours: "-", status: isWeekend ? "-" : "미출근", memo: "", isWeekend };
      }
      const hours = rec.clockIn && rec.clockOut ? diffHours(rec.clockIn, rec.clockOut).toFixed(1) + "h" : "-";
      return { date: d, dayOfWeek, clockIn: rec.clockIn || "-", clockOut: rec.clockOut || "-", hours, status: rec.status, memo: rec.memo || "", isWeekend };
    });

    const member = teamMembers.find(m => m.name === userName);
    const department = member?.role ?? "-";

    const printWindow = window.open("", "_blank");
    if (!printWindow) { flash("팝업이 차단되었습니다. 팝업을 허용해주세요."); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>근태 월별 리포트 - ${monthName}</title>
  <style>
    @media print {
      @page { margin: 15mm 12mm; size: A4; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.5; background: #fff; }
    .container { max-width: 210mm; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #3182F6; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .header .company { font-size: 14px; color: #3182F6; font-weight: 600; margin-bottom: 8px; }
    .header .period { font-size: 13px; color: #64748b; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; padding-left: 10px; border-left: 3px solid #3182F6; }
    .summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 24px; }
    .summary-item { text-align: center; padding: 12px 8px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .summary-item .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .summary-item .value { font-size: 20px; font-weight: 800; }
    .summary-item.green { background: #f0fdf4; } .summary-item.green .value { color: #16a34a; }
    .summary-item.amber { background: #fffbeb; } .summary-item.amber .value { color: #d97706; }
    .summary-item.orange { background: #fff7ed; } .summary-item.orange .value { color: #ea580c; }
    .summary-item.red { background: #fef2f2; } .summary-item.red .value { color: #dc2626; }
    .summary-item.blue { background: #eff6ff; } .summary-item.blue .value { color: #2563eb; }
    .summary-item.purple { background: #faf5ff; } .summary-item.purple .value { color: #7c3aed; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 8px 6px; text-align: center; border: 1px solid #e2e8f0; }
    td { padding: 6px; text-align: center; border: 1px solid #e2e8f0; }
    tr.weekend { background: #f8fafc; color: #94a3b8; }
    .status-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .status-정상 { background: #dcfce7; color: #16a34a; }
    .status-지각 { background: #fef3c7; color: #d97706; }
    .status-조퇴 { background: #ffedd5; color: #ea580c; }
    .status-결근 { background: #fee2e2; color: #dc2626; }
    .status-휴가 { background: #dbeafe; color: #2563eb; }
    .status-출장 { background: #f3e8ff; color: #7c3aed; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #3182F6; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #1B64DA; }
    .quarterly { margin-top: 8px; }
    .quarterly table { font-size: 12px; }
    .quarterly th { background: #eef2ff; color: #4338ca; }
    .current-q { background: #eff6ff !important; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="company">VELA Bridge</p>
      <h1>근태 월별 리포트</h1>
      <p class="period">${monthName} | 생성일: ${generatedDate}</p>
    </div>

    <div class="section">
      <h2>월간 요약</h2>
      <div class="summary-grid">
        <div class="summary-item green"><div class="label">출근일수</div><div class="value">${totalWorkDays}</div></div>
        <div class="summary-item amber"><div class="label">지각</div><div class="value">${lateCount}</div></div>
        <div class="summary-item orange"><div class="label">조퇴</div><div class="value">${earlyLeaveCount}</div></div>
        <div class="summary-item red"><div class="label">결근</div><div class="value">${absenceCount}</div></div>
        <div class="summary-item blue"><div class="label">휴가</div><div class="value">${leaveCount}</div></div>
        <div class="summary-item purple"><div class="label">초과근무</div><div class="value">${overtimeTotal.toFixed(1)}h</div></div>
      </div>
    </div>

    <div class="section">
      <h2>일별 상세</h2>
      <table>
        <thead>
          <tr>
            <th>날짜</th><th>요일</th><th>출근</th><th>퇴근</th><th>근무시간</th><th>상태</th><th>메모</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRows.map(r => `
          <tr class="${r.isWeekend ? "weekend" : ""}">
            <td>${r.date.slice(5)}</td>
            <td>${r.dayOfWeek}</td>
            <td>${r.clockIn}</td>
            <td>${r.clockOut}</td>
            <td>${r.hours}</td>
            <td><span class="status-badge status-${r.status}">${r.status}</span></td>
            <td style="text-align:left;font-size:10px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.memo}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="section quarterly">
      <h2>분기별 통계</h2>
      <table>
        <thead>
          <tr><th>분기</th><th>출근일</th><th>지각</th><th>조퇴</th><th>결근</th><th>휴가</th><th>초과근무</th></tr>
        </thead>
        <tbody>
          ${quarterlyStats.map(qs => `
          <tr class="${qs.isCurrent ? "current-q" : ""}">
            <td>${qs.label}${qs.isCurrent ? " (현재)" : ""}</td>
            <td>${qs.workDays}일</td>
            <td>${qs.late}</td>
            <td>${qs.earlyLeave}</td>
            <td>${qs.absence}</td>
            <td>${qs.leave}</td>
            <td>${qs.overtime.toFixed(1)}h</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>직원: ${userName} | 부서/직책: ${department}</div>
      <div>생성자: ${userName} | Generated by VELA Bridge</div>
    </div>

    <button class="print-btn no-print" onclick="window.print()">PDF로 인쇄</button>
  </div>
</body>
</html>`);
    printWindow.document.close();
  };

  // 위치 미니맵 컴포넌트
  const LocationMiniMap = ({ userLat, userLng, officeLat: oLat, officeLng: oLng, radius }: {
    userLat: number; userLng: number; officeLat?: number; officeLng?: number; radius?: number;
  }) => {
    const dist = oLat != null && oLng != null ? haversineDistance(userLat, userLng, oLat, oLng) : null;
    const isInside = dist !== null && radius ? dist <= radius : false;
    return (
      <div className="relative w-full h-24 md:h-32 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl overflow-hidden border border-slate-200">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={`h${i}`} className="absolute w-full border-b border-slate-300" style={{ top: `${(i + 1) * 20}%` }} />
          ))}
          {[...Array(5)].map((_, i) => (
            <div key={`v${i}`} className="absolute h-full border-r border-slate-300" style={{ left: `${(i + 1) * 20}%` }} />
          ))}
        </div>
        {/* Office location */}
        {oLat != null && oLng != null && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Radius circle */}
            <div className={`w-16 h-16 rounded-full border-2 border-dashed ${isInside ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300 bg-slate-50/50"} flex items-center justify-center`}>
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-200" />
            </div>
            <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap">사업장</p>
          </div>
        )}
        {/* User location */}
        <div className={`absolute ${oLat != null ? (isInside ? "top-1/2 left-[52%]" : "top-[25%] left-[75%]") : "top-1/2 left-1/2"} -translate-x-1/2 -translate-y-1/2`}>
          <div className="relative">
            <div className={`w-4 h-4 rounded-full ${isInside ? "bg-emerald-500" : "bg-orange-500"} shadow-lg animate-pulse`} />
            <div className={`absolute -inset-1.5 rounded-full ${isInside ? "bg-emerald-400/30" : "bg-orange-400/30"} animate-ping`} />
          </div>
          <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-500 whitespace-nowrap">내 위치</p>
        </div>
        {/* Distance label */}
        {dist !== null && (
          <div className="absolute bottom-2 right-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isInside ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
              {Math.round(dist)}m {isInside ? "(범위 내)" : "(범위 외)"}
            </span>
          </div>
        )}
        {/* Coordinates */}
        <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono">
          {userLat.toFixed(5)}, {userLng.toFixed(5)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 뷰 모드 토글 */}
      {canViewTeam && (
        <div className="flex gap-2">
          <button onClick={() => setViewMode("my")} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "my" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            내 근태
          </button>
          <button onClick={() => setViewMode("team")} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "team" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            전체 직원 근태
          </button>
        </div>
      )}

      {/* 검색 및 날짜 필터 */}
      <div className={C}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          {canViewTeam && (
            <div className="flex-1 min-w-0">
              <label className={L}>직원명 검색</label>
              <input
                type="text"
                className={I}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="이름으로 검색..."
              />
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div>
              <label className={L}>시작일</label>
              <input type="date" className={`${I} !w-auto`} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
            </div>
            <span className="text-slate-400 pb-2.5">~</span>
            <div>
              <label className={L}>종료일</label>
              <input type="date" className={`${I} !w-auto`} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
            </div>
            {(searchQuery || filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setSearchQuery(""); setFilterStartDate(""); setFilterEndDate(""); }}
                className={`${B2} whitespace-nowrap`}
              >
                초기화
              </button>
            )}
          </div>
        </div>
        {(searchQuery || filterStartDate || filterEndDate) && (
          <p className="mt-2 text-sm font-semibold text-[#3182F6]">{filteredCount}건 조회</p>
        )}
      </div>

      {/* 미입력 퇴근시간 알림 */}
      {missingClockOutRecords.length > 0 && (
        <div className={`${C} !border-amber-200 !bg-amber-50/50`}>
          <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            미입력 퇴근시간
            <span className="text-xs font-normal text-amber-500">({missingClockOutRecords.length}건)</span>
          </h3>
          <div className="space-y-2">
            {missingClockOutRecords.map(rec => (
              <div key={rec.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{rec.date}</p>
                  <p className="text-xs text-slate-400">출근: {rec.clockIn}</p>
                </div>
                {editPastClockOutId === rec.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={editPastClockOutTime}
                      onChange={e => setEditPastClockOutTime(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 w-24"
                    />
                    <button onClick={() => savePastClockOut(rec.id)} className="text-xs text-[#3182F6] font-bold px-2 py-1">확인</button>
                    <button onClick={() => { setEditPastClockOutId(null); setEditPastClockOutTime(""); }} className="text-xs text-slate-400 px-1">취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditPastClockOutId(rec.id); setEditPastClockOutTime("18:00"); }}
                    className="rounded-xl bg-amber-500 text-white font-semibold px-4 py-2 text-xs hover:bg-amber-600 active:scale-[0.98] transition-all"
                  >
                    퇴근 입력
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Clock & Clock In/Out */}
      <div className={C}>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">현재 시각</p>
          <p className="text-4xl font-bold text-slate-800 tracking-tight font-mono">
            {now.toTimeString().slice(0, 8)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-slate-400">출근 기준</span>
            {editStartTime ? (
              <>
                <input type="time" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 w-24" />
                <button onClick={saveWorkStartTime} className="text-xs text-[#3182F6] font-bold">확인</button>
                <button onClick={() => { setEditStartTime(false); setTempStartTime(workStartTime); }} className="text-xs text-slate-400">취소</button>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-700">{workStartTime}</span>
                {myRole === "대표" && (
                  <button onClick={() => setEditStartTime(true)} className="text-xs text-slate-400 hover:text-[#3182F6] transition-colors" title="출근 기준 시간 수정">✏️</button>
                )}
              </>
            )}
          </div>

        <div className="flex gap-3 justify-center mt-5">
          <button
            onClick={clockIn}
            disabled={!!todayRec?.clockIn}
            className={`${B} px-8 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            🕘 출근하기
          </button>
          <button
            onClick={clockInWithGPS}
            disabled={!!todayRec?.clockIn || gpsLoading}
            className={`rounded-2xl bg-emerald-600 text-white font-semibold px-6 py-3 text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {gpsLoading ? "위치 확인중..." : "📍 위치 기반 출근"}
          </button>
          <button
            onClick={clockOut}
            disabled={!todayRec?.clockIn || !!todayRec?.clockOut}
            className={`rounded-2xl bg-slate-700 text-white font-semibold px-8 py-3 text-base hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            🕕 퇴근하기
          </button>
        </div>

        <div className="mt-3">
          <input
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="메모 (선택사항)"
            className={`${I} text-center max-w-xs mx-auto block`}
          />
        </div>

        {/* WiFi 연결 정보 */}
        {currentWifi && (
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {currentWifi}
              {officeLocation?.wifiSSID && (
                <span className="text-slate-300 ml-1">| 사업장 SSID: {officeLocation.wifiSSID}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* GPS 위치 미니맵 & 결과 */}
      {userLocation && (
        <div className={C}>
          <h3 className="text-sm font-bold text-slate-700 mb-3">현재 위치 정보</h3>
          <LocationMiniMap
            userLat={userLocation.lat}
            userLng={userLocation.lng}
            officeLat={officeLocation?.lat}
            officeLng={officeLocation?.lng}
            radius={officeLocation?.radius}
          />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">
              위도: <span className="font-mono font-semibold">{userLocation.lat.toFixed(6)}</span>
            </span>
            <span className="bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">
              경도: <span className="font-mono font-semibold">{userLocation.lng.toFixed(6)}</span>
            </span>
            {distanceToOffice !== null && (
              <span className={`px-3 py-1.5 rounded-lg font-semibold ${
                officeLocation && distanceToOffice <= officeLocation.radius
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-orange-50 text-orange-700"
              }`}>
                사업장까지: {Math.round(distanceToOffice)}m
              </span>
            )}
          </div>
        </div>
      )}

      {/* 사업장 위치 설정 (대표/이사 전용) */}
      {canEditOffice && (
        <div className={C}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">사업장 위치 설정</h3>
            <button
              onClick={() => setShowOfficeSettings(!showOfficeSettings)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${showOfficeSettings ? "bg-slate-200 text-slate-600" : "bg-[#3182F6]/10 text-[#3182F6] hover:bg-[#3182F6]/20"}`}
            >
              {showOfficeSettings ? "닫기" : "설정"}
            </button>
          </div>
          {officeLocation && !showOfficeSettings && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg">위도: {officeLocation.lat}</span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg">경도: {officeLocation.lng}</span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg">반경: {officeLocation.radius}m</span>
              {officeLocation.wifiSSID && <span className="bg-slate-50 px-3 py-1.5 rounded-lg">WiFi: {officeLocation.wifiSSID}</span>}
            </div>
          )}
          {showOfficeSettings && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={L}>위도 (Latitude)</label>
                  <input type="text" className={I} value={officeLat} onChange={e => setOfficeLat(e.target.value)} placeholder="37.5665" />
                </div>
                <div>
                  <label className={L}>경도 (Longitude)</label>
                  <input type="text" className={I} value={officeLng} onChange={e => setOfficeLng(e.target.value)} placeholder="126.9780" />
                </div>
                <div>
                  <label className={L}>반경 (m)</label>
                  <input type="number" className={I} value={officeRadius} onChange={e => setOfficeRadius(e.target.value)} placeholder="200" />
                </div>
                <div>
                  <label className={L}>WiFi SSID (선택)</label>
                  <input type="text" className={I} value={officeWifiSSID} onChange={e => setOfficeWifiSSID(e.target.value)} placeholder="Office_WiFi" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const loc = await getGPSLocation();
                      setOfficeLat(String(loc.lat));
                      setOfficeLng(String(loc.lng));
                      flash("현재 위치가 입력되었습니다");
                    } catch (e: any) { flash(e.message); }
                  }}
                  className={`${B2} text-xs`}
                >
                  📍 현재 위치 사용
                </button>
                <button onClick={saveOfficeLocation} className={`${B} text-xs px-4 py-2`}>
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's status */}
      <div className={C}>
        <h3 className="text-sm font-bold text-slate-700 mb-4">
          오늘 근무 현황
          {isNextDayClockOut && <span className="ml-2 text-xs font-semibold text-amber-500">(어제 출근 → 익일 퇴근 대기)</span>}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">출근</p>
            <p className="text-lg font-bold text-slate-800">{todayRec?.clockIn || "--:--"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">퇴근</p>
            {editClockOut ? (
              <div className="flex items-center gap-1 justify-center">
                <input type="time" value={editClockOutTime} onChange={e => setEditClockOutTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 w-24" />
                <button onClick={updateClockOut} className="text-xs text-[#3182F6] font-bold">확인</button>
                <button onClick={() => setEditClockOut(false)} className="text-xs text-slate-400">취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-center">
                <p className="text-lg font-bold text-slate-800">{todayRec?.clockOut || "--:--"}</p>
                {todayRec?.clockOut && (
                  <button onClick={() => { setEditClockOut(true); setEditClockOutTime(todayRec.clockOut); }}
                    className="text-xs text-slate-400 hover:text-[#3182F6] transition-colors" title="퇴근 시간 수정">
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">근무시간</p>
            <p className="text-lg font-bold text-[#3182F6]">{totalHoursToday.toFixed(1)}h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">상태</p>
            {todayRec ? (
              <span className={`${BADGE} ${STATUS_COLOR[todayRec.status]}`}>{todayRec.status}</span>
            ) : (
              <span className={`${BADGE} bg-slate-100 text-slate-500`}>미출근</span>
            )}
          </div>
        </div>
      </div>

      {/* This week */}
      <div className={C}>
        <h3 className="text-sm font-bold text-slate-700 mb-4">이번 주 출근 기록</h3>
        <p className="md:hidden text-xs text-slate-400 mb-2">&larr; 좌우로 스크롤하세요</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">요일</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">날짜</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">출근</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">퇴근</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">상태</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">위치</th>
                <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">초과근무</th>
              </tr>
            </thead>
            <tbody>
              {weekDates.map((d, i) => {
                const r = weekRecords[i];
                const hasLocation = r && (r as any).latitude != null;
                return (
                  <tr key={d} className={`border-b border-slate-50 ${d === todayStr ? "bg-blue-50/40" : ""}`}>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{DAY_LABELS[i]}</td>
                    <td className="py-2.5 px-3 text-slate-500">{d.slice(5)}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {editClockInId === r?.id ? (
                        <div className="flex items-center gap-1">
                          <input type="time" value={editClockInTime} onChange={e => setEditClockInTime(e.target.value)}
                            className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                          <button onClick={() => updateClockIn(r!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                          <button onClick={() => setEditClockInId(null)} className="text-xs text-slate-400">취소</button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {r?.clockIn || "-"}
                          {myRole === "대표" && r?.clockIn && (
                            <button onClick={() => { setEditClockInId(r.id); setEditClockInTime(r.clockIn); }}
                              className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors" title="출근 시간 수정">✏️</button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {editPastClockOutId === r?.id ? (
                        <div className="flex items-center gap-1">
                          <input type="time" value={editPastClockOutTime} onChange={e => setEditPastClockOutTime(e.target.value)}
                            className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                          <button onClick={() => savePastClockOut(r!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                          <button onClick={() => { setEditPastClockOutId(null); setEditPastClockOutTime(""); }} className="text-xs text-slate-400">취소</button>
                        </div>
                      ) : editClockOutId === r?.id ? (
                        <div className="flex items-center gap-1">
                          <input type="time" value={editClockOutTimeTeam} onChange={e => setEditClockOutTimeTeam(e.target.value)}
                            className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                          <button onClick={() => updateClockOutTeam(r!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                          <button onClick={() => setEditClockOutId(null)} className="text-xs text-slate-400">취소</button>
                        </div>
                      ) : r?.clockIn && !r?.clockOut && d !== todayStr && (() => {
                        const recDate = new Date(`${d}T00:00:00`);
                        const diffDays = Math.floor((new Date().getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays <= 7 && diffDays >= 1;
                      })() ? (
                        <button
                          onClick={() => { setEditPastClockOutId(r!.id); setEditPastClockOutTime("18:00"); }}
                          className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-2 py-1 transition-all"
                        >
                          퇴근 입력
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {r?.clockOut || "-"}
                          {r?.clockOut && (
                            <button onClick={() => {
                              const recDate = new Date(`${d}T00:00:00`);
                              const diffDays = Math.floor((new Date().getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays <= 7) {
                                setEditPastClockOutId(r.id); setEditPastClockOutTime(r.clockOut);
                              } else if (myRole === "대표") {
                                setEditClockOutId(r.id); setEditClockOutTimeTeam(r.clockOut);
                              }
                            }}
                              className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors" title="퇴근 시간 수정">✏️</button>
                          )}
                          {!r?.clockOut && myRole === "대표" && r?.clockIn && (
                            <button onClick={() => { setEditClockOutId(r.id); setEditClockOutTimeTeam("18:00"); }}
                              className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors" title="퇴근 시간 수정">✏️</button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {r ? (
                        <span className={`${BADGE} text-xs ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                      ) : d <= todayStr ? (
                        <span className={`${BADGE} text-xs bg-slate-100 text-slate-400`}>-</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-400">
                      {hasLocation ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600" title={`${(r as any).latitude?.toFixed(4)}, ${(r as any).longitude?.toFixed(4)}`}>
                          📍 GPS
                        </span>
                      ) : r?.clockIn ? (
                        <span className="text-slate-300">-</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {r?.overtime ? `+${r.overtime}h` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly stats */}
      {viewMode === "my" && (
        <div className={C}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">월간 통계</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 text-indigo-700 font-semibold px-4 py-2 text-xs hover:bg-indigo-100 transition-all"
              >
                🖨️ 월별 리포트 출력
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const yyyy = now.getFullYear();
                  const mm = String(now.getMonth() + 1).padStart(2, "0");
                  const header = "이름,날짜,출근시간,퇴근시간,상태,초과근무,메모";
                  const rows = monthRecords.map(r =>
                    [r.userName, r.date, r.clockIn || "", r.clockOut || "", r.status, r.overtime, `"${(r.memo || "").replace(/"/g, '""')}"`].join(",")
                  );
                  const csv = "﻿" + [header, ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `근태현황_${yyyy}-${mm}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-xs hover:bg-emerald-100 transition-all"
              >
                📥 엑셀 다운로드
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="text-xs text-emerald-600 font-semibold mb-1">출근일수</p>
              <p className="text-2xl font-bold text-emerald-700">{totalWorkDays}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-center">
              <p className="text-xs text-amber-600 font-semibold mb-1">지각</p>
              <p className="text-2xl font-bold text-amber-700">{lateCount}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-600 font-semibold mb-1">초과근무</p>
              <p className="text-2xl font-bold text-blue-700">{overtimeTotal.toFixed(1)}h</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4 text-center">
              <p className="text-xs text-red-600 font-semibold mb-1">결근</p>
              <p className="text-2xl font-bold text-red-700">{absenceCount}</p>
            </div>
          </div>

          {/* 분기별 통계 */}
          <div className="mt-6">
            <h4 className="text-sm font-bold text-slate-700 mb-3">분기별 통계</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">분기</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">출근일</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">지각</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">조퇴</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">결근</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">휴가</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">초과근무</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterlyStats.map(qs => (
                    <tr key={qs.quarter} className={`border-b border-slate-50 ${qs.isCurrent ? "bg-blue-50/40" : ""}`}>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {qs.label}
                        {qs.isCurrent && <span className="ml-1 text-[10px] text-[#3182F6] font-bold">(현재)</span>}
                      </td>
                      <td className="text-right py-2.5 px-3 text-emerald-600 font-semibold">{qs.workDays}일</td>
                      <td className="text-right py-2.5 px-3 text-amber-600 font-semibold">{qs.late}</td>
                      <td className="text-right py-2.5 px-3 text-orange-600 font-semibold">{qs.earlyLeave}</td>
                      <td className="text-right py-2.5 px-3 text-red-600 font-semibold">{qs.absence}</td>
                      <td className="text-right py-2.5 px-3 text-blue-600 font-semibold">{qs.leave}</td>
                      <td className="text-right py-2.5 px-3 text-purple-600 font-semibold">{qs.overtime.toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 전체 직원 근태 */}
      {viewMode === "team" && canViewTeam && (
        <>
          {/* 오늘 전 직원 현황 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">오늘 전체 직원 현황</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-600 font-semibold">출근</p>
                <p className="text-xl font-bold text-emerald-700">{filteredTodayAllRecords.filter(r => r.clockIn).length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-600 font-semibold">지각</p>
                <p className="text-xl font-bold text-amber-700">{filteredTodayAllRecords.filter(r => r.status === "지각").length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold">퇴근</p>
                <p className="text-xl font-bold text-slate-700">{filteredTodayAllRecords.filter(r => r.clockOut).length}</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600 font-semibold">미출근</p>
                <p className="text-xl font-bold text-red-700">{filteredAllNames.length - filteredTodayAllRecords.filter(r => r.clockIn).length}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">직책</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">출근</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">퇴근</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">상태</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">위치</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllNames.map(name => {
                    const rec = todayAllRecords.find(r => r.userName === name);
                    const member = teamMembers.find(m => m.name === name);
                    const hasLoc = rec && (rec as any).latitude != null;
                    return (
                      <tr key={name} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{displayName(name)}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{member?.role ?? "-"}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {editClockInId === rec?.id ? (
                            <div className="flex items-center gap-1">
                              <input type="time" value={editClockInTime} onChange={e => setEditClockInTime(e.target.value)}
                                className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                              <button onClick={() => updateClockIn(rec!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                              <button onClick={() => setEditClockInId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {rec?.clockIn || <span className="text-slate-300">-</span>}
                              {myRole === "대표" && rec?.clockIn && (
                                <button onClick={() => { setEditClockInId(rec.id); setEditClockInTime(rec.clockIn); }}
                                  className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors">✏️</button>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {editClockOutId === rec?.id ? (
                            <div className="flex items-center gap-1">
                              <input type="time" value={editClockOutTimeTeam} onChange={e => setEditClockOutTimeTeam(e.target.value)}
                                className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                              <button onClick={() => updateClockOutTeam(rec!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                              <button onClick={() => setEditClockOutId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {rec?.clockOut || <span className="text-slate-300">-</span>}
                              {myRole === "대표" && rec?.clockOut && (
                                <button onClick={() => { setEditClockOutId(rec.id); setEditClockOutTimeTeam(rec.clockOut); }}
                                  className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors">✏️</button>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec ? (
                            <span className={`${BADGE} text-xs ${STATUS_COLOR[rec.status]}`}>{rec.status}</span>
                          ) : (
                            <span className={`${BADGE} text-xs bg-red-50 text-red-500`}>미출근</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {hasLoc ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600" title={`${(rec as any).latitude?.toFixed(4)}, ${(rec as any).longitude?.toFixed(4)}`}>
                              📍 GPS
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-400">{rec?.memo || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 전 직원 이번 주 요약 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">이번 주 전체 직원</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    {DAY_LABELS.map(d => (
                      <th key={d} className="text-center py-2 px-2 text-xs text-slate-400 font-semibold">{d}</th>
                    ))}
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">출근일</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">지각</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamWeekData.map(tw => (
                    <tr key={tw.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700">{displayName(tw.name)}</span>
                        {tw.role && <span className="text-[10px] text-slate-400 ml-1">{tw.role}</span>}
                      </td>
                      {tw.week.map((r, i) => (
                        <td key={weekDates[i]} className="text-center py-2.5 px-2">
                          {r ? (
                            <span className={`inline-block w-6 h-6 rounded-lg text-[10px] font-bold leading-6 ${STATUS_COLOR[r.status]}`}>
                              {r.status === "정상" ? "✓" : r.status[0]}
                            </span>
                          ) : weekDates[i] <= todayStr ? (
                            <span className="inline-block w-6 h-6 rounded-lg text-[10px] font-bold leading-6 bg-slate-100 text-slate-300">-</span>
                          ) : (
                            <span className="text-slate-200">·</span>
                          )}
                        </td>
                      ))}
                      <td className="text-right py-2.5 px-3 font-semibold text-slate-700">{tw.monthStats.workDays}일</td>
                      <td className="text-right py-2.5 px-3 font-semibold text-amber-600">{tw.monthStats.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 전 직원 월간 통계 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">월간 전체 통계</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">출근일</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">지각</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">초과근무</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">결근</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamWeekData.map(tw => (
                    <tr key={tw.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{displayName(tw.name)}</td>
                      <td className="text-right py-2.5 px-3 text-emerald-600 font-semibold">{tw.monthStats.workDays}일</td>
                      <td className="text-right py-2.5 px-3 text-amber-600 font-semibold">{tw.monthStats.late}</td>
                      <td className="text-right py-2.5 px-3 text-blue-600 font-semibold">{tw.monthStats.overtime.toFixed(1)}h</td>
                      <td className="text-right py-2.5 px-3 text-red-600 font-semibold">{tw.monthStats.absence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
